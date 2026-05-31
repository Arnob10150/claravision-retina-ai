# ClaraScope Inference Service

This FastAPI service powers ClaraScope retinal inference. It accepts fundus images, performs preprocessing, loads the bundled ClaraVision fusion checkpoint by default, and exposes the response shape needed by the web and mobile apps.

## Railway

Deploy this folder as the Railway service root:

```bash
services/inference
```

Railway will use `railway.json` or the `Procfile` start command:

```bash
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

The default model path is:

```bash
models/claravision_fusion_v6.pt
```

Set these only if you want to override the bundled checkpoint:

```bash
MODEL_PATH=/app/services/inference/models/claravision_fusion_v6.pt
MODEL_ARCH=claravision_fusion_v6
MODEL_VERSION=ClaraVision-XAI v6 QGCAF ConvNeXt-Swin fusion
```

After Railway deploys, set the frontend environment variables to the Railway URL:

```bash
VITE_INFERENCE_API_URL=https://your-railway-service.up.railway.app
EXPO_PUBLIC_INFERENCE_API_URL=https://your-railway-service.up.railway.app
```

If the checkpoint is missing, the service falls back to deterministic demo output so the API still boots, but `/health` and predictions should be treated as production-ready only when the model file is present.
