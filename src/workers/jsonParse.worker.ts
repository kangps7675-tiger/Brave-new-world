/// <reference lib="webworker" />

export type {};

self.onmessage = (event: MessageEvent<{ text?: string }>) => {
  const text = event.data?.text;
  if (typeof text !== "string") {
    self.postMessage({ ok: false, error: "missing text" });
    return;
  }
  try {
    const data = JSON.parse(text);
    self.postMessage({ ok: true, data });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "JSON parse failed",
    });
  }
};
