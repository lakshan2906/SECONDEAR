# SecondEar™ 🫁🩺
### AI-Assisted Acoustic Biomarker Screening for Cardiopulmonary Health
**VMEDITHON 3.0 — Bio × Engineering Track | Sri Sairam Engineering College**

> [!CAUTION]
> **CLINICAL PROTOTYPE DISCLAIMER**  
> *SecondEar™ is an experimental prototype Clinical Decision Support System (CDSS) developed for demonstration and research screening purposes during VMEDITHON 3.0. It is **NOT** a certified medical diagnostic device under CDSCO, FDA, or CE MDR guidelines. All acoustic biomarker screening outputs must be validated with clinical diagnostic tests (e.g. Chest X-Ray, Spirometry, Echocardiography) by registered medical practitioners.*

---

## 📌 1. Project Overview & Problem Statement

Over **70% of rural Primary Health Centres (PHCs)** in developing nations lack resident pediatricians and cardiologists, leaving auscultation to frontline nurses and ASHA workers. Manual acoustic auscultation suffers from **>40% inter-observer disagreement**, especially in noisy ambient clinic environments. Consequently, treatable conditions like pediatric pneumonia cause over **740,000 preventable deaths annually** (WHO).

A Commercial digital smart stethoscopes (e.g., Eko CORE, 3M Littmann) cost **₹25,000–₹40,000+** and require active high-speed cloud internet that routinely fails in remote rural health centers. Moreover , a normal stethoscope can capture these sounds, but interpreting them accurately often depends on experience and expertise. This can lead to delayed screening and referral, especially when early signs of respiratory or cardiopulmonary abnormalities are difficult to recognize.


**SecondEar™ transforms standard $100 smartphones and low-cost 3D-printed acoustic couplers into an intelligent, 100% offline cardiopulmonary screening tool.**

---

## ⚡ 2. Core Features & Innovations

1. **Multi-Biomarker Cardiopulmonary Screening:**
   - **Respiratory Adventitious Sounds:** Wheeze (Bronchospasm/Asthma), Fine/Coarse Crackles (Pneumonia/Alveolar fluid), Inspiratory Stridor (Upper Airway Obstruction).
   - **Cardiac Acoustics:** Normal S1/S2 lub-dub rhythms and Systolic/Diastolic Murmurs (Valvular disease screening).
2. **Real Signal Processing (DSP):**
   - 4th-Order Butterworth Bandpass Filter (**50 Hz – 2,000 Hz**) to strip low-frequency body motion artifacts and high-frequency hiss.
   - Adaptive spectral noise floor suppression.
   - 128 Mel-frequency filterbank spectrogram generation (**25ms window, 10ms hop**).
3. **On-Device Edge Neural Network (1D-CNN + TCN):**
   - Temporal Convolutional Network with dilated residual receptive fields to capture both breath cycles (~2.0s) and cardiac cycles (~0.8s).
   - Runs client-side in browser/mobile via **ONNX Runtime Web (WebAssembly)** with zero cloud network calls and **<100ms latency**.
4. **Explainable AI (XAI) Spectrogram Attention Heatmap:**
   - Grad-CAM / Saliency overlay dynamically rendered on the 128-Mel canvas.
   - Highlights the exact time-frequency bounding box where the acoustic anomaly occurred (e.g. `2.1s – 2.8s | 380–850 Hz`).
5. **1-Click Clinical Referral Slip (PDF Export):**
   - Instant client-side PDF generation via `jsPDF` containing patient demographics, clinic vitals (SpO2, HR, RR), biomarker confidence breakdown, embedded spectrogram screenshot, and recommended specialist handoff protocols.

---

## 🏗️ 3. System Architecture & End-to-End Pipeline

```
① AUDIO ACQUISITION ➔ ② DSP PREPROCESSING ➔ ③ FEATURE EXTRACTION ➔ ④ EDGE NEURAL MODEL ➔ ⑤ EXPLAINABLE OUTPUT
 • Phone Mic / Coupler • Bandpass (50–2000Hz) • 128 Mel Spectrogram      • Quantized TCN / CNN   • Highlighted Heatmap
 • 16–44.1 kHz WAV     • Adaptive Noise Filter • 25ms Window, 10ms Hop    • Local ONNX (<100ms)   • 1-Click Referral PDF
```

---

## 📊 4. Data Strategy & Synthetic Dataset Caveat

### **Synthetic Dataset Generation (`generate_synthetic_data.py`)**
Due to sandbox environment constraints during hackathon prototyping, the model is trained on **2,500 mathematically synthesized audio recordings** (16 kHz mono WAV, 4.0 seconds duration, 500 samples per class):
- **Normal:** Pink/brown noise shaped to inspiration/expiration envelopes + subtle S1/S2 heart valve thumps.
- **Wheeze:** Continuous musical harmonic tones ($200–800\text{ Hz}$) with vibrato modulation active during expiration.
- **Crackle:** Discontinuous explosive biphasic click bursts ($5–20\text{ ms}$, $150–1000\text{ Hz}$) clustered in late inspiration.
- **Stridor:** High-pitched harsh monophonic continuous tone ($600–1400\text{ Hz}$) concentrated strictly on inspiration.
- **Murmur:** Turbulent broadband swooshing energy ($120–600\text{ Hz}$) shaped with diamond envelopes between S1 and S2 heart beats.

*Strict 80/10/10 train/val/test split with zero patient-level data leakage.*

### **How to Retrain on Clinical Benchmark Datasets**
For production clinical deployment, replace the synthetic audio directory with the official clinical open datasets:
1. **ICBHI 2017 Respiratory Sound Database:** Place `.wav` and `.txt` respiratory cycle annotation files into `data/icbhi_dataset/`.
2. **PhysioNet/Computing in Cardiology (CinC) Heart Sound Challenge:** Place `.wav` PCG recordings into `data/physionet_dataset/`.
3. Run `python train_model.py --dataset clinical` to produce the clinical-grade ONNX model weights.

---

## 🚀 5. How to Run Locally

### **Prerequisites**
- Node.js (v18+)
- Python (v3.10+)

### **Step 1: Install Dependencies**
```bash
npm install
pip install numpy scipy scikit-learn soundfile torch onnx
```

### **Step 2: Generate Dataset & Train Model**
```bash
python generate_synthetic_data.py
python train_model.py
```

### **Step 3: Launch Mobile Web Application**
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 👥 6. Team (Sri Sairam Engineering College)
- **LAKSHAN M (Lead):** AI/ML & Audio Signal Processing Architecture
- **NAVEEN M J:** Embedded Hardware & Sensor Interfacing
- **MYTHILI R:** Full-Stack & Edge Mobile App Developer
- **RAGHAVI R:** Clinical Research & UI/UX Design

*VMEDITHON 3.0 • VIT Chennai • September 15–16, 2026*
