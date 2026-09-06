import type { Ref } from "react";

/**
 * useImperativeHandle는 ref 객체에 `current`를 할당한다.
 * Next가 얼린 props가 ref로 들어오면 "Cannot add property current"로 죽는다.
 */
export function bindableImperativeRef<T>(
  ref: Ref<T> | null | undefined,
): Ref<T> | null {
  if (ref == null) return null;
  if (typeof ref === "function") return ref;
  if (typeof ref !== "object") return null;
  if (Object.prototype.hasOwnProperty.call(ref, "current")) return ref;
  return Object.isExtensible(ref) ? ref : null;
}
