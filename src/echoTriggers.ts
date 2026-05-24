import type { TextbookEchoCardData } from './textbookEcho.types'
import { generateTextbookDeck } from './textbookDeck'
import { getDislikedThemes, getLikedCards } from './userPreferences'
import { getSystemLikedCards } from './systemLikedCards'

export type EchoTriggerType = 'negative' | 'doomscroll' | 'night' | 'manual'

export interface EchoTriggerPayload {
  now?: Date
  emotionText?: string
  targetTags?: string[]
}

export const makeLoadingCard = (id: string): TextbookEchoCardData => ({
  id,
  theme: { id: 'loading', label: '加载中' },
  childhood: { title: '正在生成后续卡片…' },
  adulthood: { interpretation: '你可以先看看前两张，后面的内容会自动补上。' },
  source: { textbook: '课本回音' },
  actions: { primaryLabel: '了解详情', secondaryLabel: '不感兴趣' },
})

const uniqById = (cards: TextbookEchoCardData[]) => {
  const seen = new Set<string>()
  return cards.filter((c) => {
    if (seen.has(c.id)) return false
    seen.add(c.id)
    return true
  })
}

const shuffle = <T,>(arr: T[]) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

const byTheme = (cards: TextbookEchoCardData[], includesAny: string[]) =>
  cards.filter((c) => includesAny.some((k) => c.theme.label.includes(k)))

const byAnyText = (cards: TextbookEchoCardData[], text: string) => {
  const t = text.trim()
  if (!t) return []
  return cards.filter((c) => c.childhood.title.includes(t) || c.adulthood.interpretation.includes(t) || c.theme.label.includes(t))
}

export const pickBuiltinCardsForTrigger = (
  all: TextbookEchoCardData[],
  trigger: EchoTriggerType,
  payload: EchoTriggerPayload = {},
) => {
  const mergedAll = uniqById([
    ...getSystemLikedCards().filter((c) => c.theme?.id !== 'loading'),
    ...getLikedCards().filter((c) => c.theme?.id !== 'loading'),
    ...all,
  ])
  const disliked = new Set(getDislikedThemes())
  const filtered = disliked.size ? mergedAll.filter((c) => !disliked.has(c.theme.label)) : mergedAll
  const sourceAll = filtered.length > 0 ? filtered : mergedAll

  if (trigger === 'negative') {
    if (payload.targetTags && payload.targetTags.length > 0) {
      const pool = uniqById(byTheme(sourceAll, payload.targetTags))
      return shuffle(pool.length > 0 ? pool : sourceAll).slice(0, 10)
    }

    const pool = uniqById(
      byTheme(sourceAll, [
        '内耗',
        '焦虑',
        '遗憾',
        '疏离',
        '落寞',
        '愧疚',
        '怅惘',
        '孤寂',
        '思乡',
        '思念',
        '受挫',
        '迷茫',
        '浮躁',
      ]),
    )
    return shuffle(pool).slice(0, 10)
  }

  if (trigger === 'doomscroll') {
    const pool = uniqById(
      byTheme(sourceAll, ['内耗', '浮躁', '独处', '受挫治愈', '独处松弛', '往事遗憾', '怀旧怅惘']),
    )
    return shuffle(pool).slice(0, 10)
  }

  if (trigger === 'night') {
    const hour = payload.now ? payload.now.getHours() : new Date().getHours()
    const nightBias = hour >= 22 || hour <= 4
    const pool = uniqById(
      byTheme(
        sourceAll,
        nightBias ? ['独处', '思念', '思乡', '怀旧', '浮躁'] : ['独处松弛', '受挫治愈', '亲情温暖'],
      ),
    )
    return shuffle(pool).slice(0, 10)
  }

  const emotion = payload.emotionText?.trim() ?? ''
  if (!emotion) return shuffle(sourceAll).slice(0, 10)

  const direct = byAnyText(sourceAll, emotion)
  if (direct.length > 0) return shuffle(uniqById(direct)).slice(0, 10)

  const map: Array<{ keys: string[]; themes: string[] }> = [
    { keys: ['焦虑', '内耗', '烦', '崩'], themes: ['内耗', '焦虑', '浮躁'] },
    { keys: ['疲惫', '累', '低落', '受挫', '难过'], themes: ['受挫', '治愈', '独处松弛'] },
    { keys: ['想家', '乡愁', '思念', '孤独'], themes: ['思乡', '思念', '独处'] },
    { keys: ['遗憾', '来不及', '后悔', '亏欠'], themes: ['遗憾', '愧疚', '亲情遗憾'] },
    { keys: ['迷茫', '选择', '路口'], themes: ['迷茫', '选择'] },
    { keys: ['亲情', '妈妈', '父亲', '家'], themes: ['亲情', '母爱', '家庭'] },
  ]

  const hit = map.find((m) => m.keys.some((k) => emotion.includes(k)))
  if (!hit) return shuffle(sourceAll).slice(0, 10)

  const pool = uniqById(byTheme(sourceAll, hit.themes))
  return shuffle(pool.length > 0 ? pool : sourceAll).slice(0, 10)
}

export const pickCardsForTrigger = async (
  all: TextbookEchoCardData[],
  trigger: EchoTriggerType,
  payload: EchoTriggerPayload = {},
) => {
  try {
    const deck = await generateTextbookDeck({
      trigger,
      payload: { emotionText: payload.emotionText, targetTags: payload.targetTags },
      limit: 10,
    })
    if (deck.length > 0) return deck
  } catch {}

  return pickBuiltinCardsForTrigger(all, trigger, payload)
}
