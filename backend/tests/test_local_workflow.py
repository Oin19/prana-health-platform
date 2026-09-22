import os
import unittest

from fastapi.testclient import TestClient

# Force the explicit local-development path for this integration test.
for key in (
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "PRANA_DEMO_OCR",
    "SUPABASE_MEDICAL_REPORTS_BUCKET",
):
    os.environ.pop(key, None)

from main import app


class LocalWorkflowTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_patient_screening_report_referral_and_admin_flow(self):
        patient_response = self.client.post(
            "/api/patients",
            json={
                "name": "PRANA Demo Patient",
                "age": 34,
                "gender": "Female",
                "contact": "0000000000",
                "address": "Demo Village",
            },
        )
        self.assertEqual(patient_response.status_code, 201)
        patient = patient_response.json()
        patient_id = patient["patient_id"]

        search_response = self.client.get("/api/patients", params={"query": patient_id})
        self.assertEqual(search_response.status_code, 200)
        self.assertEqual(len(search_response.json()["patients"]), 1)

        health_response = self.client.post(
            "/api/screenings/health-data",
            json={
                "patient_id": patient_id,
                "systolic_bp": 128,
                "diastolic_bp": 82,
                "blood_glucose": 108,
                "haemoglobin": 13.2,
                "bmi": 23.7,
                "symptoms": "Demo workflow",
            },
        )
        self.assertEqual(health_response.status_code, 200)
        health_id = health_response.json()["health_data"]["id"]

        assessment_response = self.client.post(
            "/api/screenings/assess",
            json={
                "patient_id": patient_id,
                "health_data_id": health_id,
                "systolic_bp": 128,
                "diastolic_bp": 82,
                "blood_glucose": 108,
                "haemoglobin": 13.2,
                "bmi": 23.7,
                "symptoms": "Demo workflow",
            },
        )
        self.assertEqual(assessment_response.status_code, 200)
        results = assessment_response.json()["results"]
        self.assertEqual(set(results), {"diabetes", "cardiovascular", "hypertension", "anaemia"})

        ocr_response = self.client.post(
            "/api/ocr/extract",
            data={"patient_id": patient_id},
            files={"file": ("demo-report.pdf", b"demo report", "application/pdf")},
        )
        self.assertEqual(ocr_response.status_code, 200)
        report = ocr_response.json()
        self.assertTrue(report["demo"])
        report_id = report["report_id"]

        verify_response = self.client.patch(
            f"/api/ocr/reports/{report_id}/verify",
            json=report["extracted_data"],
        )
        self.assertEqual(verify_response.status_code, 200)

        apply_response = self.client.post(f"/api/ocr/reports/{report_id}/apply-to-health-data")
        self.assertEqual(apply_response.status_code, 200)
        self.assertEqual(apply_response.json()["health_data"]["source"], "ocr_verified")

        referral_response = self.client.post(
            "/api/referrals",
            json={
                "patient_id": patient_id,
                "reason": "Demo referral",
                "appointment_requested": True,
            },
        )
        self.assertEqual(referral_response.status_code, 201)

        referrals_response = self.client.get("/api/referrals")
        self.assertEqual(referrals_response.status_code, 200)
        self.assertEqual(referrals_response.json()["referrals"][0]["appointment_requested"], True)

        history_response = self.client.get(f"/api/screenings/history/{patient_id}")
        self.assertEqual(history_response.status_code, 200)
        self.assertGreaterEqual(len(history_response.json()["health_data"]), 2)
        self.assertGreaterEqual(len(history_response.json()["screenings"]), 1)

        reports_response = self.client.get(f"/api/ocr/reports/{patient_id}")
        self.assertEqual(reports_response.status_code, 200)
        self.assertEqual(reports_response.json()["reports"][0]["verified_data"], report["extracted_data"])

        users_response = self.client.get("/api/users")
        self.assertEqual(users_response.status_code, 200)
        self.assertGreaterEqual(len(users_response.json()["users"]), 4)


if __name__ == "__main__":
    unittest.main()
