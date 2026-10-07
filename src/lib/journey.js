export const PATHS = {
  home: '/autoavaliacao',
  dashboard: '/radar-velocidade',
  profile: '/perfil',
  credits: '/creditos',
  result: '/resultado',
  solution: '/solucao',
  continueHealing: '/exercicios',
  contact: '/plano-de-acao',
  payment: '/pagamento',
  vitality: '/radar-vitalidade',
  admin: '/admin',
  login: '/entrar',
  register: '/cadastro',
  resetPassword: '/recuperar-senha',
  updatePassword: '/atualizar-senha',
}

export const FATIGUE_CATEGORIES = [
  { key: 'fisico', label: 'Físico', max: 80 },
  { key: 'sensorial', label: 'Sensorial', max: 80 },
  { key: 'emocional', label: 'Emocional', max: 80 },
  { key: 'mental', label: 'Mental', max: 80 },
  { key: 'social', label: 'Social', max: 80 },
  { key: 'criativo', label: 'Criativo', max: 90 },
  { key: 'espiritual', label: 'Espiritual', max: 50 },
]

export const FATIGUE_CATEGORY_KEYS = FATIGUE_CATEGORIES.map(category => category.key)

export const FATIGUE_CATEGORY_CONFIG = FATIGUE_CATEGORIES.reduce((acc, category) => {
  acc[category.key] = category
  return acc
}, {})

export const ASSESSMENT_CATEGORY_ORDER = FATIGUE_CATEGORY_KEYS

export const RADAR_CATEGORY_ORDER = [
  'fisico',
  'mental',
  'emocional',
  'social',
  'espiritual',
  'sensorial',
  'criativo',
]

export const SATISFACTION_KEYS = ['foco', 'produtividade', 'realizacao', 'ritmo']

export const TIME_RELATION_KEYS = [
  'equilibrio',
  'importancia',
  'mensagens',
  'tempo_livre',
  'delega_centraliza',
  'limite_corpo',
  'stress',
  'frustracao_agenda',
]

export const INTERNAL_SPEED_KEYS = [
  'acelerada_lenta',
  'focada_relaxada',
  'paciente_impaciente',
  'ponderada_impulsiva',
  'decisao_rapida_lenta',
]

export const BELIEF_KEYS = [
  'sacrificio',
  'utilidade',
  'sozinho',
  'meta_x',
  'pressao',
  'desorganizado',
  'bem_feito',
  'liberdade',
  'improdutivo',
  'tempo_insuficiente',
  'dar_conta',
]

export const RECOVERY_STEP_SLUGS = {
  satisfaction: 'satisfacao',
  'time-relation': 'relacao-tempo',
  'internal-speed': 'velocidade-interna',
  beliefs: 'crencas',
  cycle: 'ciclos',
  'time-tips': 'dicas-tempo',
  pauses: 'pausas',
}

export const RECOVERY_SLUG_TO_STEP = Object.entries(RECOVERY_STEP_SLUGS).reduce((acc, [id, slug]) => {
  acc[slug] = id
  return acc
}, {})

export const getAssessmentPath = (category) => `/avaliacao/${category}`

export const getRecoveryPath = (stepId) => `/recuperacao/${RECOVERY_STEP_SLUGS[stepId] || stepId}`

export const getSpecificSolutionPath = (category) => `/exercicio/${category}`

export const normalizeRecoveryStep = (stepSlug) => RECOVERY_SLUG_TO_STEP[stepSlug] || stepSlug

export const getFatiguePercent = (categoryKey, rawValue = 0) => {
  const max = FATIGUE_CATEGORY_CONFIG[categoryKey]?.max || 100
  return Math.min(100, Math.round(((rawValue || 0) / max) * 100))
}

export const getNormalizedFatigueScore = (categoryKey, rawValue = 0) => {
  const max = FATIGUE_CATEGORY_CONFIG[categoryKey]?.max || 100
  return Number((((rawValue || 0) / max) * 10).toFixed(1))
}

export const getTopFatigueCategory = (rawScores = {}) => {
  let highest = null

  FATIGUE_CATEGORIES.forEach(category => {
    const percentage = getFatiguePercent(category.key, rawScores[category.key])
    if (!highest || percentage > highest.percentage) {
      highest = { ...category, percentage }
    }
  })

  return highest
}
