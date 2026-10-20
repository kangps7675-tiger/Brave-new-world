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

const MY_CASES_KEY = "bnw.myCaseIds";
const MY_CASES_MAX = 20;

/** 이 브라우저에서 연/만든 케이스 — 사건 스택의 "내 케이스". 서버 목록은 공개하지 않는다. */
export function readMyCaseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(MY_CASES_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((x): x is string => typeof x === "string" && x.length > 0)
      : [];
  } catch {
    return [];
  }
}

function rememberMyCase(id: string): void {
  try {
    const next = [id, ...readMyCaseIds().filter((x) => x !== id)].slice(0, MY_CASES_MAX);
    localStorage.setItem(MY_CASES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("bnw:my-cases"));
  } catch {
    /* private mode */
  }
}

export function writeActiveCaseId(caseId: string): void {
  if (typeof window === "undefined") return;
  try {
    const id = caseId.trim();
    if (id) rememberMyCase(id);
    if (id) sessionStorage.setItem(CASE_ID_KEY, id);
    else sessionStorage.removeItem(CASE_ID_KEY);
  } catch {
    /* private mode */
  }
}
