/**
 * 4th-Order Butterworth Bandpass Filter (50 Hz – 2000 Hz)
 * SecondEar™ Real Signal Processing Module
 *
 * Implements a 4-pole Butterworth filter using cascaded 2nd-order IIR biquad sections.
 * Pitch deck DSP spec: 50 Hz high-pass to eliminate baseline body movement artifacts,
 * 2000 Hz low-pass to eliminate ambient high-frequency hiss.
 */

export interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export class BiquadFilter {
  private b0 = 0;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;

  // Direct Form II transposed state registers
  private z1 = 0;
  private z2 = 0;

  constructor(coeffs?: BiquadCoeffs) {
    if (coeffs) {
      this.setCoeffs(coeffs);
    }
  }

  public setCoeffs(c: BiquadCoeffs) {
    this.b0 = c.b0;
    this.b1 = c.b1;
    this.b2 = c.b2;
    this.a1 = c.a1;
    this.a2 = c.a2;
    this.reset();
  }

  public reset() {
    this.z1 = 0;
    this.z2 = 0;
  }

  public processSample(x: number): number {
    // Direct Form II Transposed structure
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }

  public processBuffer(input: Float32Array): Float32Array {
    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      out[i] = this.processSample(input[i]);
    }
    return out;
  }
}

/**
 * Calculate 2nd-order Butterworth Highpass coefficients (Q = 0.7071)
 */
export function designButterworthHighpass(cutoffHz: number, sampleRate: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Math.SQRT2); // Q = 1/sqrt(2) = 0.7071

  const a0 = 1 + alpha;
  const b0 = ((1 + cosw0) / 2) / a0;
  const b1 = (-(1 + cosw0)) / a0;
  const b2 = ((1 + cosw0) / 2) / a0;
  const a1 = (-2 * cosw0) / a0;
  const a2 = (1 - alpha) / a0;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Calculate 2nd-order Butterworth Lowpass coefficients (Q = 0.7071)
 */
export function designButterworthLowpass(cutoffHz: number, sampleRate: number): BiquadCoeffs {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * Math.SQRT2);

  const a0 = 1 + alpha;
  const b0 = ((1 - cosw0) / 2) / a0;
  const b1 = (1 - cosw0) / a0;
  const b2 = ((1 - cosw0) / 2) / a0;
  const a1 = (-2 * cosw0) / a0;
  const a2 = (1 - alpha) / a0;

  return { b0, b1, b2, a1, a2 };
}

/**
 * Cascaded 4th-order Butterworth Bandpass filter (50 Hz – 2000 Hz)
 * Stage 1: 2nd-order Highpass (50 Hz)
 * Stage 2: 2nd-order Highpass (50 Hz) -> 4th-order HP
 * Stage 3: 2nd-order Lowpass (2000 Hz)
 * Stage 4: 2nd-order Lowpass (2000 Hz) -> 4th-order LP
 */
export class ButterworthBandpass4thOrder {
  private stages: BiquadFilter[] = [];

  constructor(sampleRate = 16000, lowCut = 50, highCut = 2000) {
    this.reconfigure(sampleRate, lowCut, highCut);
  }

  public reconfigure(sampleRate: number, lowCut = 50, highCut = 2000) {
    // Clamp highCut safely below Nyquist
    const maxHighCut = sampleRate * 0.45;
    const effectiveHighCut = Math.min(highCut, maxHighCut);
    const effectiveLowCut = Math.max(10, lowCut);

    const hpCoeffs = designButterworthHighpass(effectiveLowCut, sampleRate);
    const lpCoeffs = designButterworthLowpass(effectiveHighCut, sampleRate);

    this.stages = [
      new BiquadFilter(hpCoeffs),
      new BiquadFilter(hpCoeffs),
      new BiquadFilter(lpCoeffs),
      new BiquadFilter(lpCoeffs),
    ];
  }

  public process(input: Float32Array): Float32Array {
    let current = input;
    for (const stage of this.stages) {
      stage.reset();
      current = stage.processBuffer(current);
    }
    return current;
  }
}

/**
 * Adaptive spectral noise floor suppression
 */
export function applyAdaptiveNoiseSuppression(audio: Float32Array, alpha = 0.85): Float32Array {
  const output = new Float32Array(audio.length);
  let noiseFloor = 0.01;

  for (let i = 0; i < audio.length; i++) {
    const val = audio[i];
    const absVal = Math.abs(val);
    
    // Slow tracking noise floor
    if (absVal < noiseFloor) {
      noiseFloor = alpha * noiseFloor + (1 - alpha) * absVal;
    } else {
      noiseFloor = 0.999 * noiseFloor + 0.001 * absVal;
    }

    // Soft spectral gate threshold
    const gate = Math.max(0, 1 - (noiseFloor * 1.5) / (absVal + 1e-6));
    output[i] = val * Math.min(1.0, Math.pow(gate, 1.2));
  }

  return output;
}
