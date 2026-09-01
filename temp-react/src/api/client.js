// ────────────────────────────────────────────────────────────────
// 공용 API 클라이언트
// 백엔드 서버 주소는 .env의 REACT_APP_API_BASE_URL 값을 사용합니다.
// 예) REACT_APP_API_BASE_URL=https://api.hankki-itda.com
// (.env.example 참고)
// ────────────────────────────────────────────────────────────────

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "";

const AUTH_TOKEN_KEY = "hankki_auth_token";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

// 서버 공통 에러 응답 형태: { message: string }
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// path: "/api/stores" 처럼 BASE_URL 뒤에 붙는 경로
// body가 FormData면 Content-Type을 자동으로 맡기고(멀티파트 업로드용), 아니면 JSON으로 보냅니다.
export async function apiFetch(path, { method = "GET", body, headers, ...rest } = {}) {
  const token = getAuthToken();
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!res.ok) {
    let message = `요청에 실패했습니다. (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.message) message = data.message;
    } catch (_) {
      // 에러 응답 본문이 JSON이 아닌 경우 기본 메시지 사용
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!text) return null;

  if (!contentType.includes("application/json")) {
    // 백엔드 서버가 아직 연결되지 않았거나(REACT_APP_API_BASE_URL 미설정) 라우트가 없는 경우
    // JSON이 아닌 응답(HTML 등)이 올 수 있습니다.
    throw new ApiError(`서버 응답을 해석할 수 없습니다. API 서버 연결(REACT_APP_API_BASE_URL)을 확인해주세요. (${path})`, res.status);
  }

  return JSON.parse(text);
}
