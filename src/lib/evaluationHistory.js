import {
  FATIGUE_CATEGORY_KEYS,
  SATISFACTION_KEYS,
  TIME_RELATION_KEYS,
  getFatiguePercent,
} from './journey'

export const EVALUATION_QUERY_PARAM = 'avaliacao'

export const getEvaluationIdFromSearchParams = (searchParams) => {
  const evaluationId = searchParams.get(EVALUATION_QUERY_PARAM)
  return evaluationId && evaluationId.trim() ? evaluationId.trim() : null
}

export const buildEvaluationScopedPath = (path, evaluationId) => {
  if (!evaluationId) return path
  return `${path}?${EVALUATION_QUERY_PARAM}=${encodeURIComponent(evaluationId)}`
}

export const hasCompleteFatigueScores = (scores = {}) => (
  FATIGUE_CATEGORY_KEYS.every((key) => scores[key] !== undefined && scores[key] !== null)
)

export const hasCompleteSpeedRadar = (evaluation = {}) => {
  const timeRelation = evaluation.solution_time_relation || {}
  const satisfaction = evaluation.solution_satisfaction || {}

  return (
    TIME_RELATION_KEYS.every((key) => timeRelation[key] !== undefined && timeRelation[key] !== null) &&
    SATISFACTION_KEYS.every((key) => satisfaction[key] !== undefined && satisfaction[key] !== null)
  )
}

export const calculateFatigueAverage = (scores = {}) => {
  const values = FATIGUE_CATEGORY_KEYS
    .map((key) => scores[key] !== undefined && scores[key] !== null ? getFatiguePercent(key, scores[key]) : null)
    .filter((value) => value !== null)

  if (!values.length) return null

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export const calculateVitalityScore = (scores = {}) => {
  const fatigueAverage = calculateFatigueAverage(scores)
  return fatigueAverage === null ? null : 100 - fatigueAverage
}

export const calculateTimeScore = (timeRelation = {}) => {
  const values = Object.values(timeRelation)
    .filter((value) => value !== undefined && value !== null)
    .map((value) => Math.min(100, value * 10))

  if (!values.length) return null

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export const formatEvaluationDate = (value) => {
  if (!value) return 'Data indisponível'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
