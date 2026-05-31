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
  }, [user, category])

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

      if (isFinal) {
        updates.solution_status = 'completed_deep'
      }

      const { error } = await supabase
        .from('evaluations')
        .update(updates)
        .eq('id', evaluationId)

      if (error) throw error

      if (!isSilent && !isFinal) {
        alert("Progresso salvo com sucesso!");
      }

      if (isFinal) {
        navigate('/intro')
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
    <div className="bg-[#fcfaf5] text-slate-900 min-h-screen font-display">
      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar Matches Second Image perfectly (Mentoria e Negócios) */}
        <Sidebar />

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto relative" onBlur={() => handleSave(false, true)}>
          <div className="p-8 md:p-14 lg:p-20 pb-40">
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
        <div className="fixed bottom-0 right-0 left-80 bg-gradient-to-t from-[#fcfaf5] via-[#fcfaf5] to-transparent pt-20 pb-8 px-10 md:px-20 z-30 pointer-events-none">
          <div className="max-w-5xl mx-auto w-full flex justify-between items-center pointer-events-auto">
            <button 
              onClick={() => navigate('/recovery/pauses')}
              className="flex items-center gap-2 font-bold text-slate-500 uppercase tracking-widest text-sm hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={18} strokeWidth={2.5} /> Etapas de Ritmo
            </button>
            <div className="flex gap-6 items-center">
              <button 
                onClick={() => handleSave(false)} 
                disabled={saving || loading}
                className="font-bold text-slate-600 uppercase tracking-widest text-xs hover:text-slate-900 transition-colors"
              >
                Salvar Rascunho
              </button>
              <button 
                onClick={() => handleSave(true)}
                disabled={saving || loading}
                className="bg-[#eb6496] shadow-[0_10px_20px_rgba(235,100,150,0.3)] hover:shadow-[0_15px_30px_rgba(235,100,150,0.4)] text-white px-8 py-4 rounded-xl font-bold text-sm tracking-widest uppercase hover:bg-[#d84e80] transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
              >
                Concluir Reflexão <CheckCircle size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
