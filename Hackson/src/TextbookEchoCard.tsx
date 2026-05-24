import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { TextbookEchoCardData } from './textbookEcho.types'
import {
  addBannedSpan,
  addDislikedTheme,
  addLikedCard,
  getBackgroundPromptOverride,
  getHeadingOverride,
  getLikedCards,
  makeSpanKey,
  removeDislikedTheme,
  removeLikedCard,
  setBackgroundPromptOverride,
  setHeadingOverride,
} from './userPreferences'
import {
  removeSystemLikedCardLocal,
  syncAddSystemLikedCard,
  syncRemoveSystemLikedCard,
  upsertSystemLikedCardLocal,
} from './systemLikedCards'

export interface TextbookEchoCardProps {
  cardContent: TextbookEchoCardData[]
}

export default function TextbookEchoCard({ cardContent }: TextbookEchoCardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const titleRefs = useRef<Record<string, HTMLHeadingElement | null>>({})
  const requestedBgRef = useRef<Set<string>>(new Set())

  const [activeIndex, setActiveIndex] = useState(0)
  const [loadedBg, setLoadedBg] = useState<Record<string, boolean>>({})
  const [titleLineCountById, setTitleLineCountById] = useState<Record<string, number>>({})
  const [flippedById, setFlippedById] = useState<Record<string, boolean>>({})
  const [dismissedById, setDismissedById] = useState<Record<string, boolean>>({})
  const [prewarmReady, setPrewarmReady] = useState(false)
  const [prefsVersion, setPrefsVersion] = useState(0)
  const [feedbackOpenId, setFeedbackOpenId] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'badPick' | 'wrongHeading' | 'badBg' | 'badInterpretation'>('badPick')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackHeading, setFeedbackHeading] = useState('')
  const [feedbackBackgroundPrompt, setFeedbackBackgroundPrompt] = useState('')
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false)
  const [feedbackError, setFeedbackError] = useState('')
  const dragRef = useRef({
    isDown: false,
    pointerId: -1,
    startX: 0,
    startScrollLeft: 0,
  })

  const cards = useMemo(() => cardContent ?? [], [cardContent])
  const likedIdSet = useMemo(() => new Set(getLikedCards().map((c) => c.id)), [prefsVersion])

  const hintTextByIndex = useCallback((index: number) => {
    const hints = [
      '这一刷，就够了',
      '停一秒，也算答案',
      '此刻成立',
      '放下就走',
      '别急，慢一点',
      '就这一句',
    ]
    return hints[index % hints.length]
  }, [])

  const backgroundSceneByTheme = useCallback((label: unknown) => {
    const key = String(label ?? '').trim()
    if (key.includes('亲情') || key.includes('母爱') || key.includes('家庭')) {
      return 'warm home interior at dusk, soft window light, cozy atmosphere'
    }
    if (key.includes('思乡') || key.includes('乡愁') || key.includes('漂泊')) {
      return 'lonely train platform at sunset, distant mountains, light mist'
    }
    if (key.includes('怀旧') || key.includes('往事')) {
      return 'old street at night after rain, neon reflections, gentle bokeh'
    }
    if (key.includes('愧疚') || key.includes('遗憾')) {
      return 'quiet empty room, single lamp glow, cinematic shadows'
    }
    if (key.includes('内耗') || key.includes('焦虑') || key.includes('浮躁')) {
      return 'night city riverbank, drifting light trails, calm water, deep blue'
    }
    if (key.includes('成长') || key.includes('离别')) {
      return 'autumn walkway with falling leaves, soft backlight, calm mood'
    }
    if (key.includes('独处') || key.includes('落寞')) {
      return 'moonlit lake with ripples, quiet trees silhouette, tranquil night'
    }
    if (key.includes('受挫') || key.includes('治愈')) {
      return 'morning garden with blooming flowers, soft fog, hopeful light'
    }
    return 'calm abstract watercolor background, gentle gradients, soft texture'
  }, [])

  const buildBackgroundPrompt = useCallback(
    (card: TextbookEchoCardData) => {
      const key = makeSpanKey({
        fileName: card.__debug?.fileName,
        lineNo: card.__debug?.lineNo,
        start: card.__debug?.start,
        end: card.__debug?.end,
      })
      const overridePrompt = key ? (getBackgroundPromptOverride(key) ?? '') : ''
      const scene = backgroundSceneByTheme(card.theme.label)
      const style =
        'photorealistic cinematic portrait background, 35mm, shallow depth of field, soft film grain, dreamy bokeh, high detail, calming mood, no text, no watermark'
      const palette = 'color palette: deep blue purple with soft pink accent light'
      const basePrompt = overridePrompt.trim() ? overridePrompt.trim() : card.backgroundPrompt?.trim() ?? ''
      return basePrompt
        ? `${basePrompt}, ${style}, ${palette}`
        : `${scene}, ${style}, ${palette}`
    },
    [backgroundSceneByTheme, prefsVersion],
  )

  const displaySourceTextbook = useCallback(
    (card: TextbookEchoCardData) => {
      const key = makeSpanKey({
        fileName: card.__debug?.fileName,
        lineNo: card.__debug?.lineNo,
        start: card.__debug?.start,
        end: card.__debug?.end,
      })
      const overrideHeading = key ? (getHeadingOverride(key) ?? '') : ''
      if (!overrideHeading) return card.source.textbook
      const grade = (card.__debug?.grade ?? card.source.textbook.split('-')[0] ?? '').trim()
      return grade ? `${grade}-${overrideHeading}` : overrideHeading
    },
    [prefsVersion],
  )

  const backgroundImageUrl = useCallback(
    (card: TextbookEchoCardData) => {
      const prompt = buildBackgroundPrompt(card)
      const encoded = encodeURIComponent(prompt)
      return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encoded}&image_size=portrait_16_9`
    },
    [buildBackgroundPrompt],
  )

  const bgUrlById = useMemo(() => {
    const out: Record<string, string> = {}
    for (const c of cards) {
      if (c.theme?.id === 'loading') continue
      const url = backgroundImageUrl(c)
      if (url) out[c.id] = url
    }
    return out
  }, [backgroundImageUrl, cards])

  const measureTitleLines = useCallback(() => {
    if (typeof window === 'undefined') return
    const next: Record<string, number> = {}
    for (const c of cards) {
      const el = titleRefs.current[c.id]
      if (!el) continue
      const styles = window.getComputedStyle(el)
      const lh = Number.parseFloat(styles.lineHeight)
      const h = el.getBoundingClientRect().height
      if (!Number.isFinite(lh) || lh <= 0 || !Number.isFinite(h) || h <= 0) continue
      next[c.id] = Math.max(1, Math.round(h / lh))
    }
    setTitleLineCountById(next)
  }, [cards])

  useEffect(() => {
    measureTitleLines()
  }, [activeIndex, cards, measureTitleLines, prewarmReady])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('resize', measureTitleLines)
    return () => window.removeEventListener('resize', measureTitleLines)
  }, [measureTitleLines])

  useEffect(() => {
    const alive = new Set(cards.map((c) => c.id))
    requestedBgRef.current = new Set(Array.from(requestedBgRef.current).filter((id) => alive.has(id)))
    setLoadedBg((p) => {
      const next: Record<string, boolean> = {}
      for (const c of cards) if (p[c.id]) next[c.id] = true
      return next
    })
    setPrewarmReady(true)

    const first = cards.slice(0, 3)
    if (first.length === 0) {
      return
    }

    let cancelled = false
    const preload = (card: TextbookEchoCardData) =>
      new Promise<boolean>((resolve) => {
        const url = bgUrlById[card.id]
        if (!url) return resolve(false)
        requestedBgRef.current.add(card.id)
        const img = new Image()
        img.onload = () => {
          if (!cancelled) setLoadedBg((p) => ({ ...p, [card.id]: true }))
          resolve(true)
        }
        img.onerror = () => resolve(false)
        img.src = url
      })

    void (async () => {
      await Promise.race([preload(first[0]!), new Promise((r) => window.setTimeout(r, 300))])
      for (let i = 1; i < first.length; i += 1) await preload(first[i]!)
    })()

    return () => {
      cancelled = true
    }
  }, [bgUrlById, cards])

  useEffect(() => {
    if (!prewarmReady) return

    let cancelled = false
    const preloadByIndex = (idx: number) => {
      const c = cards[idx]
      if (!c) return
      if (loadedBg[c.id]) return
      if (requestedBgRef.current.has(c.id)) return
      const url = bgUrlById[c.id]
      if (!url) return
      requestedBgRef.current.add(c.id)
      const img = new Image()
      img.onload = () => {
        if (!cancelled) setLoadedBg((p) => ({ ...p, [c.id]: true }))
      }
      img.src = url
    }

    const initialCount = Math.min(3, cards.length)
    for (let i = 0; i < initialCount; i += 1) preloadByIndex(i)

    const start = Math.max(0, activeIndex - 1)
    const end = Math.min(cards.length - 1, activeIndex + 2)
    for (let i = start; i <= end; i += 1) preloadByIndex(i)

    return () => {
      cancelled = true
    }
  }, [activeIndex, bgUrlById, cards, loadedBg, prewarmReady])

  useEffect(() => {
    setFlippedById({})
  }, [activeIndex])

  const handleDetailClick = useCallback((card: TextbookEchoCardData) => {
    setFlippedById((p) => ({ ...p, [card.id]: !p[card.id] }))
  }, [])

  const handleNotInterestedClick = useCallback(
    (card: TextbookEchoCardData) => {
      const prev = Boolean(dismissedById[card.id])
      setDismissedById((p) => ({ ...p, [card.id]: !prev }))
      if (prev) removeDislikedTheme(card.theme.label)
      else addDislikedTheme(card.theme.label)
      setFlippedById((p) => ({ ...p, [card.id]: false }))
    },
    [dismissedById],
  )

  const likedIdForCard = useCallback((card: TextbookEchoCardData) => {
    const key = makeSpanKey({
      fileName: card.__debug?.fileName,
      lineNo: card.__debug?.lineNo,
      start: card.__debug?.start,
      end: card.__debug?.end,
    })
    return key ? `liked::${key}` : `liked::${card.id}`
  }, [])

  const handleLikeClick = useCallback(
    (card: TextbookEchoCardData) => {
      if (card.theme?.id === 'loading') return
      const likedId = likedIdForCard(card)
      if (likedIdSet.has(likedId)) {
        removeLikedCard(likedId)
        removeSystemLikedCardLocal(likedId)
        void syncRemoveSystemLikedCard(likedId).catch(() => {})
        setPrefsVersion((x) => x + 1)
        return
      }
      const prompt = buildBackgroundPrompt(card).trim()
      const likedCard = { ...card, id: likedId, backgroundPrompt: prompt || card.backgroundPrompt }
      addLikedCard(likedCard)
      upsertSystemLikedCardLocal(likedCard)
      void syncAddSystemLikedCard(likedCard).catch(() => {})
      setPrefsVersion((x) => x + 1)
    },
    [buildBackgroundPrompt, likedIdForCard, likedIdSet],
  )

  const openFeedback = useCallback((card: TextbookEchoCardData) => {
    setFeedbackError('')
    setFeedbackType('badPick')
    setFeedbackNote('')
    const key = makeSpanKey({
      fileName: card.__debug?.fileName,
      lineNo: card.__debug?.lineNo,
      start: card.__debug?.start,
      end: card.__debug?.end,
    })
    setFeedbackHeading(key ? getHeadingOverride(key) ?? '' : '')
    setFeedbackBackgroundPrompt(key ? getBackgroundPromptOverride(key) ?? '' : '')
    setFeedbackOpenId(card.id)
  }, [])

  const submitFeedback = useCallback(
    async (card: TextbookEchoCardData) => {
      if (feedbackSubmitting) return
      const key = makeSpanKey({
        fileName: card.__debug?.fileName,
        lineNo: card.__debug?.lineNo,
        start: card.__debug?.start,
        end: card.__debug?.end,
      })
      if (!key) {
        setFeedbackError('缺少来源信息，无法记录反馈')
        return
      }

      setFeedbackSubmitting(true)
      setFeedbackError('')
      try {
        if (feedbackType === 'badPick') addBannedSpan(key)
        if (feedbackHeading.trim()) setHeadingOverride(key, feedbackHeading.trim())
        if (feedbackBackgroundPrompt.trim()) setBackgroundPromptOverride(key, feedbackBackgroundPrompt.trim())
        setPrefsVersion((v) => v + 1)

        const resp = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: feedbackType,
            note: feedbackNote.trim(),
            correction: {
              heading: feedbackHeading.trim() || undefined,
              backgroundPrompt: feedbackBackgroundPrompt.trim() || undefined,
            },
            card: { id: card.id },
            theme: card.theme,
            debug: card.__debug,
          }),
        })
        if (!resp.ok) throw new Error('提交失败')
        setFeedbackOpenId(null)
      } catch (e) {
        setFeedbackError(e instanceof Error ? e.message : '提交失败')
      } finally {
        setFeedbackSubmitting(false)
      }
    },
    [feedbackBackgroundPrompt, feedbackHeading, feedbackNote, feedbackSubmitting, feedbackType],
  )

  const scrollToIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(nextIndex, cards.length - 1))
      const el = cardRefs.current[clamped]
      if (!el) return

      el.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })

      setActiveIndex(clamped)
    },
    [cards.length],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        scrollToIndex(activeIndex + 1)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        scrollToIndex(activeIndex - 1)
      }
    },
    [activeIndex, scrollToIndex],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(() => {
        const width = el.clientWidth || 1
        const idx = Math.round(el.scrollLeft / width)
        setActiveIndex(Math.max(0, Math.min(idx, cards.length - 1)))
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', onScroll)
    }
  }, [cards.length])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return

    if (e.pointerType === 'mouse' && e.button !== 0) return

    const target = e.target as HTMLElement | null
    if (target?.closest('button')) return

    dragRef.current.isDown = true
    dragRef.current.pointerId = e.pointerId
    dragRef.current.startX = e.clientX
    dragRef.current.startScrollLeft = el.scrollLeft

    el.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return

    if (!dragRef.current.isDown) return
    if (dragRef.current.pointerId !== e.pointerId) return

    const dx = e.clientX - dragRef.current.startX
    el.scrollLeft = dragRef.current.startScrollLeft - dx
  }, [])

  const endPointerDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current
    if (!el) return

    if (!dragRef.current.isDown) return
    if (dragRef.current.pointerId !== e.pointerId) return

    dragRef.current.isDown = false
    dragRef.current.pointerId = -1

    try {
      el.releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  if (cards.length === 0) {
    return (
      <div className="w-full px-4">
        <div className="rounded-xl bg-[#F3F4F6] p-6 text-sm text-[#1F2937]">暂无内容</div>
      </div>
    )
  }

  return (
    <section className="w-full">
      <div className="w-full px-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#1F2937]/70">
            <span className="font-['STKaiti','华文楷体',serif]">
              {activeIndex + 1}/{cards.length}
            </span>
          </div>
          <div className="text-xs text-[#1F2937]/60">
            <span className="rounded-full bg-white/60 px-3 py-1 backdrop-blur">
              左右滑动 / 键盘 ← →
            </span>
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="mt-3 flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth touch-pan-x select-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="课本回音卡片"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onLostPointerCapture={endPointerDrag}
      >
        {cards.map((card, index) => (
          <div
            key={card.id}
            ref={(node) => {
              cardRefs.current[index] = node
            }}
            className="w-full shrink-0 snap-center px-4 box-border"
            aria-label={`卡片 ${index + 1}`}
          >
            <article
              className={[
                'relative w-full min-h-[74svh] overflow-hidden rounded-2xl bg-white/15 p-6 shadow-lg backdrop-blur transition-[transform,opacity,background-color] duration-300 ease-out hover:bg-white/20 hover:shadow-xl hover:ring-2 hover:ring-[#EC4899]/30',
                index === activeIndex ? 'opacity-100 scale-[1] animate-echo-in' : 'opacity-80 scale-[0.985]',
              ].join(' ')}
            >
              <div className="absolute inset-0">
                {bgUrlById[card.id] &&
                (index < 3 || (index >= Math.max(0, activeIndex - 1) && index <= Math.min(cards.length - 1, activeIndex + 2))) ? (
                  <img
                    src={bgUrlById[card.id]}
                    alt=""
                    className={[
                      'absolute inset-0 h-full w-full object-cover',
                      loadedBg[card.id] ? 'opacity-90 animate-echo-bg-in' : 'opacity-0',
                    ].join(' ')}
                    onLoad={() => setLoadedBg((p) => ({ ...p, [card.id]: true }))}
                    loading="lazy"
                    decoding="async"
                  />
                ) : bgUrlById[card.id] && loadedBg[card.id] ? (
                  <img
                    src={bgUrlById[card.id]}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-90"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <div
                  className={[
                    'absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/65 transition-opacity duration-300',
                    loadedBg[card.id] ? 'opacity-100' : 'opacity-100',
                  ].join(' ')}
                />
                <div
                  className={[
                    'absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.18),rgba(0,0,0,0)_55%)] transition-opacity duration-500',
                    index === activeIndex ? 'opacity-100' : 'opacity-40',
                  ].join(' ')}
                />
                {!loadedBg[card.id] &&
                bgUrlById[card.id] &&
                (index < 3 ||
                  (index >= Math.max(0, activeIndex - 1) && index <= Math.min(cards.length - 1, activeIndex + 2))) ? (
                  <div className="absolute inset-0 animate-pulse bg-white/10" />
                ) : null}
              </div>

              <div className="relative z-10 h-full min-h-[74svh] [perspective:1200px]">
                <div
                  className={[
                    'relative h-full min-h-[74svh] transition-transform duration-500 ease-out [transform-style:preserve-3d]',
                    flippedById[card.id] ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]',
                  ].join(' ')}
                >
                  <div className="absolute inset-0 [backface-visibility:hidden]">
                    <div className="relative h-full min-h-[74svh] font-['STKaiti','华文楷体',serif] text-white">
                      <div className="absolute bottom-1 left-3 z-10">
                        <button
                          type="button"
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur transition-all hover:bg-white/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 disabled:opacity-40 disabled:hover:bg-white/5"
                          onClick={() => openFeedback(card)}
                          disabled={card.theme?.id === 'loading'}
                        >
                          反馈
                        </button>
                      </div>
                      {card.theme?.id !== 'loading' ? (
                        <div className="absolute bottom-1 right-3 z-10">
                          <button
                            type="button"
                            className={[
                              'inline-flex items-center gap-1 rounded-md border bg-white/5 px-2 py-0.5 text-[10px] font-semibold backdrop-blur transition-all hover:bg-white/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30',
                              likedIdSet.has(likedIdForCard(card))
                                ? 'border-[#EC4899]/45 text-white/90'
                                : 'border-white/10 text-white/80',
                            ].join(' ')}
                            onClick={() => handleLikeClick(card)}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              className={likedIdSet.has(likedIdForCard(card)) ? 'text-[#EC4899]' : 'text-white/80'}
                            >
                              <path
                                d="M7 10V20H4C3.44772 20 3 19.5523 3 19V11C3 10.4477 3.44772 10 4 10H7ZM9 10H14.2C14.4761 10 14.7386 9.8859 14.925 9.6846L17.8 6.6C18.0667 6.3114 18.2 5.9333 18.2 5.5C18.2 4.6 17.5 4 16.6 4H13.5C13.2239 4 13 4.2239 13 4.5V7.5L9.4 9.9C9.15037 10.0664 9 10.3461 9 10.65V10ZM9 12.5V19C9 19.5523 9.44772 20 10 20H16.2C16.6792 20 17.093 19.6577 17.183 19.187L18.683 11.187C18.7857 10.639 18.3658 10.1 17.809 10.1H9V12.5Z"
                                fill="currentColor"
                              />
                            </svg>
                            <span>{likedIdSet.has(likedIdForCard(card)) ? '已赞' : '点赞'}</span>
                          </button>
                        </div>
                      ) : null}
                      <div className="absolute left-6 right-6 top-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="truncate text-[11px] text-white/80 drop-shadow">{displaySourceTextbook(card)}</div>
                          </div>
                          <div className="shrink-0 text-[11px] text-white/75 drop-shadow">{hintTextByIndex(index)}</div>
                        </div>
                      </div>

                      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2">
                        <div className="relative">
                          <h2
                            ref={(node) => {
                              titleRefs.current[card.id] = node
                            }}
                            className={[
                              'text-center font-semibold text-white drop-shadow-lg font-[\'SimSun\',\'宋体\',serif]',
                              (titleLineCountById[card.id] ?? 1) > 2
                                ? 'text-[28px] leading-[1.3] min-[390px]:text-[30px] min-[430px]:text-[34px]'
                                : 'text-[30px] leading-[1.26] min-[390px]:text-[32px] min-[430px]:text-[36px]',
                            ].join(' ')}
                          >
                            {card.childhood.title}
                          </h2>

                          <div className="absolute -bottom-7 left-0 right-0 flex items-center justify-between">
                            <button
                              type="button"
                              className={[
                                'inline-flex items-center justify-center rounded-full border bg-black/10 px-2 py-1 text-[10px] font-semibold backdrop-blur transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35',
                                dismissedById[card.id]
                                  ? 'border-white/10 text-white/70 hover:border-white/20 hover:bg-white/10'
                                  : 'border-white/15 text-white/85 hover:border-[#EC4899]/45 hover:bg-[#EC4899]/20',
                              ].join(' ')}
                              onClick={() => handleNotInterestedClick(card)}
                            >
                              {dismissedById[card.id] ? '撤销' : '不感兴趣'}
                            </button>

                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/10 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur transition-all duration-300 hover:border-[#EC4899]/45 hover:bg-[#EC4899]/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                              onClick={() => handleDetailClick(card)}
                            >
                              了解详情
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="absolute left-6 right-6 bottom-6">
                        <div className="flex items-center justify-between text-xs text-white/80">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-md px-2 py-1 transition-all hover:bg-white/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 disabled:opacity-40 disabled:hover:bg-transparent"
                              onClick={() => scrollToIndex(index - 1)}
                              disabled={index === 0}
                              aria-disabled={index === 0}
                            >
                              上一张
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="rounded-md px-2 py-1 transition-all hover:bg-white/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 disabled:opacity-40 disabled:hover:bg-transparent"
                              onClick={() => scrollToIndex(index + 1)}
                              disabled={index === cards.length - 1}
                              aria-disabled={index === cards.length - 1}
                            >
                              下一张
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    <div className="relative h-full min-h-[74svh] font-['STKaiti','华文楷体',serif] text-white">
                      <div className="absolute left-6 right-6 top-6 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-white/90 drop-shadow">成年感悟</div>
                          <div className="mt-0.5 truncate text-[11px] text-white/70 drop-shadow">
                            {displaySourceTextbook(card)}
                          </div>
                        </div>
                      </div>

                      <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2">
                        <div className="relative">
                          <p className="mx-auto max-w-[26ch] text-center text-[18px] leading-[1.75] text-white/95 drop-shadow">
                            {card.adulthood.interpretation}
                          </p>
                          <div className="absolute -bottom-7 left-0 right-0 flex items-center justify-end">
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-black/10 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur transition-all duration-300 hover:border-[#EC4899]/45 hover:bg-[#EC4899]/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35"
                              onClick={() => handleDetailClick(card)}
                            >
                              返回原文
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="absolute left-6 right-6 bottom-6">
                        <div className="flex items-center justify-between text-xs text-white/80">
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 transition-all hover:bg-white/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 disabled:opacity-40 disabled:hover:bg-transparent"
                            onClick={() => scrollToIndex(index - 1)}
                            disabled={index === 0}
                            aria-disabled={index === 0}
                          >
                            上一张
                          </button>

                          <button
                            type="button"
                            className="rounded-md px-2 py-1 transition-all hover:bg-white/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 disabled:opacity-40 disabled:hover:bg-transparent"
                            onClick={() => scrollToIndex(index + 1)}
                            disabled={index === cards.length - 1}
                            aria-disabled={index === cards.length - 1}
                          >
                            下一张
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {feedbackOpenId === card.id ? (
                <div
                  className="absolute inset-0 z-20"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerMove={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFeedbackOpenId(null)} />
                  <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-black/60 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold font-['STKaiti','华文楷体',serif]">反馈</div>
                      <button
                        type="button"
                        className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] text-white/85 backdrop-blur transition-all hover:bg-white/10 active:scale-95"
                        onClick={() => setFeedbackOpenId(null)}
                      >
                        关闭
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold">
                      <button
                        type="button"
                        className={[
                          'rounded-xl border px-3 py-2 text-left transition-all',
                          feedbackType === 'badPick' ? 'border-[#EC4899]/50 bg-[#EC4899]/15' : 'border-white/10 bg-white/5',
                        ].join(' ')}
                        onClick={() => setFeedbackType('badPick')}
                      >
                        句子不合适
                      </button>
                      <button
                        type="button"
                        className={[
                          'rounded-xl border px-3 py-2 text-left transition-all',
                          feedbackType === 'wrongHeading'
                            ? 'border-[#EC4899]/50 bg-[#EC4899]/15'
                            : 'border-white/10 bg-white/5',
                        ].join(' ')}
                        onClick={() => setFeedbackType('wrongHeading')}
                      >
                        标题提取错
                      </button>
                      <button
                        type="button"
                        className={[
                          'rounded-xl border px-3 py-2 text-left transition-all',
                          feedbackType === 'badBg' ? 'border-[#EC4899]/50 bg-[#EC4899]/15' : 'border-white/10 bg-white/5',
                        ].join(' ')}
                        onClick={() => setFeedbackType('badBg')}
                      >
                        配图不合适
                      </button>
                      <button
                        type="button"
                        className={[
                          'rounded-xl border px-3 py-2 text-left transition-all',
                          feedbackType === 'badInterpretation'
                            ? 'border-[#EC4899]/50 bg-[#EC4899]/15'
                            : 'border-white/10 bg-white/5',
                        ].join(' ')}
                        onClick={() => setFeedbackType('badInterpretation')}
                      >
                        解读不合适
                      </button>
                    </div>

                    {feedbackType === 'wrongHeading' ? (
                      <div className="mt-3">
                        <div className="text-[10px] text-white/70">你希望的篇目标题（会用于显示与后续生成修正）</div>
                        <input
                          value={feedbackHeading}
                          onChange={(e) => setFeedbackHeading(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-[#EC4899]/45"
                          placeholder="例如：孔乙己"
                        />
                      </div>
                    ) : null}

                    {feedbackType === 'badBg' ? (
                      <div className="mt-3">
                        <div className="text-[10px] text-white/70">你希望的背景图提示词（英文更稳定，中文也可以）</div>
                        <input
                          value={feedbackBackgroundPrompt}
                          onChange={(e) => setFeedbackBackgroundPrompt(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-[#EC4899]/45"
                          placeholder="例如：warm home interior, soft sunset, comforting mood"
                        />
                      </div>
                    ) : null}

                    <div className="mt-3">
                      <div className="text-[10px] text-white/70">补充说明（可选）</div>
                      <textarea
                        value={feedbackNote}
                        onChange={(e) => setFeedbackNote(e.target.value)}
                        rows={2}
                        className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/35 focus:border-[#EC4899]/45"
                        placeholder="例如：这句更适合“亲情温暖”，不要太丧"
                      />
                    </div>

                    {feedbackError ? <div className="mt-2 text-[11px] text-[#EC4899]">{feedbackError}</div> : null}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/80 transition-all hover:bg-white/10 active:scale-[0.99]"
                        onClick={() => setFeedbackOpenId(null)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        disabled={feedbackSubmitting}
                        className="flex-1 rounded-xl bg-[#EC4899] px-3 py-2 text-[12px] font-semibold text-white shadow-lg shadow-[#EC4899]/25 transition-all hover:bg-[#ff4aa6] active:scale-[0.99] disabled:opacity-60"
                        onClick={() => void submitFeedback(card)}
                      >
                        {feedbackSubmitting ? '提交中…' : '提交'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          </div>
        ))}
      </div>
    </section>
  )
}
