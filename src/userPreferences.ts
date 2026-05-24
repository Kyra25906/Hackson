import type { TextbookEchoCardData } from './textbookEcho.types'

type UserPreferences = {
  dislikedThemes: string[]
  bannedSpans: string[]
  headingOverrides: Record<string, string>
  backgroundPromptOverrides: Record<string, string>
  likedCards: TextbookEchoCardData[]
}

const KEY = 'textbookEcho.preferences.v1'

const normalize = (s: string) => s.trim()

const normalizeKey = (s: string) => s.trim()

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

const load = (): UserPreferences => {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      return { dislikedThemes: [], bannedSpans: [], headingOverrides: {}, backgroundPromptOverrides: {}, likedCards: [] }
    }
    const parsed = JSON.parse(raw) as Partial<UserPreferences>
    const dislikedThemes = Array.isArray(parsed.dislikedThemes)
      ? parsed.dislikedThemes.map((x) => (typeof x === 'string' ? normalize(x) : '')).filter(Boolean)
      : []
    const bannedSpans = Array.isArray(parsed.bannedSpans)
      ? parsed.bannedSpans.map((x) => (typeof x === 'string' ? normalizeKey(x) : '')).filter(Boolean)
      : []
    const headingOverrides =
      parsed.headingOverrides && typeof parsed.headingOverrides === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.headingOverrides as Record<string, unknown>)
              .map(([k, v]) => [normalizeKey(k), typeof v === 'string' ? v.trim() : ''])
              .filter(([k, v]) => Boolean(k) && Boolean(v)),
          )
        : {}
    const backgroundPromptOverrides =
      parsed.backgroundPromptOverrides && typeof parsed.backgroundPromptOverrides === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.backgroundPromptOverrides as Record<string, unknown>)
              .map(([k, v]) => [normalizeKey(k), typeof v === 'string' ? v.trim() : ''])
              .filter(([k, v]) => Boolean(k) && Boolean(v)),
          )
        : {}
    const likedCards = Array.isArray(parsed.likedCards) ? parsed.likedCards.filter(isCard).slice(-50) : []
    return {
      dislikedThemes: Array.from(new Set(dislikedThemes)),
      bannedSpans: Array.from(new Set(bannedSpans)).slice(-200),
      headingOverrides,
      backgroundPromptOverrides,
      likedCards,
    }
  } catch {
    return { dislikedThemes: [], bannedSpans: [], headingOverrides: {}, backgroundPromptOverrides: {}, likedCards: [] }
  }
}

const save = (prefs: UserPreferences) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {}
}

export const getDislikedThemes = () => load().dislikedThemes

export const addDislikedTheme = (label: string) => {
  const t = normalize(label)
  if (!t) return
  const prefs = load()
  const set = new Set(prefs.dislikedThemes)
  set.add(t)
  const next = Array.from(set).slice(-50)
  save({ ...prefs, dislikedThemes: next })
}

export const removeDislikedTheme = (label: string) => {
  const t = normalize(label)
  if (!t) return
  const prefs = load()
  const next = prefs.dislikedThemes.filter((x) => x !== t)
  save({ ...prefs, dislikedThemes: next })
}

export const makeSpanKey = (args: { fileName?: string; lineNo?: number; start?: number; end?: number }) => {
  const fileName = normalizeKey(String(args.fileName ?? ''))
  const lineNo = Number(args.lineNo ?? 0) || 0
  const start = Number(args.start ?? 0) || 0
  const end = Number(args.end ?? 0) || 0
  if (!fileName || lineNo <= 0) return ''
  return `${fileName}::${lineNo}:${start}:${end}`
}

export const getBannedSpans = () => load().bannedSpans

export const addBannedSpan = (key: string) => {
  const k = normalizeKey(key)
  if (!k) return
  const prefs = load()
  const set = new Set(prefs.bannedSpans)
  set.add(k)
  save({ ...prefs, bannedSpans: Array.from(set).slice(-200) })
}

export const getHeadingOverride = (key: string) => load().headingOverrides[normalizeKey(key)]

export const setHeadingOverride = (key: string, heading: string) => {
  const k = normalizeKey(key)
  const v = String(heading ?? '').trim()
  if (!k || !v) return
  const prefs = load()
  save({ ...prefs, headingOverrides: { ...prefs.headingOverrides, [k]: v } })
}

export const getBackgroundPromptOverride = (key: string) => load().backgroundPromptOverrides[normalizeKey(key)]

export const setBackgroundPromptOverride = (key: string, prompt: string) => {
  const k = normalizeKey(key)
  const v = String(prompt ?? '').trim()
  if (!k || !v) return
  const prefs = load()
  save({ ...prefs, backgroundPromptOverrides: { ...prefs.backgroundPromptOverrides, [k]: v } })
}

export const getHeadingOverridesForFile = (fileName: string) => {
  const f = normalizeKey(fileName)
  if (!f) return {}
  const { headingOverrides } = load()
  return Object.fromEntries(Object.entries(headingOverrides).filter(([k]) => k.startsWith(`${f}::`)))
}

export const getBackgroundPromptOverridesForFile = (fileName: string) => {
  const f = normalizeKey(fileName)
  if (!f) return {}
  const { backgroundPromptOverrides } = load()
  return Object.fromEntries(Object.entries(backgroundPromptOverrides).filter(([k]) => k.startsWith(`${f}::`)))
}

export const getLikedCards = () => load().likedCards

export const addLikedCard = (card: TextbookEchoCardData) => {
  const id = String(card.id ?? '').trim()
  if (!id) return
  const prefs = load()
  const next = [...prefs.likedCards.filter((c) => c.id !== id), card].slice(-50)
  save({ ...prefs, likedCards: next })
}

export const removeLikedCard = (id: string) => {
  const k = String(id ?? '').trim()
  if (!k) return
  const prefs = load()
  const next = prefs.likedCards.filter((c) => c.id !== k)
  save({ ...prefs, likedCards: next })
}
