export type TextbookEchoCardId = string

export interface TextbookEchoTheme {
  id: string
  label: string
}

export interface TextbookEchoChildhoodText {
  title: string
}

export interface TextbookEchoAdulthoodEcho {
  interpretation: string
}

export interface TextbookEchoSource {
  textbook: string
}

export interface TextbookEchoActions {
  primaryLabel?: string
  secondaryLabel?: string
}

export interface TextbookEchoDebugInfo {
  fileName?: string
  grade?: string
  pickId?: string
  heading?: string
  lineNo?: number
  origin?: string
  start?: number
  end?: number
}

export interface TextbookEchoCardData {
  id: TextbookEchoCardId
  theme: TextbookEchoTheme
  childhood: TextbookEchoChildhoodText
  adulthood: TextbookEchoAdulthoodEcho
  source: TextbookEchoSource
  actions?: TextbookEchoActions
  backgroundPrompt?: string
  __debug?: TextbookEchoDebugInfo
}
