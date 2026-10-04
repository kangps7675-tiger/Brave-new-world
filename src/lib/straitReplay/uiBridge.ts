type Listener = () => void;

let enabled = false;
const listeners = new Set<Listener>();

export function getStraitReplayEnabled(): boolean {
  return enabled;
}

export function setStraitReplayEnabled(next: boolean): void {
  if (enabled === next) return;
  enabled = next;
  for (const l of listeners) l();
}

export function subscribeStraitReplayEnabled(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
