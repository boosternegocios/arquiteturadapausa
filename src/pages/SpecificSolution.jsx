import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, Save, LayoutDashboard, Settings, LogOut, CheckCircle, FileText, ArrowRight
} from 'lucide-react'
import { PhysicalFatigue } from '../components/solutions/PhysicalFatigue'
import { CreativeFatigue } from '../components/solutions/CreativeFatigue'
import { MentalFatigue } from '../components/solutions/MentalFatigue'
import { SensorialFatigue } from '../components/solutions/SensorialFatigue'
import { EmotionalFatigue } from '../components/solutions/EmotionalFatigue'
import { SocialFatigue } from '../components/solutions/SocialFatigue'
import { SpiritualFatigue } from '../components/solutions/SpiritualFatigue'

const CATEGORY_DATA = {
  fisico: { label: 'Físico', max: 80 },
  mental: { label: 'Mental', max: 70 },
  sensorial: { label: 'Sensorial', max: 80 },
  criativo: { label: 'Criativo', max: 90 },
  emocional: { label: 'Emocional', max: 80 },
  social: { label: 'Social', max: 80 },
  espiritual: { label: 'Espiritual', max: 50 }
}

export const SpecificSolution = () => {
  const navigate = useNavigate()
  const { category } = useParams()
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [evaluationId, setEvaluationId] = useState(null)
  
  const [topFatigue, setTopFatigue] = useState(null)
  const [solutionData, setSolutionData] = useState({})

  useEffect(() => {
    const fetchEvaluation = async () => {
      if (!user) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) throw error
        
        if (data && data.length > 0) {
          setEvaluationId(data[0].id)
          
          let highestCat = 'fisico' // fallback
          if (data[0].scores && Object.keys(data[0].scores).length > 0) {
            let highestScore = -1
            Object.keys(CATEGORY_DATA).forEach(key => {
              const rawVal = data[0].scores[key] || 0
              const maxVal = CATEGORY_DATA[key].max
              const perc = Math.min(100, Math.round((rawVal / maxVal) * 100))
              if (perc > highestScore) {
                highestScore = perc
                highestCat = key
              }
            })
          }
          
          // Se recebemos um parâmetro via URL, ele vira o novo foco
          const focusCat = category && CATEGORY_DATA[category] ? category : highestCat
          setTopFatigue(focusCat)

          // Só zeramos ou setamos os dados se for a categoria que realmente queremos exibir
          if (data[0].top_fatigue_solution && data[0].top_fatigue_solution[focusCat]) {
            setSolutionData(data[0].top_fatigue_solution[focusCat])
          } else {
            setSolutionData({})
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchEvaluation()
  }, [user?.id, category])

  const validateFatigue = (category, data) => {
    if (!data) return false;
    
    const allFilled = (arr) => arr && arr.length > 0 && arr.every(item => item && String(item).trim() !== '');

    switch(category) {
      case 'fisico':
        if (!data.act01?.list || !data.act01.list.every(i => i.act?.trim() && i.rest?.trim())) return false;
        if (!data.act02?.records) return false;
        const records = Object.values(data.act02.records);
        if (records.length !== 7 || !records.every(r => r.state && r.why?.trim())) return false;
        // act03 and act05 ocultados temporariamente
        if (!data.act04 || ['temp','dark','cafeina','silencio','sons','aromas','cama'].some(k => typeof data.act04[k] !== 'number')) return false;
        return true;

      case 'criativo':
        if (!allFilled(data.act01?.list)) return false;
        if (!data.act02 || ['weekly','monthly','yearly'].some(k => !data.act02[k]?.trim())) return false;
        return true;

      case 'mental':
        // act01 e act02 ocultados temporariamente, não exigir preenchimento
        if (!data.act03 || ['imagens','frases','pessoas','lugares','eventos','emocoes','medos','duvidas'].some(k => !data.act03[k]?.trim())) return false;
        if (!data.act04?.list || !data.act04.list.every(i => i.negative?.trim() && i.positive?.trim())) return false;
        return true;

      case 'sensorial':
        // act01 ocultado temporariamente
        const act02Keys = ['desconectar','brilho','silenciar','silencio','frutas','olhos','tampaos'];
        if (!data.act02 || act02Keys.some(k => typeof data.act02[k] !== 'number')) return false;
        return true;

      case 'emocional':
        if (!data.act01 || ['outros','consigo'].some(k => typeof data.act01[k] !== 'number')) return false;
        if (!data.act02 || ['social','educacional','interessantes','infeliz'].some(k => !data.act02[k]?.trim() || typeof data.act02[`${k}_nota`] !== 'number')) return false;
        return true;

      case 'social':
        if (!allFilled(data.act01?.drainers) || !allFilled(data.act01?.boosters)) return false;
        if (!allFilled(data.act02?.presencial) || !allFilled(data.act02?.online) || !data.act02?.action?.trim()) return false;
        return true;

      case 'espiritual':
        if (!data.act01?.text?.trim() || !data.act02?.text?.trim() || !data.act03?.text?.trim()) return false;
        // act04 oculto temporariamente
        return true;

      default:
        return false;
    }
  }

  const handleSave = async (isFinal = false, isSilent = false) => {
    if (!evaluationId || !topFatigue) return
    
    if (isFinal) {
      const isValid = validateFatigue(topFatigue, solutionData);
      if (!isValid) {
        alert("Ops! Para concluir, você precisa preencher 100% dos campos de todas as seções (inclusive as tabelas inteiras). Volte e verifique o que faltou!");
        return;
      }
    }

    if (!isSilent) setSaving(true)
    try {
      
      const { data } = await supabase
        .from('evaluations')
        .select('top_fatigue_solution')
        .eq('id', evaluationId)
        .single()
        
      const currentSolutions = data?.top_fatigue_solution || {}
      
      // Preserva status de conclusão se já estiver concluído anteriormente
      const prevData = currentSolutions[topFatigue] || {};
      const updatedData = { ...solutionData };
      if (isFinal || prevData.isCompleted) {
        updatedData.isCompleted = true;
      }

      const updates = {
        top_fatigue_solution: {
          ...currentSolutions,
          [topFatigue]: updatedData
        }
      }

      // Removemos a tentativa de atualizar `solution_status` pois a coluna não existe.
      // A indicação de conclusão agora é dada por `updatedData.isCompleted = true`.

      const { error } = await supabase
        .from('evaluations')
        .update(updates)
        .eq('id', evaluationId)

      if (error) throw error

      if (!isSilent && !isFinal) {
        alert("Progresso salvo com sucesso!");
      }

      if (isFinal) {
        navigate('/continue-healing')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      if (!isSilent) alert('Erro no banco de dados: ' + error.message)
    } finally {
      if (!isSilent) setSaving(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const renderFatigueSolution = () => {
    if (topFatigue === 'fisico') return <PhysicalFatigue data={solutionData} onChange={setSolutionData} />
    if (topFatigue === 'criativo') return <CreativeFatigue data={solutionData} onChange={setSolutionData} />
    if (topFatigue === 'mental') return <MentalFatigue data={solutionData} onChange={setSolutionData} />
    if (topFatigue === 'sensorial') return <SensorialFatigue data={solutionData} onChange={setSolutionData} />
    if (topFatigue === 'emocional') return <EmotionalFatigue data={solutionData} onChange={setSolutionData} />
    if (topFatigue === 'social') return <SocialFatigue data={solutionData} onChange={setSolutionData} />
    if (topFatigue === 'espiritual') return <SpiritualFatigue data={solutionData} onChange={setSolutionData} />
    
    // Placeholder para os que ainda vamos construir:
    const ComponentPholder = () => (
      <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in slide-in-from-bottom-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Settings className="text-slate-400 animate-spin" size={32} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-4">Trilha em Construção</h2>
        <p className="text-slate-500 font-medium">A trilha de recuperação para o cansaço {topFatigue?.toUpperCase()} será implementada em seguida!</p>
      </div>
    )

    return <ComponentPholder />
  }

  return (
    <div className="bg-[#f8f3e9] min-h-screen text-slate-900 font-display">
      <div className="flex flex-col lg:flex-row lg:lg:h-[100dvh] lg:lg:overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-0 md:p-8 lg:p-12 w-full relative" onBlur={() => handleSave(false, true)}>
          <div className="p-4 pt-6 md:p-14 lg:p-20 pb-40 md:pb-40">
            {loading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-[#1ed7a4]/20 border-t-[#1ed7a4] rounded-full animate-spin"></div>
              </div>
            ) : (
              renderFatigueSolution()
            )}
          </div>
        </main>

        {/* Footer Actions */}
        <div className="mt-10 pb-4 md:pb-8 z-30">
          <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row justify-between sm:justify-between items-center gap-4 sm:gap-0 bg-white border border-slate-200 p-4 rounded-3xl">
            <button 
              onClick={() => navigate('/continue-healing')}
              className="hidden sm:flex items-center gap-1 md:gap-2 font-bold text-slate-500 uppercase tracking-widest text-[10px] md:text-sm hover:text-slate-800 transition-colors shrink-0"
            >
              <ArrowLeft size={16} strokeWidth={2.5} className="md:w-[18px] md:h-[18px]" /> <span>Voltar</span>
            </button>
            <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
              <button 
                onClick={() => navigate('/intro')}
                className="px-8 py-3.5 font-bold text-slate-600 bg-white sm:bg-transparent border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto text-xs md:text-sm tracking-widest uppercase text-center"
              >
                Voltar ao Início
              </button>
              <button 
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-8 py-3.5 font-bold text-[#004b4c] bg-[#1ed7a4] shadow-[0_10px_20px_rgba(30,215,164,0.3)] hover:shadow-[0_15px_30px_rgba(30,215,164,0.4)] rounded-xl transition-all w-full sm:w-auto text-xs md:text-sm tracking-widest uppercase hover:bg-[#1bc294] hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sm:hidden">{saving ? 'Salvando...' : 'Concluir'}</span>
                <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Concluir Exercício'}</span>
                {!saving && <CheckCircle size={16} strokeWidth={2.5} className="md:w-[18px] md:h-[18px]" />}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
