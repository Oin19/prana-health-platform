from typing import Any

ASSESSMENT_REQUIREMENTS = {
    "diabetes": ("blood_glucose",),
    "cardiovascular": ("systolic_bp", "diastolic_bp", "bmi"),
    "hypertension": ("systolic_bp", "diastolic_bp"),
    "anaemia": ("haemoglobin",),
}

class RiskAssessmentService:
    """Integration boundary for validated disease-risk models and explanations."""

    def assess(self, patient_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
        results = {}
        for disease, required_fields in ASSESSMENT_REQUIREMENTS.items():
            missing = [field for field in required_fields if patient_data.get(field) is None]
            if missing:
                results[disease] = {
                    "status": "skipped",
                    "risk": None,
                    "explanation": None,
                    "contributing_factors": [],
                    "referral_required": False,
                    "reason": "Required data is missing",
                    "missing_fields": missing,
                }
                continue
            results[disease] = {
                "status": "not_configured",
                "risk": None,
                "explanation": None,
                "contributing_factors": [],
                "referral_required": False,
                "reason": "Validated disease-assessment service is not connected",
                "missing_fields": [],
            }
        return results