import { apiFetch, setAuthToken } from "./client";

// 카카오 개발자 콘솔에서 발급받은 REST API 키와, 그곳에 등록해둔 리다이렉트 URI.
// .env에 값을 채우면 "카카오 로그인" 버튼이 실제 카카오 인가 화면으로 이동합니다.
const KAKAO_CLIENT_ID = process.env.REACT_APP_KAKAO_CLIENT_ID;
const KAKAO_REDIRECT_URI = process.env.REACT_APP_KAKAO_REDIRECT_URI || window.location.origin;

// 카카오 로그인 인가 화면 URL을 만듭니다. 로그인 버튼 클릭 시 이 주소로 리다이렉트하면,
// 사용자가 동의 후 우리 사이트로 "?code=..." 파라미터와 함께 돌아옵니다.
export function getKakaoAuthUrl() {
  const params = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID || "",
    redirect_uri: KAKAO_REDIRECT_URI,
    response_type: "code",
  });
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

export function isKakaoLoginConfigured() {
  return !!KAKAO_CLIENT_ID;
}

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
