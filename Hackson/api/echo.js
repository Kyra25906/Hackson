import fs from 'node:fs/promises'
import path from 'node:path'
import { TextDecoder } from 'node:util'

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? ''
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com').replace(/\/+$/, '')
const DEEPSEEK_CHAT_PATH = process.env.DEEPSEEK_CHAT_PATH ?? '/chat/completions'
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat'
const BOOKS_TXT_DIR = process.env.BOOKS_TXT_DIR ? path.resolve(process.env.BOOKS_TXT_DIR) : path.resolve(process.cwd(), 'book_txt')

const RUNTIME_DIR = process.env.VERCEL ? path.resolve('/tmp', 'textbook-echo') : process.cwd()
const DATA_DIR = path.resolve(RUNTIME_DIR, 'data')
const FEEDBACK_DIR = path.resolve(RUNTIME_DIR, 'feedback')
const SYSTEM_LIKED_CARDS_FILE = path.join(DATA_DIR, 'system-liked-cards.json')
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'feedback.ndjson')

const decodeBookText = (buf) => {
  const utf8 = buf.toString('utf8')
  const bad = (utf8.match(/�/g) ?? []).length
  if (bad >= 10) return new TextDecoder('gb18030').decode(buf)
  return utf8
}

const readJson = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return null
  return JSON.parse(raw)
}

const writeJson = (res, statusCode, data) => {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.end(JSON.stringify(data))
}

const safeReadDir = async (dir) => {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, n))

const stripHeadingTail = (s) => {
  const t = String(s ?? '').trim()
  const noAuthor = t.split(/[\/／]/)[0]?.trim() ?? ''
  const noPage = noAuthor.replace(/\s+\d{1,4}$/, '').trim()
  return noPage.replace(/\s{2,}/g, ' ').trim()
}

const clampLen = (s, maxLen) => {
  const t = String(s ?? '')
  if (t.length <= maxLen) return t
  return t.slice(0, maxLen)
}

const simplifySourceName = (raw) => {
  const s = String(raw ?? '').replace(/\.txt$/i, '')
  const m = s.match(/([一二三四五六七八九]|\d)年级/)
  if (m) return `${m[0]}`
  return s.trim() || '未知出处'
}

const BANNED_START_RE = [
  /^课后/i,
  /^课后练习/i,
  /^练习/i,
  /^思考/i,
  /^探究/i,
  /^活动/i,
  /^任务/i,
  /^写作/i,
  /^背诵/i,
  /^默写/i,
  /^积累/i,
  /^拓展/i,
  /^提示/i,
  /^方法/i,
  /^知识点/i,
  /^知识梳理/i,
  /^词语/i,
  /^字词/i,
  /^作者简介/i,
  /^读读写写/i,
]

const BANNED_CONTAINS_RE = [/答案/i, /解析/i, /参考答案/i, /注释/i, /赏析/i, /解读/i]

const parseHeading = (line) => {
  const raw = stripHeadingTail(line)
  if (!raw) return null
  if (raw.length > 32) return null
  if (raw.includes('目录')) return null
  if (/(单元|阅读|写作|综合|活动|名著导读|课外古诗词|附录)/.test(raw)) return null
  if (raw.includes('�')) return null
  const han = (raw.match(/[\u4e00-\u9fff]/g) ?? []).length
  if (han < 2) return null

  const m1 = raw.match(/^(\d{1,2}\*?)\s+(.+)$/)
  if (m1) return `${m1[1]} ${m1[2].trim()}`

  const m1b = raw.match(/^(\d{1,2}\*?)[、.．\-—·\s]*([\u4e00-\u9fff].+)$/)
  if (m1b) return `${m1b[1]} ${m1b[2].trim()}`

  const m2 = raw.match(/^第([一二三四五六七八九十\d]{1,3})[课篇章]\s*(.+)$/)
  if (m2) return `第${m2[1]} ${m2[2].trim()}`

  return null
}

const extractCandidates = (rawText, limit = 120) => {
  const text = String(rawText ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const scored = []
  let currentTitle = ''
  const linesRaw = text.split('\n')

  const pushFromOrigin = ({ origin, title, lineNo }) => {
    const cleanOrigin = String(origin ?? '').replace(/\s+/g, '')
    const originLen = cleanOrigin.length
    if (originLen < 10) return
    if (cleanOrigin.includes('�')) return
    const han = (cleanOrigin.match(/[\u4e00-\u9fff]/g) ?? []).length
    if (han / originLen < 0.55) return
    if (BANNED_START_RE.some((re) => re.test(cleanOrigin))) return
    if (BANNED_CONTAINS_RE.some((re) => re.test(cleanOrigin))) return
    if (cleanOrigin.includes('http') || cleanOrigin.includes('www.')) return
    if (/^第[一二三四五六七八九十\d]+[课章节]/.test(cleanOrigin)) return
    if (/^\d+$/.test(cleanOrigin)) return
    if (/^[（(]?\d+[)）][、.]/.test(cleanOrigin)) return
    if (/[A-Za-z]{6,}/.test(cleanOrigin)) return
    if (/[\\/]{1,}/.test(cleanOrigin)) return

    const snippets = []
    const clauses = cleanOrigin.split(/[，、；：]/).map((x) => x.trim()).filter(Boolean)
    for (const c of clauses) {
      if (c.length < 6) continue
      snippets.push(clampLen(c, 20))
    }
    if (snippets.length === 0) snippets.push(clampLen(cleanOrigin, 20))

    for (const snip of snippets) {
      const clean = snip
      const len = clean.length
      if (len < 6 || len > 20) continue

      let score = 0
      if (/[。！？]$/.test(cleanOrigin)) score += 1
      if (cleanOrigin.includes('我') || cleanOrigin.includes('你') || cleanOrigin.includes('他') || cleanOrigin.includes('她')) score += 1
      if (cleanOrigin.includes('可是') || cleanOrigin.includes('然而') || cleanOrigin.includes('但')) score += 1
      if (cleanOrigin.includes('不') || cleanOrigin.includes('没') || cleanOrigin.includes('再')) score += 1
      if (cleanOrigin.includes('…') || cleanOrigin.includes('——')) score += 1

      const start = cleanOrigin.indexOf(clean)
      scored.push({
        text: clean,
        title: title || '',
        lineNo: Number(lineNo) || 0,
        origin: cleanOrigin,
        start: start >= 0 ? start : 0,
        end: start >= 0 ? start + clean.length : clean.length,
        score,
      })
    }
  }

  for (let i = 0; i < linesRaw.length; i += 1) {
    const rawLine = String(linesRaw[i] ?? '')
    const line = rawLine.trim()
    if (!line) continue

    const heading = parseHeading(line)
    if (heading) {
      currentTitle = heading
      continue
    }

    const parts = line.split(/(?<=[。！？；;!?])\s*/g).map((s) => s.trim()).filter(Boolean)
    for (const s of parts) pushFromOrigin({ origin: s, title: currentTitle, lineNo: i + 1 })
  }

  scored.sort((a, b) => b.score - a.score)
  const uniq = []
  const seen = new Set()
  for (const it of scored) {
    if (seen.has(it.text)) continue
    seen.add(it.text)
    uniq.push({
      id: String(uniq.length + 1),
      text: it.text,
      title: it.title,
      lineNo: it.lineNo,
      origin: it.origin,
      start: it.start,
      end: it.end,
    })
    if (uniq.length >= limit) break
  }
  return uniq
}

const parseJsonFromModelText = (raw) => {
  const text = String(raw ?? '').trim()
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1))
  return JSON.parse(text)
}

const deepseekChat = async ({ model, messages, temperature }) => {
  if (!DEEPSEEK_API_KEY) throw new Error('Missing DEEPSEEK_API_KEY')
  if (/[^\x00-\x7F]/.test(DEEPSEEK_API_KEY)) {
    throw new Error('Invalid DEEPSEEK_API_KEY: contains non-ASCII characters')
  }

  const url = `${DEEPSEEK_BASE_URL}${DEEPSEEK_CHAT_PATH}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model ?? DEFAULT_MODEL,
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.7,
    }),
  })
  const text = await resp.text()
  if (!resp.ok) throw new Error(`DeepSeek error ${resp.status}: ${text}`)
  return JSON.parse(text)
}

const generateCardsFromCandidates = async ({ candidates, source, limit, emotionHint, avoidThemes }) => {
  const n = clamp(Number(limit ?? 12), 3, 24)
  const titleCount = new Set((candidates ?? []).map((c) => String(c?.title ?? '').trim() || '未知')).size
  const maxPerTitle = Math.max(1, Math.ceil(n / Math.min(5, titleCount || 1)))
  const avoidSet = new Set((Array.isArray(avoidThemes) ? avoidThemes : []).map((x) => String(x ?? '').trim()).filter(Boolean))
  const strongNegativeRe = /(想死|自杀|结束生命|活不下去|不如死|毫无意义|没有意义|绝望|崩溃|毁了|完了)/i
  const softNegativeRe = /(再也|永远|只剩|只能|来不及|后悔|亏欠|遗憾|无能为力)/i
  const allowedTags = [
    '内耗焦虑',
    '受挫低落',
    '受挫治愈',
    '人际疏离',
    '独处落寞',
    '独处松弛',
    '怀旧怅惘',
    '往事遗憾',
    '亲情遗憾',
    '亲情亏欠',
    '亲情思念',
    '亲情温暖',
    '亲情慰藉',
    '思乡孤寂',
    '思乡遗憾',
    '母爱动容',
    '成长离别',
    '选择迷茫',
    '思念怅惘',
    '内心愧疚',
    '心绪浮躁',
    '家庭温情',
  ]

  const system = [
    '你是“课本回音”治愈卡片生成器。',
    '任务：从给定的候选原句中，挑选最打动人心的课文原文句子，并生成对应的“成年感悟”、情绪标签、背景提示词。',
    '候选列表中可能混入课后练习/思考题/活动指引/答案解析/知识点/注释/赏析等内容：这些都不是课文原文，禁止选择。',
    `候选原句来自多个【篇目】时，输出要尽量分散：同一篇目最多选择 ${maxPerTitle} 条（如果候选里篇目数量不足，可适当放宽）。`,
    avoidSet.size ? `用户反馈：尽量避免以下主题标签：${Array.from(avoidSet).join('、')}` : '',
    '定位：治愈成年人。adulthood.interpretation 要温暖、共情、给人力量与余地，避免沉溺在负面情绪里。',
    '表达要求：不要使用“绝望/毁了/完了/活不下去”等极端负面措辞；尽量用温柔的转折与希望收束（例如“慢一点也没关系”“你已经很努力了”“仍然可以”）。',
    '输出要求：只输出 JSON 数组，不要输出任何额外文字、不要 Markdown。',
    '每个元素必须包含字段：',
    '{ pickId, theme:{id,label}, adulthood:{interpretation}, actions:{primaryLabel,secondaryLabel}, backgroundPrompt }',
    '严格限制：pickId 必须来自候选列表的 id；你只能“选择候选句子”，禁止改写/拼接/编造原句，禁止输出 childhood.title 字段。',
    '限制：候选原句正文 ≤ 20字；adulthood.interpretation ≤ 60字；backgroundPrompt 用英文短句，描述具体画面，不要文字/水印。',
    `theme.label 必须从以下列表中选择一个最贴近的：${allowedTags.join('、')}`,
    'theme.id 使用拼音或英文短词（如 peerPressure / lonely / future 等）。',
    `必须输出 ${n} 个元素，pickId 不允许重复。`,
  ]
    .filter(Boolean)
    .join('\n')

  const baseRaw = source || '未知出处'
  const base = simplifySourceName(baseRaw)
  const user = [
    `课文出处：${base}`,
    emotionHint ? `用户情绪提示：${emotionHint}` : '',
    `请生成 ${n} 张卡片。只能从候选原句中挑选，不允许编造原句。`,
    '候选原句列表：',
    ...(candidates ?? []).map((c) => `${c.id}. 【篇目：${c.title || '未知'}】【行：${c.lineNo || 0}】${c.text}`),
  ]
    .filter(Boolean)
    .join('\n')

  const byId = new Map((candidates ?? []).map((c) => [String(c.id), c]))

  const tryOnce = async (temperature) => {
    const resp = await deepseekChat({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature,
    })

    const content = resp?.choices?.[0]?.message?.content ?? ''
    const parsed = parseJsonFromModelText(content)
    if (!Array.isArray(parsed)) throw new Error('Model output is not a JSON array')

    const seen = new Set()
    const countByTitle = new Map()
    const out = []
    const pushPicked = (item, picked, id, enforceCap, enforceAvoid, enforceTone) => {
      const titleKey = String(picked?.title ?? '').trim() || '未知'
      if (enforceCap) {
        const used = countByTitle.get(titleKey) ?? 0
        if (used >= maxPerTitle) return
      }

      const label = item?.theme?.label
      if (typeof label !== 'string' || !allowedTags.includes(label)) return
      if (enforceAvoid && avoidSet.size && avoidSet.has(label)) return
      const interpretation = item?.adulthood?.interpretation
      if (typeof interpretation !== 'string' || interpretation.trim().length === 0) return
      if (strongNegativeRe.test(interpretation)) return
      if (enforceTone && softNegativeRe.test(interpretation)) return

      seen.add(id)
      countByTitle.set(titleKey, (countByTitle.get(titleKey) ?? 0) + 1)
      out.push({
        id: `${base}-${id}`,
        theme: { id: String(item?.theme?.id ?? '').trim() || 'echo', label },
        childhood: { title: picked.text },
        adulthood: { interpretation: interpretation.trim().slice(0, 60) },
        source: { textbook: picked.title ? `${base}-${picked.title}` : base },
        __debug: {
          fileName: baseRaw,
          grade: base,
          pickId: id,
          heading: picked.title || '',
          lineNo: picked.lineNo || 0,
          origin: picked.origin || '',
          start: typeof picked.start === 'number' ? picked.start : 0,
          end: typeof picked.end === 'number' ? picked.end : 0,
        },
        actions: item?.actions
          ? {
              primaryLabel: typeof item.actions.primaryLabel === 'string' ? item.actions.primaryLabel : undefined,
              secondaryLabel: typeof item.actions.secondaryLabel === 'string' ? item.actions.secondaryLabel : undefined,
            }
          : undefined,
        backgroundPrompt: typeof item?.backgroundPrompt === 'string' ? item.backgroundPrompt : undefined,
      })
    }

    for (let i = 0; i < parsed.length; i += 1) {
      if (out.length >= n) break
      const item = parsed[i]
      const pickId = item?.pickId
      const id = typeof pickId === 'number' ? String(pickId) : typeof pickId === 'string' ? pickId.trim() : ''
      if (!id || seen.has(id)) continue
      const picked = byId.get(id)
      if (!picked) continue
      pushPicked(item, picked, id, true, true, true)
    }

    if (out.length < n) {
      for (let i = 0; i < parsed.length; i += 1) {
        if (out.length >= n) break
        const item = parsed[i]
        const pickId = item?.pickId
        const id = typeof pickId === 'number' ? String(pickId) : typeof pickId === 'string' ? pickId.trim() : ''
        if (!id || seen.has(id)) continue
        const picked = byId.get(id)
        if (!picked) continue
        pushPicked(item, picked, id, false, true, true)
      }
    }

    if (out.length < n) {
      for (let i = 0; i < parsed.length; i += 1) {
        if (out.length >= n) break
        const item = parsed[i]
        const pickId = item?.pickId
        const id = typeof pickId === 'number' ? String(pickId) : typeof pickId === 'string' ? pickId.trim() : ''
        if (!id || seen.has(id)) continue
        const picked = byId.get(id)
        if (!picked) continue
        pushPicked(item, picked, id, false, false, true)
      }
    }

    if (out.length < n) {
      for (let i = 0; i < parsed.length; i += 1) {
        if (out.length >= n) break
        const item = parsed[i]
        const pickId = item?.pickId
        const id = typeof pickId === 'number' ? String(pickId) : typeof pickId === 'string' ? pickId.trim() : ''
        if (!id || seen.has(id)) continue
        const picked = byId.get(id)
        if (!picked) continue
        pushPicked(item, picked, id, false, false, false)
      }
    }

    if (out.length !== n) throw new Error(`Invalid model selection: got ${out.length}/${n}`)
    return out
  }

  try {
    return await tryOnce(0.7)
  } catch {
    return await tryOnce(0.2)
  }
}

const sanitizeLikedCard = (raw) => {
  const id = clampLen(raw?.id, 200).trim()
  const themeId = clampLen(raw?.theme?.id, 64).trim()
  const themeLabel = clampLen(raw?.theme?.label, 64).trim()
  const title = clampLen(raw?.childhood?.title, 400).trim()
  const interpretation = clampLen(raw?.adulthood?.interpretation, 1200).trim()
  const textbook = clampLen(raw?.source?.textbook, 120).trim()
  const backgroundPrompt = typeof raw?.backgroundPrompt === 'string' ? clampLen(raw.backgroundPrompt, 800).trim() : undefined
  if (!id || !themeId || !themeLabel || !title || !interpretation || !textbook) return null
  const debug = raw?.__debug && typeof raw.__debug === 'object' ? raw.__debug : undefined
  return {
    id,
    theme: { id: themeId, label: themeLabel },
    childhood: { title },
    adulthood: { interpretation },
    source: { textbook },
    backgroundPrompt: backgroundPrompt || undefined,
    __debug: debug,
  }
}

const readSystemLikedCards = async () => {
  try {
    const raw = await fs.readFile(SYSTEM_LIKED_CARDS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeSystemLikedCards = async (cards) => {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(SYSTEM_LIKED_CARDS_FILE, JSON.stringify(cards, null, 2), 'utf8')
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    const rawPath = url.searchParams.get('path')
    let pathname = url.pathname
    if (pathname === '/api/echo' && rawPath) {
      const p = String(rawPath ?? '').replace(/^\/+/, '')
      pathname = p.startsWith('api/') ? `/${p}` : `/api/${p}`
    }

    if (req.method === 'OPTIONS') {
      writeJson(res, 204, {})
      return
    }

    if (req.method === 'GET' && pathname === '/api/health') {
      writeJson(res, 200, {
        ok: true,
        deepseekConfigured: Boolean(DEEPSEEK_API_KEY),
        deepseekBaseUrl: DEEPSEEK_BASE_URL,
        deepseekChatPath: DEEPSEEK_CHAT_PATH,
        model: DEFAULT_MODEL,
        booksTxtDir: BOOKS_TXT_DIR,
        runtime: process.env.VERCEL ? 'vercel' : 'node',
      })
      return
    }

    if (req.method === 'GET' && pathname === '/api/books/list') {
      const files = (await safeReadDir(BOOKS_TXT_DIR)).filter((f) => f.toLowerCase().endsWith('.txt'))
      writeJson(res, 200, { ok: true, files })
      return
    }

    if (req.method === 'POST' && pathname === '/api/feedback') {
      const body = await readJson(req)
      await fs.mkdir(FEEDBACK_DIR, { recursive: true })
      const record = {
        ts: Date.now(),
        type: typeof body?.type === 'string' ? body.type : '',
        note: typeof body?.note === 'string' ? body.note : '',
        correction: {
          heading: typeof body?.correction?.heading === 'string' ? body.correction.heading : undefined,
          backgroundPrompt: typeof body?.correction?.backgroundPrompt === 'string' ? body.correction.backgroundPrompt : undefined,
        },
        card: body?.card,
        debug: body?.debug,
        theme: body?.theme,
        ua: String(req.headers['user-agent'] ?? ''),
      }
      await fs.appendFile(FEEDBACK_FILE, `${JSON.stringify(record)}\n`, 'utf8')
      writeJson(res, 200, { ok: true })
      return
    }

    if (req.method === 'GET' && pathname === '/api/system/likedCards') {
      const cards = await readSystemLikedCards()
      writeJson(res, 200, { ok: true, cards })
      return
    }

    if (req.method === 'POST' && pathname === '/api/system/likedCards') {
      const body = await readJson(req)
      const card = sanitizeLikedCard(body?.card)
      if (!card) {
        writeJson(res, 400, { ok: false, error: 'invalid card' })
        return
      }
      const current = await readSystemLikedCards()
      const next = [...current.filter((c) => c?.id !== card.id), card].slice(-200)
      await writeSystemLikedCards(next)
      writeJson(res, 200, { ok: true, cards: next })
      return
    }

    if (req.method === 'POST' && pathname === '/api/system/likedCards/remove') {
      const body = await readJson(req)
      const id = clampLen(body?.id, 200).trim()
      if (!id) {
        writeJson(res, 400, { ok: false, error: 'id is required' })
        return
      }
      const current = await readSystemLikedCards()
      const next = current.filter((c) => c?.id !== id)
      await writeSystemLikedCards(next)
      writeJson(res, 200, { ok: true, cards: next })
      return
    }

    if (req.method === 'POST' && pathname === '/api/cards/generateFromText') {
      const body = await readJson(req)
      const text = body?.text
      if (typeof text !== 'string' || text.trim().length < 20) {
        writeJson(res, 400, { ok: false, error: 'text is required (>= 20 chars)' })
        return
      }
      const candidates = extractCandidates(text, 160)
      const cards = await generateCardsFromCandidates({
        candidates,
        source: body?.source ?? '用户输入',
        limit: body?.limit,
        emotionHint: body?.emotionHint,
        avoidThemes: body?.avoidThemes,
      })
      writeJson(res, 200, { ok: true, candidatesCount: candidates.length, cards })
      return
    }

    if (req.method === 'POST' && pathname === '/api/books/generate') {
      const body = await readJson(req)
      const fileName = body?.fileName
      if (typeof fileName !== 'string' || !fileName.toLowerCase().endsWith('.txt')) {
        writeJson(res, 400, { ok: false, error: 'fileName (.txt) is required' })
        return
      }

      const filePath = path.resolve(BOOKS_TXT_DIR, fileName)
      if (!filePath.startsWith(BOOKS_TXT_DIR)) {
        writeJson(res, 400, { ok: false, error: 'invalid fileName' })
        return
      }

      const rawBuf = await fs.readFile(filePath)
      const text = decodeBookText(rawBuf)
      let candidates = extractCandidates(text, 200)
      const bannedSpans = Array.isArray(body?.bannedSpans) ? body.bannedSpans : []
      if (bannedSpans.length) {
        const set = new Set(
          bannedSpans
            .map((x) => {
              const lineNo = Number(x?.lineNo ?? 0) || 0
              const start = Number(x?.start ?? 0) || 0
              const end = Number(x?.end ?? 0) || 0
              return lineNo > 0 ? `${lineNo}:${start}:${end}` : ''
            })
            .filter(Boolean),
        )
        candidates = candidates.filter((c) => !set.has(`${c.lineNo || 0}:${c.start || 0}:${c.end || 0}`))
      }

      const cards = await generateCardsFromCandidates({
        candidates,
        source: body?.source ?? fileName.replace(/\.txt$/i, ''),
        limit: body?.limit,
        emotionHint: body?.emotionHint,
        avoidThemes: body?.avoidThemes,
      })
      writeJson(res, 200, { ok: true, fileName, candidatesCount: candidates.length, cards })
      return
    }

    if (req.method === 'POST' && pathname === '/api/deepseek/chat') {
      const body = await readJson(req)
      const messages = body?.messages
      if (!Array.isArray(messages) || messages.length === 0) {
        writeJson(res, 400, { ok: false, error: 'messages is required' })
        return
      }
      const data = await deepseekChat({
        model: body?.model,
        messages,
        temperature: body?.temperature,
      })
      writeJson(res, 200, { ok: true, data })
      return
    }

    if (req.method === 'POST' && pathname === '/api/deepseek/test') {
      const data = await deepseekChat({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: '回复我一个 JSON，形如 {"ok":true,"msg":"pong"}，不要输出额外文字。' },
        ],
        temperature: 0,
      })
      writeJson(res, 200, { ok: true, data })
      return
    }

    writeJson(res, 404, { ok: false, error: 'Not found' })
  } catch (e) {
    writeJson(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) })
  }
}
