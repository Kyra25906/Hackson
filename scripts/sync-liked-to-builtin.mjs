import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = process.cwd()
const likedPath = path.resolve(ROOT, 'data', 'system-liked-cards.json')
const echoCardsPath = path.resolve(ROOT, 'src', 'echoCards.ts')

const readJsonFile = async (p) => {
  try {
    const raw = await fs.readFile(p, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const uniqById = (arr) => {
  const out = []
  const seen = new Set()
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    const item = arr[i]
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }
  return out.reverse()
}

const main = async () => {
  const likedRaw = await readJsonFile(likedPath)
  const liked = Array.isArray(likedRaw) ? likedRaw : []
  const capped = uniqById(liked).slice(-100)
  const tsArray = JSON.stringify(capped, null, 2)

  const src = await fs.readFile(echoCardsPath, 'utf8')
  const re =
    /export const systemLikedBuiltinCards: TextbookEchoCardData\[\] = ([\s\S]*?)\n\nconst toThemeId =/m
  const m = src.match(re)
  if (!m) {
    throw new Error('Cannot find systemLikedBuiltinCards block in src/echoCards.ts')
  }

  const next = src.replace(
    re,
    `export const systemLikedBuiltinCards: TextbookEchoCardData[] = ${tsArray}\n\nconst toThemeId =`,
  )

  if (next === src) {
    process.stdout.write(`No changes. systemLikedBuiltinCards=${capped.length}\n`)
    return
  }

  await fs.writeFile(echoCardsPath, next, 'utf8')
  process.stdout.write(`Updated src/echoCards.ts. systemLikedBuiltinCards=${capped.length}\n`)
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`)
  process.exitCode = 1
})

