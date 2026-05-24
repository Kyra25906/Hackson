import type { NegativeThemeKey } from './negativeThemes'

export type FeedSentiment = 'negative' | 'neutral' | 'positive'

export interface FeedItem {
  id: string
  creator: string
  caption: string
  sentiment: FeedSentiment
  negativeTheme?: NegativeThemeKey
}

export const feedItems: FeedItem[] = [
  { id: 'f1', creator: '日常碎片', caption: '地铁里的人都很安静，我也一样。', sentiment: 'neutral' },
  {
    id: 'f2',
    creator: '同龄人对照组',
    caption: '同龄人已经年薪百万了，我怎么还是原地打转。',
    sentiment: 'negative',
    negativeTheme: 'peerPressure',
  },
  {
    id: 'f3',
    creator: '焦虑研究所',
    caption: '总觉得来不及，但又不知道要去哪里。',
    sentiment: 'negative',
    negativeTheme: 'future',
  },
  {
    id: 'f4',
    creator: '情绪天气',
    caption: '热闹是他们的，我什么都没有。',
    sentiment: 'negative',
    negativeTheme: 'lonely',
  },
  { id: 'f5', creator: '小确幸', caption: '今天的风很好，路边花也开了。', sentiment: 'positive' },
  {
    id: 'f6',
    creator: '心里打结',
    caption: '纠结到凌晨三点，还是想不明白他到底在不在乎我。',
    sentiment: 'negative',
    negativeTheme: 'relationshipOverthink',
  },
  {
    id: 'f7',
    creator: '城市角落',
    caption: '夜色很美，但我有点空。',
    sentiment: 'negative',
    negativeTheme: 'lonely',
  },
  { id: 'f8', creator: '慢一点', caption: '把手机放下，喝口水。', sentiment: 'positive' },
  { id: 'f9', creator: '在路上', caption: '有些路走久了，才知道自己很勇敢。', sentiment: 'positive' },
  {
    id: 'f10',
    creator: '人间一瞬',
    caption: '想家，但不敢打电话。',
    sentiment: 'negative',
    negativeTheme: 'familyRegret',
  },
  { id: 'f11', creator: '夜航船', caption: '你并不孤单，只是刚好在夜里。', sentiment: 'neutral' },
  { id: 'f12', creator: '日落记录', caption: '日落又来了，今天也算完成。', sentiment: 'positive' },
]
