export type NegativeThemeKey =
  | 'peerPressure'
  | 'lonely'
  | 'future'
  | 'familyRegret'
  | 'relationshipOverthink'
  | 'growingPain'

export interface NegativeTheme {
  key: NegativeThemeKey
  name: string
  negativeLines: string[]
  targetTags: string[]
  keywords: string[]
}

export const negativeThemes: NegativeTheme[] = [
  {
    key: 'peerPressure',
    name: '同龄人压力',
    negativeLines: ['同龄人已经年薪百万了', '感觉自己一事无成', '努力有什么用，还不是拼不过关系'],
    targetTags: ['内耗焦虑', '受挫低落', '受挫治愈'],
    keywords: ['同龄', '年薪', '一事无成', '努力', '拼不过', '落后', '比较', '焦虑'],
  },
  {
    key: 'lonely',
    name: '人际孤独',
    negativeLines: ['热闹是他们的，我什么都没有', '为什么没人懂我', '聊天的好友列表永远是空的'],
    targetTags: ['独处落寞', '人际疏离'],
    keywords: ['孤独', '没人懂', '不被理解', '厚障壁', '陌生', '热闹', '空的', '疏离'],
  },
  {
    key: 'future',
    name: '未来迷茫',
    negativeLines: ['选错路就完了', '我不知道自己想要什么', '毕业几年还在晃荡'],
    targetTags: ['选择迷茫', '往事遗憾'],
    keywords: ['迷茫', '方向', '选择', '选错', '未来', '毕业', '路口', '不知道'],
  },
  {
    key: 'familyRegret',
    name: '亲情遗憾',
    negativeLines: ['父母老了，我却不在身边', '想起奶奶偷偷抹眼泪', '没来得及好好告别'],
    targetTags: ['亲情亏欠', '亲情遗憾', '思乡孤寂', '亲情思念'],
    keywords: ['父母', '妈妈', '父亲', '奶奶', '想家', '乡愁', '来不及', '告别', '亏欠', '思念'],
  },
  {
    key: 'relationshipOverthink',
    name: '情感内耗',
    negativeLines: ['他到底喜不喜欢我', '我是不是说错话了', '纠结到凌晨三点还睡不着'],
    targetTags: ['内心愧疚', '内耗焦虑'],
    keywords: ['他', '她', '喜欢', '在乎', '说错', '纠结', '反思', '睡不着', '聊天'],
  },
  {
    key: 'growingPain',
    name: '成长阵痛',
    negativeLines: ['小时候真好，现在好累', '再也回不去了', '长大就是不断告别'],
    targetTags: ['成长离别', '怀旧怅惘', '思念怅惘'],
    keywords: ['长大', '回不去', '小时候', '告别', '怀旧', '怅惘', '离别'],
  },
]

export const getNegativeThemeByKey = (key: NegativeThemeKey) =>
  negativeThemes.find((t) => t.key === key) ?? negativeThemes[0]

export const classifyNegativeTheme = (text: string): NegativeTheme => {
  const t = text.trim()
  if (!t) return negativeThemes[0]

  let best: NegativeTheme | null = null
  let bestScore = 0

  for (const theme of negativeThemes) {
    let score = 0
    for (const k of theme.keywords) {
      if (t.includes(k)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = theme
    }
  }

  return best ?? negativeThemes[0]
}

