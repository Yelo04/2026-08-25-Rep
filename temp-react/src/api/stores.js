import { apiFetch } from "./client";

// 지도에 표시할 매장(제공처) 목록을 가져옵니다.
// GET /api/stores?keyword=검색어
// response: [{ id, name, address, lat, lng, hours, phone, photoUrl }]
export function fetchStores({ keyword } = {}) {
  const params = new URLSearchParams();
  if (keyword) params.set("keyword", keyword);
  const qs = params.toString();
  return apiFetch(`/api/stores${qs ? `?${qs}` : ""}`);
}

// 매장 상세 정보
// GET /api/stores/:storeId
// response: { id, name, address, lat, lng, hours, phone, photoUrl }
export function fetchStoreDetail(storeId) {
  return apiFetch(`/api/stores/${storeId}`);
}

// 특정 매장에서 지금 나눔 가능한 도시락(메뉴/알러지) 정보
// GET /api/stores/:storeId/lunchbox
// response: { registrationId, menuItems: string[], allergyItems: string[], photoUrl }
// registrationId는 이 도시락이 어떤 등록건(food-registration)인지를 나타내며,
// 신청(application) 시 함께 보내 신청자-등록건을 연결하는 데 사용합니다.
export function fetchLunchbox(storeId) {
  return apiFetch(`/api/stores/${storeId}/lunchbox`);
}

// 소속 인증을 마친 사용자가 관리하는 매장 목록 (한 계정이 여러 매장을 관리할 수 있음)
// GET /api/stores/mine
// response: [{ id, name, address, lat, lng, hours, phone, photoUrl }]
export function fetchMyStores() {
  return apiFetch("/api/stores/mine");
}
