# ClaraVision Retina AI

Explainable retinal disease screening platform with a Vite web dashboard, Supabase data layer, and Railway-ready FastAPI inference service powered by ClaraVision-XAI model checkpoints.

## Project Layout

```text
.
├── src/                  # Vite/React clinical dashboard
├── public/               # Static web assets
├── supabase/             # Database schema and seed migrations
├── services/inference/   # FastAPI model inference service for Railway
├── vercel.json           # Vercel static web deployment config
└── package.json          # Web build scripts
```

## Vercel Web Deployment

Deploy the repository root to Vercel.

Required production environment variables:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_INFERENCE_API_URL=https://your-railway-inference-service.up.railway.app
```

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Railway Inference Deployment

Deploy `services/inference` as the Railway service root.

Railway will use:

```bash
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

The default model path is:

```text
services/inference/models/claravision_fusion_v6.pt
```

Model checkpoints are tracked with Git LFS because they are too large for normal GitHub blobs.

## Local Development

Web:

```bash
npm install
npm run dev
```

Inference API:

```bash
cd services/inference
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Then set:

```bash
VITE_INFERENCE_API_URL=http://127.0.0.1:8000
```

