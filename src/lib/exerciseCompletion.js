const hasText = (value) => String(value || '').trim() !== ''
const allFilled = (arr) => Array.isArray(arr) && arr.length > 0 && arr.every(item => hasText(item))
const hasAnyFilled = (arr) => Array.isArray(arr) && arr.some(item => hasText(item))

export const getMissingExerciseFields = (category, data) => {
  if (!data) return ['Preencha os campos do exercício.']

  const missing = []

  switch (category) {
    case 'fisico': {
      if (!data.act01?.list || !data.act01.list.every(i => hasText(i.act) && hasText(i.rest))) missing.push('atividade 01')
      if (!data.act02?.records) missing.push('atividade 02')
      const records = Object.values(data.act02?.records || {})
      if (records.length !== 7 || !records.every(r => r.state && hasText(r.why))) missing.push('tabela de 7 dias')
      if (!data.act04 || ['temp', 'dark', 'cafeina', 'silencio', 'sons', 'aromas', 'cama'].some(k => typeof data.act04[k] !== 'number')) {
        missing.push('escala da atividade 04')
      }
      return missing
    }

    case 'criativo':
      if (!allFilled(data.act01?.list) || data.act01.list.length < 4) missing.push('as 4 belezas da atividade 01')
      if (!data.act02 || ['daily', 'weekly', 'monthly', 'yearly'].some(k => !hasText(data.act02[k]))) missing.push('os 4 períodos da atividade 02')
      return missing

    case 'mental':
      if (!data.act03 || ['imagens', 'frases', 'pessoas', 'lugares', 'eventos', 'emocoes', 'medos', 'duvidas'].some(k => !hasText(data.act03[k]))) {
        missing.push('atividade 03')
      }
      if (!data.act04?.list || !data.act04.list.every(i => hasText(i.negative) && hasText(i.positive))) missing.push('atividade 04')
      return missing

    case 'sensorial': {
      const act02Keys = ['desconectar', 'brilho', 'silenciar', 'silencio', 'frutas', 'olhos', 'tampaos']
      if (!data.act02 || act02Keys.some(k => typeof data.act02[k] !== 'number')) missing.push('escala sensorial')
      return missing
    }

    case 'emocional':
      if (!data.act01 || ['outros', 'consigo'].some(k => typeof data.act01[k] !== 'number')) missing.push('atividade 01')
      if (!data.act02 || ['social', 'educacional', 'interessantes', 'infeliz'].some(k => !hasText(data.act02[k]) || typeof data.act02[`${k}_nota`] !== 'number')) {
        missing.push('atividade 02')
      }
      return missing

    case 'social':
      if (!hasAnyFilled(data.act01?.drainers) || !hasAnyFilled(data.act01?.boosters)) missing.push('atividade 01')
      if ((!hasAnyFilled(data.act02?.presencial) && !hasAnyFilled(data.act02?.online)) || !hasText(data.act02?.action)) missing.push('atividade 02')
      return missing

    case 'espiritual':
      if (!hasText(data.act01?.text) || !hasText(data.act02?.text) || !hasText(data.act03?.text)) missing.push('atividades 01, 02 e 03')
      return missing

    default:
      return ['Exercício não encontrado.']
  }
}

export const isExerciseComplete = (category, data) =>
  Boolean(data?.isCompleted) || getMissingExerciseFields(category, data).length === 0
