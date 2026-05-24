import { useMemo, useState } from 'react'

import type { EchoTriggerType } from './echoTriggers'

export interface EchoEntryProps {
  onPick: (type: EchoTriggerType, emotionText?: string) => void | Promise<void>
  onStartSimulator: () => void
  busy?: boolean
}

export default function EchoEntry({ onPick, onStartSimulator, busy = false }: EchoEntryProps) {
  const [emotionText, setEmotionText] = useState('')

  const options = useMemo(
    () =>
      [
        {
          type: 'negative' as const,
          title: '负面刷屏',
          subtitle: '连续焦虑、内耗、遗憾时，立刻截断',
        },
        {
          type: 'doomscroll' as const,
          title: '无效刷屏',
          subtitle: '长时间空刷，换成有意义的温柔补给',
        },
        {
          type: 'night' as const,
          title: '夜间时段',
          subtitle: '深夜更敏感，让内容更轻一点',
        },
      ] as const,
    [],
  )

  return (
    <div className="w-full px-4">
      <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
        <div className="font-['STKaiti','华文楷体',serif] text-white">
          <div className="text-[18px] font-semibold tracking-wide">选择一个入口</div>
          <div className="mt-1 text-[12px] text-white/70">没有抖音上下文接口时，用“场景触发”模拟。</div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={busy}
            className="group w-full rounded-2xl border border-white/15 bg-black/25 p-4 text-left backdrop-blur transition-all duration-300 hover:border-[#EC4899]/45 hover:bg-black/30 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 disabled:opacity-50"
            onClick={onStartSimulator}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="truncate font-['STKaiti','华文楷体',serif] text-[16px] font-semibold text-white">
                  模拟刷抖音
                </div>
                <div className="mt-1 truncate font-['STKaiti','华文楷体',serif] text-[12px] text-white/70">
                  连续负面 / 无效空刷 / 夜间时段 → 自动弹出治愈卡片
                </div>
              </div>
              <div className="shrink-0 rounded-full bg-[#EC4899]/20 px-3 py-1 text-[11px] text-white/85 transition-all group-hover:bg-[#EC4899]/30">
                开始
              </div>
            </div>
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          {options.map((o) => (
            <button
              key={o.type}
              type="button"
              disabled={busy}
              className="group w-full rounded-2xl border border-white/15 bg-black/20 p-4 text-left backdrop-blur transition-all duration-300 hover:border-[#EC4899]/35 hover:bg-black/25 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 disabled:opacity-50"
              onClick={() => void onPick(o.type)}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate font-['STKaiti','华文楷体',serif] text-[16px] font-semibold text-white">
                    {o.title}
                  </div>
                  <div className="mt-1 truncate font-['STKaiti','华文楷体',serif] text-[12px] text-white/70">
                    {o.subtitle}
                  </div>
                </div>
                <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/75 transition-all group-hover:bg-[#EC4899]/20">
                  进入
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-['STKaiti','华文楷体',serif] text-[16px] font-semibold text-white">主动情绪</div>
              <div className="mt-1 font-['STKaiti','华文楷体',serif] text-[12px] text-white/70">
                输入“疲惫 / 迷茫 / 焦虑 / 孤独 / 遗憾”等
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              className="shrink-0 rounded-full border border-white/25 bg-black/10 px-3 py-1 text-[11px] font-semibold text-white/85 backdrop-blur transition-all duration-300 hover:border-[#EC4899]/55 hover:bg-[#EC4899]/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/35 disabled:opacity-50"
              onClick={() => void onPick('manual', emotionText)}
            >
              生成
            </button>
          </div>

          <input
            value={emotionText}
            onChange={(e) => setEmotionText(e.target.value)}
            disabled={busy}
            className="mt-3 w-full rounded-xl border border-white/15 bg-black/10 px-4 py-3 text-[13px] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 font-['STKaiti','华文楷体',serif]"
            placeholder="此刻的感受…"
          />
        </div>
      </div>
    </div>
  )
}
