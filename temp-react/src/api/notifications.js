import { apiFetch } from "./client";

// 알림 설정 조회
// GET /api/users/me/notification-settings
// response: { pickup: boolean, newListing: boolean, marketing: boolean }
export function fetchNotificationSettings() {
  return apiFetch("/api/users/me/notification-settings");
}

// 알림 설정 변경 (토글 하나를 바꿀 때마다 전체 설정 객체를 보냅니다)
// PATCH /api/users/me/notification-settings
// body: { pickup, newListing, marketing }
export function updateNotificationSettings(settings) {
  return apiFetch("/api/users/me/notification-settings", { method: "PATCH", body: settings });
}
