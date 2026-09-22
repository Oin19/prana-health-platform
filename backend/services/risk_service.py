from typing import Any


SUPPORTED_ASSESSMENTS = (
    "diabetes",
    "cardiovascular",
    "hypertension",
    "anaemia",
)


class RiskAssessmentService:
    """Integration boundary for validated disease-risk models/rules."""

    def assess(self, patient_data: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError(
            "Connect validated disease-assessment services/models before producing clinical risk results."
        )
