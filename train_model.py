"""
SANTFRIX SecondEar™ - 1D-CNN + TCN Model Training & ONNX Export Pipeline
VMEDITHON 3.0 • Bio-Engineering Track

Trains a lightweight 1D-CNN + Temporal Convolutional Network (TCN)
on the synthetic cardiopulmonary dataset and exports to ONNX for edge inference.

Pipeline:
1. Audio (16kHz, 4.0s) -> 4th-order Butterworth Bandpass (50-2000 Hz)
2. 128 Mel-spectrogram (25ms window, 10ms hop) -> Log-Mel (1, 128, 401)
3. 2D-CNN Spectral Feature Extractor
4. Dilated Residual Temporal Convolutional Network (TCN)
5. Temporal Attention Pooling -> 5-Class Softmax Classifier
"""

import os
import sys
import json
import wave
import numpy as np
from scipy.signal import butter, lfilter

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "synthetic_dataset")
MODEL_EXPORT_DIR = os.path.join(os.path.dirname(__file__), "public", "models")
CLASSES = ["Normal", "Wheeze", "Crackle", "Stridor", "Murmur"]
SAMPLE_RATE = 16000
N_MELS = 128
N_FFT = 512
HOP_LENGTH = 160
WIN_LENGTH = 400


def butter_bandpass_filter(data, lowcut=50.0, highcut=2000.0, fs=16000, order=4):
    """4th-order Butterworth bandpass filter."""
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    y = lfilter(b, a, data)
    return y


def hz_to_mel(hz):
    return 2595.0 * np.log10(1.0 + hz / 700.0)


def mel_to_hz(mel):
    return 700.0 * (10.0 ** (mel / 2595.0) - 1.0)


def create_mel_filterbank(sr=16000, n_fft=512, n_mels=128, f_min=50, f_max=2000):
    """Compute triangular Mel filterbank matrix."""
    min_mel = hz_to_mel(f_min)
    max_mel = hz_to_mel(f_max)
    mels = np.linspace(min_mel, max_mel, n_mels + 2)
    hzs = mel_to_hz(mels)
    bins = np.floor((n_fft + 1) * hzs / sr).astype(int)

    n_freqs = n_fft // 2 + 1
    fbank = np.zeros((n_mels, n_freqs))

    for m in range(1, n_mels + 1):
        f_m_minus = bins[m - 1]
        f_m = bins[m]
        f_m_plus = bins[m + 1]

        for k in range(f_m_minus, f_m):
            if f_m > f_m_minus:
                fbank[m - 1, k] = (k - f_m_minus) / (f_m - f_m_minus)
        for k in range(f_m, f_m_plus):
            if f_m_plus > f_m and k < n_freqs:
                fbank[m - 1, k] = (f_m_plus - k) / (f_m_plus - f_m)

    return fbank


def compute_mel_spectrogram(audio, fbank):
    """Compute Log Mel-spectrogram matching the pitch deck specifications."""
    filtered = butter_bandpass_filter(audio, 50.0, 2000.0, SAMPLE_RATE, order=4)
    window = np.hanning(WIN_LENGTH)
    n_frames = 1 + int((len(filtered) - WIN_LENGTH) / HOP_LENGTH)

    stft = np.zeros((N_FFT // 2 + 1, n_frames), dtype=np.complex64)
    for t in range(n_frames):
        start = t * HOP_LENGTH
        frame = filtered[start:start + WIN_LENGTH] * window
        padded = np.zeros(N_FFT)
        padded[:WIN_LENGTH] = frame
        stft[:, t] = np.fft.rfft(padded)

    power_spec = np.abs(stft) ** 2
    mel_spec = np.dot(fbank, power_spec)
    log_mel = np.log10(1.0 + 100.0 * mel_spec)

    mean = np.mean(log_mel)
    std = np.std(log_mel) + 1e-6
    norm_mel = (log_mel - mean) / std
    return norm_mel.astype(np.float32)


def load_dataset(metadata_path, fbank):
    """Load and transform audio files into Mel-spectrogram tensors."""
    with open(metadata_path, 'r') as f:
        meta = json.load(f)

    dataset = {"train": ([], []), "val": ([], []), "test": ([], [])}

    print(f"Loading and transforming {len(meta['samples'])} audio files into 128 Mel-spectrograms...")
    for item in meta["samples"]:
        split = item["split"]
        label = item["class_id"]
        rel_path = item["path"]
        abs_path = os.path.join(DATA_DIR, rel_path)

        with wave.open(abs_path, 'rb') as wf:
            n_frames = wf.getnframes()
            audio_bytes = wf.readframes(n_frames)
            audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0

        mel = compute_mel_spectrogram(audio, fbank)
        dataset[split][0].append(mel)
        dataset[split][1].append(label)

    for split in dataset:
        X = np.stack(dataset[split][0])  # (N, 128, Time)
        y = np.array(dataset[split][1], dtype=np.int64)
        dataset[split] = (X, y)
        print(f"Split [{split}]: X shape = {X.shape}, y shape = {y.shape}")

    return dataset


def train_and_export():
    meta_path = os.path.join(DATA_DIR, "dataset_metadata.json")
    if not os.path.exists(meta_path):
        print(f"Error: Dataset metadata not found at {meta_path}.")
        print("Please run `python generate_synthetic_data.py` first.")
        sys.exit(1)

    fbank = create_mel_filterbank(sr=SAMPLE_RATE, n_fft=N_FFT, n_mels=N_MELS, f_min=50, f_max=2000)
    dataset = load_dataset(meta_path, fbank)

    train_X, train_y = dataset["train"]
    val_X, val_y = dataset["val"]
    test_X, test_y = dataset["test"]

    os.makedirs(MODEL_EXPORT_DIR, exist_ok=True)
    onnx_path = os.path.join(MODEL_EXPORT_DIR, "secondear_tcn.onnx")
    meta_file = os.path.join(MODEL_EXPORT_DIR, "model_metadata.json")

    # Try PyTorch Training
    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
        from torch.utils.data import TensorDataset, DataLoader
        from sklearn.metrics import classification_report, confusion_matrix

        print("\nUsing PyTorch Engine for CNN+TCN Training...")

        class TemporalBlock(nn.Module):
            def __init__(self, in_channels, out_channels, kernel_size=3, dilation=1, dropout=0.2):
                super().__init__()
                padding = (kernel_size - 1) * dilation // 2
                self.conv1 = nn.Conv1d(in_channels, out_channels, kernel_size, padding=padding, dilation=dilation)
                self.bn1 = nn.BatchNorm1d(out_channels)
                self.relu1 = nn.ReLU()
                self.drop1 = nn.Dropout(dropout)
                self.conv2 = nn.Conv1d(out_channels, out_channels, kernel_size, padding=padding, dilation=dilation)
                self.bn2 = nn.BatchNorm1d(out_channels)
                self.relu2 = nn.ReLU()
                self.drop2 = nn.Dropout(dropout)
                self.downsample = nn.Conv1d(in_channels, out_channels, 1) if in_channels != out_channels else None

            def forward(self, x):
                res = x if self.downsample is None else self.downsample(x)
                out = self.drop1(self.relu1(self.bn1(self.conv1(x))))
                out = self.drop2(self.relu2(self.bn2(self.conv2(out))))
                return torch.relu(out + res)

        class SecondEarTCN(nn.Module):
            def __init__(self, num_classes=5):
                super().__init__()
                self.cnn = nn.Sequential(
                    nn.Conv2d(1, 16, kernel_size=3, padding=1),
                    nn.BatchNorm2d(16),
                    nn.ReLU(),
                    nn.MaxPool2d(2, 2),
                    nn.Conv2d(16, 32, kernel_size=3, padding=1),
                    nn.BatchNorm2d(32),
                    nn.ReLU(),
                    nn.MaxPool2d(2, 2),
                    nn.Conv2d(32, 64, kernel_size=3, padding=1),
                    nn.BatchNorm2d(64),
                    nn.ReLU(),
                    nn.MaxPool2d((4, 1)),
                )
                self.proj = nn.Conv1d(64 * 8, 64, kernel_size=1)
                self.tcn1 = TemporalBlock(64, 64, kernel_size=3, dilation=1)
                self.tcn2 = TemporalBlock(64, 64, kernel_size=3, dilation=2)
                self.tcn3 = TemporalBlock(64, 64, kernel_size=3, dilation=4)
                self.att = nn.Sequential(
                    nn.Linear(64, 32),
                    nn.Tanh(),
                    nn.Linear(32, 1)
                )
                self.classifier = nn.Sequential(
                    nn.Linear(64, 32),
                    nn.ReLU(),
                    nn.Dropout(0.25),
                    nn.Linear(32, num_classes)
                )

            def forward(self, x):
                if x.dim() == 3:
                    x = x.unsqueeze(1)
                feat = self.cnn(x)
                B, C, F, T = feat.shape
                feat_1d = feat.view(B, C * F, T)
                h = self.proj(feat_1d)
                h = self.tcn1(h)
                h = self.tcn2(h)
                h = self.tcn3(h)
                h_trans = h.transpose(1, 2)
                att_weights = torch.softmax(self.att(h_trans), dim=1)
                ctx = torch.sum(h_trans * att_weights, dim=1)
                logits = self.classifier(ctx)
                return logits

        train_loader = DataLoader(
            TensorDataset(torch.tensor(train_X, dtype=torch.float32), torch.tensor(train_y, dtype=torch.long)),
            batch_size=32, shuffle=True
        )
        val_loader = DataLoader(
            TensorDataset(torch.tensor(val_X, dtype=torch.float32), torch.tensor(val_y, dtype=torch.long)),
            batch_size=32, shuffle=False
        )
        test_loader = DataLoader(
            TensorDataset(torch.tensor(test_X, dtype=torch.float32), torch.tensor(test_y, dtype=torch.long)),
            batch_size=32, shuffle=False
        )

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = SecondEarTCN(num_classes=len(CLASSES)).to(device)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)

        epochs = 12
        print("\n--- Training 1D-CNN + TCN ---")
        for epoch in range(1, epochs + 1):
            model.train()
            total_loss, correct = 0.0, 0
            for bx, by in train_loader:
                bx, by = bx.to(device), by.to(device)
                optimizer.zero_grad()
                out = model(bx)
                loss = criterion(out, by)
                loss.backward()
                optimizer.step()
                total_loss += loss.item() * len(by)
                correct += (out.argmax(dim=1) == by).sum().item()

            train_acc = correct / len(train_X)

            model.eval()
            val_correct = 0
            with torch.no_grad():
                for bx, by in val_loader:
                    bx, by = bx.to(device), by.to(device)
                    val_correct += (model(bx).argmax(dim=1) == by).sum().item()

            val_acc = val_correct / len(val_X)
            print(f"Epoch [{epoch:02d}/{epochs}] | Train Loss: {total_loss/len(train_X):.4f} | Train Acc: {train_acc*100:.2f}% | Val Acc: {val_acc*100:.2f}%")

        # Evaluate on Test Set
        model.eval()
        all_preds, all_targets = [], []
        with torch.no_grad():
            for bx, by in test_loader:
                bx = bx.to(device)
                preds = model(bx).argmax(dim=1).cpu().numpy()
                all_preds.extend(preds)
                all_targets.extend(by.numpy())

        test_acc = float(np.mean(np.array(all_preds) == np.array(all_targets)))
        print(f"\nTest Accuracy: {test_acc*100:.2f}%")
        print("\nClassification Report (Test Set):")
        print(classification_report(all_targets, all_preds, target_names=CLASSES, digits=4))

        cm = confusion_matrix(all_targets, all_preds)
        print("Confusion Matrix:")
        print(cm)

        # Export ONNX
        dummy_input = torch.randn(1, N_MELS, train_X.shape[2], dtype=torch.float32).to(device)
        print(f"\nExporting ONNX model to: {onnx_path}")
        torch.onnx.export(
            model,
            dummy_input,
            onnx_path,
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=["spectrogram"],
            output_names=["logits"],
            dynamic_axes={"spectrogram": {0: "batch_size", 2: "time_frames"}, "logits": {0: "batch_size"}}
        )

        meta_output = {
            "model_name": "SANTFRIX SecondEar 1D-CNN + TCN",
            "version": "1.0.0",
            "classes": CLASSES,
            "input_shape": [1, N_MELS, train_X.shape[2]],
            "sample_rate": SAMPLE_RATE,
            "n_mels": N_MELS,
            "n_fft": N_FFT,
            "hop_length": HOP_LENGTH,
            "win_length": WIN_LENGTH,
            "filter_band": [50, 2000],
            "test_accuracy": test_acc,
            "confusion_matrix": cm.tolist()
        }
        with open(meta_file, "w") as f:
            json.dump(meta_output, f, indent=2)

        print(f"Model and metadata exported successfully! Model size: {os.path.getsize(onnx_path)/1024:.2f} KB")

    except Exception as e:
        print(f"PyTorch training failed or not ready ({e}). Using Scikit-Learn Spectral Neural Classifier...")
        from sklearn.neural_network import MLPClassifier
        from sklearn.metrics import classification_report, confusion_matrix

        # Feature extraction: Temporal pooling of 128 Mel bands (Mean, Max, Std, Delta)
        def extract_vector_features(X_mels):
            feats = []
            for mel in X_mels:
                mean_m = np.mean(mel, axis=1)
                max_m = np.max(mel, axis=1)
                std_m = np.std(mel, axis=1)
                diff_m = np.mean(np.diff(mel, axis=1), axis=1)
                feats.append(np.concatenate([mean_m, max_m, std_m, diff_m]))
            return np.array(feats)

        print("Extracting feature representations...")
        train_feat = extract_vector_features(train_X)
        val_feat = extract_vector_features(val_X)
        test_feat = extract_vector_features(test_X)

        clf = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=40, random_state=42)
        print("Training Multi-layer Neural Network...")
        clf.fit(train_feat, train_y)

        val_preds = clf.predict(val_feat)
        val_acc = float(np.mean(val_preds == val_y))
        print(f"Validation Accuracy: {val_acc*100:.2f}%")

        test_preds = clf.predict(test_feat)
        test_acc = float(np.mean(test_preds == test_y))
        print(f"\nTest Accuracy: {test_acc*100:.2f}%")
        print("\nClassification Report (Test Set):")
        print(classification_report(test_y, test_preds, target_names=CLASSES, digits=4))

        cm = confusion_matrix(test_y, test_preds)
        print("Confusion Matrix:")
        print(cm)

        meta_output = {
            "model_name": "SANTFRIX SecondEar Neural Classifier",
            "version": "1.0.0",
            "classes": CLASSES,
            "sample_rate": SAMPLE_RATE,
            "n_mels": N_MELS,
            "test_accuracy": test_acc,
            "confusion_matrix": cm.tolist()
        }
        with open(meta_file, "w") as f:
            json.dump(meta_output, f, indent=2)


if __name__ == "__main__":
    train_and_export()
