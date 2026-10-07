import React from 'react'
import { FATIGUE_CATEGORIES, getNormalizedFatigueScore } from '../lib/journey'
import { calculateTimeScore, calculateVitalityScore, formatEvaluationDate } from '../lib/evaluationHistory'

const getStatusLabel = (status) => {
  if (status === 'completed') return 'Finalizada'
  if (status === 'draft') return 'Em andamento'
  return 'Registrada'
}

const valueOrDash = (value, suffix = '') => (
  value === null || value === undefined ? '--' : `${value}${suffix}`
)

const formatDelta = (delta, suffix = '') => {
  if (delta === null || delta === undefined || delta === 0) return 'sem mudança'
  return `${delta > 0 ? '+' : ''}${delta}${suffix}`
}

const getPositiveDeltaClass = (delta) => {
  if (delta === null || delta === undefined || delta === 0) return 'bg-slate-100 text-slate-500'
  return delta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
}

const getFatigueDeltaClass = (delta) => {
  if (delta === null || delta === undefined || delta === 0) return 'bg-slate-100 text-slate-500'
  return delta < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
}

const DeltaBadge = ({ delta, suffix = '', type = 'positive' }) => {
  if (delta === null || delta === undefined) return null
  const className = type === 'fatigue' ? getFatigueDeltaClass(delta) : getPositiveDeltaClass(delta)

  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${className}`}>
      {formatDelta(delta, suffix)}
    </span>
  )
}

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

const getLatestInsights = (rows) => {
  if (rows.length < 2) return []

  const latest = rows[0]
  const insights = []

  if (latest.vitalityDelta !== null && latest.vitalityDelta !== 0) {
    insights.push({
      label: 'Vitalidade',
      text: latest.vitalityDelta > 0 ? `subiu ${latest.vitalityDelta} pontos` : `caiu ${Math.abs(latest.vitalityDelta)} pontos`,
      className: getPositiveDeltaClass(latest.vitalityDelta),
    })
  }

  if (latest.timeDelta !== null && latest.timeDelta !== 0) {
    insights.push({
      label: 'Relação com o tempo',
      text: latest.timeDelta > 0 ? `melhorou ${latest.timeDelta} pontos` : `caiu ${Math.abs(latest.timeDelta)} pontos`,
      className: getPositiveDeltaClass(latest.timeDelta),
    })
  }

  const fatigueMoves = latest.fatigueScores
    .filter(score => score.delta !== null && score.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  fatigueMoves.slice(0, 2).forEach(score => {
    insights.push({
      label: score.label,
      text: score.delta < 0 ? `reduziu ${Math.abs(score.delta)} ponto${Math.abs(score.delta) === 1 ? '' : 's'}` : `aumentou ${score.delta} ponto${score.delta === 1 ? '' : 's'}`,
      className: getFatigueDeltaClass(score.delta),
    })
  })

  return insights.slice(0, 4)
}

const getCurrentSnapshot = (row) => {
  if (!row) return []

  const highestFatigue = getTopFatigue(row, 'highest')
  const lowestFatigue = getTopFatigue(row, 'lowest')
  const snapshot = []

  if (row.vitality !== null && row.vitality !== undefined) {
    snapshot.push({
      label: 'Vitalidade atual',
      text: `${row.vitality}%`,
      helper: 'Energia registrada na última avaliação finalizada.',
      className: 'bg-rose-100 text-brand-pink',
    })
  }

  if (row.time !== null && row.time !== undefined) {
    snapshot.push({
      label: 'Relação com o tempo',
      text: `${row.time}%`,
      helper: 'Satisfação com o uso do tempo na última avaliação.',
      className: 'bg-teal-100 text-primary',
    })
  }

  if (highestFatigue) {
    snapshot.push({
      label: 'Maior cansaço',
      text: `${highestFatigue.label}: ${highestFatigue.value}`,
      helper: 'Ponto que pede mais atenção agora.',
      className: 'bg-amber-100 text-amber-700',
    })
  }

  if (lowestFatigue) {
    snapshot.push({
      label: 'Menor cansaço',
      text: `${lowestFatigue.label}: ${lowestFatigue.value}`,
      helper: 'Área mais leve nesta leitura.',
      className: 'bg-emerald-100 text-emerald-700',
    })
  }

  return snapshot
}

const SummaryCard = ({ item }) => (
  <div className="rounded-2xl border border-white/15 bg-white/10 p-3 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-white/70">{item.label}</p>
    <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${item.className}`}>
      {item.text}
    </p>
    {item.helper && <p className="mt-2 text-xs font-semibold leading-relaxed text-white/75">{item.helper}</p>}
  </div>
)

const MetricBlock = ({ label, value, delta, suffix = '', accent = 'text-white', type = 'positive' }) => (
  <div className="rounded-2xl border border-white/15 bg-white/10 p-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-white/65">{label}</p>
    <p className={`mt-2 text-2xl font-black leading-none ${accent}`}>{value}</p>
    <DeltaBadge delta={delta} suffix={suffix} type={type} />
  </div>
)

const FatigueChip = ({ score }) => (
  <div className="min-w-0 rounded-2xl border border-white/15 bg-white/10 p-3">
    <p className="truncate text-[10px] font-black uppercase tracking-widest text-white/65">{score.label}</p>
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <span className="text-xl font-black leading-none text-white">{valueOrDash(score.value)}</span>
      <DeltaBadge delta={score.delta} type="fatigue" />
    </div>
  </div>
)

const EvaluationComparisonCard = ({ row }) => {
  const highestFatigue = getTopFatigue(row, 'highest')
  const lowestFatigue = getTopFatigue(row, 'lowest')

  return (
    <article className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/65">Autoavaliação</p>
          <h5 className="mt-1 text-lg font-black text-white">{formatEvaluationDate(row.createdAt)}</h5>
        </div>
        <span className="inline-flex w-fit rounded-full bg-mint px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
          {getStatusLabel(row.status)}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricBlock
          label="Vitalidade"
          value={valueOrDash(row.vitality, '%')}
          delta={row.vitalityDelta}
          suffix="%"
          accent="text-brand-pink"
        />
        <MetricBlock
          label="Relação com o tempo"
          value={valueOrDash(row.time, '%')}
          delta={row.timeDelta}
          suffix="%"
          accent="text-mint"
        />
        <MetricBlock
          label="Maior cansaço"
          value={highestFatigue ? `${highestFatigue.label}: ${highestFatigue.value}` : '--'}
          accent="text-white"
        />
        <MetricBlock
          label="Menor cansaço"
          value={lowestFatigue ? `${lowestFatigue.label}: ${lowestFatigue.value}` : '--'}
          accent="text-white"
        />
      </div>

      <div>
        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-white/65">Mapa dos 7 cansaços</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {row.fatigueScores.map(score => <FatigueChip key={score.key} score={score} />)}
        </div>
      </div>
    </article>
  )
}

export const EvaluationComparisonTable = ({ evaluations = [], title = 'Comparativo por data' }) => {
  const completedEvaluations = evaluations.filter(evaluation => evaluation.status === 'completed')
  const inProgressCount = evaluations.length - completedEvaluations.length
  const rows = buildRows(completedEvaluations)
  const insights = getLatestInsights(rows)
  const currentSnapshot = getCurrentSnapshot(rows[0])
  const summaryItems = insights.length > 0 ? insights : currentSnapshot

  return (
    <section className="rounded-[1.75rem] border border-mint/30 bg-primary p-4 shadow-lg shadow-slate-200/60 md:p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-mint px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary shadow-sm">
            Evolução
          </span>
          <h4 className="mt-3 text-xl font-black text-white md:text-2xl">{title}</h4>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-white/75">
            Compare a evolução das autoavaliações finalizadas. Rascunhos ficam no histórico, mas não entram na comparação.
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left shadow-sm md:text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/65">Finalizadas</p>
          <p className="text-2xl font-black text-white">{rows.length}</p>
        </div>
      </div>

      {inProgressCount > 0 && (
        <div className="mb-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-antonio text-sm font-semibold uppercase text-brand-pink shadow-sm">
          {inProgressCount} {inProgressCount === 1 ? 'autoavaliação em andamento ficou fora' : 'autoavaliações em andamento ficaram fora'} deste comparativo até serem finalizadas.
        </div>
      )}

      {rows.length === 0 && (
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-5 shadow-sm">
          <p className="text-sm font-black text-white">Ainda não há autoavaliações finalizadas para comparar.</p>
          <p className="mt-1 text-sm font-medium text-white/70">
            Quando a primeira avaliação for concluída, os indicadores aparecem aqui.
          </p>
        </div>
      )}

      {rows.length === 1 && (
        <div className="mb-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 font-antonio text-sm font-semibold uppercase text-brand-pink shadow-sm">
          Esta é a primeira autoavaliação finalizada. Finalize outra para ver a evolução entre datas.
        </div>
      )}

      {summaryItems.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map(item => <SummaryCard key={`${item.label}-${item.text}`} item={item} />)}
        </div>
      )}

      {rows.length > 0 && <div className="space-y-3">
        {rows.map(row => <EvaluationComparisonCard key={row.id} row={row} />)}
      </div>}
    </section>
  )
}
