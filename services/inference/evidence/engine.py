from __future__ import annotations

from typing import Any


def build_evidence(prediction: dict[str, Any]) -> dict[str, Any]:
    predicted = prediction["predicted_class"]
    concepts = prediction.get("activated_concepts", [])
    probabilities = sorted(prediction.get("probabilities", []), key=lambda x: x["probability"], reverse=True)

    supporting = []
    for concept in concepts:
        supporting.append(
            {
                "title": concept["concept"],
                "concept": concept["concept"],
                "text": f"{concept['concept']} was activated with score {concept['score']:.2f}, supporting {predicted}.",
            }
        )

    differential = []
    for alt in probabilities[1:4]:
        missing = concepts[-1]["concept"] if concepts else "class-specific evidence"
        differential.append(
            {
                "label": alt["label"],
                "probability": alt["probability"],
                "ruledOutBecause": f"Ranked lower than {predicted}; supporting evidence was weaker and {missing} did not dominate.",
            }
        )

    level = prediction["uncertainty_level"]
    if level == "low":
        uncertainty_reason = "Low uncertainty: probability mass is concentrated and the image-quality signal is acceptable."
    elif level == "medium":
        uncertainty_reason = "Medium uncertainty: differential probabilities or image quality suggest clinician review."
    else:
        uncertainty_reason = "High uncertainty: refer for specialist review before relying on the automated output."

    return {
        "supporting_reasons": supporting,
        "differential": differential,
        "uncertainty_reason": uncertainty_reason,
    }
