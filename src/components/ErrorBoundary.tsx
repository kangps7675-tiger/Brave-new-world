"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional label for logging / UI */
  name?: string;
  fallback?: ReactNode;
};

type State = {
  error: Error | null;
  /** 원인 컴포넌트 경로 — 운영 빌드에서 에러 번호만 보일 때 위치를 알려 준다 */
  stack: string | null;
};

/** 같은 화면에서 자동 복구를 반복하지 않게 — 이 시간 안에 또 터지면 에러 화면을 보여 준다 */
const AUTO_RECOVER_WINDOW_MS = 15_000;

/**
 * Catches render errors in the subtree so a single panel crash
 * does not blank the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null };
  private lastAutoRecoverAt = 0;

  static getDerivedStateFromError(error: Error): State {
    return { error, stack: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error, info.componentStack);
    this.setState({ stack: info.componentStack ?? null });
    // 렌더 도중 상태 경합(React #185 등)은 다시 마운트하면 대개 풀린다 — 첫 번째는 조용히 복구
    const now = Date.now();
    if (!this.props.fallback && now - this.lastAutoRecoverAt > AUTO_RECOVER_WINDOW_MS) {
      this.lastAutoRecoverAt = now;
      window.setTimeout(() => this.setState({ error: null, stack: null }), 50);
    }
  }

  private reset = () => {
    this.setState({ error: null, stack: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          role="alert"
          className="flex min-h-[40vh] flex-col items-center justify-center gap-3 bg-[#02040a] px-6 text-center text-slate-200"
        >
          <p className="text-sm font-medium text-amber-100/90">화면을 표시하지 못했습니다</p>
          <p className="max-w-md text-xs leading-5 text-slate-400">
            {this.state.error.message || "Unexpected render error"}
          </p>
          {this.state.stack ? (
            <details className="max-w-md text-left text-micro text-slate-500">
              <summary className="cursor-pointer text-center">오류 위치(문의 시 복사)</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
                {`${this.state.error.message}\n${this.state.stack.trim().split("\n").slice(0, 8).join("\n")}`}
              </pre>
            </details>
          ) : null}
          <button
            type="button"
            onClick={this.reset}
            className="rounded-lg border border-sky-300/30 bg-sky-950/40 px-3 py-1.5 text-xs text-sky-100 transition hover:border-sky-200/50"
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
