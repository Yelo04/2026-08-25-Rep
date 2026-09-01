import { API_BASE_URL, ApiError } from "./client";

// 관리자 전용 토큰 — 일반 사용자 토큰(hankki_auth_token)과 분리해서 저장합니다.
const ADMIN_TOKEN_KEY = "hankki_admin_token";

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

// 관리자 API 공용 fetch 래퍼 (src/api/client.js의 apiFetch와 동일한 동작, 토큰만 분리)
export async function adminApiFetch(path, { method = "GET", body, headers, ...rest } = {}) {
  const token = getAdminToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
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
    throw new ApiError(`서버 응답을 해석할 수 없습니다. API 서버 연결(REACT_APP_API_BASE_URL)을 확인해주세요. (${path})`, res.status);
  }

  return JSON.parse(text);
}
