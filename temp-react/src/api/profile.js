import { apiFetch } from "./client";

// 내 프로필 조회
// GET /api/users/me
// response: { name, email, phone, avatarUrl }
export function fetchMyProfile() {
  return apiFetch("/api/users/me");
}

// 내 프로필 수정
// PATCH /api/users/me
// body: { name, email, phone }
// response: { name, email, phone, avatarUrl }
export function updateMyProfile({ name, email, phone }) {
  return apiFetch("/api/users/me", { method: "PATCH", body: { name, email, phone } });
}

// 프로필 사진 업로드 (multipart/form-data)
// POST /api/users/me/avatar
// form field: avatar (file)
// response: { avatarUrl }
export function uploadAvatar(file) {
  const form = new FormData();
  form.append("avatar", file);
  return apiFetch("/api/users/me/avatar", { method: "POST", body: form });
}

// 활동 통계 (마이페이지 상단 3칸)
// GET /api/users/me/stats
// response: { applicationCount, registrationCount, activeDays }
export function fetchMyStats() {
  return apiFetch("/api/users/me/stats");
}

// 회원 탈퇴
// DELETE /api/users/me
export function deleteAccount() {
  return apiFetch("/api/users/me", { method: "DELETE" });
}
