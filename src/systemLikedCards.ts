import type { TextbookEchoCardData } from './textbookEcho.types'

const KEY = 'textbookEcho.systemLikedCards.cache.v1'

const isCard = (x: unknown): x is TextbookEchoCardData => {
  if (!x || typeof x !== 'object') return false
  const v = x as Record<string, unknown>
  if (typeof v.id !== 'string' || !v.id.trim()) return false
  const theme = v.theme as Record<string, unknown> | undefined
  const childhood = v.childhood as Record<string, unknown> | undefined
  const adulthood = v.adulthood as Record<string, unknown> | undefined
  const source = v.source as Record<string, unknown> | undefined
  if (!theme || typeof theme !== 'object' || typeof theme.id !== 'string' || typeof theme.label !== 'string') return false
  if (!childhood || typeof childhood !== 'object' || typeof childhood.title !== 'string') return false
  if (!adulthood || typeof adulthood !== 'object' || typeof adulthood.interpretation !== 'string') return false
  if (!source || typeof source !== 'object' || typeof source.textbook !== 'string') return false
  return true
}

const loadCache = (): TextbookEchoCardData[] => {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter(isCard).slice(-200) : []
  } catch {
    return []
  }
}

const saveCache = (cards: TextbookEchoCardData[]) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cards.slice(-200)))
  } catch {}
}

export const getSystemLikedCards = () => loadCache()

export const upsertSystemLikedCardLocal = (card: TextbookEchoCardData) => {
  const id = String(card.id ?? '').trim()
  if (!id) return
  const current = loadCache()
  const next = [...current.filter((c) => c.id !== id), card].slice(-200)
  saveCache(next)
}

export const removeSystemLikedCardLocal = (id: string) => {
  const k = String(id ?? '').trim()
  if (!k) return
  const current = loadCache()
  const next = current.filter((c) => c.id !== k)
  saveCache(next)
}

export const refreshSystemLikedCards = async () => {
  try {
    const resp = await fetch('/api/system/likedCards', { method: 'GET' })
    if (!resp.ok) throw new Error('fetch failed')
    const data = (await resp.json()) as { cards?: unknown }
    const cards = Array.isArray(data?.cards) ? data.cards.filter(isCard).slice(-200) : []
    saveCache(cards)
    return cards
  } catch {
    return loadCache()
  }
}

export const syncAddSystemLikedCard = async (card: TextbookEchoCardData) => {
  await fetch('/api/system/likedCards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ card }),
  })
}

export const syncRemoveSystemLikedCard = async (id: string) => {
  await fetch('/api/system/likedCards/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

