import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, Save, LayoutDashboard, Settings, LogOut, CheckCircle, FileText, ArrowRight, HeartPulse, Sparkles, Brain, EyeOff, Smile, Users, Heart
} from 'lucide-react'

// Informações estendidas para os cards do Oásis
const CATEGORY_OASIS = {
  fisico: { id: 'fisico', label: 'Cansaço Físico', color: 'bg-amber-400', textColor: 'text-amber-500', icon: HeartPulse, desc: 'Restaurar o corpo, otimizar sono e tensão.' },
  mental: { id: 'mental', label: 'Cansaço Mental', color: 'bg-red-400', textColor: 'text-red-500', icon: Brain, desc: 'Reframing de pensamentos e descompressão.' },
  sensorial: { id: 'sensorial', label: 'Cansaço Sensorial', color: 'bg-amber-500', textColor: 'text-amber-600', icon: EyeOff, desc: 'Gestão de barulho, telas e estímulos.' },
  criativo: { id: 'criativo', label: 'Cansaço Criativo', color: 'bg-emerald-400', textColor: 'text-emerald-500', icon: Sparkles, desc: 'Retomar encanto, estilo de vida sabático.' },
  emocional: { id: 'emocional', label: 'Cansaço Emocional', color: 'bg-orange-400', textColor: 'text-orange-500', icon: Smile, desc: 'Limpar máscaras, lidar com performance.' },
  social: { id: 'social', label: 'Cansaço Social', color: 'bg-emerald-500', textColor: 'text-emerald-600', icon: Users, desc: 'Mapear convívio e organizar interações.' },
  espiritual: { id: 'espiritual', label: 'Cansaço Espiritual', color: 'bg-[#1ed7a4]', textColor: 'text-[#004b4c]', icon: Heart, desc: 'De volta ao eixo e conexão de cura.' }
}

export const ContinueHealing = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [completedTracks, setCompletedTracks] = useState([])

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!user) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select('top_fatigue_solution')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) throw error
        
          if (data && data.length > 0 && data[0].top_fatigue_solution) {
            // Conta apenas como concluído os que tem a flag isCompleted
            const tracks = Object.keys(data[0].top_fatigue_solution).filter(
              key => data[0].top_fatigue_solution[key]?.isCompleted === true
            )
            setCompletedTracks(tracks)
          }
        } catch (error) {
          console.error('Erro ao carregar dados:', error)
        } finally {
          setLoading(false)
        }
      }
      fetchEvaluation()
    }, [user])
  
    const handleLogout = async () => {
      await signOut()
      navigate('/login')
    }
  
    return (
      <div className="bg-[#fcfaf5] text-slate-900 h-screen font-display flex overflow-hidden">
        
        {/* Sidebar - Copiado perfeitamente de SpecificSolution */}
        <Sidebar />
  
        {/* Main Área Oásis */}
        <main className="flex-1 overflow-y-auto relative bg-[#004b4c]">
          {/* Glow de fundo */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#1ed7a4]/10 rounded-full blur-[120px] pointer-events-none"></div>
  
          <div className="max-w-6xl mx-auto w-full p-8 md:p-14 lg:p-20 relative z-10">
            
            <div className="text-center mb-16 animate-in fade-in slide-in-from-top-10">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#eb6496] rounded-[2rem] shadow-xl text-white mb-8 transform rotate-3 hover:rotate-6 transition-transform">
                <CheckCircle size={40} strokeWidth={2.5} />
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter mb-6 font-display leading-tight" style={{ transform: 'scaleY(1.05)' }}>
                Mergulho Profundo Concluído.
              </h2>
              <p className="text-xl text-[#1ed7a4] font-bold max-w-3xl mx-auto mb-4">
                Primeiro passo: coloque em prática hoje mesmo o que você acabou de tirar de produtivo dessa ferida principal.
              </p>
              <p className="text-lg text-white font-medium max-w-3xl mx-auto opacity-90 leading-relaxed">
                Sua jornada para blindar a sua arquitetura mental e física não precisa parar aqui. Ao explorar outras dimensões do cansaço, você garante que nenhum outro vazamento invisível afete a sua performance. Selecione outro card para estancar mais um cansaço!
              </p>
            </div>
  
            {loading ? (
              <div className="flex justify-center p-20">
                <div className="w-10 h-10 border-4 border-[#1ed7a4]/20 border-t-[#1ed7a4] rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-10" style={{animationDelay: '100ms'}}>
                {Object.values(CATEGORY_OASIS).map((cat, index) => {
                  const Icon = cat.icon
                  const isCompleted = completedTracks.includes(cat.id)
  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/specific-solution/${cat.id}`)}
                      className={`relative group text-left rounded-3xl p-8 border shadow-xl transition-all overflow-hidden flex flex-col h-[260px] ${
                        isCompleted 
                          ? 'bg-slate-200 border-slate-300 opacity-60 hover:opacity-100' 
                          : 'bg-white border-slate-100 hover:shadow-2xl hover:-translate-y-2 hover:border-[#1ed7a4]/30'
                      }`}
                    >
                      {/* Faixa decorativa topo card */}
                      <div className={`absolute top-0 left-0 w-full h-2 ${isCompleted ? 'bg-slate-400' : cat.color}`}></div>
                      
                      <div className="flex justify-between items-start mb-6 mt-2">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform ${
                          isCompleted ? 'bg-slate-400' : `${cat.color} group-hover:scale-110`
                        }`}>
                          <Icon size={28} />
                        </div>
                        
                        {isCompleted && (
                          <span className="bg-slate-300 text-slate-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm border border-slate-400/50">
                            <CheckCircle size={10} /> Concluído
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-black text-[#004b4c] mb-2">{cat.label}</h3>
                      <p className={`text-slate-500 font-medium text-sm leading-relaxed mb-4 ${isCompleted ? 'opacity-70' : ''}`}>{cat.desc}</p>
  
                      {!isCompleted && (
                        <div className="mt-auto flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all w-max border text-[#eb6496] bg-[#eb6496]/5 border-[#eb6496]/20 hover:bg-[#eb6496] hover:text-white group-hover:scale-105">
                           Entrar na Solução <ArrowRight size={14} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

          <div className="mt-32 mb-10 pb-20 text-center animate-in fade-in" style={{animationDelay: '300ms'}}>
             <button 
              onClick={() => navigate('/')} 
              className="px-10 py-5 rounded-2xl bg-white/5 text-white font-bold tracking-widest uppercase text-sm border border-white/10 hover:bg-white/10 transition-colors shadow-lg"
            >
              Voltar ao Início
            </button>
          </div>

        </div>
      </main>
      
    </div>
  )
}
