// The OS switch: System Settings › Accessibility › Visual effects → "Show
// animations in Windows". Read on every call, so flipping it takes effect
// without a reload; the springs, Mochi's idle drift and the CSS all ask here.

export function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
