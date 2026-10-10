/** 파일럿 — 편집 토큰·활성 사건 ID는 브라우저 세션에만 둔다. */

const TOKEN_KEY = "bnw.caseEditorToken";
const CASE_ID_KEY = "bnw.activeCaseId";

export function readCaseEditorToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(TOKEN_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function writeCaseEditorToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    const t = token.trim();
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

export function readActiveCaseId(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(CASE_ID_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function writeActiveCaseId(caseId: string): void {
  if (typeof window === "undefined") return;
  try {
    const id = caseId.trim();
    if (id) sessionStorage.setItem(CASE_ID_KEY, id);
    else sessionStorage.removeItem(CASE_ID_KEY);
  } catch {
    /* private mode */
  }
}
