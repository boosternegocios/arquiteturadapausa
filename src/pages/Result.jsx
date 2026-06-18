import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip 
} from 'recharts'
import { 
  LayoutDashboard, Activity, CheckCircle, BarChart2, Brain, 
  Settings, LogOut, Heart, HeartPulse, Fingerprint, Lightbulb, Users, Sun, ArrowRight, ActivitySquare, FileText
} from 'lucide-react'

// Map of icons and max possible values for each category
const CATEGORY_DATA = {
  fisico: { label: 'Físico', max: 80, icon: ActivitySquare },
  mental: { label: 'Mental', max: 70, icon: Brain },
  sensorial: { label: 'Sensorial', max: 80, icon: Fingerprint },
  criativo: { label: 'Criativo', max: 90, icon: Lightbulb },
  emocional: { label: 'Emocional', max: 80, icon: Heart },
  social: { label: 'Social', max: 80, icon: Users },
  social: { label: 'Social', max: 80, icon: Users },
  espiritual: { label: 'Espiritual', max: 50, icon: Sun }
}

const RESULT_TEXTS = {
  fisico: "Sua avaliação indica que a dimensão física é mais sobrecarregada. Seu corpo e mente estão demandando sono reparador e fluidez corporal.",
  mental: "Sua avaliação indica que a dimensão mental é mais sobrecarregada. Seu corpo e mente estão demandando meditação e organização de tarefas e pensamentos.",
  social: "Sua avaliação indica que a dimensão social é mais sobrecarregada. Seu corpo e mente estão pedindo que você equilibre o tempo e a qualidade da interação social olhando sua agenda de maneira estratégica priorizando momentos de auto reconexão.",
  emocional: "Sua avaliação indica que a dimensão emocional é mais sobrecarregada. Seu corpo e mente estão pedindo que você busque autoconsciência, autenticidade e autocuidado e priorize relações de qualidade para que “máscaras” sociais possam ser tiradas.",
  sensorial: "Sua avaliação indica que a dimensão sensorial está mais sobrecarregada. Seu corpo e mente pedem que você reduza a exposição à telas, ruídos e alimentos ultraprocessados.",
  criativo: "Sua avaliação indica que a dimensão criativa está mais sobrecarregada. Seu corpo e mente pedem que você busque inspiração em contato com a arte, a música, o lúdico ou a natureza.",
  espiritual: "Sua avaliação indica que a dimensão espiritual está mais sobrecarregada. Seu corpo e mente pedem que você busque reconexão com seu propósito e valores essenciais."
}

export const Result = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState([])
  const [topCategory, setTopCategory] = useState(null)
  
  useEffect(() => {
    const fetchResults = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('evaluations')
          .select('scores')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (error) throw error
        
        if (data && data.length > 0 && data[0].scores) {
          const rawScores = data[0].scores
          
          // Normalize to 0-10 based on maximums
          const normalizedScores = Object.entries(CATEGORY_DATA).map(([key, config]) => {
            const rawVal = rawScores[key] || 0
            const normalized = (rawVal / config.max) * 10
            return {
              key,
              label: config.label,
              Icon: config.icon,
              score: parseFloat(normalized.toFixed(1)),
              radarLabel: `${config.label.toUpperCase()} (${normalized.toFixed(1)})`,
              fullMark: 10
            }
          })
          
          // Sort descending to find the highest fatigue
          const sorted = [...normalizedScores].sort((a, b) => b.score - a.score)
          
          setScores(normalizedScores)
          setTopCategory(sorted[0])
        }
      } catch (err) {
        console.error('Erro ao buscar resultados:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [user])

  const handleLogout = async () => {
    await signOut()
  }

  // Pre-process Data to force standard sorting for radar or let it naturally map
  // Usually, a specific order is nice to keep it shaped beautifully
  const radarData = ['fisico', 'mental', 'emocional', 'social', 'espiritual', 'sensorial', 'criativo']
    .map(key => scores.find(s => s.key === key))
    .filter(Boolean)

  const otherCategories = [...scores].sort((a, b) => b.score - a.score).slice(1)

  return (
    <div className="bg-[#f8f3e9] flex flex-col lg:flex-row h-[100dvh] overflow-hidden font-display text-slate-800">
      
      {/* Sidebar - Similar to Dashboard */}
      <Sidebar />

      {/* Main Content View */}
      <main className="flex-1 h-[100dvh] w-full overflow-y-auto px-6 py-8 md:px-10 md:py-12 lg:px-16 flex flex-col items-center">
        <div className="w-full max-w-[1100px] flex flex-col h-full gap-8">
          
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Resultado do Diagnóstico</p>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-3 flex-wrap">
                Seu nível de cansaço maior é 
                {loading ? (
                   <span className="bg-slate-200 animate-pulse h-10 w-48 rounded inline-block"></span>
                ) : (
                  <span className="text-brand-pink border-b-[6px] border-brand-pink/20 pb-0 uppercase leading-none">
                     {topCategory?.label}
                  </span>
                )}
              </h1>
            </div>
            
            {/* CTA Button moved to Header for Above the Fold visibility */}
            {!loading && scores.length > 0 && (
              <button 
                onClick={() => navigate('/solution')} 
                className="bg-[#1f1a1a] hover:bg-black text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 whitespace-nowrap shadow-xl w-full md:w-auto"
              >
                Iniciar sua reflexão <ArrowRight size={20} />
              </button>
            )}
          </header>

          {/* Results Area */}
          {!loading && scores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
              
              {/* Radar Chart Panel */}
              <div className="md:col-span-12 lg:col-span-7 bg-white rounded-3xl p-10 flex flex-col relative shadow-sm border border-slate-100/50">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-1.5 h-6 bg-brand-pink rounded-r-md -ml-10"></div>
                  <h2 className="text-xl font-bold text-slate-800">Mapeamento das 7 Dimensões</h2>
                </div>
                
                <div className="flex-1 flex items-center justify-center min-h-[350px]">
                  <ResponsiveContainer width="100%" height={450}>
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                      <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                      <PolarAngleAxis 
                        dataKey="radarLabel" 
                        tick={{ fill: "#64748b", fontSize: 10, fontWeight: 700 }} 
                      />
                      <Radar 
                        name="Cansaço" 
                        dataKey="score" 
                        stroke="#e96197" 
                        strokeWidth={3} 
                        fill="#e96197" 
                        fillOpacity={0.15} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
                        itemStyle={{ color: '#e96197', fontWeight: 'bold' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Insight Text block */}
                <div className="mt-8 bg-[#e8fbf6] text-[#1b4332] p-6 rounded-2xl border border-emerald-100/50 text-[15px] font-medium max-w-[90%] mx-auto text-center leading-relaxed">
                  "{RESULT_TEXTS[topCategory.key]}"
                </div>
              </div>

              {/* Cards Panel */}
              <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-5">
                
                {/* Top Highlight Card */}
                <div className="bg-brand-pink text-white rounded-3xl p-8 relative overflow-hidden shadow-lg shadow-brand-pink/20">
                  {/* Watermark icon */}
                  <topCategory.Icon size={120} className="absolute -right-6 -bottom-6 text-white opacity-10 transform -rotate-12" />
                  
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <topCategory.Icon size={32} />
                    <span className="text-5xl font-black">{topCategory.score}</span>
                  </div>
                  
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-1">Cansaço {topCategory.label}</h3>
                    <p className="text-white/80 text-sm font-medium">Prioridade Máxima</p>
                  </div>
                </div>

                {/* Grid for remaining cards */}
                <div className="grid grid-cols-2 gap-4">
                  {otherCategories.map((cat) => (
                    <div key={cat.key} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100/50 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <cat.Icon size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-lg font-black text-slate-800">{cat.score}</span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-[15px] mb-3">{cat.label}</h4>
                      
                      {/* Mini progress bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-auto">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(cat.score / 10) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
              
            </div>
          ) : !loading && (
             <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-3xl">
                <HeartPulse size={64} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold">Nenhum resultado finalizado encontrado.</p>
                <button onClick={() => navigate('/assessment/fisico')} className="mt-6 px-8 py-3 bg-brand-pink text-white font-bold rounded-full">
                  Fazer Avaliação
                </button>
             </div>
          )}

          {/* Removed Bottom Action Footer since CTA is now at the top */}

        </div>
      </main>
    </div>
  )
}
