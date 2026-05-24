import type { TextbookEchoCardData } from './textbookEcho.types'
import {
  getBackgroundPromptOverridesForFile,
  getBannedSpans,
  getDislikedThemes,
  getHeadingOverridesForFile,
} from './userPreferences'

type ListBooksResp = { ok?: boolean; files?: string[]; error?: string }
type GenerateResp = { ok?: boolean; cards?: TextbookEchoCardData[]; error?: string }

type TextbookTrigger = 'negative' | 'doomscroll' | 'night' | 'manual'

export interface TextbookDeckPayload {
  emotionText?: string
  targetTags?: string[]
}

let cachedFiles: string[] | null = null
let cachedAt = 0

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

const fetchJsonWithTimeout = async <T,>(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController()
  const t = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(input, { ...init, signal: controller.signal })
    const json = (await resp.json()) as T
    return { resp, json }
  } finally {
    window.clearTimeout(t)
  }
}

export const listBookFiles = async () => {
  const now = Date.now()
  if (cachedFiles && now - cachedAt < 60_000) return cachedFiles
  const resp = await fetch('/api/books/list')
  const json = (await resp.json()) as ListBooksResp
  const files = Array.isArray(json.files) ? json.files : []
  cachedFiles = files
  cachedAt = now
  return files
}

const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)]

const parseBannedSpansForFile = (baseName: string) => {
  const prefix = `${baseName}::`
  return getBannedSpans()
    .filter((k) => k.startsWith(prefix))
    .map((k) => {
      const rest = k.slice(prefix.length)
      const [lineNoRaw, startRaw, endRaw] = rest.split(/[:]/g)
      const lineNo = Number(lineNoRaw ?? 0) || 0
      const start = Number(startRaw ?? 0) || 0
      const end = Number(endRaw ?? 0) || 0
      return { lineNo, start, end }
    })
    .filter((x) => x.lineNo > 0)
    .slice(-200)
}

const emotionHintForTrigger = (trigger: TextbookTrigger, payload: TextbookDeckPayload) => {
  const fromTags = payload.targetTags?.filter(Boolean).join('、') ?? ''
  const fromEmotion = payload.emotionText?.trim() ?? ''
  if (fromEmotion) return fromEmotion
  if (fromTags) return fromTags
  if (trigger === 'negative') return '焦虑、内耗、遗憾'
  if (trigger === 'doomscroll') return '空刷、浮躁、内耗'
  if (trigger === 'night') return '深夜、敏感、独处'
  return ''
}

export const generateTextbookDeck = async (args: { trigger: TextbookTrigger; payload?: TextbookDeckPayload; limit: number }) => {
  const files = await listBookFiles()
  if (files.length === 0) throw new Error('No textbook files')
  const fileName = pickRandom(files)
  const baseName = fileName.replace(/\.txt$/i, '')
  const emotionHint = emotionHintForTrigger(args.trigger, args.payload ?? {})
  const avoidThemes = getDislikedThemes()
  const bannedSpans = parseBannedSpansForFile(baseName)
  const headingOverrides = getHeadingOverridesForFile(baseName)
  const backgroundPromptOverrides = getBackgroundPromptOverridesForFile(baseName)

  const { resp, json } = await fetchJsonWithTimeout<GenerateResp>(
    '/api/books/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        limit: args.limit,
        emotionHint,
        avoidThemes,
        bannedSpans,
        headingOverrides,
        backgroundPromptOverrides,
      }),
    },
    20_000,
  )

  if (!resp.ok || !json.ok || !Array.isArray(json.cards)) {
    await sleep(200)
    throw new Error(json.error || 'Generate failed')
  }

  return json.cards
}
