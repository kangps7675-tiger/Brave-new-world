/** Stream a response body into UTF-8 text without response.json() (chunked read). */
export async function readResponseBodyText(
  response: Response,
  onChunk?: (bytesReceived: number) => void,
): Promise<string> {
  if (!response.body) {
    throw new Error("Response body missing");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let text = "";
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
    onChunk?.(bytes);
  }
  text += decoder.decode();
  return text;
}

export async function fetchJsonViaStream<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const text = await readResponseBodyText(response);
  return JSON.parse(text) as T;
}
