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
  fisico: { id: 'fisico', label: 'Cansaço Físico', color: 'bg-amber-400', textColor: 'text-amber-500', icon: HeartPulse, desc: 'Sono reparador, nutrição e fluidez corporal' },
  mental: { id: 'mental', label: 'Cansaço Mental', color: 'bg-red-400', textColor: 'text-red-500', icon: Brain, desc: 'Descompressão e organização dos pensamentos' },
  sensorial: { id: 'sensorial', label: 'Cansaço Sensorial', color: 'bg-amber-500', textColor: 'text-amber-600', icon: EyeOff, desc: 'Redução de estímulos estressores' },
  criativo: { id: 'criativo', label: 'Cansaço Criativo', color: 'bg-emerald-400', textColor: 'text-emerald-500', icon: Sparkles, desc: 'Momentos lúdicos, contemplativos e inspiradores' },
  emocional: { id: 'emocional', label: 'Cansaço Emocional', color: 'bg-orange-400', textColor: 'text-orange-500', icon: Smile, desc: 'Autoconsciência, autenticidade e autocuidado' },
  social: { id: 'social', label: 'Cansaço Social', color: 'bg-emerald-500', textColor: 'text-emerald-600', icon: Users, desc: 'Limites saudáveis e agenda social estratégica' },
  espiritual: { id: 'espiritual', label: 'Cansaço Espiritual', color: 'bg-[#1ed7a4]', textColor: 'text-[#004b4c]', icon: Heart, desc: 'Transcendência Horizontal e Vertical' }
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
  
          <div className="max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 xl:px-12 relative z-10">
            
            <div className="text-center mb-8 animate-in fade-in slide-in-from-top-10">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#eb6496] rounded-2xl shadow-xl text-white mb-4 transform rotate-3 hover:rotate-6 transition-transform">
                <CheckCircle size={24} strokeWidth={2.5} />
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter mb-4 font-display leading-tight" style={{ transform: 'scaleY(1.05)' }}>
                Reflexão concluída
              </h2>
              <p className="text-lg md:text-xl text-[#1ed7a4] font-bold max-w-3xl mx-auto mb-3">
                Você já começou a arquitetar a sua pausa!
              </p>
              <p className="text-lg text-white font-medium max-w-5xl mx-auto opacity-90 leading-relaxed">
                A pausa é o principal antídoto para o esgotamento, um ato de reconstrução que nos conecta com a fonte de energia de que precisamos. <br />
                É o momento em que o cérebro digere estímulos, o coração se reorienta e a intenção se refina. <br />
                Hoje mesmo, adote um micro hábito que atue no que você acabou de aprender com essa reflexão.
              </p>
            </div>
  
            {loading ? (
              <div className="flex justify-center p-10">
                <div className="w-8 h-8 border-4 border-[#1ed7a4]/20 border-t-[#1ed7a4] rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-10" style={{animationDelay: '100ms'}}>
                {Object.values(CATEGORY_OASIS).map((cat, index) => {
                  const Icon = cat.icon
                  const isCompleted = completedTracks.includes(cat.id)
  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/specific-solution/${cat.id}`)}
                      className={`relative group text-left rounded-3xl p-5 border shadow-lg transition-all overflow-hidden flex flex-col min-h-[170px] ${
                        isCompleted 
                          ? 'bg-slate-200 border-slate-300 opacity-60 hover:opacity-100' 
                          : 'bg-white border-slate-100 hover:shadow-xl hover:-translate-y-1 hover:border-[#1ed7a4]/30'
                      }`}
                    >
                      {/* Faixa decorativa topo card */}
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${isCompleted ? 'bg-slate-400' : cat.color}`}></div>
                      
                      <div className="flex justify-between items-start mb-3 mt-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform ${
                          isCompleted ? 'bg-slate-400' : `${cat.color} group-hover:scale-110`
                        }`}>
                          <Icon size={20} />
                        </div>
                        
                        {isCompleted && (
                          <span className="bg-slate-300 text-slate-600 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm border border-slate-400/50">
                            <CheckCircle size={8} /> Concluído
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-black text-[#004b4c] mb-1 leading-tight">{cat.label}</h3>
                      <p className={`text-slate-500 font-medium text-[13px] leading-snug mb-3 ${isCompleted ? 'opacity-70' : ''}`}>{cat.desc}</p>
  
                      {!isCompleted && (
                        <div className="mt-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all w-max border text-[#eb6496] bg-[#eb6496]/5 border-[#eb6496]/20 hover:bg-[#eb6496] hover:text-white group-hover:scale-105">
                           Iniciar reflexão <ArrowRight size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

          <div className="mt-12 mb-10 pb-20 text-center animate-in fade-in" style={{animationDelay: '300ms'}}>
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
