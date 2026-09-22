import { supabase, supabaseConfigured } from "../lib/supabase";

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
  saveHealthData: (data) =>
    request("/screenings/health-data", { method: "POST", body: JSON.stringify(data) }),
  assess: (data) =>
    request("/screenings/assess", { method: "POST", body: JSON.stringify(data) }),
  createReferral: (data) =>
    request("/referrals", { method: "POST", body: JSON.stringify(data) }),
  listReferrals: () => request("/referrals"),
  updateReferral: (referralId, data) => request("/referrals/" + encodeURIComponent(referralId), { method: "PATCH", body: JSON.stringify(data) }),
  screeningHistory: (patientId) => request("/screenings/history/" + encodeURIComponent(patientId)),
  verifyReport: (reportId, data) => request("/ocr/reports/" + encodeURIComponent(reportId) + "/verify", { method: "PATCH", body: JSON.stringify(data) }),
  extractReport: (patientId, file) => {
    const form = new FormData();
    form.append("patient_id", patientId);
    form.append("file", file);
    return request("/ocr/extract", { method: "POST", body: form });
  },
};
