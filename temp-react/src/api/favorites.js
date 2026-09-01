import { apiFetch } from "./client";

// 찜한 매장 목록
// GET /api/favorites
// response: [{ id, name, address }]  (id는 매장 id)
export function fetchFavorites() {
  return apiFetch("/api/favorites");
}

// 매장 찜하기
// POST /api/favorites
// body: { storeId }
export function addFavorite(storeId) {
  return apiFetch("/api/favorites", { method: "POST", body: { storeId } });
}

// 찜 해제
// DELETE /api/favorites/:storeId
export function removeFavorite(storeId) {
  return apiFetch(`/api/favorites/${storeId}`, { method: "DELETE" });
}
