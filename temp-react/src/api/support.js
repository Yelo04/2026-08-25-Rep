import { apiFetch } from "./client";

// 1:1 문의 등록
// POST /api/support/inquiries
// body: { message: string }
export function submitInquiry(message) {
  return apiFetch("/api/support/inquiries", { method: "POST", body: { message } });
}
