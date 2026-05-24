import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { TRIGGER_CONFIG } from './config/triggers'
import { allCards } from './echoCards'
import { makeLoadingCard, pickBuiltinCardsForTrigger, type EchoTriggerType } from './echoTriggers'
import { generateTextbookDeck } from './textbookDeck'
import { feedItems, type FeedItem } from './feedData'
import { classifyNegativeTheme, getNegativeThemeByKey } from './negativeThemes'
import TextbookEchoCard from './TextbookEchoCard'
import type { TextbookEchoCardData } from './textbookEcho.types'

export interface FeedSimulatorProps {
  onExit: () => void
}

type DeckOverlay =
  | {
      trigger: EchoTriggerType
      subtitle?: string
      deck: TextbookEchoCardData[]
      requestId: string
    }
  | null

const isNight = (d: Date) => {
  const h = d.getHours()
  return h >= TRIGGER_CONFIG.night.startHour || h <= TRIGGER_CONFIG.night.endHour
}

export default function FeedSimulator({ onExit }: FeedSimulatorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<Array<HTMLDivElement | null>>([])

  const [activeIndex, setActiveIndex] = useState(0)
  const [overlay, setOverlay] = useState<DeckOverlay>(null)

  const negativeStreakRef = useRef(0)
  const swipeTimestampsRef = useRef<number[]>([])
  const lastActionAtRef = useRef(Date.now())

  const items = useMemo<FeedItem[]>(() => feedItems, [])

  const scrollToIndex = useCallback((nextIndex: number) => {
    const clamped = Math.max(0, Math.min(nextIndex, items.length - 1))
    const el = itemRefs.current[clamped]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveIndex(clamped)
  }, [items.length])

  const openOverlay = useCallback(
    (trigger: EchoTriggerType, args?: { emotionText?: string; subtitle?: string; targetTags?: string[] }) => {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const seed = pickBuiltinCardsForTrigger(allCards, trigger, {
        emotionText: args?.emotionText,
        now: new Date(),
        targetTags: args?.targetTags,
      }).slice(0, 2)
      const initial = [...seed, makeLoadingCard(`loading-${requestId}`)]
      setOverlay({ trigger, subtitle: args?.subtitle, deck: initial, requestId })

      void (async () => {
        let deck: TextbookEchoCardData[] = []
        try {
          const more = await generateTextbookDeck({
            trigger,
            payload: { emotionText: args?.emotionText, targetTags: args?.targetTags },
            limit: 3,
          })
          deck = [...seed, ...more]
        } catch {
          deck = pickBuiltinCardsForTrigger(allCards, trigger, {
            emotionText: args?.emotionText,
            now: new Date(),
            targetTags: args?.targetTags,
          }).slice(0, 5)
        }
        setOverlay((p) => {
          if (!p || p.requestId !== requestId) return p
          return { ...p, deck }
        })
      })()
    },
    [],
  )

  const markAction = useCallback(() => {
    lastActionAtRef.current = Date.now()
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let raf = 0
    const onScroll = () => {
      if (overlay) return
      markAction()
      cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        const height = el.clientHeight || 1
        const idx = Math.round(el.scrollTop / height)
        const next = Math.max(0, Math.min(idx, items.length - 1))
        if (next === activeIndex) return

        setActiveIndex(next)

        const now = Date.now()
        swipeTimestampsRef.current = [...swipeTimestampsRef.current, now].filter(
          (t) => now - t < TRIGGER_CONFIG.doomscroll.swipeWindowMs,
        )

        const current = items[next]
        if (current.sentiment === 'negative') {
          negativeStreakRef.current += 1
        } else {
          negativeStreakRef.current = 0
        }

        const negativeThreshold = isNight(new Date())
          ? TRIGGER_CONFIG.negative.nightConsecutiveCount
          : TRIGGER_CONFIG.negative.consecutiveCount
        if (negativeStreakRef.current >= negativeThreshold) {
          negativeStreakRef.current = 0
          const recent = [items[next], items[Math.max(0, next - 1)], items[Math.max(0, next - 2)]].filter(
            (x) => x && x.sentiment === 'negative',
          )
          const candidates = recent.map((x) =>
            x.negativeTheme ? getNegativeThemeByKey(x.negativeTheme) : classifyNegativeTheme(x.caption),
          )
          const theme = candidates[0] ?? classifyNegativeTheme(current.caption)
          openOverlay('negative', { subtitle: theme.name, targetTags: theme.targetTags })
          return
        }

        if (swipeTimestampsRef.current.length >= TRIGGER_CONFIG.doomscroll.swipeThreshold) {
          swipeTimestampsRef.current = []
          openOverlay('doomscroll')
          return
        }

        if (isNight(new Date()) && next >= 4 && next % 5 === 0) {
          openOverlay('night')
        }
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
    }
  }, [activeIndex, items, markAction, openOverlay, overlay])

  useEffect(() => {
    if (overlay) return
    const timer = window.setInterval(() => {
      const idleMs = Date.now() - lastActionAtRef.current
      if (idleMs >= TRIGGER_CONFIG.doomscroll.idleMs) {
        lastActionAtRef.current = Date.now()
        openOverlay('doomscroll')
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [openOverlay, overlay])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (overlay) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        markAction()
        scrollToIndex(activeIndex + 1)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        markAction()
        scrollToIndex(activeIndex - 1)
      }
    },
    [activeIndex, markAction, overlay, scrollToIndex],
  )

  const activeItem = items[activeIndex]

  return (
    <div className="w-full">
      <div className="px-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/35 hover:bg-[#EC4899]/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 font-['STKaiti','华文楷体',serif]"
            onClick={onExit}
          >
            返回
          </button>
          <div className="text-[11px] text-white/70 font-['STKaiti','华文楷体',serif]">
            {activeIndex + 1}/{items.length}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="mt-3 h-[78svh] w-full snap-y snap-mandatory overflow-y-auto scroll-smooth px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        tabIndex={0}
        role="region"
        aria-label="信息流模拟"
        onKeyDown={handleKeyDown}
      >
        {items.map((it, i) => (
          <div
            key={it.id}
            ref={(node) => {
              itemRefs.current[i] = node
            }}
            className="h-[78svh] w-full snap-start pb-4"
          >
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white/10 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/75" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.18),rgba(0,0,0,0)_55%)] opacity-70" />

              <div className="relative h-full p-6 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-semibold text-white/90 font-['STKaiti','华文楷体',serif]">
                      @{it.creator}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-white/70 font-['STKaiti','华文楷体',serif]">
                      {it.sentiment === 'negative'
                        ? '负向内容'
                        : it.sentiment === 'positive'
                          ? '正向内容'
                          : '中性内容'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/55 hover:bg-[#EC4899]/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                    onClick={() => {
                      markAction()
                      openOverlay('manual', { emotionText: '我有点疲惫' })
                    }}
                  >
                    需要治愈
                  </button>
                </div>

                <div className="mt-6 flex h-[60%] items-center justify-center">
                  <div className="text-center text-[22px] leading-relaxed text-white drop-shadow font-['STKaiti','华文楷体',serif]">
                    {it.caption}
                  </div>
                </div>

                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                  <button
                    type="button"
                    className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-semibold text-white/85 backdrop-blur transition-all hover:bg-white/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                    onClick={() => {
                      markAction()
                      scrollToIndex(activeIndex - 1)
                    }}
                    disabled={i === 0}
                  >
                    上一个
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-semibold text-white/85 backdrop-blur transition-all hover:bg-white/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                    onClick={() => {
                      markAction()
                      scrollToIndex(activeIndex + 1)
                    }}
                    disabled={i === items.length - 1}
                  >
                    下一个
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {overlay ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute inset-0">
            <div className="mx-auto w-full max-w-[428px] pt-4">
              <div className="px-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-white/90 font-['STKaiti','华文楷体',serif]">
                      {overlay.trigger === 'negative'
                        ? '负面内容触发'
                        : overlay.trigger === 'doomscroll'
                          ? '无效刷屏触发'
                          : overlay.trigger === 'night'
                            ? '夜间时段触发'
                            : '主动情绪触发'}
                    </div>
                    {overlay.subtitle ? (
                      <div className="mt-0.5 truncate text-[11px] text-white/70 font-['STKaiti','华文楷体',serif]">
                        {overlay.subtitle}
                      </div>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="ml-3 shrink-0 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/55 hover:bg-[#EC4899]/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                    onClick={() => {
                      setOverlay(null)
                      markAction()
                    }}
                  >
                    继续刷
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <TextbookEchoCard cardContent={overlay.deck} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3 px-4">
        <div className="rounded-2xl bg-white/5 p-4 text-[12px] text-white/70 backdrop-blur font-['STKaiti','华文楷体',serif]">
          <div className="flex items-center justify-between">
            <div>当前：@{activeItem.creator}</div>
            <div>
              {activeItem.sentiment === 'negative'
                ? '负向'
                : activeItem.sentiment === 'positive'
                  ? '正向'
                  : '中性'}
            </div>
          </div>
          <div className="mt-2 text-[11px] text-white/60">触发规则：负向连续≥3 / 60秒滑动≥12 / 25秒无操作 / 夜间偏置</div>
        </div>
      </div>
    </div>
  )
}
