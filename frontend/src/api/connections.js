import client from "./client";

/** Company -> consultant: { profileId, missionId?, message }.
 *  Consultant -> mission: { missionId, message }. */
export function createConnectionRequest({ profileId, missionId, message }) {
  return client.post("/connections", {
    profile_id: profileId ?? null,
    mission_id: missionId ?? null,
    message: message || null,
  });
}

export function listMyConnectionRequests() {
  return client.get("/connections/mine");
}

export function listReceivedConnectionRequests() {
  return client.get("/connections/received");
}

export function getConnectionRequest(id) {
  return client.get(`/connections/${id}`);
}

export function getContact(requestId) {
  return client.get(`/connections/${requestId}/contact`);
}

/** The consultant's CV (PDF blob) -- company side, approved connections only. */
export function downloadConsultantCv(requestId) {
  return client.get(`/connections/${requestId}/cv`, { responseType: "blob" });
}

/** Opens a downloaded blob in a new tab (PDF viewer) instead of navigating away. */
export function openBlob(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
