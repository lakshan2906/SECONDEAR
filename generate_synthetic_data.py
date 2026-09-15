"""
SANTFRIX SecondEar™ - Synthetic Cardiopulmonary Acoustic Dataset Generator
VMEDITHON 3.0 • Bio-Engineering Track

Generates synthetic lung and heart sound recordings for 5 distinct clinical classes:
0: Normal
1: Wheeze
2: Crackle
3: Stridor
4: Murmur

Pure Python & NumPy Compatible - No heavy external dependencies required.
"""

import os
import wave
import struct
import math
import random
import json

SAMPLE_RATE = 16000  # 16 kHz Mono
DURATION = 4.0       # 4.0 seconds per sample
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION)  # 64,000 samples
CLASSES = ["Normal", "Wheeze", "Crackle", "Stridor", "Murmur"]
SAMPLES_PER_CLASS = 500  # 2500 total samples
SPLIT_RATIOS = {"train": 0.8, "val": 0.1, "test": 0.1}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data", "synthetic_dataset")


def generate_breath_envelope(t, rate=0.5):
    """Respiratory cycle envelope (Inhale ~0.8s, Pause ~0.1s, Exhale ~1.0s, Pause ~0.1s)."""
    t_mod = t % (1.0 / rate)
    if 0 <= t_mod < 0.8:
        return math.sin(math.pi * t_mod / 0.8) ** 1.5
    elif 0.9 <= t_mod < 1.9:
        return 0.7 * (math.sin(math.pi * (t_mod - 0.9) / 1.0) ** 1.3)
    return 0.05


def synthesize_normal_sample():
    """Normal vesicular breath sounds with low cardiac S1/S2 beats."""
    audio = [0.0] * TOTAL_SAMPLES
    b0, b1, b2 = 0.0, 0.0, 0.0
    rate = random.uniform(0.46, 0.54)
    hr_bpm = random.uniform(66, 78)
    hr_period = 60.0 / hr_bpm

    for i in range(TOTAL_SAMPLES):
        t = i / SAMPLE_RATE
        white = random.gauss(0, 1)
        # Pink noise IIR approximation
        b0 = 0.99765 * b0 + white * 0.099046
        b1 = 0.96300 * b1 + white * 0.296516
        b2 = 0.57000 * b2 + white * 1.0526913
        pink = (b0 + b1 + b2 + white * 0.1848) * 0.12
        env = generate_breath_envelope(t, rate)
        audio[i] = pink * env * 0.75 + random.gauss(0, 0.01)

    # Cardiac S1/S2
    n_beats = int(math.ceil(DURATION / hr_period))
    for b in range(n_beats):
        t_s1 = b * hr_period
        t_s2 = t_s1 + 0.30
        idx_s1 = int(t_s1 * SAMPLE_RATE)
        idx_s2 = int(t_s2 * SAMPLE_RATE)

        # S1 (50 Hz)
        for j in range(int(0.08 * SAMPLE_RATE)):
            idx = idx_s1 + j
            if idx < TOTAL_SAMPLES:
                t_rel = j / SAMPLE_RATE
                audio[idx] += 0.22 * math.sin(2 * math.pi * 50 * t_rel) * math.exp(-t_rel * 40)

        # S2 (75 Hz)
        for j in range(int(0.07 * SAMPLE_RATE)):
            idx = idx_s2 + j
            if idx < TOTAL_SAMPLES:
                t_rel = j / SAMPLE_RATE
                audio[idx] += 0.17 * math.sin(2 * math.pi * 75 * t_rel) * math.exp(-t_rel * 50)

    return audio


def synthesize_wheeze_sample():
    """Wheeze: Continuous musical harmonic tones (250–650 Hz) during expiration."""
    audio = synthesize_normal_sample()
    f0 = random.uniform(280, 620)
    vib_rate = random.uniform(3.5, 5.5)
    vib_depth = random.uniform(12, 25)
    phase = 0.0

    for i in range(TOTAL_SAMPLES):
        t = i / SAMPLE_RATE
        freq_inst = f0 + vib_depth * math.sin(2 * math.pi * vib_rate * t)
        phase += 2 * math.pi * freq_inst / SAMPLE_RATE

        t_mod = t % 2.0
        is_exhale = t_mod >= 0.85 and t_mod < 1.95
        amp = 0.75 if is_exhale else 0.15
        env = generate_breath_envelope(t, 0.5)

        tone = math.sin(phase) + 0.4 * math.sin(2 * phase) + 0.15 * math.sin(3 * phase)
        audio[i] = audio[i] * 0.4 + tone * env * amp * 0.8

    return audio


def synthesize_crackle_sample():
    """Crackle: Discontinuous explosive micro-clicks (5–20ms, 250–950 Hz) in inspiration."""
    audio = synthesize_normal_sample()
    for cycle in range(2):
        t_start = cycle * 2.0 + 0.28
        t_end = cycle * 2.0 + 0.76
        num_clicks = random.randint(10, 18)

        for _ in range(num_clicks):
            t_click = random.uniform(t_start, t_end)
            fc = random.uniform(300, 900)
            dur = random.uniform(0.008, 0.016)
            amp = random.uniform(0.7, 1.2)
            n_click_samples = int(dur * SAMPLE_RATE)
            idx_start = int(t_click * SAMPLE_RATE)

            for j in range(n_click_samples):
                idx = idx_start + j
                if idx < TOTAL_SAMPLES:
                    t_rel = j / SAMPLE_RATE
                    click = math.sin(2 * math.pi * fc * t_rel) * math.exp(-t_rel * 320) * amp
                    audio[idx] += click

    return audio


def synthesize_stridor_sample():
    """Stridor: High-pitched harsh monophonic continuous tone (600–1350 Hz) in inspiration."""
    audio = synthesize_normal_sample()
    f_stridor = random.uniform(650, 1200)

    for i in range(TOTAL_SAMPLES):
        t = i / SAMPLE_RATE
        t_mod = t % 2.0
        if 0.05 <= t_mod < 0.8:
            inh_env = math.sin(math.pi * (t_mod - 0.05) / 0.75) ** 2
            phase = 2 * math.pi * f_stridor * t
            harsh = (
                math.sin(phase) +
                0.5 * math.sin(2 * phase) +
                0.3 * math.sin(3 * phase) +
                random.gauss(0, 0.2)
            )
            audio[i] = audio[i] * 0.35 + harsh * inh_env * 0.85

    return audio


def synthesize_murmur_sample():
    """Murmur: Turbulent swooshing noise (120–550 Hz) between S1 and S2."""
    audio = synthesize_normal_sample()
    hr_period = 0.83
    n_beats = int(math.ceil(DURATION / hr_period))

    for b in range(n_beats):
        t_s1 = b * hr_period
        t_s2 = t_s1 + 0.30
        m_start = t_s1 + 0.04
        m_end = t_s2
        m_dur = m_end - m_start

        idx_start = int(m_start * SAMPLE_RATE)
        n_m_samples = int(m_dur * SAMPLE_RATE)

        for j in range(n_m_samples):
            idx = idx_start + j
            if idx < TOTAL_SAMPLES:
                t_rel = j / SAMPLE_RATE
                m_env = math.sin(math.pi * t_rel / m_dur) ** 1.5
                turb = random.gauss(0, 1) * math.sin(2 * math.pi * 320 * t_rel)
                audio[idx] += turb * m_env * 0.85

    return audio


def save_pcm16_wav(filepath, float_audio):
    """Normalize and write 16-bit PCM Mono WAV."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    max_abs = max(abs(x) for x in float_audio) or 1.0
    norm_audio = [x / max_abs * 0.92 for x in float_audio]
    int16_samples = [int(max(-32767, min(32767, x * 32767))) for x in norm_audio]

    with wave.open(filepath, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        raw_bytes = struct.pack(f"<{len(int16_samples)}h", *int16_samples)
        wf.writeframes(raw_bytes)


def main():
    print("=" * 65)
    print("SANTFRIX SecondEar™ - Synthetic Cardiopulmonary Dataset Generator")
    print("=" * 65)

    generators = {
        0: synthesize_normal_sample,
        1: synthesize_wheeze_sample,
        2: synthesize_crackle_sample,
        3: synthesize_stridor_sample,
        4: synthesize_murmur_sample
    }

    n_train = int(SAMPLES_PER_CLASS * SPLIT_RATIOS["train"])
    n_val = int(SAMPLES_PER_CLASS * SPLIT_RATIOS["val"])
    n_test = SAMPLES_PER_CLASS - n_train - n_val

    print(f"Total classes: {len(CLASSES)} ({CLASSES})")
    print(f"Samples per class: {SAMPLES_PER_CLASS} (Train: {n_train}, Val: {n_val}, Test: {n_test})")
    print(f"Total dataset: {SAMPLES_PER_CLASS * len(CLASSES)} WAV files")
    print(f"Saving to: {OUTPUT_DIR}\n")

    metadata = {
        "sample_rate": SAMPLE_RATE,
        "duration_sec": DURATION,
        "classes": CLASSES,
        "total_samples": SAMPLES_PER_CLASS * len(CLASSES),
        "splits": {"train": n_train * len(CLASSES), "val": n_val * len(CLASSES), "test": n_test * len(CLASSES)},
        "samples": []
    }

    for cls_idx, cls_name in enumerate(CLASSES):
        print(f"Generating class [{cls_idx}] {cls_name} ({SAMPLES_PER_CLASS} samples)...")
        gen_fn = generators[cls_idx]

        for i in range(SAMPLES_PER_CLASS):
            audio = gen_fn()
            if i < n_train:
                split = "train"
                sample_num = i
            elif i < n_train + n_val:
                split = "val"
                sample_num = i - n_train
            else:
                split = "test"
                sample_num = i - n_train - n_val

            filename = f"{cls_name.lower()}_{split}_{sample_num:04d}.wav"
            rel_path = os.path.join(split, cls_name, filename)
            abs_path = os.path.join(OUTPUT_DIR, rel_path)

            save_pcm16_wav(abs_path, audio)
            metadata["samples"].append({
                "filename": filename,
                "split": split,
                "class_id": cls_idx,
                "class_name": cls_name,
                "path": rel_path
            })

    meta_path = os.path.join(OUTPUT_DIR, "dataset_metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)

    # Save curated demo samples to public/samples
    public_samples_dir = os.path.join(os.path.dirname(__file__), "public", "samples")
    os.makedirs(public_samples_dir, exist_ok=True)
    for cls_idx, cls_name in enumerate(CLASSES):
        demo_audio = generators[cls_idx]()
        demo_name = f"{cls_name.lower()}_preset.wav"
        save_pcm16_wav(os.path.join(public_samples_dir, demo_name), demo_audio)
        print(f"Exported demo sample: public/samples/{demo_name}")

    print("\nDataset generation completed successfully!")
    print(f"Dataset metadata saved: {meta_path}")


if __name__ == "__main__":
    main()
