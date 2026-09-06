"use client";

import { lazy, type ComponentType } from "react";

type DynamicOptions = {
  ssr?: boolean;
  loading?: () => JSX.Element | null;
};

type LoaderResult<P> =
  | ComponentType<P>
  | { default: ComponentType<P> }
  | Record<string, ComponentType<P>>;

function resolveComponent<P>(loaded: LoaderResult<P>): ComponentType<P> {
  if (typeof loaded === "function") {
    return loaded as ComponentType<P>;
  }
  if ("default" in loaded && typeof loaded.default === "function") {
    return loaded.default;
  }
  const named = Object.values(loaded).find((value) => typeof value === "function");
  if (named) {
    return named as ComponentType<P>;
  }
  throw new Error("clientDynamic: dynamic import did not resolve a component");
}

/** Client-only code splitting (`next/dynamic` with `{ ssr: false }` equivalent). */
export default function clientDynamic<P = Record<string, never>>(
  loader: () => Promise<LoaderResult<P>>,
  options?: DynamicOptions,
): ComponentType<P> {
  void options;
  return lazy(() =>
    loader().then((mod) => ({ default: resolveComponent(mod) })),
  ) as ComponentType<P>;
}
