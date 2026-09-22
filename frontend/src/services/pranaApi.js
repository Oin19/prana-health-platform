const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const response = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
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
};
