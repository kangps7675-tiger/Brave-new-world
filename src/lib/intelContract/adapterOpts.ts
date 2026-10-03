import type {
  DisconfirmCandidate,
  DisconfirmLog,
} from "@/lib/intelContract/disconfirmPass";

/** 모든 어댑터가 공유하는 반증 입력 — corpus 없으면 미실행 */
export type AdapterDisconfirmOpts = {
  /** 단위 테스트·명시 주입용. 있으면 corpus보다 우선 */
  disconfirmLog?: DisconfirmLog | null;
  /**
   * 반증 후보.
   * - undefined/null → queried: false (아직/실패/미연결)
   * - 배열 → 탐색 실행
   */
  disconfirmCorpus?: DisconfirmCandidate[] | null;
  windowHours?: number;
  nowMs?: number;
};
