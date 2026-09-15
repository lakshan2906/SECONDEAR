/**
 * Real-time Mel-Spectrogram Feature Extractor
 * SecondEar™ Real Signal Processing Module
 *
 * Computes 128-bin Log Mel-Spectrogram directly from raw audio PCM buffers:
 * - 16,000 Hz sample rate
 * - 512 FFT size (25ms window = 400 samples with zero-padding)
 * - 160 hop size (10ms time hop)
 * - 128 Mel-spaced triangular filters (50 Hz – 2000 Hz)
 * - Canvas heat-map rendering with clinical bio-acoustic color palettes
 */

export interface SpectrogramResult {
  melMatrix: Float32Array[]; // [128][time_frames]
  nFrames: number;
  nMelBins: number;
  timeAxis: number[]; // seconds per column
  freqAxis: number[]; // Hz per row
  minVal: number;
  maxVal: number;
}

export function hzToMel(hz: number): number {
  return 2595.0 * Math.log10(1.0 + hz / 700.0);
}

export function melToHz(mel: number): number {
  return 700.0 * (Math.pow(10.0, mel / 2595.0) - 1.0);
}

/**
 * Pre-generate 128 triangular Mel filterbank weights
 */
export function createMelFilterbank(
  sampleRate = 16000,
  nFft = 512,
  nMels = 128,
  fMin = 50,
  fMax = 2000
): { weights: Float32Array[]; freqCenters: number[] } {
  const minMel = hzToMel(fMin);
  const maxMel = hzToMel(fMax);
  const melPoints = new Float32Array(nMels + 2);
  const hzPoints = new Float32Array(nMels + 2);
  const binPoints = new Int32Array(nMels + 2);

  for (let i = 0; i < nMels + 2; i++) {
    melPoints[i] = minMel + (i / (nMels + 1)) * (maxMel - minMel);
    hzPoints[i] = melToHz(melPoints[i]);
    binPoints[i] = Math.floor(((nFft + 1) * hzPoints[i]) / sampleRate);
  }

  const nFreqBins = nFft / 2 + 1;
  const weights: Float32Array[] = [];
  const freqCenters: number[] = [];

  for (let m = 1; m <= nMels; m++) {
    const filter = new Float32Array(nFreqBins);
    const fPrev = binPoints[m - 1];
    const fCenter = binPoints[m];
    const fNext = binPoints[m + 1];
    freqCenters.push(hzPoints[m]);

    for (let k = fPrev; k < fCenter; k++) {
      if (fCenter > fPrev && k < nFreqBins) {
        filter[k] = (k - fPrev) / (fCenter - fPrev);
      }
    }
    for (let k = fCenter; k < fNext; k++) {
      if (fNext > fCenter && k < nFreqBins) {
        filter[k] = (fNext - k) / (fNext - fCenter);
      }
    }
    weights.push(filter);
  }

  return { weights, freqCenters };
}

/**
 * Radix-2 / In-place Fast Fourier Transform (Cooley-Tukey)
 */
export function computeFFT(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i];
      const ti = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tr;
      imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wr = 1.0;
      let wi = 0.0;
      for (let k = 0; k < half; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + half] * wr - imag[i + k + half] * wi;
        const vI = real[i + k + half] * wi + imag[i + k + half] * wr;

        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + half] = uR - vR;
        imag[i + k + half] = uI - vI;

        const nextWr = wr * wStepR - wi * wStepI;
        wi = wr * wStepI + wi * wStepR;
        wr = nextWr;
      }
    }
  }
}

/**
 * Computes the real 128 Mel-spectrogram tensor from audio PCM
 */
export function computeMelSpectrogram(
  audioData: Float32Array,
  sampleRate = 16000,
  nMels = 128,
  nFft = 512,
  hopLength = 160,
  winLength = 400
): SpectrogramResult {
  const { weights, freqCenters } = createMelFilterbank(sampleRate, nFft, nMels, 50, 2000);
  const nFreqBins = nFft / 2 + 1;

  // Hanning window
  const window = new Float32Array(winLength);
  for (let i = 0; i < winLength; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winLength - 1)));
  }

  const nFrames = Math.max(1, Math.floor((audioData.length - winLength) / hopLength) + 1);
  const timeAxis: number[] = [];

  // Initialize Mel matrix [128][nFrames]
  const melMatrix: Float32Array[] = [];
  for (let m = 0; m < nMels; m++) {
    melMatrix.push(new Float32Array(nFrames));
  }

  const realBuffer = new Float32Array(nFft);
  const imagBuffer = new Float32Array(nFft);
  const powerSpectrum = new Float32Array(nFreqBins);

  let minVal = Infinity;
  let maxVal = -Infinity;

  for (let frameIdx = 0; frameIdx < nFrames; frameIdx++) {
    const start = frameIdx * hopLength;
    timeAxis.push(start / sampleRate);

    // Apply Hanning window & zero pad to nFft
    realBuffer.fill(0);
    imagBuffer.fill(0);

    for (let i = 0; i < winLength; i++) {
      if (start + i < audioData.length) {
        realBuffer[i] = audioData[start + i] * window[i];
      }
    }

    // FFT
    computeFFT(realBuffer, imagBuffer);

    // Power spectrum |X(f)|^2
    for (let k = 0; k < nFreqBins; k++) {
      const p = realBuffer[k] * realBuffer[k] + imagBuffer[k] * imagBuffer[k];
      powerSpectrum[k] = p;
    }

    // Mel filterbank dot product & Log scaling
    for (let m = 0; m < nMels; m++) {
      const fbank = weights[m];
      let energy = 0;
      for (let k = 0; k < nFreqBins; k++) {
        energy += fbank[k] * powerSpectrum[k];
      }
      // Dynamic range log compression: log10(1 + 100 * energy)
      const logVal = Math.log10(1.0 + 100.0 * energy);
      melMatrix[m][frameIdx] = logVal;

      if (logVal < minVal) minVal = logVal;
      if (logVal > maxVal) maxVal = logVal;
    }
  }

  return {
    melMatrix,
    nFrames,
    nMelBins: nMels,
    timeAxis,
    freqAxis: freqCenters,
    minVal: minVal === Infinity ? 0 : minVal,
    maxVal: maxVal === -Infinity ? 1 : maxVal,
  };
}

/**
 * Bio-acoustic Colormaps for Mel-Spectrogram Rendering
 */
export function getBioColor(normalizedVal: number): [number, number, number] {
  // Clamped [0, 1]
  const v = Math.max(0, Math.min(1, normalizedVal));

  // Medical Cyan-Magma Palette (Deep Navy -> Purple -> Electric Cyan -> Bright Amber -> White)
  if (v < 0.25) {
    const t = v / 0.25;
    return [
      Math.round(8 + t * (40 - 8)),
      Math.round(12 + t * (25 - 12)),
      Math.round(35 + t * (75 - 35)),
    ];
  } else if (v < 0.5) {
    const t = (v - 0.25) / 0.25;
    return [
      Math.round(40 + t * (120 - 40)),
      Math.round(25 + t * (40 - 25)),
      Math.round(75 + t * (180 - 75)),
    ];
  } else if (v < 0.75) {
    const t = (v - 0.5) / 0.25;
    return [
      Math.round(120 + t * (0 - 120)),
      Math.round(40 + t * (245 - 40)),
      Math.round(180 + t * (212 - 180)),
    ];
  } else {
    const t = (v - 0.75) / 0.25;
    return [
      Math.round(0 + t * (255 - 0)),
      Math.round(245 + t * (255 - 245)),
      Math.round(212 + t * (180 - 212)),
    ];
  }
}
