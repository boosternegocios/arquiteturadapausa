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

const buildRows = (evaluations = []) => (
  [...evaluations]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
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
)

export const EvaluationComparisonTable = ({ evaluations = [], title = 'Comparativo por data' }) => {
  const rows = buildRows(evaluations)

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
                <td className="bg-slate-50 px-3 py-3 text-sm font-black text-brand-pink">{valueOrDash(row.vitality, '%')}</td>
                <td className="bg-slate-50 px-3 py-3 text-sm font-black text-primary">{valueOrDash(row.time, '%')}</td>
                {row.fatigueScores.map(score => (
                  <td key={score.key} className="bg-slate-50 px-3 py-3 text-sm font-black text-slate-700">
                    {valueOrDash(score.value)}
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
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tempo</p>
                <p className="text-lg font-black text-primary">{valueOrDash(row.time, '%')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {row.fatigueScores.map(score => (
                <div key={score.key} className="rounded-xl bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{score.label}</p>
                  <p className="text-base font-black text-slate-700">{valueOrDash(score.value)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
