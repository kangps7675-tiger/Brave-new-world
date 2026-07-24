"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ background: "#02040a", color: "#e2e8f0", margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          role="alert"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", opacity: 0.6 }}>
            멋진 신세계
          </p>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>앱을 복구할 수 없습니다</h1>
          <p style={{ maxWidth: 420, fontSize: 14, lineHeight: 1.6, opacity: 0.7, margin: 0 }}>
            {error.message || "치명적인 오류가 발생했습니다."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(125, 211, 252, 0.35)",
              background: "rgba(8, 47, 73, 0.5)",
              color: "#e0f2fe",
              padding: "8px 16px",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
