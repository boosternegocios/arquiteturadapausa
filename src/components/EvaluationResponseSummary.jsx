import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { isExerciseComplete } from '../lib/exerciseCompletion'

const LABELS = {
  solution_satisfaction: 'Índice de satisfação',
  solution_time_relation: 'Relação com o tempo',
  solution_internal_speed: 'Velocidade interna',
  solution_beliefs: 'Crenças e reflexões',
  solution_rhythm_impacts: 'Impactos no ritmo',
  scores: 'Diagnóstico dos 7 cansaços',
  top_fatigue_solution: 'Exercícios práticos',
  answers: 'Notas da autoavaliação',
  foco: 'Foco',
  produtividade: 'Produtividade',
  realizacao: 'Realização',
  ritmo: 'Ritmo',
  equilibrio: 'Equilibra as esferas da vida',
  importancia: 'Prioriza atividades',
  mensagens: 'Protege o tempo pessoal',
  tempo_livre: 'Satisfeito com o tempo livre',
  delega_centraliza: 'Delega com segurança',
  limite_corpo: 'Respeita o corpo',
  stress: 'Não sente stress',
  frustracao_agenda: 'Satisfeito com a agenda',
  acelerada_lenta: 'Acelerada x lenta',
  focada_relaxada: 'Focada x relaxada',
  paciente_impaciente: 'Paciente x impaciente',
  ponderada_impulsiva: 'Ponderada x impulsiva',
  decisao_rapida_lenta: 'Decisão rápida x lenta',
  fisico: 'Cansaço físico',
  mental: 'Cansaço mental',
  emocional: 'Cansaço emocional',
  social: 'Cansaço social',
  espiritual: 'Cansaço espiritual',
  sensorial: 'Cansaço sensorial',
  criativo: 'Cansaço criativo',
  action: 'Plano de ação',
  actionPlan: 'Plano de ação',
  when: 'Quando',
  duration: 'Duração',
  metric: 'Métrica',
  list: 'Lista',
  records: 'Registros',
  drainers: 'Pessoas que drenam energia',
  boosters: 'Pessoas que abastecem energia',
  presencial: 'Interações presenciais',
  online: 'Interações online',
  daily: 'Restauração diária',
  weekly: 'Restauração semanal',
  monthly: 'Restauração mensal',
  yearly: 'Momento sabático anual',
}

const INTERNAL_KEYS = new Set(['isCompleted'])

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.every(isEmptyValue)
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !key.startsWith('_') && !INTERNAL_KEYS.has(key))
      .every(([, nested]) => isEmptyValue(nested))
  }
  return false
}

const labelFor = (key) => {
  if (LABELS[key]) return LABELS[key]
  if (/^[a-z]+_\d+$/i.test(key)) return `Pergunta ${key.split('_').pop()}`
  if (/^act\d+$/i.test(key)) return `Atividade ${key.replace(/\D/g, '')}`
  return key
    .replace(/^_+/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

const formatScalar = (value) => {
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (typeof value === 'number') return String(value)
  return String(value)
}

const RenderValue = ({ value, depth = 0 }) => {
  if (isEmptyValue(value)) return null

  if (Array.isArray(value)) {
    const visibleItems = value.filter(item => !isEmptyValue(item))
    if (visibleItems.length === 0) return null

    return (
      <div className="space-y-2">
        {visibleItems.map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-white/70 p-3">
            {typeof item === 'object' && item !== null ? (
              <RenderValue value={item} depth={depth + 1} />
            ) : (
              <p className="text-sm font-medium text-slate-700">{formatScalar(item)}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([key, nested]) => !key.startsWith('_') && !INTERNAL_KEYS.has(key) && !isEmptyValue(nested))

    if (entries.length === 0) return null

    return (
      <div className={depth === 0 ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'space-y-3'}>
        {entries.map(([key, nested]) => (
          <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{labelFor(key)}</p>
            {typeof nested === 'object' && nested !== null ? (
              <RenderValue value={nested} depth={depth + 1} />
            ) : (
              <p className="text-sm font-bold text-slate-700 whitespace-pre-wrap">{formatScalar(nested)}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return <p className="text-sm font-bold text-slate-700 whitespace-pre-wrap">{formatScalar(value)}</p>
}

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <h4 className="mb-4 text-base font-black text-slate-800">{title}</h4>
    {children}
  </section>
)

const ExercisesSection = ({ solutions }) => {
  const entries = Object.entries(solutions || {}).filter(([, data]) => !isEmptyValue(data))
  if (entries.length === 0) return null

  return (
    <Section title="Exercícios práticos, planos e compromissos">
      <div className="space-y-4">
        {entries.map(([category, data]) => {
          const completed = isExerciseComplete(category, data)
          return (
            <div key={category} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h5 className="font-black text-slate-800">{labelFor(category)}</h5>
                {completed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    <CheckCircle2 size={12} />
                    Concluído
                  </span>
                )}
              </div>
              <RenderValue value={data} />
            </div>
          )
        })}
      </div>
    </Section>
  )
}

export const EvaluationResponseSummary = ({ evaluation }) => {
  if (!evaluation) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">
        Nenhuma avaliação selecionada.
      </div>
    )
  }

  const sections = [
    ['solution_satisfaction', evaluation.solution_satisfaction],
    ['solution_time_relation', evaluation.solution_time_relation],
    ['solution_internal_speed', evaluation.solution_internal_speed],
    ['solution_beliefs', evaluation.solution_beliefs],
    ['solution_rhythm_impacts', evaluation.solution_rhythm_impacts],
    ['scores', evaluation.scores],
    ['answers', evaluation.answers],
  ].filter(([, value]) => !isEmptyValue(value))

  const hasContent = sections.length > 0 || !isEmptyValue(evaluation.top_fatigue_solution)

  if (!hasContent) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">
        Ainda não há respostas preenchidas nesta avaliação.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sections.map(([key, value]) => (
        <Section key={key} title={LABELS[key] || labelFor(key)}>
          <RenderValue value={value} />
        </Section>
      ))}
      <ExercisesSection solutions={evaluation.top_fatigue_solution} />
    </div>
  )
}
