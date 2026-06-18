import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  CheckCircle,
  FileText,
  Target,
  Send,
  Globe,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export const Sidebar = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [energyScore, setEnergyScore] = useState(0);
  const [vitalityScore, setVitalityScore] = useState(0);
  const [timeScore, setTimeScore] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fechar menu ao mudar de rota no mobile
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fetchEnergy = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select('solution_satisfaction, scores, solution_time_relation')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          const evalData = data[0];
          
          if (evalData.solution_satisfaction) {
            const sat = evalData.solution_satisfaction;
            const keys = ['foco', 'produtividade', 'felicidade', 'realizacao'];
            let sum = 0;
            let count = 0;
            keys.forEach(k => {
              if (sat[k]) {
                sum += sat[k];
                count++;
              }
            });
            if (count > 0) {
              const avg = sum / count;
              setEnergyScore(Math.round(avg * 10)); 
            }
          }

          if (evalData.scores) {
            const scores = evalData.scores;
            const CATEGORY_DATA = { fisico: 80, mental: 80, sensorial: 80, criativo: 90, emocional: 80, social: 80, espiritual: 50 };
            let vitSum = 0;
            let vitCount = 0;
            Object.keys(CATEGORY_DATA).forEach(key => {
              if (scores[key] !== undefined && scores[key] !== null) {
                vitSum += Math.min(100, Math.round((scores[key] / CATEGORY_DATA[key]) * 100));
                vitCount++;
              }
            });
            if (vitCount > 0) {
              setVitalityScore(Math.round(vitSum / vitCount));
            }
          }

          if (evalData.solution_time_relation) {
            const timeRel = evalData.solution_time_relation;
            let timeSum = 0;
            let timeCount = 0;
            Object.values(timeRel).forEach(val => {
              if (val !== undefined && val !== null) {
                timeSum += val * 10;
                timeCount++;
              }
            });
            if (timeCount > 0) {
              setTimeScore(Math.round(timeSum / timeCount));
            }
          }
        }
      } catch (err) {
        console.error('Erro ao buscar energia:', err);
      }
    };
    fetchEnergy();
  }, [user]);

  const handleLogout = async () => {
    localStorage.clear();
    sessionStorage.clear();
    try {
      await Promise.race([
        signOut(),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
    } catch (e) {
      console.warn("Logout timeout or error", e);
    }
    window.location.href = '/login';
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden w-full bg-mint shrink-0 p-4 px-6 flex items-center justify-between border-b border-primary/10 z-30 relative shadow-sm">
        <img 
          src="https://noybugsrzlxbzjgstjff.supabase.co/storage/v1/object/public/Imagens/logotipo_carolrocha_branco%20(1).png" 
          alt="Logo Carol Rocha Mentoria E Negócios" 
          className="h-8 object-contain"
        />
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 bg-white/20 text-white rounded-xl active:scale-95 transition-transform"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsOpen(false)} 
      />

      {/* Sidebar Content */}
      <aside className={`fixed lg:relative top-0 left-0 z-50 w-80 bg-mint flex flex-col shrink-0 h-[100dvh] overflow-y-auto border-r border-primary/10 transition-transform duration-300 shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        
        <div className="p-8 pb-4 items-center flex justify-between gap-3">
          <img 
            src="https://noybugsrzlxbzjgstjff.supabase.co/storage/v1/object/public/Imagens/logotipo_carolrocha_branco%20(1).png" 
            alt="Logo Carol Rocha Mentoria E Negócios" 
            className="w-48 h-auto object-contain hidden lg:block"
          />
          <img 
            src="https://noybugsrzlxbzjgstjff.supabase.co/storage/v1/object/public/Imagens/logotipo_carolrocha_branco%20(1).png" 
            alt="Logo Carol Rocha" 
            className="w-32 h-auto object-contain lg:hidden"
          />
          <button 
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 text-white bg-white/20 rounded-full active:scale-95"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-1.5 mt-2">
          <button 
            onClick={() => window.open('https://arquiteturadapausa.com/', '_blank')} 
            className="w-full flex items-center justify-start gap-4 px-5 py-3.5 rounded-full mx-2 font-bold transition-all duration-300 text-primary hover:bg-primary/10"
          >
            <Globe size={20} /> O Método
          </button>

          <button 
            onClick={() => navigate('/intro')} 
            className={`w-full flex items-center justify-start gap-4 px-5 py-3.5 rounded-full mx-2 font-bold transition-all duration-300 ${
              (isActive('/intro') || isActive('/assessment') || location.pathname === '/recovery/pauses')
                ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            <FileText size={20} /> Autoavaliação
          </button>

          <button 
            onClick={() => navigate('/')} 
            className={`w-full flex items-center justify-start gap-4 px-5 py-3.5 rounded-full mx-2 font-bold transition-all duration-300 ${
              isActive('/') 
                ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            <LayoutDashboard size={20} /> Radar de Velocidade
          </button>
          
          <button 
            onClick={() => navigate('/vitality')} 
            className={`w-full flex items-center justify-start gap-4 px-5 py-3.5 rounded-full mx-2 font-bold transition-all duration-300 ${
              isActive('/vitality') 
                ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            <Target size={20} /> Radar de Vitalidade
          </button>
          
          <button 
            onClick={() => navigate('/continue-healing')} 
            className={`w-full flex items-center justify-start gap-4 px-5 py-3.5 rounded-full mx-2 font-bold transition-all duration-300 ${
              ((isActive('/continue-healing') || isActive('/specific-solution') || isActive('/recovery') || isActive('/result') || isActive('/solution')) && location.pathname !== '/recovery/pauses')
                ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            <CheckCircle size={20} /> Exercícios Práticos
          </button>

          <button 
            onClick={() => navigate('/contact')} 
            className={`w-full flex items-center justify-start gap-4 px-5 py-3.5 rounded-full mx-2 font-bold transition-all duration-300 ${
              isActive('/contact') 
                ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            <Send size={20} /> Plano de ação
          </button>

          {isAdmin && (
            <button 
              onClick={() => navigate('/admin')} 
              className={`w-full flex items-center justify-start gap-4 px-5 py-3.5 rounded-full mx-2 font-bold transition-all duration-300 ${
                isActive('/admin') 
                  ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
                  : 'text-primary hover:bg-primary/10'
              }`}
            >
              <ShieldCheck size={20} /> Painel Admin
            </button>
          )}
        </nav>
        
        <div className="p-6 space-y-4">
          <div className="bg-white/30 p-5 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-3">Sua Energia</p>
            <div className="h-2.5 w-full bg-white/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${vitalityScore}%` }}></div>
            </div>
            <p className="text-sm mt-3 font-bold text-primary">{vitalityScore}% Vitalidade</p>
          </div>

          <div className="bg-white/30 p-5 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-3">Relação com o Tempo</p>
            <div className="h-2.5 w-full bg-white/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${timeScore}%` }}></div>
            </div>
            <p className="text-sm mt-3 font-bold text-primary">{timeScore}% Satisfação</p>
          </div>
          
          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-4 px-5 py-4 bg-white/30 rounded-2xl cursor-pointer shadow-sm hover:bg-white/40 transition-colors"
          >
            <img 
              alt="Avatar" 
              className="w-12 h-12 rounded-full object-cover border-2 border-white/50" 
              src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.user_metadata?.full_name ? user.user_metadata.full_name : (user?.email ? user.email.split('@')[0] : 'U')}&background=eb6496&color=fff`}
            />
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-base text-primary truncate max-w-[120px]" title={user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Usuário')}>
                {user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Usuário')}
              </span>
              <span className="text-[10px] font-bold text-primary/60 uppercase">Perfil</span>
            </div>
            <Settings size={20} className="ml-auto text-primary" />
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary/90 transition-all active:scale-95 text-base mt-2"
          >
            <LogOut size={20} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
};
