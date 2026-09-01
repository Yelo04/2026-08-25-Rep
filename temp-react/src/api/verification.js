import { apiFetch } from "./client";

// 내 소속 인증 상태 조회
// GET /api/verifications/me
// response: { verified: boolean, org: string | null, status: "none" | "pending" | "approved" | "rejected" }
export function fetchMyVerification() {
  return apiFetch("/api/verifications/me");
}

// 소속 인증 신청 (증빙 파일은 선택, multipart/form-data)
// POST /api/verifications
// form fields: org (string), document (file, 선택)
// response: { verified, org, status }
// 참고: 심사가 필요한 서비스라면 status가 즉시 "approved"가 아니라 "pending"으로 돌아올 수 있습니다.
// 이 경우 프론트에서는 verified=false로 유지하고 "심사중" 안내를 보여주도록 화면을 조정해야 합니다.
export function submitVerification({ org, documentFile }) {
  const form = new FormData();
  form.append("org", org);
  if (documentFile) form.append("document", documentFile);
  return apiFetch("/api/verifications", { method: "POST", body: form });
}

// 인증 해제 (테스트/철회용)
// DELETE /api/verifications/me
export function cancelVerification() {
  return apiFetch("/api/verifications/me", { method: "DELETE" });
}
