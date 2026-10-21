import client from "./client";

export function listMissions({ page, pageSize, q, domain, city, workMode }, config = {}) {
  return client.get("/missions", {
    ...config,
    params: {
      page,
      page_size: pageSize,
      q: q || undefined,
      domain: domain || undefined,
      city: city || undefined,
      work_mode: workMode || undefined,
    },
  });
}

export function getMission(id) {
  return client.get(`/missions/${id}`);
}

export function getMyMissions() {
  return client.get("/missions/mine");
}

export function createMission(payload) {
  return client.post("/missions", payload);
}

export function updateMission(id, payload) {
  return client.put(`/missions/${id}`, payload);
}

export function setMissionVisibility(id, visible) {
  return client.post(`/missions/${id}/visibility`, null, { params: { visible } });
}

export function deleteMission(id) {
  return client.delete(`/missions/${id}`);
}

export function getMissionMatches(id) {
  return client.get(`/missions/${id}/matches`);
}
