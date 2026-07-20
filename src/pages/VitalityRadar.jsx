import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useVisibilityRefresh } from '../hooks/useVisibilityRefresh'
import { 
  LayoutDashboard, 
  Activity, 
  CheckCircle, 
  BarChart2, 
  Brain, 
  Settings, 
  LogOut, 
  Bell, 
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

export const VitalityRadar = () => {
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
  const [vitalityScore, setVitalityScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [journeyProgress, setJourneyProgress] = useState(0)
  const [nextCategory, setNextCategory] = useState('fisico')
  const [assessmentStatus, setAssessmentStatus] = useState(null)
  const [topFatigue, setTopFatigue] = useState(null)

  const fetchEvaluations = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('evaluations')
        .select('solution_time_relation, solution_satisfaction, solution_internal_speed, solution_beliefs, scores, top_fatigue_solution, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        const evalData = data[0]
        
        let nextRoute = '/intro';
        if (!evalData.solution_satisfaction || Object.keys(evalData.solution_satisfaction).length === 0) {
          nextRoute = '/recovery/satisfaction';
        } else if (!evalData.solution_time_relation || Object.keys(evalData.solution_time_relation).length === 0) {
          nextRoute = '/recovery/time-relation';
        } else if (!evalData.solution_internal_speed || Object.keys(evalData.solution_internal_speed).length === 0) {
          nextRoute = '/recovery/internal-speed';
        } else if (!evalData.solution_beliefs || !evalData.solution_beliefs._card2_completed) {
          nextRoute = '/recovery/beliefs';
        } else if (!evalData.scores || Object.keys(evalData.scores).length < 7) {
          nextRoute = '/assessment/fisico';
        } else if (Object.keys(evalData.top_fatigue_solution || {}).filter(k => evalData.top_fatigue_solution[k]?.isCompleted).length < 7) {
          nextRoute = '/continue-healing';
        } else {
          nextRoute = '/contact';
        }
        setNextCategory(nextRoute);

        const validCategories = ['fisico', 'sensorial', 'emocional', 'mental', 'social', 'criativo', 'espiritual']
        const allScoresComplete = evalData.scores && validCategories.every(cat => evalData.scores[cat] !== undefined && evalData.scores[cat] !== null)
        
        if (allScoresComplete) {
          const fetchedScores = evalData.scores
          const status = evalData.status
          
          setHasRecord(true)
          setAssessmentStatus(status)

          const normalized = {}
          let highestScore = -1
          let highestCat = null
          let vitSum = 0;
          let vitCount = 0;

          Object.keys(CATEGORY_DATA).forEach(key => {
            const rawVal = fetchedScores[key]
            if (rawVal !== undefined && rawVal !== null) {
              const maxVal = CATEGORY_DATA[key].max
              const perc = Math.min(100, Math.round((rawVal / maxVal) * 100))
              normalized[key] = perc
              vitSum += perc;
              vitCount++;

              // Find top fatigue category accurately
              if (perc > highestScore) {
                highestScore = perc
                highestCat = { key, label: CATEGORY_DATA[key].label, percentage: perc }
              }
            } else {
              normalized[key] = 0;
            }
          })

          setScores(normalized)
          setTopFatigue(highestCat)
          if (vitCount > 0) setVitalityScore(Math.round(vitSum / vitCount))
          
          const answeredCount = validCategories.filter(cat => fetchedScores[cat] !== undefined && fetchedScores[cat] !== null).length
          setJourneyProgress(Math.round((answeredCount / 7) * 100))
        } else {
          setHasRecord(false)
          setJourneyProgress(0)
          setVitalityScore(0)
        }
      } else {
        setHasRecord(false)
        setJourneyProgress(0)
        setNextCategory('/recovery/satisfaction')
        setVitalityScore(0)
      }
    } catch (err) {
      console.error('Erro ao buscar avaliações:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchEvaluations()
  }, [fetchEvaluations])

  // Re-fetch data when user returns to the tab after switching away
  useVisibilityRefresh(fetchEvaluations)

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
    <div className="bg-background-light dark:bg-background-dark text-slate-900 min-h-screen font-display">
      <div className="flex flex-col lg:flex-row lg:h-[100dvh] lg:overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-12 bg-background-light relative w-full">
          {/* Header */}
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 lg:pb-8">
              <div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">Radar de Vitalidade</h2>
                <p className="text-slate-500 font-medium mt-2 text-sm md:text-base lg:text-lg">Bom dia, {user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Alex')}!</p>
              </div>
              <div className="flex items-center gap-4">
                {hasRecord && (
                  <div className="bg-brand-pink/20 text-brand-pink px-3 py-2 md:px-4 rounded-xl flex items-center gap-2 border border-brand-pink/30">
                    <span className="text-[10px] hidden md:inline font-bold uppercase tracking-widest">Sua Energia:</span>
                    <span className="text-[10px] md:hidden font-bold uppercase tracking-widest">Energia:</span>
                    <span className="text-base md:text-lg font-black">{vitalityScore}%</span>
                  </div>
                )}
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 sm:p-6 overflow-y-auto">
                  <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-16 max-w-[600px] w-full flex flex-col items-center text-center shadow-2xl relative overflow-y-auto max-h-[90vh] my-auto">
                    
                    <button 
                      onClick={() => navigate('/intro')}
                      className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-slate-100 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors z-20 shrink-0"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    
                    {/* Pink decorative blob */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-pink/10 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-[60px] pointer-events-none"></div>
                    
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-brand-pink/10 rounded-full flex items-center justify-center mb-6 md:mb-10 text-brand-pink border border-brand-pink/20 relative z-10 shrink-0">
                      <FileText size={32} strokeWidth={2.5} className="md:w-10 md:h-10" />
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-800 mb-4 md:mb-6 tracking-tight relative z-10 leading-tight">
                      Você ainda não gerou métricas
                    </h3>
                    <p className="text-slate-500 text-base md:text-lg mb-8 md:mb-12 leading-relaxed font-medium relative z-10 px-0 md:px-8">
                      Para visualizar o seu Radar de Vitalidade, você precisa completar os exercícios pendentes. Continue de onde parou para prosseguir com o diagnóstico.
                    </p>
                    
                    <button 
                      onClick={() => navigate(nextCategory)} 
                      className="bg-[#eb6496] relative z-10 text-white w-full py-4 md:py-5 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm tracking-[0.15em] uppercase shadow-[0_15px_30px_-5px_rgba(235,100,150,0.4)] hover:shadow-[0_20px_35px_-5px_rgba(235,100,150,0.5)] hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-2 md:gap-3 shrink-0 mb-6"
                    >
                      Continuar de onde parei <ArrowRight size={18} strokeWidth={2.5} />
                    </button>
                    
                    <button 
                      onClick={() => navigate('/intro')}
                      className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 relative z-10 shrink-0 mb-2"
                      style={{ marginTop: '24px' }}
                    >
                      Voltar para o Início
                    </button>
                  </div>
                </div>
                
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 flex-1 relative z-10">
            
            {/* Left Column */}
            <div className="col-span-1 lg:col-span-7 flex flex-col gap-8 min-w-0 w-full max-w-full">
              
              {/* Radar Chart Card */}
              <div className="bg-white rounded-[2rem] p-4 md:p-8 shadow-sm overflow-hidden w-full max-w-full box-border">
                <div className="flex justify-between items-center mb-4 md:mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <RechartsRadar size={24} className="text-accent" /> Radar de Vitalidade
                  </h3>
                  {hasRecord && (
                    <div className="bg-brand-pink/10 text-brand-pink px-4 py-2 rounded-xl flex items-center gap-2 border border-brand-pink/20">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Sua Energia:</span>
                      <span className="text-lg font-black">{vitalityScore}% <span className="text-sm font-bold opacity-80 hidden md:inline">Vitalidade</span></span>
                    </div>
                  )}
                </div>
                
                <div className="relative aspect-square max-h-[300px] md:max-h-[400px] mx-auto flex items-center justify-center w-full -mt-2 md:-mt-4 overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius={window.innerWidth < 768 ? "60%" : "65%"} data={radarData}>
                      <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                      <PolarAngleAxis 
                        dataKey="radarLabel" 
                        tick={(props) => {
                          const { payload, x, y, textAnchor } = props;
                          const words = payload.value.split(' ');
                          const lines = [];
                          let currentLine = '';
                          words.forEach(word => {
                            if ((currentLine + word).length > 12) {
                              if (currentLine) lines.push(currentLine.trim());
                              currentLine = word + ' ';
                            } else {
                              currentLine += word + ' ';
                            }
                          });
                          if (currentLine) lines.push(currentLine.trim());

                          return (
                            <text x={x} y={y} textAnchor={textAnchor} fill="#94a3b8" fontSize={window.innerWidth < 768 ? 9 : 10} fontWeight={700}>
                              {lines.map((line, index) => (
                                <tspan x={x} dy={index === 0 ? 0 : 12} key={index}>{line}</tspan>
                              ))}
                            </text>
                          );
                        }} 
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
            <div className="col-span-1 lg:col-span-5 flex flex-col gap-8 h-[calc(100vh-180px)]">
              
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
