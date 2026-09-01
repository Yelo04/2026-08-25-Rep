import { adminApiFetch, setAdminToken } from "./adminClient";

// MVP 임시 조치: 백엔드의 관리자 로그인 API가 아직 없을 때,
// .env의 REACT_APP_ADMIN_PASSWORD를 설정해두면 그 값과 프론트에서 직접 비교해 로그인합니다.
// 백엔드가 POST /api/admin/login을 구현하면 이 값을 지우세요 — 그러면 자동으로 서버 로그인으로 전환됩니다.
const LOCAL_ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD;

// 관리자 로그인 (간단한 비밀번호 로그인)
// POST /api/admin/login
// body: { password }
// response: { token }
export async function adminLogin(password) {
  if (LOCAL_ADMIN_PASSWORD) {
    if (password !== LOCAL_ADMIN_PASSWORD) {
      throw new Error("비밀번호가 올바르지 않습니다.");
    }
    const localToken = "local-admin-token";
    setAdminToken(localToken);
    return { token: localToken };
  }

  const data = await adminApiFetch("/api/admin/login", { method: "POST", body: { password } });
  if (data && data.token) setAdminToken(data.token);
  return data;
}

export function adminLogout() {
  setAdminToken(null);
}

// 대기 중인 소속 인증 신청 목록
// GET /api/admin/verifications?status=pending
// response: [{ id, name, org, documentUrl, submittedAt }]
//   documentUrl(선택): 첨부 서류 다운로드/미리보기 링크
export function fetchPendingVerifications() {
  return adminApiFetch("/api/admin/verifications?status=pending");
}

// 인증 신청 승인/반려
// POST /api/admin/verifications/:verificationId/respond
// body: { decision: "approve" | "reject" }
// 승인 시 해당 사용자의 verified를 true로, 반려 시 status를 "rejected"로 바꿔주세요.
export function respondToVerification(verificationId, decision) {
  return adminApiFetch(`/api/admin/verifications/${verificationId}/respond`, {
    method: "POST",
    body: { decision },
  });
}
