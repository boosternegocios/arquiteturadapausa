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

export const EvaluationComparisonTable = ({ evaluations = [], title = 'Comparativo por data' }) => {
  const rows = buildRows(evaluations)
  const insights = getLatestInsights(rows)

  if (rows.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4">
        <h4 className="text-lg font-black text-slate-800">{title}</h4>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Compare a evolução dos principais indicadores em cada autoavaliação.
        </p>
      </div>

      {insights.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {insights.map(insight => (
            <div key={`${insight.label}-${insight.text}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{insight.label}</p>
              <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-black ${insight.className}`}>
                {insight.text}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[980px] border-separate border-spacing-y-2 text-left">
          <thead>
            <tr>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Vitalidade</th>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo</th>
              {FATIGUE_CATEGORIES.map(category => (
                <th key={category.key} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {category.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="rounded-l-xl bg-slate-50 px-3 py-3 text-xs font-black text-slate-800">
                  {formatEvaluationDate(row.createdAt)}
                </td>
                <td className="bg-slate-50 px-3 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {getStatusLabel(row.status)}
                  </span>
                </td>
                <td className="bg-slate-50 px-3 py-3 text-sm font-black text-brand-pink">
                  <div>{valueOrDash(row.vitality, '%')}</div>
                  <DeltaBadge delta={row.vitalityDelta} suffix="%" />
                </td>
                <td className="bg-slate-50 px-3 py-3 text-sm font-black text-primary">
                  <div>{valueOrDash(row.time, '%')}</div>
                  <DeltaBadge delta={row.timeDelta} suffix="%" />
                </td>
                {row.fatigueScores.map(score => (
                  <td key={score.key} className="bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
                    <div>{valueOrDash(score.value)}</div>
                    <DeltaBadge delta={score.delta} type="fatigue" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {rows.map(row => (
          <div key={row.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Iniciada em</p>
                <p className="text-sm font-black text-slate-800">{formatEvaluationDate(row.createdAt)}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${row.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {getStatusLabel(row.status)}
              </span>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vitalidade</p>
                <p className="text-lg font-black text-brand-pink">{valueOrDash(row.vitality, '%')}</p>
                <DeltaBadge delta={row.vitalityDelta} suffix="%" />
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo</p>
                <p className="text-lg font-black text-primary">{valueOrDash(row.time, '%')}</p>
                <DeltaBadge delta={row.timeDelta} suffix="%" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {row.fatigueScores.map(score => (
                <div key={score.key} className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{score.label}</p>
                  <p className="text-base font-black text-slate-700">{valueOrDash(score.value)}</p>
                  <DeltaBadge delta={score.delta} type="fatigue" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
