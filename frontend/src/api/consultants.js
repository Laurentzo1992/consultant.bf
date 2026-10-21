import client from "./client";

export function listConsultants({ page, pageSize, q, domain, city, minExperience }, config = {}) {
  return client.get("/consultants", {
    ...config,
    params: {
      page,
      page_size: pageSize,
      q: q || undefined,
      domain: domain || undefined,
      city: city || undefined,
      min_experience: minExperience || undefined,
    },
  });
}

export function getConsultant(id) {
  return client.get(`/consultants/${id}`);
}

export function getMyProfile() {
  return client.get("/consultants/me");
}

export function saveMyProfile(payload) {
  return client.put("/consultants/me", payload);
}

export function setMyProfileVisibility(visible) {
  return client.post("/consultants/me/visibility", null, { params: { visible } });
}

export function getMyMatchingMissions() {
  return client.get("/consultants/me/matches");
}

export function uploadMyCv(file) {
  const form = new FormData();
  form.append("file", file);
  return client.put("/consultants/me/cv", form);
}

export function deleteMyCv() {
  return client.delete("/consultants/me/cv");
}

export function downloadMyCv() {
  return client.get("/consultants/me/cv", { responseType: "blob" });
}
