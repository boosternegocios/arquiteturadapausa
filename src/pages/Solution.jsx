import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  FileText,
  Lightbulb,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'

export const Solution = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

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
            
            <h1 className="text-[2rem] md:text-[3rem] lg:text-[3.5rem] font-bold text-[#234c4c] uppercase leading-[1.05] tracking-tight md:tracking-tighter" style={{ fontFamily: 'Oswald, "Barlow Condensed", "Arial Narrow", sans-serif', transform: 'scaleY(1.1)' }}>
              QUANDO SE APERTA O BOTÃO DE PAUSA EM UMA MÁQUINA, ELA <span className="text-[#e2538b]">DESLIGA</span>. QUANDO SE APERTA ESSE BOTÃO EM UM HUMANO, ELE <span className="text-[#234c4c] font-black">LIGA</span> E COMEÇA A REFLETIR, SE RECONECTAR E A REIMAGINAR CAMINHOS.
            </h1>

            <div className="flex flex-col items-center mt-12 md:mt-16">
              <div className="w-12 h-[1px] bg-slate-300 mb-6"></div>
              <cite className="text-sm md:text-base font-bold text-slate-500 tracking-[0.2em] font-sans not-italic uppercase opacity-90">
                DOV SEIDMAN
              </cite>
            </div>

            <div className="mt-16 md:mt-24 flex flex-col items-center w-full">
              <button 
                onClick={() => navigate('/recovery/satisfaction')} 
                className="bg-[#eb6496] text-white px-10 md:px-14 py-4 md:py-5 rounded-full font-bold text-xs md:text-sm tracking-[0.1em] uppercase hover:bg-[#d84e80] transition-all active:scale-95 shadow-[0_15px_30px_-5px_rgba(235,100,150,0.4)] hover:shadow-[0_20px_35px_-5px_rgba(235,100,150,0.5)] flex items-center justify-center gap-3 w-full sm:w-auto"
              >
                COMEÇAR A REFLETIR <ArrowRight size={16} strokeWidth={2.5} />
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
