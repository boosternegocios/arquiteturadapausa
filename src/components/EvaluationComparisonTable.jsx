import React from 'react'
import { ActivitySquare, ArrowRight, Brain, Check, EyeOff, Heart, Leaf, Lightbulb, Users } from 'lucide-react'
import { FATIGUE_CATEGORIES, getNormalizedFatigueScore } from '../lib/journey'
import { calculateTimeScore, calculateVitalityScore, formatEvaluationDate } from '../lib/evaluationHistory'

const valueOrDash = (value, suffix = '') => (
  value === null || value === undefined ? '--' : `${value}${suffix}`
)

const buildRows = (evaluations = []) => {
  const chronologicalRows = [...evaluations]
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((evaluation) => {
      const scores = evaluation.scores || {}
      const fatigueScores = FATIGUE_CATEGORIES.map(category => ({
        ...category,
        value: scores[category.key] !== undefined && scores[category.key] !== null
          ? getNormalizedFatigueScore(category.key, scores[category.key])
          : null,
      }))

      return {
        id: evaluation.id,
        createdAt: evaluation.created_at,
        status: evaluation.status,
        vitality: calculateVitalityScore(scores),
        time: calculateTimeScore(evaluation.solution_time_relation || {}),
        fatigueScores,
      }
    })

  return chronologicalRows
    .map((row, index) => {
      const previous = chronologicalRows[index - 1]
      const fatigueScores = row.fatigueScores.map(score => {
        const previousScore = previous?.fatigueScores.find(item => item.key === score.key)
        return {
          ...score,
          delta: previousScore?.value !== null && previousScore?.value !== undefined && score.value !== null && score.value !== undefined
            ? Number((score.value - previousScore.value).toFixed(1))
            : null,
        }
      })

      return {
        ...row,
        vitalityDelta: previous?.vitality !== null && previous?.vitality !== undefined && row.vitality !== null && row.vitality !== undefined
          ? row.vitality - previous.vitality
          : null,
        timeDelta: previous?.time !== null && previous?.time !== undefined && row.time !== null && row.time !== undefined
          ? row.time - previous.time
          : null,
        fatigueScores,
      }
    })
    .reverse()
}

const getTopFatigue = (row, direction = 'highest') => {
  if (!row) return null

  const validScores = row.fatigueScores.filter(score => (
    score.value !== null && score.value !== undefined
  ))

  if (validScores.length === 0) return null

  return [...validScores].sort((a, b) => (
    direction === 'highest' ? b.value - a.value : a.value - b.value
  ))[0]
}

const CATEGORY_ICONS = {
  fisico: ActivitySquare,
  sensorial: EyeOff,
  emocional: Heart,
  mental: Brain,
  social: Users,
  criativo: Lightbulb,
  espiritual: Leaf,
}

const valuePercent = (value) => valueOrDash(value, '%')

const ProgressLine = ({ value, colorClass = 'bg-mint' }) => (
  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-300/70">
    <div
      className={`h-full rounded-full ${colorClass}`}
      style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }}
    />
  </div>
)

const CompareMetric = ({ label, value, description, colorClass, lineColor, labelClass = 'text-primary', descriptionClass = 'text-primary/80' }) => (
  <div className="border-slate-300/70 md:border-l md:pl-5">
    <p className={`font-antonio text-[11px] font-semibold uppercase tracking-[0.28em] ${labelClass}`}>{label}</p>
    <p className={`mt-3 text-4xl font-black leading-none ${colorClass}`}>{value}</p>
    <ProgressLine value={Number.parseFloat(value)} colorClass={lineColor} />
    <p className={`mt-3 text-sm font-medium leading-snug ${descriptionClass}`}>{description}</p>
  </div>
)

const CompareCard = ({ row, variant = 'light', title }) => {
  if (!row) return null

  const highestFatigue = getTopFatigue(row, 'highest')
  const lowestFatigue = getTopFatigue(row, 'lowest')
  const isDark = variant === 'dark'
  const panelClass = isDark
    ? 'bg-primary text-white shadow-2xl shadow-primary/25'
    : 'bg-white/45 text-primary shadow-xl shadow-slate-200/70'
  const labelClass = isDark ? 'text-mint' : 'text-primary'
  const bodyClass = isDark ? 'text-white/80' : 'text-primary/80'
  const dividerClass = isDark ? 'border-white/20' : 'border-slate-300/70'
  const mutedMetricClass = isDark ? 'text-white' : 'text-primary'
  const vitalityColor = isDark ? 'text-mint' : 'text-brand-pink'
  const timeColor = isDark ? 'text-mint' : 'text-primary'

  return (
    <article className={`rounded-[1.6rem] p-5 md:p-6 ${panelClass}`}>
      <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-start md:justify-between">
        <div className={dividerClass}>
          <p className={`font-antonio text-[12px] font-semibold uppercase tracking-[0.32em] ${labelClass}`}>{title}</p>
          <h5 className="mt-3 font-antonio text-2xl font-semibold uppercase tracking-wide">{formatEvaluationDate(row.createdAt)}</h5>
        </div>
        {isDark && (
          <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-mint px-4 py-2 font-antonio text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Check size={16} /> Finalizada
          </span>
        )}
      </div>

      <div className={`mt-5 grid gap-5 border-b pb-5 md:grid-cols-2 ${dividerClass}`}>
        <CompareMetric
          label="Vitalidade"
          value={valuePercent(row.vitality)}
          description="Energia registrada na avaliação."
          colorClass={vitalityColor}
          lineColor={isDark ? 'bg-mint' : 'bg-brand-pink'}
          labelClass={isDark ? 'text-mint' : 'text-primary'}
          descriptionClass={isDark ? 'text-white/80' : 'text-primary/80'}
        />
        <CompareMetric
          label="Relação com o tempo"
          value={valuePercent(row.time)}
          description="Satisfação com o uso do tempo."
          colorClass={timeColor}
          lineColor={isDark ? 'bg-mint' : 'bg-primary'}
          labelClass={isDark ? 'text-mint' : 'text-primary'}
          descriptionClass={isDark ? 'text-white/80' : 'text-primary/80'}
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className={`md:border-l md:pl-5 ${dividerClass}`}>
          <p className={`font-antonio text-[11px] font-semibold uppercase tracking-[0.28em] ${labelClass}`}>Maior cansaço</p>
          <p className={`mt-3 text-2xl font-black ${mutedMetricClass}`}>{highestFatigue ? `${highestFatigue.label}: ${highestFatigue.value}` : '--'}</p>
          <p className={`mt-2 text-sm font-medium leading-snug ${bodyClass}`}>Ponto que pede mais atenção.</p>
        </div>
        <div className={`md:border-l md:pl-5 ${dividerClass}`}>
          <p className={`font-antonio text-[11px] font-semibold uppercase tracking-[0.28em] ${labelClass}`}>Menor cansaço</p>
          <p className={`mt-3 text-2xl font-black ${mutedMetricClass}`}>{lowestFatigue ? `${lowestFatigue.label}: ${lowestFatigue.value}` : '--'}</p>
          <p className={`mt-2 text-sm font-medium leading-snug ${bodyClass}`}>Área mais leve nesta leitura.</p>
        </div>
      </div>
    </article>
  )
}

const AreaEvolution = ({ firstRow, latestRow }) => (
  <div className="rounded-[1.6rem] bg-white/45 p-5 shadow-xl shadow-slate-200/60 md:p-6">
    <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
      <div>
        <p className="font-antonio text-sm font-semibold uppercase tracking-[0.35em] text-brand-pink">Mapa dos 7 cansaços</p>
        <h5 className="mt-2 font-antonio text-4xl font-semibold uppercase leading-none text-primary md:text-5xl">
          Evolução <span className="text-brand-pink">por área</span>
        </h5>
      </div>
      <p className="text-sm font-medium leading-relaxed text-primary/80">
        Veja como cada área evoluiu da primeira autoavaliação para a mais recente.
      </p>
      <div className="flex w-fit items-center gap-4 rounded-xl bg-white/80 px-4 py-3 text-xs font-bold text-primary shadow-sm">
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-brand-pink" /> Primeira avaliação</span>
        <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-mint" /> Avaliação finalizada</span>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
      {latestRow.fatigueScores.map(score => {
        const firstScore = firstRow.fatigueScores.find(item => item.key === score.key)
        const Icon = CATEGORY_ICONS[score.key] || ActivitySquare
        const firstValue = firstScore?.value ?? null
        const latestValue = score.value ?? null

        return (
          <div key={score.key} className="border-primary/15 lg:border-l lg:pl-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-mint/70 text-primary">
              <Icon size={22} />
            </div>
            <p className="mt-3 text-center font-antonio text-lg font-semibold uppercase tracking-[0.15em] text-primary">{score.label}</p>
            <div className="mt-4 flex items-end justify-center gap-3">
              <div className="text-center">
                <p className="mb-2 text-lg font-black text-brand-pink">{valueOrDash(firstValue)}</p>
                <div className="h-20 w-8 rounded-lg bg-brand-pink" />
              </div>
              <div className="text-center">
                <p className="mb-2 text-lg font-black text-mint">{valueOrDash(latestValue)}</p>
                <div className="h-20 w-8 rounded-lg bg-mint" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  </div>
)

export const EvaluationComparisonTable = ({ evaluations = [], title = 'Comparativo por data' }) => {
  const completedEvaluations = evaluations.filter(evaluation => evaluation.status === 'completed')
  const inProgressCount = evaluations.length - completedEvaluations.length
  const rows = buildRows(completedEvaluations)
  const latestRow = rows[0]
  const firstRow = rows[rows.length - 1]

  return (
    <section className="rounded-[1.75rem] bg-[#fbf6ec] p-4 shadow-lg shadow-slate-200/60 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1fr_1.2fr] xl:items-stretch">
        <div className="flex flex-col justify-center">
          <p className="font-antonio text-sm font-semibold uppercase tracking-[0.45em] text-brand-pink">Evolução real</p>
          <h4 className="mt-4 font-antonio text-5xl font-semibold uppercase leading-[0.95] text-primary md:text-7xl">{title}</h4>
          <div className="mt-5 h-1.5 w-20 bg-brand-pink" />
          <p className="mt-6 max-w-sm text-lg font-medium leading-relaxed text-primary/85">
            Compare a evolução das autoavaliações finalizadas. Rascunhos ficam no histórico, mas não entram na comparação.
          </p>
        </div>

        {rows.length > 0 && (
          <CompareCard row={firstRow} title="Primeira avaliação" />
        )}

        {rows.length > 0 && (
          <div className="relative">
            {rows.length > 1 && (
              <div className="absolute -left-8 top-1/2 z-10 hidden -translate-y-1/2 xl:block">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-pink text-white shadow-xl shadow-brand-pink/30">
                  <ArrowRight size={34} />
                </div>
              </div>
            )}
            <CompareCard row={latestRow} title="Avaliação finalizada" variant="dark" />
          </div>
        )}
      </div>

      {inProgressCount > 0 && (
        <div className="mt-5 rounded-2xl border border-brand-pink/15 bg-white/60 px-4 py-3 font-antonio text-sm font-semibold uppercase text-brand-pink shadow-sm">
          {inProgressCount} {inProgressCount === 1 ? 'autoavaliação em andamento ficou fora' : 'autoavaliações em andamento ficaram fora'} deste comparativo até serem finalizadas.
        </div>
      )}

      {rows.length === 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white/70 px-4 py-5 shadow-sm">
          <p className="text-sm font-black text-primary">Ainda não há autoavaliações finalizadas para comparar.</p>
          <p className="mt-1 text-sm font-medium text-primary/70">
            Quando a primeira avaliação for concluída, os indicadores aparecem aqui.
          </p>
        </div>
      )}

      {rows.length === 1 && (
        <div className="mt-5 rounded-2xl border border-brand-pink/15 bg-white/60 px-4 py-3 font-antonio text-sm font-semibold uppercase text-brand-pink shadow-sm">
          Esta é a primeira autoavaliação finalizada. Finalize outra para ver a evolução entre datas.
        </div>
      )}

      {rows.length > 0 && <div className="mt-6"><AreaEvolution firstRow={firstRow} latestRow={latestRow} /></div>}
    </section>
  )
}
