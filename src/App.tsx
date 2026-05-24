import { useEffect, useMemo, useState } from 'react'

import EchoEntry from './EchoEntry'
import FeedSimulator from './FeedSimulator'
import AdminPanel from './AdminPanel'
import TextbookEchoCard from './TextbookEchoCard'
import { allCards } from './echoCards'
import { makeLoadingCard, pickBuiltinCardsForTrigger, type EchoTriggerType } from './echoTriggers'
import { generateTextbookDeck } from './textbookDeck'
import type { TextbookEchoCardData } from './textbookEcho.types'
import { refreshSystemLikedCards } from './systemLikedCards'

type SceneMode = 'entry' | 'deck' | 'simulator'

type ActiveScene = {
  mode: SceneMode
  trigger?: EchoTriggerType
  deck?: TextbookEchoCardData[]
  title?: string
  requestId?: string
} | null

function App() {
  const [active, setActive] = useState<ActiveScene>({ mode: 'entry' })
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminDeck, setAdminDeck] = useState<TextbookEchoCardData[]>([])
  const [adminTitle, setAdminTitle] = useState<string>('')
  const [deckLoading, setDeckLoading] = useState(false)

  const isAdmin = useMemo(() => new URLSearchParams(window.location.search).get('admin') === '1', [])
  useEffect(() => {
    void refreshSystemLikedCards()
  }, [])

  const headerTitle = useMemo(() => {
    if (!active || active.mode === 'entry') return '课本回音'
    if (active.title) return active.title
    if (active.mode === 'simulator') return '信息流模拟'
    if (active.trigger === 'negative') return '负面刷屏'
    if (active.trigger === 'doomscroll') return '无效刷屏'
    if (active.trigger === 'night') return '夜间时段'
    return '主动情绪'
  }, [active])

  return (
    <div className="min-h-[100svh] w-full bg-[#0B1020]">
      <div className="mx-auto w-full max-w-[428px] pt-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <div className="px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {active && active.mode !== 'entry' ? (
                <button
                  type="button"
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/35 hover:bg-[#EC4899]/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 font-['STKaiti','华文楷体',serif]"
                  onClick={() => setActive({ mode: 'entry' })}
                >
                  返回
                </button>
              ) : null}
              <h1 className="text-sm font-semibold text-white/90 font-['STKaiti','华文楷体',serif]">
                {headerTitle}
              </h1>
            </div>

            <div className="text-[11px] text-white/60 font-['STKaiti','华文楷体',serif]">
              上下文触发入口
            </div>
          </div>

          {!active || active.mode === 'entry' ? (
            <p className="mt-1 text-xs leading-relaxed text-white/65 font-['STKaiti','华文楷体',serif]">
              无法获取信息流上下文时，用场景触发模拟“刷到这一刻就成立”。
            </p>
          ) : active.mode === 'simulator' ? (
            <p className="mt-1 text-xs leading-relaxed text-white/65 font-['STKaiti','华文楷体',serif]">
              纵向滚动模拟刷信息流，连续负面/无效空刷/夜间偏置会自动弹出治愈卡片。
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-white/65 font-['STKaiti','华文楷体',serif]">
              向左或向右滑动，切换不同的治愈截断。
            </p>
          )}
        </div>

        <div className="mt-4">
          {!active || active.mode === 'entry' ? (
            <EchoEntry
              busy={deckLoading}
              onPick={async (type, emotionText) => {
                if (deckLoading) return
                const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
                const seed = pickBuiltinCardsForTrigger(allCards, type, { emotionText, now: new Date() }).slice(0, 2)
                const loadingCard = makeLoadingCard(`loading-${requestId}`)
                const initialDeck = [...seed, loadingCard]
                setAdminDeck(initialDeck)
                setAdminTitle(type)
                setActive({ mode: 'deck', trigger: type, deck: initialDeck, requestId })

                setDeckLoading(true)
                void (async () => {
                  try {
                    const more = await generateTextbookDeck({
                      trigger: type,
                      payload: { emotionText },
                      limit: 3,
                    })
                    setActive((p) => {
                      if (!p || p.mode !== 'deck' || p.requestId !== requestId) return p
                      const base = seed
                      return { ...p, deck: [...base, ...more], requestId }
                    })
                    setAdminDeck((p) => (p.length && p[0]?.id === seed[0]?.id ? [...seed, ...more] : p))
                  } catch {
                    setActive((p) => {
                      if (!p || p.mode !== 'deck' || p.requestId !== requestId) return p
                      const fallback = pickBuiltinCardsForTrigger(allCards, type, { emotionText, now: new Date() }).slice(0, 5)
                      return { ...p, deck: fallback, requestId }
                    })
                  } finally {
                    setDeckLoading(false)
                  }
                })()
              }}
              onStartSimulator={() => setActive({ mode: 'simulator' })}
            />
          ) : active.mode === 'simulator' ? (
            <FeedSimulator onExit={() => setActive({ mode: 'entry' })} />
          ) : (
            <TextbookEchoCard cardContent={active.deck ?? []} />
          )}
        </div>

        {isAdmin ? (
          <div className="mt-4 px-4">
            <button
              type="button"
              className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-[12px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/35 hover:bg-[#EC4899]/15 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 font-['STKaiti','华文楷体',serif]"
              onClick={() => setAdminOpen(true)}
            >
              打开管理员监测
            </button>
          </div>
        ) : null}
      </div>

      <AdminPanel open={adminOpen} title={adminTitle} deck={adminDeck} onClose={() => setAdminOpen(false)} />

      {deckLoading && (!active || active.mode === 'entry') ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="w-full max-w-[360px] rounded-2xl border border-white/15 bg-white/5 p-5 text-center text-white/85 backdrop-blur font-['STKaiti','华文楷体',serif]">
              <div className="text-[14px] font-semibold">正在从课本生成卡片…</div>
              <div className="mt-1 text-[12px] text-white/65">如果模型暂时不可用，会自动切回内置卡片。</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
