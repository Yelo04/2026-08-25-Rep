import { apiFetch, setAuthToken } from "./client";

// 카카오 로그인 콜백에서 받은 인가 코드(code)를 백엔드로 전달합니다.
// 백엔드는 카카오 서버와 토큰을 교환/검증한 뒤, 우리 서비스 자체의 로그인 토큰을 내려줘야 합니다.
// POST /api/auth/kakao
// body: { code: string }
// response: { token: string, isNewUser: boolean }
export async function loginWithKakao(code) {
  const data = await apiFetch("/api/auth/kakao", { method: "POST", body: { code } });
  if (data && data.token) setAuthToken(data.token);
  return data;
}

export function logout() {
  setAuthToken(null);
}
