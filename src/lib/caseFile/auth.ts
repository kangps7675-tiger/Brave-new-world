import { authorizeCronRequest, unauthorizedResponse } from "@/lib/auth/cronAuth";

const CASE_EDITOR_KEYS = ["CASE_EDITOR_SECRET"] as const;

/** 사건 파일 쓰기 API — Authorization: Bearer <CASE_EDITOR_SECRET> */
export function authorizeCaseEditor(request: Request): boolean {
  return authorizeCronRequest(request, CASE_EDITOR_KEYS);
}

export { unauthorizedResponse };
