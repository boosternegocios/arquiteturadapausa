import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  ArrowRight
} from 'lucide-react'

const CATEGORY_DATA = {
  fisico: { max: 80 },
  mental: { max: 70 },
  sensorial: { max: 80 },
  criativo: { max: 90 },
  emocional: { max: 80 },
  social: { max: 80 },
  espiritual: { max: 50 }
}

export const Solution = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [topCategoryKey, setTopCategoryKey] = useState('sensorial')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopFatigue = async () => {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select('scores')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          
        if (data && data.length > 0 && data[0].scores) {
          const rawScores = data[0].scores
          
          const normalizedScores = Object.entries(CATEGORY_DATA).map(([key, config]) => {
            const rawVal = rawScores[key] || 0
            const normalized = (rawVal / config.max) * 10
            return { key, score: normalized }
          })
          
          const sorted = [...normalizedScores].sort((a, b) => b.score - a.score)
          setTopCategoryKey(sorted[0].key)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchTopFatigue()
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Falha ao sair', error)
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen font-display">
      <div className="flex h-screen overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#fcfbf8] via-[#f7f3ec] to-[#faebed] flex items-center justify-center p-6 md:p-12 relative font-display">
          
          <div className="max-w-[850px] w-full z-10 flex flex-col items-center justify-center text-center">
            
            <h1 className="text-[2rem] md:text-[2.5rem] lg:text-[3rem] font-bold text-[#234c4c] leading-[1.2] tracking-tight uppercase">
              AGORA QUE VOCÊ JÁ SABE QUAIS DIMENSÕES DO CANSAÇO FORAM MAIS RELEVANTES NA SUA AUTOAVALIAÇÃO, VOCÊ PODE REFLETIR SOBRE SEUS HÁBITOS E COMEÇAR A <span className="text-[#e2538b] font-black">ARQUITETAR A SUA PAUSA</span> PARA <span className="text-[#e2538b] font-black">GARANTIR A RECUPERAÇÃO</span> QUE MELHOR SE ADEQUA À SUA NECESSIDADE.
            </h1>

            <div className="mt-16 md:mt-24 flex flex-col items-center w-full">
              <button 
                disabled={loading}
                onClick={() => navigate(`/specific-solution/${topCategoryKey}`)} 
                className="bg-[#eb6496] text-white px-10 md:px-14 py-4 md:py-5 rounded-full font-bold text-xs md:text-sm tracking-[0.1em] uppercase hover:bg-[#d84e80] transition-all active:scale-95 shadow-[0_15px_30px_-5px_rgba(235,100,150,0.4)] hover:shadow-[0_20px_35px_-5px_rgba(235,100,150,0.5)] flex items-center justify-center gap-3 w-full sm:w-auto"
              >
                INICIAR SUA REFLEXÃO <ArrowRight size={16} strokeWidth={2.5} />
              </button>
              
              <div className="mt-10 flex items-center gap-2 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full border-2 border-slate-300 relative flex items-center justify-center">
                  <span className="w-[2px] h-[2px] bg-slate-400 absolute rounded-full"></span>
                </span> 
                TEMPO ESTIMADO DE TRANSIÇÃO: 2 MINUTOS
              </div>
            </div>

          </div>
        </main>

      </div>
    </div>
  )
}
