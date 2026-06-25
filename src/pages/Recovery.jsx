import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, ArrowRight, Save, LayoutDashboard, Settings, LogOut, CheckCircle, Plus, Trash2, FileText
} from 'lucide-react'

const STEPS = [
  { id: 'satisfaction', number: 1, title: '1 Quão satisfeito você está com seu nível de...', subtitle: 'Usando uma escala de 1 (mais baixo) a 10 (mais alto)' },
  { id: 'time-relation', number: 2, title: '2 Analise sua relação com o tempo', subtitle: 'Em uma escala de 1 a 10, onde 1 (discorda totalmente) a 10 (concorda totalmente), quanto você:' },
  { id: 'internal-speed', number: 3, title: '3 Reflita sobre sua velocidade interna', subtitle: 'Em uma escala de 1 a 10, onde 1 indica um ritmo interno mais lento e 10 indica um ritmo interno mais acelerado, como você se considera? Posicione o controle conforme você se identifica' },
  { id: 'beliefs', number: 4, title: '1 Você possui alguma dessas crenças?', subtitle: 'Em uma escala de 1 a 10, quanto você concorda com as afirmações, considerando 1 (mais baixo) a 10 (mais alto)' },
  { id: 'cycle', number: 5, title: '2 Entenda seus Ciclos', subtitle: 'A reflexão sobre os ciclos nos ajuda a quebrar a inércia do desgaste.' },
  { id: 'time-tips', number: 6, title: '3 Reflita sobre sua relação com o tempo', subtitle: 'Mude a perspectiva sobre como você gasta a sua vida.' },
  { id: 'pauses', number: 7, title: 'Estratégias para pausas intencionais', subtitle: 'Passos fundamentais para recuperar energia vital.' }
]

const QUESTIONS = {
  satisfaction: [
    { key: 'foco', label: 'Foco' },
    { key: 'produtividade', label: 'Produtividade' },
    { key: 'realizacao', label: 'Realização' },
    { key: 'ritmo', label: 'Seu ritmo de vida' },
  ],
  time_relation: [
    { key: 'equilibrio', label: 'Equilibra o tempo para: trabalho, outros e si mesmo' },
    { key: 'importancia', label: 'Define bem a importância e a urgência das atividades' },
    { key: 'mensagens', label: 'Evita enviar msgs fora do horário de trabalho' },
    { key: 'tempo_livre', label: 'Considera seu tempo livre semanal satisfatório' },
    { key: 'limite_corpo', label: 'Não desrespeita o limite do seu corpo por excesso de atividades' },
    { key: 'stress', label: 'Não sente stress crônico' },
    { key: 'frustracao_agenda', label: 'Vive satisfeito com a sua agenda' },
    { key: 'delega_centraliza', label: 'Delega tarefas com segurança' },
  ],
  internal_speed: [
    { key: 'acelerada_lenta', label: 'Lento(a) ou Acelerado(a)?' },
    { key: 'focada_relaxada', label: 'Focado(a) ou Disperso(a)?' },
    { key: 'paciente_impaciente', label: 'Paciente ou Impaciente?' },
    { key: 'ponderada_impulsiva', label: 'Ponderado(a) ou Impulsivo(a)?' },
    { key: 'decisao_rapida_lenta', label: 'Toma decisões lentamente ou rapidamente?' },
  ],
  beliefs: [
    { key: 'sacrificio', label: 'Preciso me sacrificar para atingir meus objetivos' },
    { key: 'utilidade', label: 'Minha utilidade define meu valor' },
    { key: 'sozinho', label: 'Dou conta do meu trabalho sozinho (a)' },
    { key: 'meta_x', label: 'Vou ser feliz quando atingir a Meta X' },
    { key: 'pressao', label: 'Eu funciono melhor sob pressão' },
    { key: 'desorganizado', label: 'Sou desorganizado por natureza' },
    { key: 'bem_feito', label: 'Se eu não fizer, não sairá bem feito' },
    { key: 'liberdade', label: 'Planejar meu tempo me deixa sem liberdade' },
    { key: 'improdutivo', label: 'Descansar é improdutivo' },
    { key: 'tempo_insuficiente', label: 'Não tenho tempo suficiente' },
    { key: 'dar_conta', label: 'Tenho que dar conta de tudo' },
  ]
}

export const Recovery = () => {
  const { step } = useParams()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [evaluationId, setEvaluationId] = useState(null)
  const mainRef = useRef(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0)
    }
  }, [step])

  const currentStepInfo = STEPS.find(s => s.id === step) || STEPS[0]
  const isLastStep = currentStepInfo.number === STEPS.length
  
  const PHASE_1_STEPS = ['satisfaction', 'time-relation', 'internal-speed']
  const PHASE_2_STEPS = ['beliefs', 'cycle', 'time-tips']

  let visualSteps = STEPS
  if (PHASE_1_STEPS.includes(step)) {
    visualSteps = STEPS.filter(s => PHASE_1_STEPS.includes(s.id))
  } else if (PHASE_2_STEPS.includes(step)) {
    visualSteps = STEPS.filter(s => PHASE_2_STEPS.includes(s.id))
  }

  const visualStepNumber = visualSteps.findIndex(s => s.id === step) + 1

  const [formData, setFormData] = useState({
    satisfaction: {},
    time_relation: {},
    internal_speed: {},
    beliefs: {},
    cycle_relation: 5,
    rhythm_impacts: [{ id: 1, aspect: '', action: '' }, { id: 2, aspect: '', action: '' }, { id: 3, aspect: '', action: '' }, { id: 4, aspect: '', action: '' }, { id: 5, aspect: '', action: '' }]
  })

  useEffect(() => {
    let isMounted = true;
    
    const fetchEvaluation = async () => {
      if (!user) return
      
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn("Recovery fetchEvaluation timeout! Forcing loading to false.");
          setLoading(false);
        }
      }, 5000);

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('evaluations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        clearTimeout(timeoutId);
        if (!isMounted) return;

        if (error) throw error
        
        if (data && data.length > 0) {
          setEvaluationId(data[0].id)
          setFormData(prev => ({
            ...prev,
            satisfaction: data[0].solution_satisfaction || {},
            time_relation: data[0].solution_time_relation || {},
            internal_speed: data[0].solution_internal_speed || {},
            beliefs: data[0].solution_beliefs || {},
            rhythm_impacts: (data[0].solution_rhythm_impacts && data[0].solution_rhythm_impacts.length > 0) 
              ? data[0].solution_rhythm_impacts 
              : prev.rhythm_impacts
          }))
        } else {
          // Create new evaluation if none exists
          const { data: newEval, error: insertError } = await supabase
            .from('evaluations')
            .insert([{ user_id: user.id, status: 'draft' }])
            .select()
          
          if (insertError) throw insertError
          if (newEval && newEval.length > 0) {
            setEvaluationId(newEval[0].id)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchEvaluation()
    
    return () => {
      isMounted = false;
    }
  }, [user])

  const handleSave = async (isFinal = false, isAdvancing = false) => {
    let currentEvalId = evaluationId;

    const fetchWithTimeout = (promise, ms = 8000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Conexão muito lenta. Tente novamente.')), ms))
      ])
    }

    if (!currentEvalId) {
      try {
        setSaving(true)
        const { data: newEval, error: insertError } = await fetchWithTimeout(
          supabase.from('evaluations').insert([{ user_id: user.id, status: 'draft' }]).select()
        )
        if (insertError) throw insertError
        if (newEval && newEval.length > 0) {
          currentEvalId = newEval[0].id
          setEvaluationId(currentEvalId)
        }
      } catch (e) {
        console.error('Insert error:', e)
      }
    }

    if (isAdvancing) {
      if (step === 'satisfaction' && Object.keys(formData.satisfaction).length < QUESTIONS.satisfaction.length) {
        alert('Por favor, responda todas as perguntas desta etapa antes de avançar.')
        return
      }
      if (step === 'time-relation' && Object.keys(formData.time_relation).length < QUESTIONS.time_relation.length) {
        alert('Por favor, responda todas as perguntas desta etapa antes de avançar.')
        return
      }
      if (step === 'beliefs') {
        const answersCount = Object.keys(formData.beliefs).filter(k => k !== '_card2_completed').length
        if (answersCount < QUESTIONS.beliefs.length) {
          alert('Por favor, responda todas as perguntas desta etapa antes de avançar.')
          return
        }
      }
    }

    setSaving(true)
    let saveSuccess = false;
    
    try {
      if (currentEvalId) {
        let beliefsToSave = formData.beliefs
        if (isAdvancing && step === 'time-tips') {
          beliefsToSave = { ...beliefsToSave, _card2_completed: true }
        }

        const updates = {
          solution_satisfaction: formData.satisfaction,
          solution_time_relation: formData.time_relation,
          solution_internal_speed: formData.internal_speed,
          solution_beliefs: beliefsToSave,
          solution_rhythm_impacts: formData.rhythm_impacts.filter(r => r.aspect.trim() || r.action.trim()),
          solution_status: isFinal ? 'completed' : 'draft'
        }

        const { error } = await fetchWithTimeout(
          supabase.from('evaluations').update(updates).eq('id', currentEvalId)
        )
        if (error) throw error
        saveSuccess = true;
      }
    } catch (error) {
      console.error('Erro ao salvar formulário:', error)
      if (!isAdvancing) {
        alert('Aviso: Não foi possível salvar o rascunho. Verifique sua conexão. (' + error.message + ')')
      }
    } finally {
      setSaving(false)
      
      if (isAdvancing) {
        if (isFinal) {
          navigate('/contact')
        } else if (step === 'internal-speed' || step === 'time-tips') {
          navigate('/intro')
        } else {
          const nextStepIndex = STEPS.findIndex(s => s.id === step) + 1
          if (nextStepIndex < STEPS.length) {
            navigate(`/recovery/${STEPS[nextStepIndex].id}`)
          }
        }
      } else if (saveSuccess) {
        alert('Rascunho salvo com sucesso!')
      }
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const renderScale1to10 = (section, questions) => (
    <div className="space-y-10">
      {questions.map((q, index) => (
        <div key={q.key} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
          <h3 className="text-xl font-bold text-slate-800 mb-6">{q.label}</h3>
          <div className="grid grid-cols-5 md:flex md:justify-start gap-2 md:gap-4 md:flex-wrap place-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => {
              const isSelected = formData[section][q.key] === val
              // Decide color based on value
              let colorClass = 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
              if (isSelected) {
                if (val < 5) colorClass = 'bg-[#eb6496] text-white border-[#eb6496] shadow-md font-bold'
                else if (val === 5) colorClass = 'bg-slate-900 text-white border-slate-900 shadow-md font-bold'
                else colorClass = 'bg-[#1ed7a4] text-slate-900 border-[#1ed7a4] shadow-md font-black'
              }

              return (
                <button
                  key={val}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    [section]: { ...prev[section], [q.key]: val }
                  }))}
                  className={`w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all duration-200 ${colorClass} ${isSelected ? 'scale-110' : 'hover:scale-105'}`}
                >
                  {val}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  const renderBipolarScale = () => (
    <div className="space-y-12">
      {QUESTIONS.internal_speed.map((q, index) => {
        const parts = q.label.replace('?', '').split(' ou ')
        const leftLabel = parts[0]
        const rightLabel = parts[1] || parts[0]
        const currentValue = formData.internal_speed[q.key] || 5

        return (
          <div key={q.key} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex justify-between items-center mb-6">
              <span className={`font-bold text-lg ${currentValue < 5 ? 'text-[#eb6496]' : 'text-slate-400'}`}>{leftLabel}</span>
              <span className={`font-bold text-lg ${currentValue > 6 ? 'text-[#1ed7a4]' : 'text-slate-400'}`}>{rightLabel}</span>
            </div>
            <div className="relative pt-6 pb-2">
              {/* Fake track */}
              <div className="absolute top-8 left-0 right-0 h-2 bg-slate-200 rounded-full"></div>
              {/* Value indicator connecting line if wanted, but simpler to just use input range */}
              <input 
                type="range"
                min="1"
                max="10"
                value={currentValue}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  internal_speed: { ...prev.internal_speed, [q.key]: parseInt(e.target.value) }
                }))}
                className="w-full relative z-10 accent-[#eb6496] appearance-none bg-transparent h-2 rounded-full outline-none"
                style={{
                   // A simple custom style for thumb
                   WebkitAppearance: 'none'
                }}
              />
              <div className="flex justify-between px-1 mt-4 text-xs font-bold text-slate-300">
                {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderRhythmForm = () => (
    <div className="space-y-12 relative max-w-4xl">
      {/* Vertical line timeline */}
      <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-slate-200 z-0"></div>
      
      {formData.rhythm_impacts.map((item, index) => (
        <div key={item.id} className="relative z-10 flex gap-6 md:gap-8 group">
          {/* Timeline Node */}
          <div className="shrink-0 w-12 h-12 rounded-full bg-[#1ed7a4] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[#1ed7a4]/30 border-4 border-[#fcfaf5]">
            {String(index + 1).padStart(2, '0')}
          </div>
          
          {/* Card */}
          <div className="flex-1 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="mb-6">
              <label className="block text-xs font-black uppercase text-[#eb6496] tracking-widest mb-3">Fator de Impacto</label>
              <input 
                type="text"
                placeholder="Ex: Excesso de notificações digitais"
                value={item.aspect}
                onChange={(e) => {
                  const newImpacts = [...formData.rhythm_impacts]
                  newImpacts[index].aspect = e.target.value
                  setFormData({...formData, rhythm_impacts: newImpacts})
                }}
                className="w-full bg-[#f4ece3]/50 p-4 rounded-xl border-none font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1ed7a4]/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">Ação de Mitigação</label>
              <textarea 
                placeholder="Ex: Estabelecer janelas de 'modo foco' entre 9h e 11h"
                value={item.action}
                onChange={(e) => {
                  const newImpacts = [...formData.rhythm_impacts]
                  newImpacts[index].action = e.target.value
                  setFormData({...formData, rhythm_impacts: newImpacts})
                }}
                rows={2}
                className="w-full bg-[#f4ece3]/50 p-4 rounded-xl border-none font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#1ed7a4]/30 resize-none"
              />
            </div>
          </div>
        </div>
      ))}
      
      <button 
        onClick={() => setFormData(p => ({...p, rhythm_impacts: [...p.rhythm_impacts, { id: Date.now(), aspect: '', action: '' }]}))}
        className="ml-20 flex items-center gap-2 text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-[#eb6496] transition-colors"
      >
        <Plus size={18} /> Adicionar Linha
      </button>
    </div>
  )

  const renderCycleInfo = () => (
    <div className="flex flex-col gap-12 items-center h-full w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4">
      
      <div className="w-full max-w-3xl mb-4">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Pensando na sua agenda semanal, você tem um ciclo negativo ou realista de relação com o tempo?</h3>
        <div className="flex justify-between items-center mb-6">
          <span className={`font-bold text-lg ${formData.cycle_relation < 5 ? 'text-[#eb6496]' : 'text-slate-400'}`}>Negativo</span>
          <span className={`font-bold text-lg ${formData.cycle_relation > 6 ? 'text-[#1ed7a4]' : 'text-slate-400'}`}>Realista</span>
        </div>
        <div className="relative pt-6 pb-2">
          <div className="absolute top-8 left-0 right-0 h-2 bg-slate-200 rounded-full"></div>
          <input 
            type="range"
            min="1"
            max="10"
            value={formData.cycle_relation}
            onChange={(e) => setFormData(prev => ({ ...prev, cycle_relation: parseInt(e.target.value) }))}
            className="w-full relative z-10 accent-[#eb6496] appearance-none bg-transparent h-2 rounded-full outline-none"
            style={{ WebkitAppearance: 'none' }}
          />
          <div className="flex justify-between px-1 mt-4 text-xs font-bold text-slate-300">
            {[1,2,3,4,5,6,7,8,9,10].map(n => <span key={n}>{n}</span>)}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-12 md:gap-8 justify-center w-full">
      
      {/* Ciclo Negativo */}
      <div className="flex-1 flex flex-col items-center p-8 bg-slate-50/80 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
        <div className="w-64 h-64 rounded-full border-dashed border-4 border-slate-300 relative flex items-center justify-center mb-8 rotate-12 transition-transform duration-1000 group-hover:rotate-45">
          <div className="absolute -top-6 bg-slate-800 text-white p-3 rounded-xl shadow-lg border border-slate-700 w-40 text-center text-xs font-bold leading-tight z-10">Procrastinação<br/>Atraso<br/><span className="text-[10px] font-normal opacity-70">Volume</span></div>
          <div className="absolute -right-12 bg-slate-800 text-white p-3 rounded-xl shadow-lg border border-slate-700 w-40 text-center text-xs font-bold leading-tight z-10">Ansiedade<br/>Frustração<br/><span className="text-[10px] font-normal opacity-70">Prazo inviável</span></div>
          <div className="absolute -bottom-6 -left-6 bg-slate-800 text-white p-3 rounded-xl shadow-lg border border-slate-700 w-40 text-center text-xs font-bold leading-tight z-10">Fracasso<br/><span className="text-[10px] font-normal opacity-70">Culpa e incapacidade</span></div>
          
          <div className="w-32 h-32 rounded-full border-4 border-[#eb6496] border-t-transparent border-l-transparent opacity-30 animate-spin" style={{ animationDuration: '3s' }}></div>
        </div>
        <h3 className="text-3xl font-black text-slate-800 mb-2">Ciclo Negativo</h3>
        <p className="text-sm font-bold uppercase tracking-widest text-slate-500 text-center leading-relaxed">Gera sentimentos negativos e esgotamento. É alimentado por um volume de atividades irrealista, pela cobrança por produtividade e pela sensação de que "nunca há tempo suficiente".</p>
      </div>

      <div className="text-slate-300 shrink-0 hidden md:block">
        <ArrowRight size={40} strokeWidth={1} />
      </div>

      {/* Ciclo Realista */}
      <div className="flex-1 flex flex-col items-center p-8 bg-gradient-to-br from-[#1ed7a4]/10 to-transparent rounded-[3rem] border border-[#1ed7a4]/20 shadow-sm relative overflow-hidden group">
        <div className="w-64 h-64 rounded-full border-solid border-4 border-[#1ed7a4]/30 relative flex items-center justify-center mb-8 -rotate-12 transition-transform duration-1000 group-hover:rotate-0">
          <div className="absolute -top-6 -left-6 bg-white text-[#004b4c] p-4 rounded-xl shadow-xl shadow-[#1ed7a4]/20 border border-white w-40 text-center text-sm font-black leading-tight z-10">Hierarquizar<br/>Atividades</div>
          <div className="absolute -right-6 top-1/2 -translate-y-1/2 bg-white text-[#004b4c] p-4 rounded-xl shadow-xl shadow-[#1ed7a4]/20 border border-white w-40 text-center text-sm font-black leading-tight z-10">Melhor feito<br/>que perfeito</div>
          <div className="absolute -bottom-8 left-8 bg-white text-[#004b4c] p-4 rounded-xl shadow-xl shadow-[#1ed7a4]/20 border border-white w-44 text-center text-sm font-black leading-tight z-10">Foco individual e<br/>Pacto coletivo</div>
          
          <div className="w-32 h-32 rounded-full border-4 border-[#1ed7a4] border-b-transparent border-r-transparent opacity-60 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }}></div>
        </div>
        <h3 className="text-3xl font-black text-[#004b4c] mb-2">Ciclo Realista</h3>
        <p className="text-sm font-bold uppercase tracking-widest text-[#1ed7a4] text-center leading-relaxed">Exige abandonar a ilusão do controle e aceitar que o tempo é um recurso fixo, dinâmico e limitado. Em vez de tentar "gerenciar" as horas o foco passa a ser em gerenciar a própria energia e o que é possível dentro do tempo</p>
      </div>

      </div>
    </div>
  )

  const renderTimeTips = () => {
    const list = [
      { id: '01', title: 'Seu tempo não é só seu', desc: 'Há o horário do trabalho e o tempo de cuidado com os outros, use o resto com sabedoria' },
      { id: '02', title: 'Nem tudo é urgente', desc: 'Defina uma ordem de importância e a prioridade para realização das coisas' },
      { id: '03', title: 'Excesso de trabalho não é status', desc: 'Stress contínuo não significa produtividade e pode ser a causa de algum problema grave.' },
      { id: '04', title: 'Dinheiro não compra saúde', desc: 'Quando desconsideramos constantemente os limites do corpo as consequências chegam' },
      { id: '05', title: 'Desacelerar não é deixar de fazer', desc: 'Respeite o ritmo do seu corpo e dos outros, incluindo momentos de descanso para aumentar a produtividade' },
      { id: '06', title: 'Estabeleça limites', desc: 'Produtividade também precisa de tempo livre. Comece com o seu exemplo, evite enviar msgs fora do horário de trabalho.' },
      { id: '07', title: 'Disciplina é liberdade', desc: 'Pensamos antes de gastar 1h em uma tarefa mas não antes de olhar o celular 1 min. Sera que foi so 1 min?' },
    ]
    return (
      <div className="flex flex-col rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
        {list.map((item, index) => (
          <div key={item.id} className={`flex gap-6 p-6 md:p-8 ${index !== list.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50 transition-colors group`}>
            <div className="text-3xl md:text-4xl font-black text-[#1ed7a4]/50 group-hover:text-[#1ed7a4] transition-colors shrink-0 pt-1 w-12">{item.id}</div>
            <div className="flex-1 md:flex md:gap-8 items-start">
              <h4 className="text-lg md:text-xl font-bold text-slate-800 md:w-1/3 shrink-0 mb-2 md:mb-0 leading-tight">{item.title}</h4>
              <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed md:w-2/3">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderPauses = () => {
    const list = [
      { id: '01', title: 'Permissão para Pausar', desc: 'Lembre a si mesmo que as pausas são necessárias, não opcionais.' },
      { id: '02', title: 'Comunicações em Lotes', desc: 'Designe horários específicos para e-mails e mensagens para ampliar o foco.' },
      { id: '03', title: 'Repense a duração das reuniões', desc: 'Opte por reuniões mais curtas para criar oportunidades de micropausa.' },
      { id: '04', title: 'Imponha Limites', desc: 'Respeite seu tempo terminando as reuniões conforme o programado.' },
      { id: '05', title: 'Agende e Lembre', desc: 'Planeje as pausas, especialmente quando sua energia cair à tarde.' },
      { id: '06', title: 'Abrace as Pausas Inesperadas', desc: 'Use qualquer tempo de inatividade para se recarregar.' },
    ]
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <div className="mb-10 bg-[#fcfaf5] border border-[#e2dacb] rounded-3xl p-8 md:p-10 text-slate-600 relative overflow-hidden shadow-sm text-left max-w-full">
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#eb6496]"></div>
          <div className="font-medium text-base md:text-lg leading-relaxed relative z-10 space-y-5">
            <p>Arquitete sua pausa de uma maneira que a recuperação de cada uma das suas 7 energias possam ser acompanhadas com a mesma seriedade que um <span className="font-black text-[#eb6496]">indicador-chave de desempenho de negócios.</span></p>
            <p>Adote o princípio do <span className="font-black text-[#eb6496]">“não estratégico”</span>, priorizando o que realmente importa, que é o projeto que realiza, a família e a própria saúde.</p>
            <p>Incorpore <span className="font-black text-[#eb6496]">micropausas diárias</span> a sua rotina, seja em cinco minutos de silêncio, seja um tempo ao ar livre ou melhorando a sua higiene do sono.</p>
            <p>Crie <span className="font-black text-[#eb6496]">“lotes de comunicação”</span> para responder a e-mails em horários fixos, em vez de ser interrompido a cada notificação, e repense a duração das suas reuniões.</p>
            <p>Planeje <span className="font-black text-[#eb6496]">pausas cíclicas (semanais)</span> e <span className="font-black text-[#eb6496]">macropausas (semestrais/anuais)</span>, incluindo o descanso e as férias na sua agenda, assim como faria com uma reunião.</p>
            <p>Seja um <span className="font-black text-[#eb6496]">exemplo de desconexão</span>, protegendo noites e fins de semana para que o seu time se sinta seguro para fazer o mesmo.</p>
          </div>
        </div>

        <div className="grid gap-6 md:gap-8">
          {list.map((item, index) => (
          <div key={item.id} className="flex gap-6 md:gap-8 items-start group">
            <div className="text-4xl md:text-5xl font-black text-[#eb6496]/20 group-hover:text-[#eb6496] transition-colors shrink-0 tracking-tighter w-16">{item.id}</div>
            <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm flex-1 transform transition-all group-hover:-translate-y-1 group-hover:shadow-md">
              <span className="font-bold text-lg md:text-xl text-[#004b4c] block mb-2">{item.title}</span>
              <span className="text-slate-500 text-sm md:text-base font-medium leading-relaxed">{item.desc}</span>
            </div>
          </div>
        ))}
        </div>
      </div>
    )
  }

  const renderCurrentStep = () => {
    if (loading) return <div className="flex-1 flex justify-center items-center"><div className="w-10 h-10 border-4 border-[#1ed7a4]/20 border-t-[#1ed7a4] rounded-full animate-spin"></div></div>

    if (step === 'satisfaction') {
      const isComplete = Object.keys(formData.satisfaction).length === QUESTIONS.satisfaction.length;
      const badRatings = Object.values(formData.satisfaction).filter(v => v < 5).length;
      return (
        <div className="space-y-12">
          {renderScale1to10('satisfaction', QUESTIONS.satisfaction)}
          {isComplete && badRatings > 0 && (
            <div className="bg-[#eb6496]/10 border border-[#eb6496]/20 p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 shadow-sm mt-12">
              <p className="text-slate-800 font-bold text-lg leading-relaxed mb-4">
                De acordo com sua autorreflexão, <span className="text-[#eb6496]">{badRatings} entre 4 atributos</span> que refletem cognição, desenvolvimento pessoal e qualidade de vida foram mal avaliados por você.
              </p>
              <p className="text-slate-600 font-medium leading-relaxed">
                Reflita sobre a qualidade do seu pensamento e seu bem-estar. Considerando os pontos de atenção desse exercício, há algum micro-hábito que você possa adotar a partir de hoje para melhorar sua rotina?
              </p>
            </div>
          )}
        </div>
      )
    }
    if (step === 'time-relation') {
      const answers = Object.values(formData.time_relation);
      const isComplete = answers.length === QUESTIONS.time_relation.length;
      const average = answers.length > 0 ? answers.reduce((a, b) => a + b, 0) / answers.length : 0;
      const badRatings = answers.filter(v => v < 5).length;
      return (
        <div className="space-y-12">
          {renderScale1to10('time_relation', QUESTIONS.time_relation)}
          {isComplete && average < 5 && (
            <div className="bg-[#eb6496]/10 border border-[#eb6496]/20 p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 shadow-sm mt-12">
              <p className="text-slate-800 font-bold text-lg leading-relaxed mb-4">
                De acordo com sua autorreflexão, <span className="text-[#eb6496]">{badRatings} de 8 atributos</span> que refletem sua relação com o tempo tiveram uma auto avaliação ruim.
              </p>
              <p className="text-slate-600 font-medium leading-relaxed">
                Reflita sobre sua agenda: ela possui um volume de atividades gerenciável ou minimamente realista? Considerando os pontos de atenção desse exercício, há algum micro-hábito que você possa adotar a partir de hoje para melhorar sua rotina?
              </p>
            </div>
          )}
        </div>
      )
    }
    if (step === 'internal-speed') {
      const answers = Object.values(formData.internal_speed);
      const isComplete = answers.length === QUESTIONS.internal_speed.length;
      const average = answers.length > 0 ? answers.reduce((a, b) => a + b, 0) / answers.length : 0;
      const acceleratedCount = answers.filter(v => v > 5).length;
      return (
        <div className="space-y-12">
          {renderBipolarScale()}
          {isComplete && average > 5 && (
            <div className="bg-[#eb6496]/10 border border-[#eb6496]/20 p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 shadow-sm mt-12">
              <p className="text-slate-800 font-bold text-lg leading-relaxed mb-4">
                De acordo com sua autorreflexão, <span className="text-[#eb6496]">{acceleratedCount} de 5 atributos</span> que refletem sua velocidade interna indicam um ritmo acelerado.
              </p>
              <p className="text-slate-600 font-medium leading-relaxed">
                Reflita sobre sua capacidade de focar, sua impaciência e pressa. Considerando os pontos de atenção desse exercício, há algum micro-hábito que você possa adotar a partir de hoje para melhorar sua rotina?
              </p>
            </div>
          )}
        </div>
      )
    }
    if (step === 'beliefs') return renderScale1to10('beliefs', QUESTIONS.beliefs)
    if (step === 'rhythm') return renderRhythmForm()
    if (step === 'cycle') return renderCycleInfo()
    if (step === 'time-tips') return renderTimeTips()
    if (step === 'pauses') return renderPauses()
    
    return null
  }

  return (
    <div className="bg-[#f8f3e9] text-slate-900 min-h-screen font-display">
      <div className="flex flex-col lg:flex-row h-[100dvh] overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 w-full relative">
          <div className="max-w-[1000px] mx-auto w-full p-8 md:p-14 lg:p-20">
            
            {/* Header / Progress element matching Image 1 */}
            <div className="mb-14">
              {step !== 'pauses' && (
                <div className="flex items-center gap-3 mb-10">
                  <div className="flex gap-1.5">
                    {visualSteps.map((s, i) => (
                      <div key={s.id} className={`h-1.5 rounded-full ${i < visualStepNumber ? 'bg-[#004b4c] w-8' : 'bg-[#e2dacb] w-6'}`}></div>
                    ))}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#004b4c] ml-2">PASSO {visualStepNumber} DE {visualSteps.length}</span>
                </div>
              )}
              
              {step === 'satisfaction' && (
                <div className="mb-10 bg-[#f4ece3]/60 border border-[#e2dacb]/40 rounded-3xl p-8 md:p-10 text-slate-700 space-y-5 font-medium text-lg md:text-xl leading-relaxed font-sora shadow-sm animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[#eb6496]/80"></div>
                  <p>Na modernidade, substituímos o ritmo da natureza pela <strong className="text-[#eb6496] font-bold">velocidade das máquinas</strong> e transformamos o tempo em uma <strong className="text-[#eb6496] font-bold">moeda de troca</strong>. Se tempo é dinheiro, quanto mais rápido, melhor.</p>
                  <p>A vida se tornou tão acelerada que não conseguimos dar um passo para fora da <strong className="text-[#eb6496] font-bold">pressa</strong>. Ela está dentro e fora de nós. Mas, afinal, <strong className="text-[#eb6496] font-bold">para que corremos tanto?</strong></p>
                  <p>Considerando sua relação com o tempo, pense nos aspectos que afetam o ritmo de vida que você almeja. Seu modo de viver e trabalhar estão compatíveis com sua <strong className="text-[#eb6496] font-bold">velocidade interna?</strong></p>
                </div>
              )}

              {step === 'beliefs' && (
                <div className="mb-10 bg-[#f4ece3]/60 border border-[#e2dacb]/40 rounded-3xl p-8 md:p-10 text-slate-700 space-y-5 font-medium text-lg md:text-xl leading-relaxed font-sora shadow-sm animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[#eb6496]/80"></div>
                  <p>Internalizamos a ideia de que <strong className="text-[#eb6496] font-bold">valemos pelo que produzimos</strong> e passamos a viver uma <strong className="text-[#eb6496] font-bold">corrida contra o relógio</strong> onde até o “tempo livre” passou a ser cronometrado.</p>
                  <p>Pensamos em como trabalhar melhor, mas não <strong className="text-[#eb6496] font-bold">como descansar melhor</strong>, porém essas duas esferas da vida se complementam.</p>
                  <p>Diante de tanta correria, saber pausar se tornou um <strong className="text-[#eb6496] font-bold">“superpoder”</strong>, uma habilidade EXTRAordinária que pode ser treinada para que a mente funcione melhor.</p>
                  <p>Se pausar é tão essencial, <strong className="text-[#eb6496] font-bold">por que não conseguimos?</strong></p>
                  <p>O tempo é uma das poucas coisas que não podemos controlar, então a mente humana tenta simplificar o entendimento dessa realidade complexa através de <strong className="text-[#eb6496] font-bold">crenças limitantes</strong> para reagir a pressões sociais, à ansiedade e à sobrecarga. Pensamentos como 'não tenho tempo para nada' agem como <strong className="text-[#eb6496] font-bold">mecanismos de defesa</strong> ou desculpas automáticas para evitar mudanças e justificar a permanência em uma <strong className="text-[#eb6496] font-bold">'zona de conforto'</strong>.</p>
                </div>
              )}
              
              <h2 className="text-3xl md:text-4xl lg:text-[2.5rem] xl:text-[2.75rem] font-bold text-[#004b4c] tracking-tighter leading-[1.05] mb-6 font-display" style={{ transform: 'scaleY(1.1)', transformOrigin: 'left' }}>
                {currentStepInfo.title}
              </h2>
              <p className="text-xl text-slate-500 font-medium">
                {currentStepInfo.subtitle}
              </p>
            </div>

            {/* Questions Container */}
            <div className="pb-32">
              {renderCurrentStep()}
            </div>

          </div>
        </main>

        {/* Footer Actions */}
        <div className="fixed bottom-0 right-0 left-0 lg:left-80 bg-gradient-to-t from-[#fcfaf5] via-[#fcfaf5] to-transparent pt-20 pb-4 md:pb-8 px-4 md:px-10 lg:px-20 z-30 pointer-events-none">
          <div className="max-w-[1000px] mx-auto w-full flex justify-between items-center pointer-events-auto gap-2">
            <button 
              onClick={() => {
                const prevStepIndex = STEPS.findIndex(s => s.id === step) - 1
                if (prevStepIndex >= 0) {
                  navigate(`/recovery/${STEPS[prevStepIndex].id}`)
                } else {
                  navigate(-1)
                }
              }}
              className="flex items-center gap-1 md:gap-2 font-bold text-slate-500 uppercase tracking-widest text-[10px] md:text-sm hover:text-slate-800 transition-colors shrink-0"
            >
              <ArrowLeft size={16} strokeWidth={2.5} className="md:w-[18px] md:h-[18px]" /> <span className="hidden sm:inline">Voltar</span>
            </button>
            <div className="flex gap-3 md:gap-6 items-center">
              <button 
                onClick={() => handleSave(false)} 
                disabled={saving}
                className="font-bold text-slate-600 uppercase tracking-widest text-[9px] md:text-xs hover:text-slate-900 transition-colors text-center leading-tight"
              >
                Salvar<br className="sm:hidden"/> Rascunho
              </button>
              <button 
                onClick={() => handleSave(isLastStep, true)}
                disabled={saving}
                className="bg-[#eb6496] shadow-[0_10px_20px_rgba(235,100,150,0.3)] hover:shadow-[0_15px_30px_rgba(235,100,150,0.4)] text-white px-4 py-3 md:px-8 md:py-4 rounded-xl font-bold text-[10px] md:text-sm tracking-widest uppercase hover:bg-[#d84e80] transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-1 md:gap-3 text-center leading-tight shrink-0"
              >
                <span className="sm:hidden">{['internal-speed', 'time-tips'].includes(step) ? 'Concluir' : (step === 'pauses' ? 'Plano' : (isLastStep ? 'Concluir' : 'Próxima'))}</span>
                <span className="hidden sm:inline">{['internal-speed', 'time-tips'].includes(step) ? 'Concluir Análise' : (step === 'pauses' ? 'Solicitar plano personalizado' : (isLastStep ? 'Concluir Reflexão' : 'Próxima pergunta'))}</span>
                <ArrowRight size={16} strokeWidth={2.5} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
