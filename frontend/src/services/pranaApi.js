import { supabase, supabaseConfigured } from "../lib/supabase";
import { enqueueHealthData, enqueueMedicalReport } from "./offlineQueue";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (supabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API_BASE + path, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || "PRANA API request failed");
  return body;
}

export const pranaApi = {
  searchPatients: (query = "") =>
    request("/patients" + (query ? "?query=" + encodeURIComponent(query) : "")),
  createPatient: (patient) =>
    request("/patients", { method: "POST", body: JSON.stringify(patient) }),
  saveHealthData: async (data) => {
    try {
      return await request("/screenings/health-data", { method: "POST", body: JSON.stringify(data) });
    } catch (error) {
      if (!navigator.onLine) {
        await enqueueHealthData(data);
        return { status: "queued_offline", queued: true, message: "Health data saved locally and queued for synchronization." };
      }
      throw error;
    }
  },
  assess: (data) =>
    request("/screenings/assess", { method: "POST", body: JSON.stringify(data) }),
  createReferral: (data) =>
    request("/referrals", { method: "POST", body: JSON.stringify(data) }),
  listReferrals: () => request("/referrals"),
  updateReferral: (referralId, data) => request("/referrals/" + encodeURIComponent(referralId), { method: "PATCH", body: JSON.stringify(data) }),
  screeningHistory: (patientId) => request("/screenings/history/" + encodeURIComponent(patientId)),
  listUsers: () => request("/users"),
  updateUserRole: (userId, role) => request("/users/" + encodeURIComponent(userId) + "?role=" + encodeURIComponent(role), { method: "PATCH" }),
  verifyReport: (reportId, data) => request("/ocr/reports/" + encodeURIComponent(reportId) + "/verify", { method: "PATCH", body: JSON.stringify(data) }),
  applyVerifiedReport: (reportId) => request("/ocr/reports/" + encodeURIComponent(reportId) + "/apply-to-health-data", { method: "POST" }),
  medicalReports: (patientId) => request("/ocr/reports/" + encodeURIComponent(patientId)),
  extractReport: async (patientId, file) => {
    const form = new FormData();
    form.append("patient_id", patientId);
    form.append("file", file);
    try {
      return await request("/ocr/extract", { method: "POST", body: form });
    } catch (error) {
      if (!navigator.onLine) {
        await enqueueMedicalReport(patientId, file);
        return { status: "queued_offline", queued: true, patient_id: patientId, filename: file.name, reason: "Medical report saved locally and queued for upload when connectivity returns." };
      }
      throw error;
    }
  },
};
