import type { TextbookEchoCardData } from './textbookEcho.types'

export const systemLikedBuiltinCards: TextbookEchoCardData[] = [
  {
    "id": "liked::22",
    "theme": {
      "id": "亲情遗憾",
      "label": "亲情遗憾"
    },
    "childhood": {
      "title": "\"怎么了呢？\"父亲老了。"
    },
    "adulthood": {
      "interpretation": "父亲老了，突然就想哭了"
    },
    "source": {
      "textbook": "八年级上册《台阶》李森祥"
    },
    "backgroundPrompt": "old man sitting quietly, warm side light, deep wrinkles, time passing, photorealistic cinematic portrait background, 35mm, shallow depth of field, soft film grain, dreamy bokeh, high detail, calming mood, no text, no watermark, color palette: deep blue purple with soft pink accent light"
  }
]

const toThemeId = (label: string) => {
  const raw = label.trim()
  const safe = raw.replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]+/gu, '')
  return safe || 'theme'
}

const builtinCards: TextbookEchoCardData[] = [
  {
    id: '1',
    theme: { id: toThemeId('内耗焦虑'), label: '内耗焦虑' },
    childhood: {
      title: '结，是解不完的；人生中的问题也是解不完的，不然，岂不太平淡无味了么？',
    },
    adulthood: { interpretation: '有点疙瘩，日子才有滋味' },
    source: { textbook: '六年级上册《丁香结》宗璞' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'calm night desk by window, soft lamp glow, there are some purple flowers on the desk,raindrops on glass, introspective mood',
  },
  {
    id: '2',
    theme: { id: toThemeId('亲情思念'), label: '亲情思念' },
    childhood: { title: '呼兰河这小城里边，以前住着我的祖父，现在埋着我的祖父。' },
    adulthood: { interpretation: '人没了，才知道多想他' },
    source: { textbook: '部编版拓展篇目《呼兰河传》萧红' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'old small town street in northeast china, winter dusk, soft snow, nostalgic atmosphere',
  },
  {
    id: '3',
    theme: { id: toThemeId('思乡遗憾'), label: '思乡遗憾' },
    childhood: { title: '后来啊，乡愁是一方矮矮的坟墓，我在外头，母亲在里头。' },
    adulthood: { interpretation: '想说的话，再也听不到回答' },
    source: { textbook: '九年级上册《乡愁》余光中' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'lonely coastline at twilight, gentle waves, far city lights, quiet sorrow, misty air',
  },
  {
    id: '4',
    theme: { id: toThemeId('怀旧怅惘'), label: '怀旧怅惘' },
    childhood: { title: '一直到现在，我实在再没有吃到那夜似的好豆，也不再看到那夜似的好戏了。' },
    adulthood: { interpretation: '最好的味道，都留在回忆里了' },
    source: { textbook: '八年级下册《社戏》鲁迅' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'rural night festival lights in the distance, river reflections, warm lantern glow, nostalgic',
  },
  {
    id: '5',
    theme: { id: toThemeId('内心愧疚'), label: '内心愧疚' },
    childhood: { title: '那是一个幸运的人对一个不幸者的愧怍。' },
    adulthood: { interpretation: '想起来，就觉得亏欠' },
    source: { textbook: '七年级下册《老王》杨绛' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'quiet corridor with dim light, empty chair, cinematic shadows, reflective mood',
  },
  {
    id: '6',
    theme: { id: toThemeId('成长离别'), label: '成长离别' },
    childhood: { title: '爸爸的花儿落了，我已不再是小孩子。' },
    adulthood: { interpretation: '那一刻，我被迫长大了' },
    source: { textbook: '七年级下册《城南旧事》林海音' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'courtyard in early summer, fallen petals, warm sunlight, gentle breeze, coming of age',
  },
  {
    id: '7',
    theme: { id: toThemeId('独处落寞'), label: '独处落寞' },
    childhood: { title: '这时候最热闹的，要数树上的蝉声与水里的蛙声；但热闹是他们的，我什么也没有。' },
    adulthood: { interpretation: '热闹都是别人的' },
    source: { textbook: '高中必修《荷塘月色》朱自清' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'moonlit lotus pond, quiet summer night, ripples on water, distant tree silhouettes, calm loneliness',
  },
  {
    id: '8',
    theme: { id: toThemeId('感念亲情'), label: '感念亲情' },
    childhood: { title: '这时我看见他的背影，我的泪很快地流了下来。' },
    adulthood: { interpretation: '爸爸的背影，让我哭了' },
    source: { textbook: '八年级上册《背影》朱自清' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'train station platform, father figure walking away, warm light, soft bokeh, emotional cinematic',
  },
  {
    id: '9',
    theme: { id: toThemeId('往事遗憾'), label: '往事遗憾' },
    childhood: { title: '此情可待成追忆，只是当时已惘然。' },
    adulthood: { interpretation: '当时不懂，懂了也回不去' },
    source: { textbook: '高中必修《锦瑟》李商隐' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'Empty solitary bench,back view in the rain through a blurred window and in sight are floating petals',
  },
  {
    id: '10',
    theme: { id: toThemeId('人际疏离'), label: '人际疏离' },
    childhood: { title: '我似乎打了一个寒噤；我就知道，我们之间已经隔了一层可悲的厚障壁了。' },
    adulthood: { interpretation: '我们之间，隔着说不出的陌生' },
    source: { textbook: '九年级上册《故乡》鲁迅' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'two people separated by foggy glass, muted colors, distant silhouettes, emotional distance',
  },
  {
    id: '11',
    theme: { id: toThemeId('亲情遗憾'), label: '亲情遗憾' },
    childhood: { title: '我已经懂了，可我已经来不及了。' },
    adulthood: { interpretation: '懂了，却再也来不及' },
    source: { textbook: '高中必修《我与地坛》史铁生' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'autumn park bench, fallen leaves, quiet path, soft fog, regretful warmth',
  },
  {
    id: '12',
    theme: { id: toThemeId('亲情温暖'), label: '亲情温暖' },
    childhood: { title: '我买几个橘子去。你就在此地，不要走动。' },
    adulthood: { interpretation: '话不多，却满是疼爱' },
    source: { textbook: '八年级上册《背影》朱自清' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'warm hands holding oranges, soft sunrise light, cozy home mood, gentle warmth',
  },
  {
    id: '13',
    theme: { id: toThemeId('心绪浮躁'), label: '心绪浮躁' },
    childhood: { title: '何夜无月？何处无竹柏？但少闲人如吾两人者耳。' },
    adulthood: { interpretation: '慢下来，月色就有了诗意' },
    source: { textbook: '八年级上册《记承天寺夜游》苏轼' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt:
      'quiet courtyard under moonlight, bamboo shadows on white wall, stillness, poetic calm',
  },
  {
    id: '14',
    theme: { id: toThemeId('母爱动容'), label: '母爱动容' },
    childhood: { title: '母亲喜欢花，可自从我的腿瘫痪后她侍弄的那些花都死了。' },
    adulthood: { interpretation: '母亲为我，放弃了她的花' },
    source: { textbook: '七年级上册《秋天的怀念》史铁生' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'withered flowers on a windowsill, soft morning light, tender sadness, love',
  },
  {
    id: '15',
    theme: { id: toThemeId('选择迷茫'), label: '选择迷茫' },
    childhood: { title: '一片树林里分出两条路——而我选择了人迹更少的一条。' },
    adulthood: { interpretation: '我选了那条冷清的路' },
    source: { textbook: '七年级下册《未选择的路》弗罗斯特' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'forest path split into two, morning fog, soft light rays, contemplative mood',
  },
  {
    id: '16',
    theme: { id: toThemeId('思念怅惘'), label: '思念怅惘' },
    childhood: { title: '庭有枇杷树，吾妻死之年所手植也，今已亭亭如盖矣。' },
    adulthood: { interpretation: '树长大了，你却不在了' },
    source: { textbook: '高中必修《项脊轩志》归有光' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'a loquat tree in courtyard, sunlight through leaves, quiet emptiness, longing',
  },
  {
    id: '17',
    theme: { id: toThemeId('受挫低落'), label: '受挫低落' },
    childhood: { title: '花和人都会遇到各种各样的不幸，但是生命的长河是无止境的。' },
    adulthood: { interpretation: '不幸会过去，花还会开' },
    source: { textbook: '七年级下册《紫藤萝瀑布》宗璞' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'wisteria flowers blooming, soft fog, gentle light, hopeful spring morning',
  },
  {
    id: '18',
    theme: { id: toThemeId('思乡孤寂'), label: '思乡孤寂' },
    childhood: { title: '夕阳西下，断肠人在天涯。' },
    adulthood: { interpretation: '一个人漂泊，心里空落落' },
    source: { textbook: '七年级上册《天净沙·秋思》马致远' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'silhouette traveler at sunset, long road, orange sky fading to blue, loneliness',
  },
  {
    id: '19',
    theme: { id: toThemeId('亲情亏欠'), label: '亲情亏欠' },
    childhood: { title: '听说北海的花开了，我推着你去走走。' },
    adulthood: { interpretation: '没能陪她看花，成了永远的憾' },
    source: { textbook: '七年级上册《秋天的怀念》史铁生' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'lake park in autumn, distant flowers, wheelchair path, warm melancholy',
  },
  {
    id: '20',
    theme: { id: toThemeId('家庭温情'), label: '家庭温情' },
    childhood: { title: '好像我背上的同她背上的加起来，就是整个世界。' },
    adulthood: { interpretation: '背上的是家，是全世界' },
    source: { textbook: '七年级上册《散步》莫怀戚' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'family walking in park, soft sunset, warm color tones, safe and gentle',
  },
  {
    id: '21',
    theme: { id: toThemeId('亲情慰藉'), label: '亲情慰藉' },
    childhood: {
      title:
        '母亲啊！你是荷叶，我是红莲。心中的雨点来了，除了你，谁是我在无遮拦天空下的荫蔽？',
    },
    adulthood: { interpretation: '妈妈为我挡住了所有风雨' },
    source: { textbook: '七年级上册《荷叶·母亲》冰心' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'lotus leaf sheltering red lotus in rain, soft light, tender protection',
  },
  {
    id: '22',
    theme: { id: toThemeId('亲情遗憾'), label: '亲情遗憾' },
    childhood: { title: '"怎么了呢？"父亲老了。' },
    adulthood: { interpretation: '父亲老了，突然就想哭了' },
    source: { textbook: '八年级上册《台阶》李森祥' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'old man sitting quietly, warm side light, deep wrinkles, time passing',
  },
  {
    id: '23',
    theme: { id: toThemeId('受挫治愈'), label: '受挫治愈' },
    childhood: { title: '花和人都会遇到各种各样的不幸，但是生命的长河是无止境的' },
    adulthood: { interpretation: '生命不停，一切都会过去' },
    source: { textbook: '七年级下册《紫藤萝瀑布》宗璞' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'sunrise over river, light fog, gentle pastel colors, calm healing mood',
  },
  {
    id: '24',
    theme: { id: toThemeId('独处松弛'), label: '独处松弛' },
    childhood: { title: '何夜无月？何处无竹柏？但少闲人如吾两人者耳。' },
    adulthood: { interpretation: '一个人，也有好月色' },
    source: { textbook: '八年级上册《记承天寺夜游》苏轼' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'minimal moonlit alley, bamboo shadows, calm night air, poetic quietness',
  },
  {
    id: '25',
    theme: { id: toThemeId('独处落寞'), label: '独处落寞' },
    childhood: { title: '但热闹是他们的，我什么都没有。' },
    adulthood: { interpretation: '热闹在远处，我在自己的安静里。' },
    source: { textbook: '朱自清《荷塘月色》' },
    actions: { secondaryLabel: '不感兴趣' },
    backgroundPrompt: 'quiet night lake, distant city lights, soft haze, solitary silhouette, calm',
  },
]

export const allCards: TextbookEchoCardData[] = [...systemLikedBuiltinCards, ...builtinCards]
