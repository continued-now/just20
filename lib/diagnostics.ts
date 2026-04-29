export function devLog(event: string, metadata?: Record<string, unknown>): void {
  if (!__DEV__) return;
  if (metadata) {
    console.log(`[Just20:${event}]`, metadata);
    return;
  }
  console.log(`[Just20:${event}]`);
}
