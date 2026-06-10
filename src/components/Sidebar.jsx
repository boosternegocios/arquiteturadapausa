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
  ShieldCheck
} from 'lucide-react';

export const Sidebar = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [energyScore, setEnergyScore] = useState(0);

  useEffect(() => {
    const fetchEnergy = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('evaluations')
          .select('solution_satisfaction')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        
        if (data && data.length > 0 && data[0].solution_satisfaction) {
          const sat = data[0].solution_satisfaction;
          // Calculate average of satisfaction (foco, produtividade, felicidade, realizacao)
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
            setEnergyScore(Math.round(avg * 10)); // Scale 1-10 to 10-100%
          }
        }
      } catch (err) {
        console.error('Erro ao buscar energia:', err);
      }
    };
    fetchEnergy();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Falha ao sair', error);
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="w-80 bg-mint dark:bg-mint flex flex-col z-20 shrink-0 h-screen overflow-y-auto border-r border-primary/10">
      <div className="p-10 pb-6 items-center flex justify-center gap-3">
        <img 
          src="https://noybugsrzlxbzjgstjff.supabase.co/storage/v1/object/public/Imagens/logotipo_carolrocha_branco%20(1).png" 
          alt="Logo Carol Rocha Mentoria E Negócios" 
          className="w-48 h-auto object-contain"
        />
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2 mt-4">
        <button 
          onClick={() => window.open('https://arquiteturadapausa.com/', '_blank')} 
          className="w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 text-primary hover:bg-primary/10"
        >
          <Globe size={20} /> O Método
        </button>

        <button 
          onClick={() => navigate('/intro')} 
          className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
            (isActive('/intro') || isActive('/assessment') || location.pathname === '/recovery/pauses')
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
              : 'text-primary hover:bg-primary/10'
          }`}
        >
          <FileText size={20} /> Autoavaliação
        </button>

        <button 
          onClick={() => navigate('/')} 
          className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
            isActive('/') 
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
              : 'text-primary hover:bg-primary/10'
          }`}
        >
          <LayoutDashboard size={20} /> Radar de Velocidade
        </button>
        
        <button 
          onClick={() => navigate('/vitality')} 
          className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
            isActive('/vitality') 
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
              : 'text-primary hover:bg-primary/10'
          }`}
        >
          <Target size={20} /> Radar de Vitalidade
        </button>
        
        <button 
          onClick={() => navigate('/continue-healing')} 
          className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
            ((isActive('/continue-healing') || isActive('/specific-solution') || isActive('/recovery') || isActive('/result') || isActive('/solution')) && location.pathname !== '/recovery/pauses')
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
              : 'text-primary hover:bg-primary/10'
          }`}
        >
          <CheckCircle size={20} /> Exercícios Práticos
        </button>

        <button 
          onClick={() => navigate('/contact')} 
          className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
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
            className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
              isActive('/admin') 
                ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            <ShieldCheck size={20} /> Painel Admin
          </button>
        )}
      </nav>
      
      <div className="p-8 space-y-5">
        <div className="bg-white/30 p-5 rounded-2xl shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-3">Sua Energia</p>
          <div className="h-2.5 w-full bg-white/50 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${energyScore}%` }}></div>
          </div>
          <p className="text-sm mt-3 font-bold text-primary">{energyScore}% {energyScore >= 80 ? 'Alto Astral' : energyScore >= 50 ? 'Equilibrado' : 'Atenção'}</p>
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
  );
};
