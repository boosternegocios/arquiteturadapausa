import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  CheckCircle,
  FileText
} from 'lucide-react';

export const Sidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
          onClick={() => navigate('/')} 
          className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
            isActive('/') 
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
              : 'text-primary hover:bg-primary/10'
          }`}
        >
          <LayoutDashboard size={20} /> Dashboard
        </button>
        
        <button 
          onClick={() => navigate('/assessment/fisico')} 
          className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
            isActive('/assessment') 
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
              : 'text-primary hover:bg-primary/10'
          }`}
        >
          <FileText size={20} /> Avaliação
        </button>

        <button 
          onClick={() => navigate('/continue-healing')} 
          className={`w-full flex items-center justify-start gap-4 px-6 py-3 rounded-full mx-2 font-bold transition-all duration-300 ${
            (isActive('/continue-healing') || isActive('/specific-solution') || isActive('/recovery') || isActive('/result') || isActive('/solution'))
              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/20 transition-transform active:scale-95'
              : 'text-primary hover:bg-primary/10'
          }`}
        >
          <CheckCircle size={20} /> Reflexão
        </button>
      </nav>
      
      <div className="p-8 space-y-5">
        <div className="bg-white/30 p-5 rounded-2xl shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70 mb-3">Sua Energia</p>
          <div className="h-2.5 w-full bg-white/50 rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: '88%' }}></div>
          </div>
          <p className="text-sm mt-3 font-bold text-primary">88% Alto Astral</p>
        </div>
        
        <div className="flex items-center gap-4 px-5 py-4 bg-white/30 rounded-2xl cursor-pointer shadow-sm hover:bg-white/40 transition-colors">
          <img 
            alt="Avatar" 
            className="w-12 h-12 rounded-full object-cover border-2 border-white/50" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDI145YuLzL1ssMxxHtCaBvrLMd8vgZ4y-jjsnGYWD5DZDlkRKe_y4R2ezPRI0zzU03HDEND3HsXIeCE2SS4yoslpLRixIpgWWknOxUSnj_055Vwq4ZP021NGOLlybi6Oj71seDQZax28DwTem0wkn7SBlDGMEkJq_UTMTxePch_MHSBqRxpMRkptIe5fML5ha2jMpt3OTPczzIsszI8if0tlnGHOyxXLWwpppjWKQ2Q4l4LFpAlVurRgGU0TWJKpTNYAV2ChTFjh0"
          />
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-base text-primary truncate max-w-[120px]">{user?.email ? user.email.split('@')[0] : 'Usuário'}</span>
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
