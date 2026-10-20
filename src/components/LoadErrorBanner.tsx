"use client";

type LoadErrorBannerProps = {
  message: string;
  compact?: boolean;
  className?: string;
};

function friendlyLoadMessage(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("load failed") ||
    lower.includes("networkerror")
  ) {
    return "지도 데이터를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침해 주세요.";
  }
  if (lower.includes("404") || lower.includes("not found")) {
    return "데이터 파일을 찾을 수 없습니다. 아래 개발자 안내를 참고하거나 새로고침해 보세요.";
  }
  if (lower.includes("json") || lower.includes("parse")) {
    return "데이터 형식 오류가 있습니다. 잠시 후 새로고침하거나 개발자 안내를 확인해 주세요.";
  }
  return "지도를 불러오는 중 문제가 생겼습니다. 새로고침하면 대부분 해결됩니다.";
}

export function LoadErrorBanner({ message, compact = false, className = "" }: LoadErrorBannerProps) {
  const friendly = friendlyLoadMessage(message);

  return (
    <div
      className={`rounded-xl border border-rose-400/35 bg-rose-950/85 text-rose-50 shadow-lg backdrop-blur-md ${
        compact ? "px-3 py-2 text-xs" : "p-3 text-sm"
      } ${className}`}
      role="alert"
    >
      <p className="font-medium leading-snug">{friendly}</p>
      {!compact ? (
        <p className="mt-1 text-meta leading-5 text-rose-100/75">
          연결은 정상인데 계속 실패하면 로컬 개발 환경에서 데이터 빌드가 필요할 수 있습니다.
        </p>
      ) : null}
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "mt-2" : "mt-3"}`}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-rose-200/35 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/30"
        >
          새로고침
        </button>
        <details className="text-meta text-rose-100/70">
          <summary className="cursor-pointer select-none text-rose-100/85 hover:text-rose-50">
            개발자 안내
          </summary>
          <p className="mt-2 leading-5">{message}</p>
          <p className="mt-1 font-mono text-micro leading-4 text-rose-100/60">
            npm run data:refresh
            <br />
            npm run data:build
          </p>
        </details>
      </div>
    </div>
  );
}
