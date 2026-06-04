from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path

from evidence.engine import build_evidence
from schemas import EvidenceRequest, PredictionResponse
from services.predict import MODEL_PATH, MODEL_VERSION, predict_bytes, _load_torch_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly download + load the model at startup so the first request is fast
    import asyncio
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _load_torch_model)
    yield


app = FastAPI(title="ClaraScope Inference API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/health")
def health():
    model_path = Path(MODEL_PATH)
    return {
        "status": "ok",
        "model_version": MODEL_VERSION,
        "model_path": str(model_path),
        "model_path_exists": model_path.exists(),
    }


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)):
    data = await file.read()
    prediction = predict_bytes(data)
    evidence = build_evidence(prediction)
    return {**prediction, **evidence}


@app.post("/explain")
async def explain(file: UploadFile = File(...)):
    data = await file.read()
    prediction = predict_bytes(data)
    return {
        "heatmap_base64": prediction["heatmap_base64"],
        "activated_concepts": prediction["activated_concepts"],
        "model_version": prediction["model_version"],
    }


@app.post("/evidence")
def evidence(request: EvidenceRequest):
    return build_evidence(request.model_dump())
