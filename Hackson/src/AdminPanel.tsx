import { useMemo } from 'react'
import type { TextbookEchoCardData } from './textbookEcho.types'

type DebugCard = TextbookEchoCardData & {
  __debug?: {
    fileName?: string
    grade?: string
    pickId?: string
    heading?: string
    lineNo?: number
    origin?: string
    start?: number
    end?: number
  }
}

export interface AdminPanelProps {
  open: boolean
  title?: string
  deck: TextbookEchoCardData[]
  onClose: () => void
}

export default function AdminPanel({ open, title, deck, onClose }: AdminPanelProps) {
  const items = useMemo(() => deck as DebugCard[], [deck])
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] bg-black/70">
      <div className="mx-auto h-full w-full max-w-[428px] px-4 py-4">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1020]/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-white/90 font-['STKaiti','华文楷体',serif]">
                管理员监测
              </div>
              <div className="mt-0.5 truncate text-[11px] text-white/60 font-['STKaiti','华文楷体',serif]">
                {title || '当前卡片组'}
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all hover:border-[#EC4899]/35 hover:bg-[#EC4899]/15 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 font-['STKaiti','华文楷体',serif]"
              onClick={onClose}
            >
              关闭
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[12px] text-white/70 font-['STKaiti','华文楷体',serif]">
                暂无数据
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((c, idx) => (
                  <div key={`${c.id}-${idx}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-white/90 font-['STKaiti','华文楷体',serif]">
                          {idx + 1}. {c.childhood.title}
                        </div>
                        <div className="mt-1 text-[11px] text-white/60 font-['STKaiti','华文楷体',serif]">
                          展示出处：{c.source.textbook}
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/75">
                        {c.theme.label}
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] leading-relaxed text-white/75 font-['STKaiti','华文楷体',serif]">
                      成年回音：{c.adulthood.interpretation}
                    </div>

                    {c.__debug ? (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] text-white/70">
                        <div>来源文件：{c.__debug.fileName || '-'}</div>
                        <div>
                          篇目：{c.__debug.heading || '-'}　行号：{typeof c.__debug.lineNo === 'number' ? c.__debug.lineNo : '-'}　pickId：
                          {c.__debug.pickId || '-'}
                        </div>
                        <div className="mt-2 text-white/60">原始句（用于追溯，不展示给用户）</div>
                        <div className="mt-1 whitespace-pre-wrap break-words text-white/75">{c.__debug.origin || '-'}</div>
                      </div>
                    ) : (
                      <div className="mt-3 text-[11px] text-white/45 font-['STKaiti','华文楷体',serif]">无追溯信息</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

