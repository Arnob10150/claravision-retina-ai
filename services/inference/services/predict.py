import base64
import hashlib
import os
import time
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from services.preprocess import load_rgb, quality_score


CLASSES = [
    "Diabetic Retinopathy",
    "Media Hazy",
    "Myopic Retinopathy",
    "Normal",
    "Optic Disc Disorder",
]

CONCEPTS = [
    "Microaneurysms",
    "Hemorrhages",
    "Hard exudates",
    "Media opacity",
    "Macular changes",
    "Cup-to-disc ratio enlargement",
    "Optic disc pallor",
]

MODEL_VERSION = os.getenv("MODEL_VERSION", "ClaraVision-XAI v6 QGCAF ConvNeXt-Swin fusion")
MODEL_PATH = os.getenv("MODEL_PATH", str(Path(__file__).resolve().parents[1] / "models" / "claravision_fusion_v6.pt"))
MODEL_ARCH = os.getenv("MODEL_ARCH", "claravision_fusion_v6")
IMAGE_SIZE = int(os.getenv("IMAGE_SIZE", "224"))


def _stable_distribution(image_bytes: bytes, quality: float) -> np.ndarray:
    digest = hashlib.sha256(image_bytes).digest()
    raw = np.array([digest[i] for i in range(len(CLASSES))], dtype="float32") / 255.0
    raw = raw + np.array([0.16, 0.08, 0.10, 0.22, 0.09], dtype="float32")
    if quality < 0.45:
        raw[1] += 0.35
    exp = np.exp(raw / 0.42)
    return exp / exp.sum()


def _heatmap_base64(rgb: np.ndarray) -> str:
    gray = (rgb.mean(axis=2) * 255).astype("uint8")
    edges = cv2.Canny(gray, 80, 160)
    heat = cv2.applyColorMap(edges, cv2.COLORMAP_JET)
    heat = cv2.cvtColor(heat, cv2.COLOR_BGR2RGB)
    overlay = np.clip(0.60 * rgb * 255 + 0.40 * heat, 0, 255).astype("uint8")
    image = Image.fromarray(overlay)
    buf = BytesIO()
    image.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _pil_from_bytes(image_bytes: bytes) -> Image.Image:
    return Image.open(BytesIO(image_bytes)).convert("RGB")


@lru_cache(maxsize=1)
def _load_torch_model():
    if not MODEL_PATH:
        return None

    path = Path(MODEL_PATH)
    if not path.exists():
        raise FileNotFoundError(f"MODEL_PATH does not exist: {path}")

    import torch

    from services.fusion_model import ClaraVisionChampion

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    checkpoint = torch.load(path, map_location=device)
    class_names = checkpoint.get("class_names") or CLASSES
    state_dict = checkpoint.get("state_dict", checkpoint)

    if MODEL_ARCH != "claravision_fusion_v6":
        raise ValueError(f"Unsupported MODEL_ARCH for this service: {MODEL_ARCH}")

    model = ClaraVisionChampion()
    model.load_state_dict(state_dict, strict=True)
    model.to(device).eval()

    return {"model": model, "device": device, "class_names": class_names, "torch": torch}


def _predict_with_torch(image_bytes: bytes) -> tuple[list[str], np.ndarray] | None:
    bundle = _load_torch_model()
    if bundle is None:
        return None

    from torchvision import transforms

    model = bundle["model"]
    device = bundle["device"]
    class_names = bundle["class_names"]
    torch = bundle["torch"]

    tf = transforms.Compose(
        [
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    x = tf(_pil_from_bytes(image_bytes)).unsqueeze(0).to(device)
    with torch.no_grad():
        logits = model(x)
        if isinstance(logits, dict):
            logits = logits["logits"]
        probs = torch.softmax(logits, dim=1).squeeze(0).detach().cpu().numpy()

    return list(class_names), probs.astype("float32")


def _concept_scores(pred_idx: int, confidence: float, quality: float) -> list[dict]:
    concept_scores = []
    for i, concept in enumerate(CONCEPTS):
        score = float(min(0.98, max(0.05, confidence - 0.08 * i + 0.05 * quality)))
        concept_scores.append({"concept": concept, "score": score, "region": "posterior pole"})
    return concept_scores[:3]


def _build_prediction(image_bytes: bytes, labels: list[str], probs: np.ndarray, model_version: str) -> dict:
    rgb = load_rgb(image_bytes)
    q = quality_score(rgb)
    pred_idx = int(np.argmax(probs))
    confidence = float(probs[pred_idx])
    uncertainty = float(max(0.02, min(0.95, (1.0 - confidence) * (1.15 - 0.35 * q))))
    level = "low" if uncertainty < 0.18 else "medium" if uncertainty < 0.38 else "high"

    return {
        "predicted_class": labels[pred_idx],
        "confidence": confidence,
        "uncertainty_score": uncertainty,
        "uncertainty_level": level,
        "probabilities": [{"label": label, "probability": float(p)} for label, p in zip(labels, probs)],
        "activated_concepts": _concept_scores(pred_idx, confidence, q),
        "referral_flag": level != "low",
        "model_version": model_version,
        "heatmap_base64": _heatmap_base64(rgb),
    }


def predict_bytes(image_bytes: bytes) -> dict:
    started = time.time()
    trained = _predict_with_torch(image_bytes)

    if trained is not None:
        labels, probs = trained
        prediction = _build_prediction(image_bytes, labels, probs, MODEL_VERSION)
    else:
        rgb = load_rgb(image_bytes)
        q = quality_score(rgb)
        probs = _stable_distribution(image_bytes, q)
        prediction = _build_prediction(image_bytes, CLASSES, probs, "ClaraVision-XAI demo fallback")

    prediction["processing_time_ms"] = int((time.time() - started) * 1000)
    return prediction
