import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { isExerciseComplete } from '../lib/exerciseCompletion'
import { supabase } from '../lib/supabase'

const LABELS = {
  solution_satisfaction: 'Índice de satisfação',
  solution_time_relation: 'Relação com o tempo',
  solution_internal_speed: 'Velocidade interna',
  solution_beliefs: 'Crenças e reflexões',
  solution_rhythm_impacts: 'Impactos no ritmo',
  scores: 'Diagnóstico dos 7 cansaços',
  top_fatigue_solution: 'Exercícios práticos',
  answers: 'Notas do diagnóstico',
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
  act: 'O que cansa',
  rest: 'Como restaurar',
  why: 'Observação',
  state: 'Estado',
  category: 'Área',
  text: 'Resposta',
  temp: 'Temperatura do quarto',
  dark: 'Nível de escuridão',
  cafeina: 'Gestão da cafeína',
  silencio: 'Silêncio',
  sons: 'Sons relaxantes',
  aromas: 'Aromas e tecidos',
  cama: 'Colchão e travesseiro',
  desconectar: 'Desconectar do celular',
  brilho: 'Ajustar brilho das telas',
  silenciar: 'Silenciar notificações',
  frutas: 'Frutas e vegetais naturais',
  olhos: 'Fechar os olhos durante o dia',
  tampaos: 'Tampões de ouvido',
  estimulo: 'Estímulo que sobrecarrega',
  melhorar: 'Como melhorar',
  imagens: 'Imagens recorrentes',
  frases: 'Frases que escuta',
  pessoas: 'Pessoas',
  lugares: 'Lugares',
  eventos: 'Eventos ou compromissos',
  emocoes: 'Emoções predominantes',
  medos: 'Medos',
  duvidas: 'Dúvidas',
  negative: 'Pensamento negativo',
  positive: 'Afirmação positiva',
  outros: 'Com os outros',
  consigo: 'Consigo mesma',
  educacional: 'Nível educacional',
  interessantes: 'Pessoas mais interessantes',
  infeliz: 'Estado emocional',
  social_nota: 'Nota de atenção social',
  educacional_nota: 'Nota de atenção educacional',
  interessantes_nota: 'Nota de atenção',
  infeliz_nota: 'Nota de atenção emocional',
  paz: 'Experiência de paz',
}

const INTERNAL_KEYS = new Set(['isCompleted'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CATEGORY_ORDER = ['fisico', 'mental', 'emocional', 'social', 'espiritual', 'sensorial', 'criativo']
const SCALE_SECTIONS = new Set(['scores', 'solution_satisfaction', 'solution_time_relation', 'solution_internal_speed'])

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
  if (key.endsWith('_nota')) {
    return `${labelFor(key.replace(/_nota$/, ''))} - nota`
  }
  if (UUID_PATTERN.test(key)) return 'Pergunta registrada'
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

const isScalar = (value) => value === null || typeof value !== 'object'

const visibleEntries = (value) => Object.entries(value || {})
  .filter(([key, nested]) => !key.startsWith('_') && !INTERNAL_KEYS.has(key) && !isEmptyValue(nested))

const RenderValue = ({ value, depth = 0, compact = false }) => {
  if (isEmptyValue(value)) return null

  if (Array.isArray(value)) {
    const visibleItems = value.filter(item => !isEmptyValue(item))
    if (visibleItems.length === 0) return null

    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {visibleItems.map((item, index) => (
          <div key={index} className="min-w-0 rounded-xl border border-slate-100 bg-white p-3">
            {typeof item === 'object' && item !== null ? (
              <RenderValue value={item} depth={depth + 1} compact />
            ) : (
              <p className="break-words text-sm font-semibold text-slate-700">{formatScalar(item)}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = visibleEntries(value)

    if (entries.length === 0) return null
    const allScalars = entries.every(([, nested]) => isScalar(nested))

    if (allScalars || compact) {
      return (
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {entries.map(([key, nested]) => (
            <div key={key} className="min-w-0 rounded-xl border border-slate-100 bg-white p-3">
              <dt className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{labelFor(key)}</dt>
              {isScalar(nested) ? (
                <dd className="break-words text-sm font-bold text-slate-700 whitespace-pre-wrap">{formatScalar(nested)}</dd>
              ) : (
                <dd><RenderValue value={nested} depth={depth + 1} compact /></dd>
              )}
            </div>
          ))}
        </dl>
      )
    }

    return (
      <div className={depth === 0 ? 'grid grid-cols-1 gap-3 lg:grid-cols-2' : 'space-y-2'}>
        {entries.map(([key, nested]) => (
          <div key={key} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{labelFor(key)}</p>
            {typeof nested === 'object' && nested !== null ? (
              <RenderValue value={nested} depth={depth + 1} />
            ) : (
              <p className="break-words text-sm font-bold text-slate-700 whitespace-pre-wrap">{formatScalar(nested)}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return <p className="break-words text-sm font-bold text-slate-700 whitespace-pre-wrap">{formatScalar(value)}</p>
}

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
    <h4 className="mb-3 text-base font-black text-slate-800">{title}</h4>
    {children}
  </section>
)

const ScaleSection = ({ title, value }) => {
  const entries = visibleEntries(value)
  if (entries.length === 0) return null

  return (
    <Section title={title}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, score]) => (
          <div key={key} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <span className="break-words text-sm font-bold text-slate-600">{labelFor(key)}</span>
            <span className="shrink-0 rounded-full bg-[#004b4c] px-3 py-1 text-xs font-black text-white">
              {formatScalar(score)}
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

const sortAnswers = ([aKey, aQuestion], [bKey, bQuestion]) => {
  const aCategory = aQuestion?.category || ''
  const bCategory = bQuestion?.category || ''
  const aCategoryIndex = CATEGORY_ORDER.indexOf(aCategory)
  const bCategoryIndex = CATEGORY_ORDER.indexOf(bCategory)
  const safeA = aCategoryIndex === -1 ? CATEGORY_ORDER.length : aCategoryIndex
  const safeB = bCategoryIndex === -1 ? CATEGORY_ORDER.length : bCategoryIndex
  if (safeA !== safeB) return safeA - safeB
  return (aQuestion?.order_index || 999) - (bQuestion?.order_index || 999) || aKey.localeCompare(bKey)
}

const AnswersSection = ({ answers, questionsById }) => {
  const entries = visibleEntries(answers)
    .map(([key, value]) => [key, value, questionsById[key]])
    .sort(([aKey, , aQuestion], [bKey, , bQuestion]) => sortAnswers([aKey, aQuestion], [bKey, bQuestion]))

  if (entries.length === 0) return null

  const grouped = entries.reduce((acc, [key, value, question]) => {
    const category = question?.category || 'outros'
    if (!acc[category]) acc[category] = []
    acc[category].push([key, value, question])
    return acc
  }, {})

  return (
    <Section title="Notas do diagnóstico">
      <div className="space-y-3">
        {Object.entries(grouped).map(([category, categoryEntries]) => (
          <div key={category} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
            <h5 className="mb-3 font-black text-slate-800">{category === 'outros' ? 'Perguntas registradas' : labelFor(category)}</h5>
            <div className="space-y-2">
              {categoryEntries.map(([key, value, question], index) => (
                <div key={key} className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {question?.order_index ? `Pergunta ${question.order_index}` : `Registro ${index + 1}`}
                    </p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-700">
                      {question?.text || 'Resposta registrada na avaliação.'}
                    </p>
                  </div>
                  <span className="w-max shrink-0 rounded-full bg-[#eb6496] px-3 py-1 text-xs font-black text-white">
                    Nota {formatScalar(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

const ExercisesSection = ({ solutions }) => {
  const entries = Object.entries(solutions || {}).filter(([, data]) => !isEmptyValue(data))
  if (entries.length === 0) return null

  return (
    <Section title="Exercícios práticos, planos e compromissos">
      <div className="space-y-3">
        {entries.map(([category, data]) => {
          const completed = isExerciseComplete(category, data)
          return (
            <div key={category} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h5 className="font-black text-slate-800">{labelFor(category)}</h5>
                {completed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    <CheckCircle2 size={12} />
                    Concluído
                  </span>
                )}
              </div>
              <RenderValue value={data} compact />
            </div>
          )
        })}
      </div>
    </Section>
  )
}

export const EvaluationResponseSummary = ({ evaluation }) => {
  const [questions, setQuestions] = useState([])

  useEffect(() => {
    let isMounted = true

    const fetchQuestions = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, category, order_index, text')
        .order('category', { ascending: true })
        .order('order_index', { ascending: true })

      if (!isMounted) return

      if (error) {
        console.warn('Falha ao buscar perguntas para o histórico:', error)
        setQuestions([])
        return
      }

      setQuestions([
        ...(data || []),
        {
          id: 'mental_8',
          category: 'mental',
          order_index: 8,
          text: 'Com frequência tenho dificuldade de me concentrar',
        },
      ])
    }

    fetchQuestions()

    return () => {
      isMounted = false
    }
  }, [])

  const questionsById = useMemo(() => {
    return questions.reduce((acc, question) => {
      acc[question.id] = question
      return acc
    }, {})
  }, [questions])

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
  ].filter(([, value]) => !isEmptyValue(value))

  const hasContent = sections.length > 0 || !isEmptyValue(evaluation.answers) || !isEmptyValue(evaluation.top_fatigue_solution)

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
        SCALE_SECTIONS.has(key) ? (
          <ScaleSection key={key} title={LABELS[key] || labelFor(key)} value={value} />
        ) : (
          <Section key={key} title={LABELS[key] || labelFor(key)}>
            <RenderValue value={value} compact />
          </Section>
        )
      ))}
      <AnswersSection answers={evaluation.answers} questionsById={questionsById} />
      <ExercisesSection solutions={evaluation.top_fatigue_solution} />
    </div>
  )
}
