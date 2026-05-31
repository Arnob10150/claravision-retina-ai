from io import BytesIO

import numpy as np
from PIL import Image


def load_rgb(image_bytes: bytes) -> np.ndarray:
    image = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224))
    return np.asarray(image).astype("float32") / 255.0


def quality_score(rgb: np.ndarray) -> float:
    gray = rgb.mean(axis=2)
    contrast = float(gray.std())
    illumination = float(1.0 - abs(gray.mean() - 0.5))
    return max(0.0, min(1.0, 0.55 * contrast * 3.0 + 0.45 * illumination))
