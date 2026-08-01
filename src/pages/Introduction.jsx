import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useVisibilityRefresh } from '../hooks/useVisibilityRefresh'
import { 
  BarChart2, 
  Zap, 
  Activity,
  Pause,
  CheckCircle,
  Lock,
  ArrowRight
} from 'lucide-react'

const SATISFACTION_KEYS = ['foco', 'produtividade', 'realizacao', 'ritmo']
const TIME_RELATION_KEYS = ['equilibrio', 'importancia', 'mensagens', 'tempo_livre', 'delega_centraliza', 'limite_corpo', 'stress', 'frustracao_agenda']
const INTERNAL_SPEED_KEYS = ['acelerada_lenta', 'focada_relaxada', 'paciente_impaciente', 'ponderada_impulsiva', 'decisao_rapida_lenta']

export const Introduction = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step1Done, setStep1Done] = useState(false)
  const [step2Done, setStep2Done] = useState(false)
  const [step3Done, setStep3Done] = useState(false)
  const [assessmentIsComplete, setAssessmentIsComplete] = useState(false)
  const [mainRecoveryDone, setMainRecoveryDone] = useState(false)
  const [nextStep1Route, setNextStep1Route] = useState('/recovery/satisfaction')
  const [nextStep2Route, setNextStep2Route] = useState('/recovery/beliefs')
  const [nextStep3Route, setNextStep3Route] = useState('/assessment/fisico')
  const [loading, setLoading] = useState(true)

  const fetchProgress = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('[Introduction] Supabase error:', error)
        return
      }

      if (data && data.length > 0) {
        const d = data[0]
        
        const sat = d.solution_satisfaction || {}
        const timeRel = d.solution_time_relation || {}
        const intSpeed = d.solution_internal_speed || {}
        const beliefs = d.solution_beliefs || {}

        const satDone = SATISFACTION_KEYS.every(k => sat[k] !== undefined && sat[k] !== null)
        const timeDone = TIME_RELATION_KEYS.every(k => timeRel[k] !== undefined && timeRel[k] !== null)
        const speedDone = INTERNAL_SPEED_KEYS.every(k => intSpeed[k] !== undefined && intSpeed[k] !== null)
        const card1Complete = satDone && timeDone && speedDone
        
        setStep1Done(card1Complete)

        if (!satDone) setNextStep1Route('/recovery/satisfaction')
        else if (!timeDone) setNextStep1Route('/recovery/time-relation')
        else if (!speedDone) setNextStep1Route('/recovery/internal-speed')

        const card2Complete = beliefs._card2_completed === true
        setStep2Done(card2Complete)

        const beliefsKeys = ['sacrificio', 'utilidade', 'sozinho', 'meta_x', 'pressao', 'desorganizado', 'bem_feito', 'liberdade', 'improdutivo', 'tempo_insuficiente', 'dar_conta']
        const beliefsDone = beliefsKeys.every(k => beliefs[k] !== undefined && beliefs[k] !== null)
        if (!beliefsDone) setNextStep2Route('/recovery/beliefs')
        else if (!card2Complete) setNextStep2Route('/recovery/cycle')

        const CATEGORIES = ['fisico', 'sensorial', 'emocional', 'mental', 'social', 'criativo', 'espiritual']
        
        if (d.status === 'completed') {
          setAssessmentIsComplete(true)
        } else {
          setAssessmentIsComplete(false)
          let nextCat = 'fisico'
          
          if (d.scores && Object.keys(d.scores).length > 0 && Object.keys(d.scores).length < 7) {
            for (const cat of CATEGORIES) {
              if (d.scores[cat] === undefined || d.scores[cat] === null) {
                nextCat = cat
                break
              }
            }
          } else if (d.scores && Object.keys(d.scores).length >= 7 && d.status === 'draft') {
            nextCat = 'fisico'
          }
          
          setNextStep3Route(`/assessment/${nextCat}`)
        }

        let completedCount = 0
        if (d.top_fatigue_solution) {
          completedCount = Object.keys(d.top_fatigue_solution).filter(
            key => d.top_fatigue_solution[key]?.isCompleted === true
          ).length
        }
        if (completedCount >= 1) setMainRecoveryDone(true)
        if (completedCount >= 7) setStep3Done(true)
      }
    } catch (error) {
      console.error('[Introduction] Erro ao buscar:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  // Re-fetch data when user returns to the tab after switching away
  useVisibilityRefresh(fetchProgress)

  const activeCard = step3Done ? 4 : step2Done ? 3 : step1Done ? 2 : 1

  const handleCardClick = (cardNum) => {
    if (cardNum === 1 && !step1Done) navigate(nextStep1Route)
    if (cardNum === 2 && step1Done && !step2Done) navigate(nextStep2Route)
    if (cardNum === 3 && step2Done && !step3Done) {
      if (mainRecoveryDone) {
        navigate('/continue-healing')
      } else if (assessmentIsComplete) {
        navigate('/resultado')
      } else {
        navigate(nextStep3Route)
      }
    }
    if (cardNum === 4) navigate('/contact')
  }

  if (loading) {
    return (
      <div className="bg-[#007b7a] min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#1ed7a4]/20 border-t-[#1ed7a4] rounded-full animate-spin" />
      </div>
    )
  }

  const cards = [
    {
      num: 1,
      icon: <BarChart2 size={26} strokeWidth={2.5} />,
      title: 'ANÁLISE DE HÁBITOS E COMPORTAMENTOS',
      desc: 'Como é a sua relação com o tempo e que aspectos afetam o ritmo de vida?',
      done: step1Done,
      cta: 'Iniciar análise',
    },
    {
      num: 2,
      icon: <Zap size={26} strokeWidth={2.5} />,
      title: 'IDENTIFICAÇÃO DE GATILHOS',
      desc: 'Quais suas crenças limitantes, seus impulsionadores e drenadores de energia?',
      done: step2Done,
      cta: 'Identificar gatilhos',
    },
    {
      num: 3,
      icon: <Activity size={26} strokeWidth={2.5} />,
      title: 'DIAGNÓSTICO DOS 7 CANSAÇOS',
      desc: 'Identifique qual tipo de cansaço predomina e realize os 7 exercícios propostos.',
      done: step3Done,
      cta: mainRecoveryDone ? 'Ver exercícios' : (assessmentIsComplete ? 'Ver resultado' : 'Iniciar diagnóstico'),
    },
    {
      num: 4,
      icon: <Pause size={26} strokeWidth={2.5} />,
      title: 'PLANO DE AÇÃO PERSONALIZADO',
      desc: 'Estratégias práticas, construindo sua rotina ideal e sua arquitetura de pausa.',
      done: false,
      cta: 'Solicitar plano personalizado',
    },
  ]

  return (
    <div className="bg-[#007b7a] text-slate-100 min-h-screen font-display">
      <div className="flex flex-col lg:flex-row lg:h-[100dvh] lg:overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-y-auto lg:overflow-hidden lg:h-[100dvh] w-full">
          
          {/* Header */}
          <div className="px-6 md:px-10 lg:px-14 pt-8 pb-6 shrink-0">
            <p className="text-[#1ed7a4] text-xs font-bold tracking-[0.25em] uppercase mb-3 flex items-center gap-3">
              <span className="w-6 h-[1px] bg-[#1ed7a4]"></span> A SOLUÇÃO
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter font-antonio">
              ARQUITETE <span className="text-[#1ed7a4]">SUA PAUSA</span>
            </h1>
            <p className="mt-3 max-w-[560px] text-white/70 font-medium text-base leading-relaxed font-sora">
              A gestão do tempo é um pacto coletivo, mas a forma como protegemos nosso foco e canalizamos a energia são escolhas pessoais.
            </p>
          </div>

          {/* Cards Grid — fill remaining height with padding */}
          <div className="shrink-0 lg:flex-1 lg:min-h-0 px-6 md:px-10 lg:px-14 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 h-auto lg:h-full rounded-2xl overflow-hidden border border-white/10">
            {cards.map((card, i) => {
              const isActive = activeCard === card.num
              const isDone = card.done
              const isLocked = !isDone && !isActive && card.num !== 4
              const isAvailable = card.num === 4 && !isActive

              // Border classes between cards
              const borderR = i % 2 === 0 ? 'md:border-r border-white/15' : ''
              const borderB = i < 2 ? 'border-b border-white/15' : ''

              let bg = ''
              let cursor = ''
              let contentOpacity = ''

              if (isDone) {
                bg = 'bg-[#005f5e]'
                cursor = 'cursor-default'
                contentOpacity = 'opacity-75'
              } else if (isActive) {
                bg = 'bg-[#1ed7a4]'
                cursor = 'cursor-pointer hover:bg-[#19c898] active:scale-[0.99]'
              } else if (isAvailable) {
                bg = 'bg-[#005f5e]'
                cursor = 'cursor-pointer hover:bg-[#005554] active:scale-[0.99]'
                contentOpacity = ''
              } else {
                // locked — solid dark teal, fully visible, just not clickable
                bg = 'bg-[#005f5e]'
                cursor = 'cursor-not-allowed'
                contentOpacity = ''
              }

              return (
                <div
                  key={card.num}
                  onClick={() => handleCardClick(card.num)}
                  className={`relative flex flex-col justify-between p-8 md:p-10 transition-all duration-300 ${bg} ${cursor} ${borderR} ${borderB}`}
                >
                  <div className={contentOpacity}>
                    {/* Top row: icon + number */}
                    <div className="flex justify-between items-start mb-8">
                      <div className={`w-13 h-13 w-12 h-12 flex items-center justify-center rounded-2xl
                        ${isDone ? 'bg-white/10 text-[#1ed7a4]' : isActive ? 'bg-[#004b4c] text-[#1ed7a4]' : 'bg-white/10 text-white/50'}
                      `}>
                        {isDone ? <CheckCircle size={24} strokeWidth={2.5} /> : isLocked ? <Lock size={22} strokeWidth={2} /> : card.icon}
                      </div>
                      <span className={`text-7xl font-black font-antonio leading-none
                        ${isDone ? 'text-white/10' : isActive ? 'text-[#004b4c]/15' : 'text-white/10'}
                      `}>
                        {String(card.num).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-xl md:text-2xl font-black uppercase mb-3 font-antonio leading-tight
                      ${isActive ? 'text-[#004b4c]' : 'text-white'}
                    `}>
                      {card.title}
                    </h3>

                    {/* Desc */}
                    <p className={`text-sm md:text-base leading-relaxed font-sora
                      ${isActive ? 'text-[#004b4c]/80' : isDone ? 'text-white/60' : 'text-white/55'}
                    `}>
                      {card.desc}
                    </p>
                  </div>

                  {/* Bottom CTA */}
                  <div className="mt-8">
                    {isDone && (
                      <span className="inline-flex items-center gap-2 text-[#1ed7a4] text-xs font-bold uppercase tracking-widest">
                        <CheckCircle size={14} /> Concluído
                      </span>
                    )}
                    {isActive && (
                      <span className="inline-flex items-center gap-2 text-[#004b4c] font-bold text-sm uppercase tracking-widest">
                        {card.cta} <ArrowRight size={16} />
                      </span>
                    )}
                    {isAvailable && (
                      <span className="inline-flex items-center gap-2 text-[#1ed7a4] hover:text-[#19c898] transition-colors font-bold text-sm uppercase tracking-widest">
                        {card.cta} <ArrowRight size={16} />
                      </span>
                    )}
                    {isLocked && (
                      <span className="inline-flex items-center gap-2 text-white/20 font-bold text-sm uppercase tracking-widest">
                        <Lock size={14} /> Bloqueado
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
