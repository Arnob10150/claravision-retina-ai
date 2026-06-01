from typing import Literal

from pydantic import BaseModel, ConfigDict


class Probability(BaseModel):
    label: str
    probability: float


class ActivatedConcept(BaseModel):
    concept: str
    score: float
    region: str | None = None


class EvidenceReason(BaseModel):
    title: str
    text: str
    concept: str | None = None


class DifferentialDiagnosis(BaseModel):
    label: str
    probability: float
    ruledOutBecause: str


class EvidenceRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    predicted_class: str
    confidence: float
    uncertainty_score: float
    uncertainty_level: Literal["low", "medium", "high"]
    probabilities: list[Probability]
    activated_concepts: list[ActivatedConcept]
    referral_flag: bool
    model_version: str


class PredictionResponse(EvidenceRequest):
    supporting_reasons: list[EvidenceReason]
    differential: list[DifferentialDiagnosis]
    uncertainty_reason: str
    heatmap_base64: str
