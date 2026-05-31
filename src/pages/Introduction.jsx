import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  BarChart2, 
  Zap, 
  Clipboard, 
  Pause,
  Activity
} from 'lucide-react'

export const Introduction = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step1Done, setStep1Done] = useState(false)
  const [step2Done, setStep2Done] = useState(false)
  const [step3Done, setStep3Done] = useState(false)

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select('solution_internal_speed, solution_beliefs, solution_status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (data && data.length > 0) {
          if (data[0].solution_internal_speed && Object.keys(data[0].solution_internal_speed).length > 0) {
            setStep1Done(true)
          }
          if (data[0].solution_beliefs && data[0].solution_beliefs._card2_completed === true) {
            setStep2Done(true)
          }
          if (data[0].solution_status === 'completed' || data[0].solution_status === 'completed_deep') {
            setStep3Done(true)
          }
        }
      } catch (error) {
        console.error(error)
      }
    }
    fetchProgress()
  }, [user])

  return (
    <div className="bg-[#007b7a] text-slate-100 min-h-screen">
      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 md:p-16 flex flex-col justify-center items-center relative">
          
          <div className="max-w-[1000px] w-full">
            <div className="mb-12">
              <p className="text-mint text-sm font-bold tracking-[0.2em] uppercase mb-4 flex items-center gap-4">
                <span className="w-8 h-[1px] bg-mint"></span> A SOLUÇÃO
              </p>
              <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter font-antonio">
                ARQUITETE <span className="text-mint">SUA PAUSA</span>
              </h1>
              <p className="mt-6 max-w-[600px] text-white/90 font-medium text-lg leading-relaxed font-sora">
                A gestão do tempo é um pacto coletivo, mas a forma como protegemos nosso foco e canalizamos a energia são escolhas pessoais. Assuma um compromisso com você.
              </p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2">
              
              {/* Item 1 */}
              <div 
                onClick={() => { if (!step1Done) navigate('/recovery/satisfaction') }}
                className={`p-8 md:pr-12 md:pb-12 border-b border-white/20 md:border-r transition-colors duration-300 relative group
                  ${step1Done 
                    ? 'opacity-50 grayscale cursor-default hover:bg-white/5' 
                    : 'bg-mint text-primary hover:bg-[#2fc7a5] cursor-pointer'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 flex items-center justify-center ${step1Done ? 'bg-white/20 text-white' : 'bg-white text-mint'}`}>
                    <BarChart2 size={24} strokeWidth={2.5} />
                  </div>
                  <span className={`text-6xl font-black font-antonio ${step1Done ? 'text-white/10' : 'text-primary/20'}`}>01</span>
                </div>
                <h3 className={`text-xl font-black uppercase mb-3 font-antonio ${step1Done ? 'text-white' : 'text-primary'}`}>
                  ANÁLISE DE HÁBITOS E COMPORTAMENTOS
                </h3>
                <p className={`text-base leading-relaxed font-sora ${step1Done ? 'text-white/80' : 'text-primary/90'}`}>
                  Como é a sua relação com o tempo e que aspectos afetam o ritmo de vida?
                </p>

                {!step1Done && (
                  <div className="absolute top-4 right-4 bg-primary text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-sora font-bold pointer-events-none shadow-md">
                    Clique aqui para começar
                  </div>
                )}
              </div>

              {/* Item 2 */}
              <div 
                onClick={() => { if (step1Done && !step2Done) navigate('/recovery/beliefs') }}
                className={`p-8 md:pl-12 md:pb-12 border-b border-white/20 transition-colors duration-300 relative group
                  ${step2Done 
                    ? 'opacity-50 grayscale cursor-default hover:bg-white/5'
                    : step1Done 
                    ? 'bg-mint text-primary hover:bg-[#2fc7a5] cursor-pointer' 
                    : 'hover:bg-white/10'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 flex items-center justify-center ${step1Done ? 'bg-white text-mint' : 'bg-mint text-primary'}`}>
                    <Zap size={24} strokeWidth={2.5} />
                  </div>
                  <span className={`text-6xl font-black font-antonio ${step1Done ? 'text-primary/20' : 'text-white/10'}`}>02</span>
                </div>
                <h3 className={`text-xl font-black uppercase mb-3 font-antonio ${step1Done ? 'text-primary' : 'text-white'}`}>
                  IDENTIFICAÇÃO DE GATILHOS
                </h3>
                <p className={`text-base leading-relaxed font-sora ${step1Done ? 'text-primary/90' : 'text-white/80'}`}>
                  Quais suas crenças limitantes, seus impulsionadores e drenadores de energia?
                </p>
                
                {step1Done && !step2Done && (
                  <div className="absolute top-4 right-4 bg-primary text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-sora font-bold pointer-events-none shadow-md">
                    Clique aqui para começar
                  </div>
                )}
              </div>

              {/* Item 3 */}
              <div 
                onClick={() => { if (step2Done && !step3Done) navigate('/assessment/fisico') }}
                className={`p-8 md:pr-12 md:pt-12 border-b md:border-b-0 md:border-r border-white/20 transition-colors duration-300 relative group
                  ${step3Done 
                    ? 'opacity-50 grayscale cursor-default hover:bg-white/5'
                    : step2Done 
                    ? 'bg-mint text-primary hover:bg-[#2fc7a5] cursor-pointer' 
                    : 'hover:bg-white/10'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 flex items-center justify-center ${step2Done ? 'bg-white text-mint' : 'bg-mint text-primary'}`}>
                    <Activity size={24} strokeWidth={2.5} />
                  </div>
                  <span className={`text-6xl font-black font-antonio ${step2Done ? 'text-primary/20' : 'text-white/10'}`}>03</span>
                </div>
                <h3 className={`text-xl font-black uppercase mb-3 font-antonio ${step2Done ? 'text-primary' : 'text-white'}`}>
                  DIAGNÓSTICO DOS 7 TIPOS DE DESCANSO
                </h3>
                <p className={`text-base leading-relaxed font-sora ${step2Done ? 'text-primary/90' : 'text-white/80'}`}>
                  Identifique os seus cansaços, qual tipo de descanso você precisa?
                </p>

                {step2Done && !step3Done && (
                  <div className="absolute top-4 right-4 bg-primary text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-sora font-bold pointer-events-none shadow-md">
                    Clique aqui para começar
                  </div>
                )}
              </div>

              {/* Item 4 */}
              <div 
                onClick={() => { if (step3Done) navigate('/recovery/pauses') }}
                className={`p-8 md:pl-12 md:pt-12 transition-colors duration-300 relative group
                  ${step3Done 
                    ? 'bg-mint text-primary hover:bg-[#2fc7a5] cursor-pointer' 
                    : 'hover:bg-white/10'
                  }
                `}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 flex items-center justify-center ${step3Done ? 'bg-white text-mint' : 'bg-mint text-primary'}`}>
                    <Pause size={24} strokeWidth={2.5} />
                  </div>
                  <span className={`text-6xl font-black font-antonio ${step3Done ? 'text-primary/20' : 'text-white/10'}`}>04</span>
                </div>
                <h3 className={`text-xl font-black uppercase mb-3 font-antonio ${step3Done ? 'text-primary' : 'text-white'}`}>
                  PLANO DE AÇÃO PERSONALIZADO
                </h3>
                <p className={`text-base leading-relaxed font-sora ${step3Done ? 'text-primary/90' : 'text-white/80'}`}>
                  Estratégias práticas, construindo sua rotina ideal e sua arquitetura de pausa
                </p>

                {step3Done && (
                  <div className="absolute top-4 right-4 bg-primary text-white text-xs px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-sora font-bold pointer-events-none shadow-md">
                    Clique aqui para acessar
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
