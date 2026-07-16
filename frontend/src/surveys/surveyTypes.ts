export type SurveyScaleOption = {
  value: number
  label: string
}

export type SurveyIllustration = {
  values: number[]
  src: string
  alt: string
}

export type SurveyQuestion = {
  id: string
  title: string
  subtitle: string
  descriptions: Record<number, string>
  illustrations?: SurveyIllustration[]
}

export type SurveyConfig = {
  id: string
  title: string
  description: string
  scale: SurveyScaleOption[]
  questions: SurveyQuestion[]
}

export type SurveyAnswers = Record<string, number>

export type SurveyResult = {
  surveyId: string
  playerName: string
  characterName: string
  answers: SurveyAnswers
}