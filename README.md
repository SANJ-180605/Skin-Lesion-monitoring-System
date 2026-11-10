# SkinGuard AI: Confidence-Based Skin Lesion Classification and Monitoring System

An accessible, intelligent skin spot checking and monitoring application designed for everyday people and families, backed by rigorous research deep-learning models (Standard U-Net segmentation, 3-class EfficientNetB0 classification with raw softmax probabilities, and classical computer-vision longitudinal spot tracking).

SkinGuard AI bridges the gap between sophisticated dermoscopic AI research and everyday personal health: translating complex metrics into clear, reassuring, plain-English insights, an ABCDE melanoma guide, and actionable summaries designed to share directly with your dermatologist.

---

## 1. Key Features for Everyday Users

- **Check a Skin Spot:** Take or upload a photo of a mole or skin spot. The system segments the spot boundary and compares it against three patterns: **Cancerous**, **Precancerous / in situ**, and **Benign**.
- **Plain-English Explanations:** Explains what the AI saw, how confident it is, and what to watch out for.
- **Track Changes Over Time:** Upload a photo from a previous month and a photo from today. The system aligns them, highlights newly expanded or changed areas in red, and measures spot size and border regularities.
- **ABCDE Educational Guide:** Interactive reference explaining Asymmetry, Border irregularity, Color variation, Diameter ($>6\text{mm}$), and Evolution.
- **Family Profiles:** Save checks under individual profiles for family members or track your own spots over time.
- **Doctor Discussion Summaries (PDF):** Download a one-page summary with photos, outlines, and key questions to bring to your next doctor or dermatologist visit.
- **1-Click Sample Demos:** Built-in demo sample photos allow immediate hands-on testing without having to look up or photograph dermoscopy images.

---

## 2. Prerequisites

- **Operating System:** Windows 10/11, macOS, or Linux
- **Python:** Python 3.10, 3.11, or 3.12
- **Node.js:** Node.js v18+ and npm (or pnpm/yarn)
- **MongoDB Atlas:** MongoDB Atlas connection string (or local MongoDB daemon)
- **Visual C++ Runtime (Windows only):** Standard Visual C++ 2015–2022 Redistributable DLLs (provided in `backend/dlls/` for native TensorFlow execution)

---

## 3. System Architecture & Model Specifications

This platform integrates the exact models and methodologies developed in the three project research notebooks:

### Model 1: U-Net Skin Lesion Segmentation
- **Origin:** `Model1_Optimized_UNet_Skin_Lesion_Segmentation.ipynb`
- **Architecture:** Standard U-Net with 4-stage convolutional encoder/decoder and skip connections.
- **Input Dimensions:** 256 × 256 × 3 RGB.
- **Normalization:** Normalized to `[0.0, 1.0]` (division by 255.0).
- **Loss & Metrics:** Binary Cross-Entropy + Dice Loss (`bce_dice_loss`), evaluated with `dice_coefficient`.
- **Thresholding:** 0.5 binary threshold for foreground lesion boundary extraction.
- **Checkpoint Locations:**
  - Selected Best: `backend/saved_models/unet/model1_selected_best.keras`
  - Baseline BCE+Dice: `backend/saved_models/unet/baseline_bce_dice_best.keras`

### Model 2: Three-Class EfficientNetB0 Classification
- **Origin:** `Model2_HAM10000_EfficientNetB0_Classification.ipynb`
- **Architecture:** Pretrained EfficientNetB0 backbone (`include_top=False`) + Global Average Pooling + Dropout(0.3) + Dense(3, activation='softmax').
- **Input Dimensions:** 224 × 224 × 3 RGB.
- **Normalization:** Raw `[0.0, 255.0]` range. **No division by 255**, preserving Keras internal rescaling.
- **Label Mapping (HAM10000 -> 3-Class):**
  | Original HAM10000 Labels | 3-Class Diagnostic Category | Class Index |
  | :--- | :--- | :---: |
  | `mel` (Melanoma), `bcc` (Basal cell carcinoma) | **Cancerous** | `0` |
  | `akiec` (Actinic keratoses / Bowen's disease) | **Precancerous / in situ** | `1` |
  | `bkl` (Keratosis), `df` (Dermatofibroma), `nv` (Nevus), `vasc` (Vascular) | **Benign** | `2` |
- **Confidence Output:**
  $$\text{Confidence Score} = \max(P_{\text{softmax}}) \times 100$$
  Raw output softmax vector is preserved without synthetic boosting or arbitrary calibration.
- **Checkpoint Location:**
  - `backend/saved_models/efficientnet/best_three_class_model.keras`

### Model 3: Longitudinal Lesion Co-Registration & Monitoring
- **Origin:** `Model3_Skin_Lesion_Monitoring_One_Hour_Demo.ipynb`
- **Methodology:** Classical computer vision pipeline (NOT a deep learning model).
- **Image Preprocessing:** EXIF orientation correction, Lanczos aspect-preserving downsampling to max dimension 768 px.
- **Image Co-Registration:** ORB feature extraction (1,500 keypoints) + Lowe's ratio test matching + RANSAC homography estimation (`cv2.findHomography`, threshold 5.0).
- **Fallback Rule:** If inlier matches < 8, falls back to resize-only alignment and flags registration as **unconfirmed**.
- **Lesion Masking:** GrabCut algorithm initialized with central seed rect (`[12%, 12%, 76%, 76%]`), followed by largest connected component selection and morphological closing (5×5 kernel). Fallback to LAB L-channel Otsu thresholding if GrabCut fails.
- **Morphometric Features:** Area (px), Perimeter (px), Bounding box width/height (px), Circularity ($4\pi \cdot \text{Area} / \text{Perimeter}^2$).
- **Percentage Change:**
  $$\text{Percentage Change} = \left(\frac{\text{Follow-up Value} - \text{Baseline Value}}{\text{Baseline Value}}\right) \times 100$$
- **Color-Coded Difference Map:** Yellow (Stable overlap), Red (Expansion/New area), Blue (Regression).

---

## 4. Project Directory Structure

```text
skin_lesion_analyzer/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point, lifespan, CORS & static mounts
│   │   ├── config.py                # Pydantic Settings & environment variables
│   │   ├── database.py              # MongoDB Atlas / Motor client & in-memory fallback
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   ├── routes/
│   │   │   ├── auth.py              # JWT authentication endpoints
│   │   │   ├── patients.py          # Patient cohort CRUD APIs
│   │   │   ├── analysis.py          # U-Net + EfficientNet inference endpoints
│   │   │   ├── monitoring.py        # Longitudinal co-registration & monitoring APIs
│   │   │   ├── history.py           # Historical sessions & dashboard metrics
│   │   │   └── reports.py           # Downloadable PDF report endpoints
│   │   ├── services/
│   │   │   ├── unet_service.py      # Standard U-Net inference & overlay generation
│   │   │   ├── classification_service.py # EfficientNetB0 3-class prediction service
│   │   │   ├── monitoring_service.py     # Classical CV registration & GrabCut pipeline
│   │   │   ├── image_service.py     # Image saving, difference map, and overlay utils
│   │   │   └── report_service.py    # ReportLab PDF generator
│   │   ├── ml/
│   │   │   ├── model_loader.py      # Safe checkpoint loading & custom loss objects
│   │   │   ├── preprocessing.py     # Separate preprocessing for Model 1, 2, and 3
│   │   │   └── label_mapping.py     # Exact HAM10000 3-class mappings
│   │   └── utils/
│   │       ├── security.py          # Password hashing & JWT helpers
│   │       └── validators.py        # MIME & file upload security validators
│   ├── saved_models/
│   │   ├── unet/                    # U-Net .keras checkpoints
│   │   └── efficientnet/            # EfficientNetB0 .keras checkpoints
│   ├── dlls/                        # Windows Visual C++ runtime DLLs for TensorFlow
│   ├── tools/
│   │   ├── init_models.py           # Checkpoint verification & architecture export
│   │   └── test_backend.py          # End-to-end backend test suite
│   ├── uploads/                     # Uploaded dermoscopy images and generated overlays
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/              # UI widgets (Uploader, Viewer, Cards, Charts, Tables)
│   │   ├── pages/                   # Landing, Dashboard, Analysis, Monitoring, Patients, History
│   │   ├── services/api.js          # Axios API client
│   │   ├── context/AuthContext.jsx  # Authentication state provider
│   │   ├── layouts/DashboardLayout.jsx # Responsive sidebar layout
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

---

## 5. Backend Installation & Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment (optional but recommended):**
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to configure your MongoDB Atlas connection:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   DATABASE_NAME=skin_lesion_db
   JWT_SECRET=your-secure-jwt-secret-key-change-in-production
   ```
   *(Note: If no MongoDB Atlas URI is supplied, the application automatically uses an in-memory persistent fallback store, allowing testing without database setup.)*

---

## 6. How to Place the Model Checkpoints

Place your trained `.keras` checkpoint files directly into their respective folders:

1. **U-Net Segmentation Model:**
   Copy `baseline_bce_dice_best.keras` or `model1_selected_best.keras` from your Model 1 notebook artifacts into:
   ```text
   backend/saved_models/unet/model1_selected_best.keras
   ```

2. **Three-Class EfficientNetB0 Model:**
   Copy `best_three_class_model.keras` from your Model 2 notebook artifacts into:
   ```text
   backend/saved_models/efficientnet/best_three_class_model.keras
   ```

3. **Verify or Generate Test Checkpoints:**
   To verify existing checkpoints or initialize the exact model architectures for immediate local testing, run:
   ```bash
   python tools/init_models.py
   ```

---

## 7. How to Run the FastAPI Backend

Run the server using Uvicorn:

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive API Docs (Swagger):** `http://localhost:8000/docs`
- **System Health Check:** `http://localhost:8000/api/health`
- **Model Checkpoint Status:** `http://localhost:8000/api/models/status`

---

## 8. Frontend Installation & Execution

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173`.
   Requests to `/api` and `/uploads` are automatically proxied to `http://localhost:8000`.

5. **Production Build:**
   ```bash
   npm run build
   ```

---

## 9. How to Test Each Model

Run the automated end-to-end test suite to test all three pipelines:

```bash
cd backend
python tools/test_backend.py
```

This script verifies:
1. Model loading & custom loss serialization (`dice_coefficient`, `bce_dice_loss`).
2. Standard U-Net segmentation, binary mask generation, and overlay rendering.
3. EfficientNetB0 three-class prediction and softmax confidence vector output.
4. Classical CV image co-registration (ORB + RANSAC homography) and difference mapping.
5. Patient record creation and retrieval.
6. High-resolution PDF clinical report generation.

---

## 10. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new medical researcher |
| `POST` | `/api/auth/login` | Authenticate and retrieve JWT bearer token |
| `GET` | `/api/auth/me` | Fetch authenticated user profile |
| `POST` | `/api/patients` | Create a new patient record (`PAT-XXXXXX`) |
| `GET` | `/api/patients` | List patients with optional search query |
| `GET` | `/api/patients/{id}` | Retrieve patient profile, analyses & monitoring history |
| `PUT` | `/api/patients/{id}` | Update patient demographics and clinical notes |
| `DELETE`| `/api/patients/{id}` | Delete patient and all associated records |
| `POST` | `/api/analysis/predict` | Multipart upload: runs U-Net segmentation + 3-class classification |
| `GET` | `/api/analysis/{id}` | Retrieve saved analysis result by ID |
| `GET` | `/api/analysis/patient/{id}` | List all analyses for a specific patient |
| `PUT` | `/api/analysis/{id}/link` | Link an analysis to an existing patient |
| `POST` | `/api/monitoring/compare` | Multipart upload: compares baseline & follow-up lesion images |
| `GET` | `/api/monitoring/{id}` | Retrieve monitoring session by ID |
| `GET` | `/api/monitoring/patient/{id}` | List monitoring sessions for a patient |
| `GET` | `/api/history/dashboard` | Aggregated metrics & 3-class distribution |
| `GET` | `/api/reports/analysis/{id}` | Download PDF clinical report for analysis |
| `GET` | `/api/reports/monitoring/{id}` | Download PDF report for monitoring session |
| `GET` | `/api/health` | System health check & database status |
| `GET` | `/api/models/status` | ML model checkpoint readiness & metadata |

---

## 11. Production Deployment Instructions

### Docker / Containerized Deployment
A multi-container setup running FastAPI + Uvicorn behind NGINX:

1. **Environment Variables:** Set live MongoDB Atlas connection string (`MONGODB_URI`), strong `JWT_SECRET`, and production frontend domain in `CORS_ORIGINS`.
2. **Reverse Proxy:** Terminate SSL/TLS with NGINX or Caddy. Proxy `/api` to port 8000 and serve the frontend static build from `/var/www/dist`.
3. **Storage Strategy:** Store uploaded dermoscopic images in MongoDB GridFS or connect an S3-compatible bucket by updating `app/database.py`.

---

## 12. Ethical Considerations & Medical Disclaimer

> **RESEARCH PROTOTYPE ONLY:** This web application is developed strictly for academic and clinical research purposes. Model predictions, softmax confidence scores, and automated morphometric measurements do not constitute a confirmed clinical medical diagnosis. All dermoscopic findings must be interpreted by a certified dermatologist or licensed medical pathologist in conjunction with histopathological biopsy evaluation.

