import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Home, FileText, BarChart2, Activity, Settings, LogOut, LayoutDashboard } from 'lucide-react'

export const Assessment = () => {
  const { category } = useParams() // e.g. 'fisico', 'sensorial'
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const mainRef = useRef(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0)
    }
  }, [category])
  
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({}) // { questionId: value (0-10) }
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const categoryNames = {
    fisico: 'FÍSICO',
    sensorial: 'SENSORIAL',
    emocional: 'EMOCIONAL',
    mental: 'MENTAL',
    social: 'SOCIAL',
    criativo: 'CRIATIVO',
    espiritual: 'ESPIRITUAL'
  }
  const categoryTitle = category ? `CANSAÇO ${categoryNames[category.toLowerCase()] || category.toUpperCase()}` : 'AVALIAÇÃO'

  useEffect(() => {
    const fetchQuestionsAndDraft = async () => {
      if (!category || !user) return
      
      try {
        setLoading(true)
        // Buscando perguntas da categoria
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('*')
          .eq('category', category.toLowerCase())
          .order('order_index', { ascending: true })
          
        let fetchedQData = qData || []
        
        if (category.toLowerCase() === 'mental') {
          fetchedQData.push({
            id: 'mental_8',
            category: 'mental',
            order_index: 8,
            text: 'Com frequência tenho dificuldade de me concentrar'
          })
        }
        
        setQuestions(fetchedQData)
        
        // Buscando rascunho de avaliação
        const { data: draftData, error: draftErr } = await supabase
          .from('evaluations')
          .select('answers')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .single()
          
        if (draftData && draftData.answers) {
          setAnswers(draftData.answers)
        } else {
          setAnswers({})
        }
      } catch (err) {
        if (err.code !== 'PGRST116') { // ignora erro de nenhum rascunho encontrado
          console.error('Erro ao buscar dados:', err)
        } else {
          setAnswers({})
        }
      } finally {
        setLoading(false)
      }
    }
    
    fetchQuestionsAndDraft()
  }, [category, user])

  const handleSliderChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: parseInt(value, 10)
    }))
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const { data: draftData } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .single()
        
      const existingAnswers = draftData?.answers || {}
      const existingScores = draftData?.scores || {}
      
      const newAnswers = { ...existingAnswers, ...answers }
      
      let categoryScore = 0
      let allAnswered = true
      questions.forEach(q => {
        if (answers[q.id] !== undefined) {
          categoryScore += answers[q.id]
        } else {
          allAnswered = false
        }
      })
      
      const newScores = { ...existingScores }
      if (allAnswered) {
        newScores[category.toLowerCase()] = categoryScore
      } else {
        delete newScores[category.toLowerCase()]
      }
      
      if (draftData) {
        const { error } = await supabase
          .from('evaluations')
          .update({ answers: newAnswers, scores: newScores })
          .eq('id', draftData.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('evaluations')
          .insert({ 
            user_id: user.id, 
            status: 'draft', 
            answers: newAnswers,
            scores: newScores
          })
        if (error) throw error
      }
      
      alert('Progresso salvo com sucesso! Você pode fechar ou retornar depois sem perder suas respostas.')
    } catch (err) {
      console.error('Erro ao salvar rascunho:', err)
      alert('Houve um erro ao salvar suas respostas. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleNextStep = async () => {
    if (answeredCount < totalQuestions) return
    
    setIsSaving(true)
    try {
      // 1. Fetch current draft if any
      const { data: draftData } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft')
        .single()
        
      const existingAnswers = draftData?.answers || {}
      const existingScores = draftData?.scores || {}
      
      const newAnswers = { ...existingAnswers, ...answers }
      
      // Calculate category score
      let categoryScore = 0
      questions.forEach(q => {
        if (answers[q.id] !== undefined) {
          categoryScore += answers[q.id]
        }
      })
      
      const newScores = { ...existingScores, [category.toLowerCase()]: categoryScore }
      
      if (draftData) {
        // Update draft
        const { error } = await supabase
          .from('evaluations')
          .update({ answers: newAnswers, scores: newScores })
          .eq('id', draftData.id)
        if (error) throw error
      } else {
        // Create new draft
        const { error } = await supabase
          .from('evaluations')
          .insert({ 
            user_id: user.id, 
            status: 'draft', 
            answers: newAnswers,
            scores: newScores
          })
        if (error) throw error
      }
      
      // Navigating logic
      const CATEGORIES = ['fisico', 'sensorial', 'emocional', 'mental', 'social', 'criativo', 'espiritual']
      const currentIndex = CATEGORIES.indexOf(category.toLowerCase())
      
      if (currentIndex >= 0 && currentIndex < CATEGORIES.length - 1) {
        // Próximo
        const nextCategory = CATEGORIES[currentIndex + 1]
        navigate(`/assessment/${nextCategory}`)
      } else {
        // Final
        await supabase
          .from('evaluations')
          .update({ status: 'completed' })
          .eq('user_id', user.id)
          .eq('status', 'draft')
          
        navigate('/resultado')
      }
      
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Houve um erro ao salvar suas respostas. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  const answeredCount = questions.filter(q => answers[q.id] !== undefined).length
  const totalQuestions = questions.length
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  return (
    <div className="bg-[#f8f3e9] h-screen text-slate-900 font-display flex overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 h-screen overflow-y-auto px-8 py-12 md:px-16 lg:px-24">
        <div className="max-w-4xl mx-auto flex flex-col min-h-full">
          
          {/* Header */}
          <div className="flex items-end justify-between mb-10 gap-8 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <h1 className="text-4xl md:text-5xl font-black text-[#1a202c] uppercase tracking-tight mb-3">
                {categoryTitle}
              </h1>
              <p className="text-[#4a5568] text-base md:text-lg leading-relaxed max-w-2xl">
                Quanto você se identifica com as afirmações abaixo?<br/>
                Dê uma nota de 0 a 10, onde 0 indica que você não se identifica e 10 indica que você se reconhece completamente.
              </p>
            </div>
            
            {/* Progress indicator */}
            <div className="w-48 shrink-0 flex flex-col gap-2">
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-slate-800">Progresso</span>
                <span className="text-sm font-bold text-slate-800">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden">
                <div className="h-full bg-brand-pink transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <div className="text-right text-xs text-slate-400 mt-1">
                {answeredCount} de {totalQuestions} respondidas
              </div>
            </div>
          </div>

          {/* Content / Questions */}
          <div className="space-y-6 flex-1 mb-10">
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-10 h-10 border-4 border-mint/30 border-t-mint rounded-full animate-spin"></div>
              </div>
            ) : questions.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-slate-500">
                Nenhuma pergunta encontrada para esta categoria.
              </div>
            ) : (
              questions.map((q, index) => {
                const val = answers[q.id]
                const formattedNum = String(index + 1).padStart(2, '0')
                
                let qText = q.text.trim().replace(/\.$/, '')
                if (category === 'fisico') {
                  if (formattedNum === '02') qText = qText.replace('cansado', 'cansado (a)')
                  if (formattedNum === '05') qText = qText.replace('lento', 'lento (a)')
                } else if (category === 'sensorial') {
                  if (formattedNum === '02') {
                    qText = qText.replace('inseguro', 'inseguro (a)').replace(/ comigo mesmo/gi, '')
                  }
                  if (formattedNum === '04') {
                    qText = qText.replace('abraçado', 'abraçado (a)').replace('tocado', 'tocado (a)')
                  }
                  if (formattedNum === '07') {
                    qText = qText.replace('ansioso', 'ansioso (a)')
                  }
                } else if (category === 'emocional') {
                  if (formattedNum === '04') {
                    qText = qText.replace(/meu pior crítico/gi, 'meu (minha) pior crítico (a)')
                  }
                } else if (category === 'mental') {
                  if (formattedNum === '03') {
                    qText = qText.replace('esquecido', 'esquecido (a)')
                  }
                } else if (category === 'social') {
                  if (formattedNum === '06') {
                    qText = qText.replace('sozinho', 'sozinho (a)')
                  }
                } else if (category === 'criativo') {
                  if (formattedNum === '03') {
                    qText = qText.replace('me empolgavam', 'antes me empolgavam,')
                  }
                } else if (category === 'espiritual') {
                  if (formattedNum === '02') {
                    qText = qText.replace('mesmo', 'mesmo (a)')
                  }
                  if (formattedNum === '05') {
                    qText = 'Sinto que estou apenas levando a vida, ao invés de prosperar e viver plenamente'
                  }
                }
                
                return (
                  <div key={q.id} className="bg-white rounded-2xl p-6 lg:p-8 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-4">
                    
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.15em] text-brand-pink mb-3 uppercase">Pergunta {formattedNum}</p>
                      <h3 className="text-xl lg:text-2xl font-bold text-slate-800 leading-tight">
                        {qText}
                      </h3>
                    </div>
                    
                    <div className="w-full mt-2 lg:mt-3 border-t border-slate-50 pt-4">
                      <div className="flex justify-center flex-wrap items-center w-full mb-3 gap-2 sm:gap-3 lg:gap-4">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          let selectedClass = 'bg-brand-pink border-brand-pink text-white shadow-lg shadow-brand-pink/30 scale-110';
                          if (val === num) {
                            if (num < 5) selectedClass = 'bg-[#eb6496] border-[#eb6496] text-white shadow-lg shadow-[#eb6496]/30 scale-110';
                            else if (num === 5) selectedClass = 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/30 scale-110';
                            else selectedClass = 'bg-[#1ed7a4] border-[#1ed7a4] text-slate-900 font-black shadow-lg shadow-[#1ed7a4]/30 scale-110';
                          }

                          return (
                          <button
                            key={num}
                            onClick={() => handleSliderChange(q.id, num)}
                            className={`flex flex-col items-center justify-center w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full font-bold text-xs sm:text-base border-2 transition-all flex-shrink-0 ${
                              val === num
                                ? selectedClass
                                : 'bg-transparent border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {num}
                          </button>
                        )})}
                      </div>
                      
                      <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-4">
                        <span>0 - Não me identifico</span>
                        <span>10 - Completamente</span>
                      </div>
                    </div>
                    
                  </div>
                )
              })
            )}
          </div>
          
          {/* Footer Actions */}
          {!loading && questions.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mt-auto border-t border-slate-200/60 pt-8 pb-10">
              <button 
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-8 py-3.5 font-bold text-slate-600 bg-transparent border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto text-sm tracking-wide">
                {isSaving ? 'SALVANDO...' : 'SALVAR RASCUNHO'}
              </button>
              <button 
                disabled={isSaving}
                onClick={() => {
                  if (answeredCount < totalQuestions) {
                    alert(`É necessário responder todas as ${totalQuestions} questões desta etapa antes de avançar. Faltam ${totalQuestions - answeredCount} questões.`)
                  } else {
                    handleNextStep()
                  }
                }}
                className={`px-8 py-3.5 font-bold text-white bg-brand-pink rounded-xl transition-all w-full sm:w-auto text-sm tracking-wide ${
                  answeredCount === totalQuestions && !isSaving
                    ? 'hover:bg-brand-pink/90 shadow-lg shadow-brand-pink/30 hover:shadow-brand-pink/40 hover:-translate-y-0.5 cursor-pointer'
                    : 'opacity-90 hover:bg-brand-pink/90 cursor-pointer shadow-sm'
                }`}
              >
                {isSaving ? 'SALVANDO...' : 'PRÓXIMA ETAPA'}
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
