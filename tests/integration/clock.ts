// M-134 / ACP-042: the integration browser flows pin "now" on BOTH sides, so
// they do not depend on the hour they run (AGENTS.md Rule 28 / ACP-007).
// 10:00 on Oct 8 in shop time. Must be earlier than the real clock: emulator
// ID tokens carry real timestamps and only fail once an hour past issue.
export const PINNED_NOW = "2026-10-08T07:00:00.000Z";
