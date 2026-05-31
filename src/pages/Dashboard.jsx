import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  LayoutDashboard, 
  Activity, 
  CheckCircle, 
  BarChart2, 
  Brain, 
  Settings, 
  LogOut, 
  Bell, 
  Radar, 
  HeartCrack,
  FileText,
  ArrowRight
} from 'lucide-react'
import { 
  Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip 
} from 'recharts'

// Map of categories and max possible values
const CATEGORY_DATA = {
  fisico: { label: 'Físico', max: 80 },
  mental: { label: 'Mental', max: 80 },
  sensorial: { label: 'Sensorial', max: 80 },
  criativo: { label: 'Criativo', max: 90 },
  emocional: { label: 'Emocional', max: 80 },
  social: { label: 'Social', max: 80 },
  espiritual: { label: 'Espiritual', max: 50 }
}

export const Dashboard = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [scores, setScores] = useState({
    fisico: 0,
    mental: 0,
    sensorial: 0,
    criativo: 0,
    emocional: 0,
    social: 0,
    espiritual: 0
  })
  const [hasRecord, setHasRecord] = useState(false)
  const [loading, setLoading] = useState(true)
  const [journeyProgress, setJourneyProgress] = useState(0)
  const [nextCategory, setNextCategory] = useState('fisico')
  const [assessmentStatus, setAssessmentStatus] = useState(null)
  const [topFatigue, setTopFatigue] = useState(null)

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!user) return
      
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('evaluations')
          .select('scores, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (error) throw error
        
        if (data && data.length > 0 && data[0].scores && Object.keys(data[0].scores).length > 0) {
          const fetchedScores = data[0].scores
          const status = data[0].status
          
          setHasRecord(true)
          setAssessmentStatus(status)

          const normalized = {}
          let highestScore = -1
          let highestCat = null

          Object.keys(CATEGORY_DATA).forEach(key => {
            const rawVal = fetchedScores[key] || 0
            const maxVal = CATEGORY_DATA[key].max
            const perc = Math.min(100, Math.round((rawVal / maxVal) * 100))
            normalized[key] = perc

            // Find top fatigue category accurately
            if (perc > highestScore) {
              highestScore = perc
              highestCat = { key, label: CATEGORY_DATA[key].label, percentage: perc }
            }
          })

          setScores(normalized)
          setTopFatigue(highestCat)
          
          // Calcular o progresso e determinar próxima categoria com a ordem original do app
          const validCategories = ['fisico', 'sensorial', 'emocional', 'mental', 'social', 'criativo', 'espiritual']
          const answeredCount = validCategories.filter(cat => fetchedScores[cat] !== undefined && fetchedScores[cat] !== null).length
          setJourneyProgress(Math.round((answeredCount / 7) * 100))
          
          if (status === 'draft') {
            const nextCat = validCategories.find(cat => fetchedScores[cat] === undefined || fetchedScores[cat] === null)
            setNextCategory(nextCat || 'fisico')
          } else {
            setNextCategory('fisico') // Se já concluiu, ao clicar vai reiniciar do zero
          }
        } else {
          setHasRecord(false)
          setJourneyProgress(0)
          setNextCategory('fisico')
        }
      } catch (err) {
        console.error('Erro ao buscar avaliações:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvaluations()
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Falha ao sair', error)
    }
  }

  const fatigueLevels = [
    { label: 'Físico', key: 'fisico', value: scores.fisico, colorClass: 'bg-amber-400' },
    { label: 'Mental', key: 'mental', value: scores.mental, colorClass: 'bg-red-400' },
    { label: 'Sensorial', key: 'sensorial', value: scores.sensorial, colorClass: 'bg-amber-500' },
    { label: 'Criativo', key: 'criativo', value: scores.criativo, colorClass: 'bg-emerald-400' },
    { label: 'Emocional', key: 'emocional', value: scores.emocional, colorClass: 'bg-orange-400' },
    { label: 'Social', key: 'social', value: scores.social, colorClass: 'bg-emerald-500' },
    { label: 'Espiritual', key: 'espiritual', value: scores.espiritual, colorClass: 'bg-mint' },
  ]

  const radarData = Object.keys(CATEGORY_DATA).map(key => ({
    radarLabel: CATEGORY_DATA[key].label.toUpperCase(),
    score: hasRecord ? scores[key] : 0, 
    fullMark: 100
  }))

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen font-display">
      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-12 bg-background-light">
          <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-center mb-12">
              <div>
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Seu Dashboard de Energia</h2>
                <p className="text-slate-500 font-medium mt-2 text-lg">Bom dia, {user?.email ? user.email.split('@')[0] : 'Alex'}! Acompanhe seu ritmo e produtividade hoje.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="p-4 bg-white rounded-full shadow-sm cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                    <Bell size={24} className="text-slate-700" />
                  </div>
                  <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"></span>
                </div>
              </div>
            </header>
            
            {/* Layout Handling: Empty State or Filled Data */}
            {!loading && !hasRecord ? (
              <div className="flex-1 flex flex-col items-center justify-center border-[3px] border-dashed border-slate-200/60 rounded-[3rem] bg-white/30 relative mt-4">
                
                {/* Dashed outline subtle element to signify emptiness */}
                <div className="flex flex-col items-center opacity-30 pointer-events-none">
                  <LayoutDashboard size={64} className="text-slate-400 mb-4" />
                  <p className="font-bold text-slate-400 uppercase tracking-widest">Painel Desocupado</p>
                </div>

                {/* Popup Blur Overlay that Auto-Opens */}
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-[3rem] p-10 md:p-16 max-w-[600px] w-full flex flex-col items-center text-center shadow-2xl scale-100 relative overflow-hidden">
                    
                    {/* Pink decorative blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-pink/10 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>
                    
                    <div className="w-24 h-24 bg-brand-pink/10 rounded-full flex items-center justify-center mb-10 text-brand-pink border border-brand-pink/20 relative z-10">
                      <FileText size={40} strokeWidth={2.5} />
                    </div>
                    
                    <h3 className="text-3xl lg:text-4xl font-black text-slate-800 mb-6 tracking-tight relative z-10 leading-tight">
                      Pronto para avaliar seus impulsionadores de fadiga?
                    </h3>
                    <p className="text-slate-500 text-lg mb-12 leading-relaxed font-medium relative z-10 px-2 lg:px-8">
                      O cansaço é multifacetado, então tentar diminuir a fadiga sem identificar a causa dela é como tentar encher um balde furado. Você sabe que tipo de cansaço está sentindo e de que tipo de recuperação precisa?
                    </p>
                    
                    <button 
                      onClick={() => navigate('/intro')} 
                      className="bg-[#eb6496] relative z-10 text-white w-full py-5 rounded-2xl font-bold text-sm tracking-[0.15em] uppercase shadow-[0_15px_30px_-5px_rgba(235,100,150,0.4)] hover:shadow-[0_20px_35px_-5px_rgba(235,100,150,0.5)] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3"
                      style={{ marginBottom: '32px' }}
                    >
                      Iniciar a avaliação <ArrowRight size={18} strokeWidth={2.5} />
                    </button>
                    
                    <button 
                      onClick={() => signOut()}
                      className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 relative z-10"
                    >
                      Sair por enquanto
                    </button>
                  </div>
                </div>
                
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-10 flex-1 relative z-10">
            
            {/* Left Column */}
            <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
              
              {/* Radar Chart Card */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <RechartsRadar size={24} className="text-accent" /> Radar de Vitalidade
                  </h3>
                  <select className="bg-slate-50 border-none rounded-xl text-sm font-semibold text-slate-600 px-4 py-2 outline-none">
                    <option>Semana Atual</option>
                    <option>Últimos 30 dias</option>
                  </select>
                </div>
                
                <div className="relative aspect-square max-h-[400px] mx-auto flex items-center justify-center w-full -mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="82%" data={radarData}>
                      <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                      <PolarAngleAxis 
                        dataKey="radarLabel" 
                        tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }} 
                      />
                      <RechartsRadar 
                        name="Fadiga" 
                        dataKey="score" 
                        stroke="#00d1d2" 
                        strokeWidth={4} 
                        fill="#00d1d2" 
                        fillOpacity={0.2} 
                        dot={{ r: 4, fill: '#004b4c', strokeWidth: 0 }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', fontWeight: 'bold' }}
                        itemStyle={{ color: '#00d1d2', fontWeight: 'bold' }}
                        cursor={false}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Progresso da Jornada Card */}
              <div className="bg-primary relative overflow-hidden text-white rounded-[2rem] p-10 shadow-lg shadow-primary/20 flex flex-col justify-between shrink-0">
                <div className="relative z-10 mb-8">
                  <h3 className="text-2xl font-bold mb-6">Progresso da Jornada</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-bold text-accent">{journeyProgress}%</span>
                    <span className="text-lg text-white/50 font-medium">da trilha atual</span>
                  </div>
                  <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden mt-4">
                    <div className="h-full bg-accent rounded-full transition-all duration-1000 ease-out" style={{ width: `${journeyProgress}%` }}></div>
                  </div>
                </div>
                <button onClick={() => navigate(assessmentStatus === 'completed' ? '/solution' : '/intro')} className="relative z-10 w-full bg-white text-primary py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-colors shadow-sm">
                  {assessmentStatus === 'completed' ? 'Continuar para a Solução' : (journeyProgress === 100 || !hasRecord ? 'Iniciar nova avaliação' : 'Continuar de onde parei')}
                </button>
              </div>
              
            </div>
            
            {/* Right Column: Fatigue List */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-8 h-[calc(100vh-180px)]">
              
              {hasRecord && topFatigue && (
                <div className="bg-gradient-to-br from-brand-pink to-[#d84e80] text-white rounded-[2rem] p-8 relative overflow-hidden shadow-xl shadow-brand-pink/20 shrink-0">
                  <div className="absolute -right-10 -bottom-10 text-white/10 transform rotate-12 pointer-events-none">
                     <Activity size={200} strokeWidth={1.5} />
                  </div>
                  
                  <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="bg-white/20 p-3.5 rounded-2xl backdrop-blur-md border border-white/20">
                      <HeartCrack size={24} strokeWidth={2.5} className="text-white drop-shadow-md" />
                    </div>
                    <span className="text-6xl font-black drop-shadow-sm tracking-tighter tabular-nums">{topFatigue.percentage}<span className="text-3xl opacity-80 ml-1">%</span></span>
                  </div>
                  
                  <div className="relative z-10">
                    <p className="text-white/80 text-[11px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                       <span className="w-2 h-2 bg-white rounded-full animate-pulse shadow-sm"></span> SEU PRINCIPAL DESGASTE
                    </p>
                    <h3 className="text-3xl font-black mb-1 uppercase tracking-tight border-b border-white/20 pb-4">Cansaço {topFatigue.label}</h3>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-[2rem] p-8 shadow-sm flex-1 flex flex-col overflow-hidden">
                <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-slate-800 shrink-0">
                  <BarChart2 size={24} className="text-primary" /> Índice das 7 Dimensões
                </h3>
                
                <div className="space-y-7 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    fatigueLevels.map((item) => (
                      <div key={item.key}>
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                          <span className="text-xl font-black text-primary">{hasRecord ? item.value : 0}%</span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.colorClass} rounded-full`} style={{ width: `${hasRecord ? item.value : 0}%` }}></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {!loading && !hasRecord && (
                  <div className="mt-6 shrink-0">
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-center">
                      <p className="text-sm font-bold uppercase tracking-wider mb-1">Processo não iniciado</p>
                      <p className="text-xs">Faça sua primeira avaliação para visualizar seus níveis de fadiga.</p>
                    </div>
                  </div>
                )}
              </div>
              
              </div>
            </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
