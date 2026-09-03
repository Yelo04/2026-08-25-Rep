import { apiFetch } from "./client";

// 잉여 식품 등록 (사진 포함 → multipart/form-data)
// POST /api/food-registrations
// form fields: storeId (한 계정이 여러 매장을 관리할 수 있어 어느 매장에 등록하는지 명시),
//   menuItems[] (string, 반복), allergyItems[] (string, 반복), quantity (string), photo (file, 선택)
// response: { id, storeId, menu, quantity, date, status }
export function registerFood({ storeId, menuItems, quantity, allergyItems, photoFile }) {
  const form = new FormData();
  form.append("storeId", storeId);
  menuItems.forEach((m) => form.append("menuItems[]", m));
  allergyItems.forEach((a) => form.append("allergyItems[]", a));
  form.append("quantity", quantity);
  if (photoFile) form.append("photo", photoFile);
  return apiFetch("/api/food-registrations", { method: "POST", body: form });
}

// 내 등록 내역 (내가 관리하는 모든 매장의 등록건 전체)
// GET /api/food-registrations/me
// response: [{ id, storeId, menu, quantity, date, status, applicantCount }]
//   status: "등록됨" | "마감됨" | "수령완료"
//   applicantCount(선택): 이 등록건에 신청한 인원 수 — 내려주면 등록 내역 목록에 "신청 N건"으로 표시됩니다.
export function fetchMyRegistrations() {
  return apiFetch("/api/food-registrations/me");
}

// 특정 등록건에 신청한 사람 목록 (식품 등록자가 신청을 수락/거절하기 위해 사용)
// GET /api/food-registrations/:registrationId/applicants
// response: [{ id, applicantName, pickupTime, status }]
//   id는 application id, status: "대기중" | "수락됨" | "거절됨"
export function fetchRegistrationApplicants(registrationId) {
  return apiFetch(`/api/food-registrations/${registrationId}/applicants`);
}

// 신청 수락/거절
// POST /api/food-registrations/:registrationId/applicants/:applicationId/respond
// body: { decision: "accept" | "reject" }
export function respondToApplicant(registrationId, applicationId, decision) {
  return apiFetch(`/api/food-registrations/${registrationId}/applicants/${applicationId}/respond`, {
    method: "POST",
    body: { decision },
  });
}

// 현장 QR/코드로 수령 확인 (제공자가 수락된 신청자의 픽업을 확정할 때 사용)
// POST /api/food-registrations/:registrationId/applicants/:applicationId/verify-pickup
// body: { code } — 사용자 신청 내역 화면에 뜬 QR/코드 값
export function verifyPickup(registrationId, applicationId, code) {
  return apiFetch(`/api/food-registrations/${registrationId}/applicants/${applicationId}/verify-pickup`, {
    method: "POST",
    body: { code },
  });
}

// 등록건 상세 (수정 화면에서 기존 값을 불러올 때 사용)
// GET /api/food-registrations/:registrationId
// response: { id, storeId, menuItems, allergyItems, quantity, photoUrl }
export function fetchRegistrationDetail(registrationId) {
  return apiFetch(`/api/food-registrations/${registrationId}`);
}

// 등록한 식품 정보 수정
// PATCH /api/food-registrations/:registrationId
// body: { menuItems, allergyItems, quantity }
export function updateRegistration(registrationId, { menuItems, quantity, allergyItems }) {
  return apiFetch(`/api/food-registrations/${registrationId}`, {
    method: "PATCH",
    body: { menuItems, quantity, allergyItems },
  });
}
