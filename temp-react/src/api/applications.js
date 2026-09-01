import { apiFetch } from "./client";

// 도시락 신청
// POST /api/applications
// body: { storeId, registrationId, pickupTime }
// registrationId: 신청 대상 잉여 식품 등록건 id (StoreCard/fetchLunchbox 응답의 registrationId)
// response: { id, storeId, registrationId, storeName, pickupTime, status, createdAt }
export function applyLunchbox({ storeId, registrationId, pickupTime }) {
  return apiFetch("/api/applications", { method: "POST", body: { storeId, registrationId, pickupTime } });
}

// 내 신청 내역
// GET /api/applications/me
// response: [{ id, storeName, date, time, status }]  status: "수령완료" | "취소됨" | "수령대기" 등
export function fetchMyApplications() {
  return apiFetch("/api/applications/me");
}

// 신청 취소
// POST /api/applications/:applicationId/cancel
export function cancelApplication(applicationId) {
  return apiFetch(`/api/applications/${applicationId}/cancel`, { method: "POST" });
}
