export const TRIGGER_CONFIG = {
  negative: {
    consecutiveCount: 3,
    nightConsecutiveCount: 2,
    perItemDuration: 1200,
    totalDuration: 3500,
  },
  doomscroll: {
    swipeWindowMs: 60_000,
    swipeThreshold: 12,
    idleMs: 25_000,
  },
  endlessScroll: {
    scrollThreshold: 10,
    resetOnPause: false,
  },
  night: {
    startHour: 22,
    endHour: 5,
  },
} as const

