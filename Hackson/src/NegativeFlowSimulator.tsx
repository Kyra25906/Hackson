import { useEffect, useMemo, useRef, useState } from 'react'

import { TRIGGER_CONFIG } from './config/triggers'
import { allCards } from './echoCards'
import { makeLoadingCard, pickBuiltinCardsForTrigger } from './echoTriggers'
import { negativeThemes, type NegativeTheme } from './negativeThemes'
import TextbookEchoCard from './TextbookEchoCard'
import { generateTextbookDeck } from './textbookDeck'
import type { TextbookEchoCardData } from './textbookEcho.types'

export interface NegativeFlowSimulatorProps {
  onBack: () => void
}

type Step = 'select' | 'simulate' | 'interrupted'

export default function NegativeFlowSimulator({ onBack }: NegativeFlowSimulatorProps) {
  const [step, setStep] = useState<Step>('select')
  const [selectedTheme, setSelectedTheme] = useState<NegativeTheme | null>(null)
  const [deck, setDeck] = useState<TextbookEchoCardData[]>([])
  const [activeLineIndex, setActiveLineIndex] = useState(0)
  const [loadingDeck, setLoadingDeck] = useState(false)

  const timersRef = useRef<number[]>([])
  const requestIdRef = useRef<string | null>(null)

  const clearTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }

  useEffect(() => clearTimers, [])

  const lines = useMemo(() => selectedTheme?.negativeLines ?? [], [selectedTheme])

  useEffect(() => {
    if (step !== 'simulate' || !selectedTheme) return

    clearTimers()
    setActiveLineIndex(0)

    const per = TRIGGER_CONFIG.negative.perItemDuration
    const count = Math.max(1, TRIGGER_CONFIG.negative.consecutiveCount)
    const total = TRIGGER_CONFIG.negative.totalDuration

    for (let i = 1; i < count; i += 1) {
      const t = window.setTimeout(() => setActiveLineIndex(i), i * per)
      timersRef.current.push(t)
    }

    const tEnd = window.setTimeout(() => setStep('interrupted'), total)
    timersRef.current.push(tEnd)

    return () => clearTimers()
  }, [selectedTheme, step])

  return (
    <div className="w-full">
      <div className="px-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/35 hover:bg-[#EC4899]/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 font-['STKaiti','华文楷体',serif]"
            onClick={() => {
              clearTimers()
              requestIdRef.current = null
              onBack()
            }}
          >
            返回
          </button>

          <div className="text-[11px] text-white/70 font-['STKaiti','华文楷体',serif]">负面内容截断</div>
        </div>
      </div>

      {step === 'select' ? (
        <div className="mt-3 px-4">
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <div className="font-['STKaiti','华文楷体',serif] text-white">
              <div className="text-[18px] font-semibold tracking-wide">你正在被哪种情绪包围？</div>
              <div className="mt-1 text-[12px] text-white/70">选一个主题，模拟“连续刷到同类负面内容”。</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {negativeThemes.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  disabled={loadingDeck}
                  className="rounded-2xl border border-white/15 bg-black/20 p-4 text-left backdrop-blur transition-all duration-300 hover:border-[#EC4899]/35 hover:bg-black/25 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 disabled:opacity-50"
                  onClick={() => {
                    if (loadingDeck) return
                    setLoadingDeck(true)
                    setSelectedTheme(t)
                    const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
                    requestIdRef.current = requestId

                    const seed = pickBuiltinCardsForTrigger(allCards, 'negative', {
                      targetTags: t.targetTags,
                      now: new Date(),
                    }).slice(0, 2)
                    setDeck([...seed, makeLoadingCard(`loading-${requestId}`)])
                    setStep('simulate')

                    void (async () => {
                      let nextDeck: TextbookEchoCardData[] = []
                      try {
                        const more = await generateTextbookDeck({
                          trigger: 'negative',
                          payload: { targetTags: t.targetTags },
                          limit: 3,
                        })
                        nextDeck = [...seed, ...more]
                      } catch {
                        nextDeck = pickBuiltinCardsForTrigger(allCards, 'negative', {
                          targetTags: t.targetTags,
                          now: new Date(),
                        }).slice(0, 5)
                      }
                      if (requestIdRef.current !== requestId) return
                      setDeck(nextDeck)
                      setLoadingDeck(false)
                    })()
                  }}
                >
                  <div className="truncate font-['STKaiti','华文楷体',serif] text-[16px] font-semibold text-white">
                    {t.name}
                  </div>
                  <div className="mt-1 line-clamp-2 font-['STKaiti','华文楷体',serif] text-[12px] text-white/70">
                    {t.negativeLines[0]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 'simulate' ? (
        <div className="mt-3 px-4">
          <div className="relative h-[78svh] w-full overflow-hidden rounded-2xl bg-white/10 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/45 to-black/80" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.18),rgba(0,0,0,0)_55%)] opacity-80" />

            <div className="relative h-full p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-white/90 font-['STKaiti','华文楷体',serif]">
                    {selectedTheme?.name}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-white/70 font-['STKaiti','华文楷体',serif]">
                    模拟：每条停留 {TRIGGER_CONFIG.negative.perItemDuration}ms × {TRIGGER_CONFIG.negative.consecutiveCount} 条
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/75 backdrop-blur">
                  {Math.min(activeLineIndex + 1, lines.length)}/{TRIGGER_CONFIG.negative.consecutiveCount}
                </div>
              </div>

              <div className="mt-6 flex h-[68%] items-center justify-center">
                <div className="w-full">
                  <div
                    className="transition-all duration-300"
                    style={{
                      transform: `translateY(-${activeLineIndex * 100}%)`,
                    }}
                  >
                    {lines.slice(0, TRIGGER_CONFIG.negative.consecutiveCount).map((line, i) => (
                      <div key={`${line}-${i}`} className="flex h-[46svh] items-center justify-center">
                        <div className="text-center text-[22px] leading-relaxed text-white drop-shadow font-['STKaiti','华文楷体',serif]">
                          {line}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                <button
                  type="button"
                  className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-semibold text-white/85 backdrop-blur transition-all hover:bg-white/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                  onClick={() => {
                    clearTimers()
                    requestIdRef.current = null
                    setStep('select')
                    setSelectedTheme(null)
                    setDeck([])
                    setLoadingDeck(false)
                  }}
                >
                  换主题
                </button>
                <div className="text-[11px] text-white/70 font-['STKaiti','华文楷体',serif]">即将被温柔截断…</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {step === 'interrupted' ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute inset-0">
            <div className="mx-auto w-full max-w-[428px] pt-4">
              <div className="px-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-white/90 font-['STKaiti','华文楷体',serif]">
                      负面内容触发
                    </div>
                    {selectedTheme ? (
                      <div className="mt-0.5 truncate text-[11px] text-white/70 font-['STKaiti','华文楷体',serif]">
                        {selectedTheme.name}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/55 hover:bg-[#EC4899]/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                      onClick={() => {
                        clearTimers()
                        requestIdRef.current = null
                        setStep('select')
                        setSelectedTheme(null)
                        setDeck([])
                        setLoadingDeck(false)
                      }}
                    >
                      换主题
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/55 hover:bg-[#EC4899]/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                      onClick={() => {
                        clearTimers()
                        requestIdRef.current = null
                        onBack()
                      }}
                    >
                      返回
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <TextbookEchoCard cardContent={deck} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
