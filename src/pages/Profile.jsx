import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Save, Bell, Mail, Phone } from 'lucide-react';

export const Profile = () => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [energyScore, setEnergyScore] = useState(0);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.user_metadata?.full_name || '',
        phone: user.user_metadata?.phone || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      });
      fetchEnergy();
    }
  }, [user]);

  const [vitalityScore, setVitalityScore] = useState(0);
  const [timeScore, setTimeScore] = useState(0);

  const fetchEnergy = async () => {
    try {
      const { data } = await supabase
        .from('evaluations')
        .select('solution_satisfaction, scores, solution_time_relation')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const evalData = data[0];
        
        if (evalData.solution_satisfaction) {
          const sat = evalData.solution_satisfaction;
          const keys = ['foco', 'produtividade', 'felicidade', 'realizacao'];
          let sum = 0;
          let count = 0;
          keys.forEach(k => {
            if (sat[k]) { sum += sat[k]; count++; }
          });
          if (count > 0) {
            setEnergyScore(Math.round((sum / count) * 10));
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url
        }
      });
      if (error) throw error;
      setSuccessMsg('Perfil atualizado com sucesso!');
      
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (error) {
      alert('Erro ao atualizar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para enviar.');
      }

      const file = event.target.files[0];
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 150; // Limite para manter a string base64 pequena
          let width = img.width;
          let height = img.height;

          // Calcula as proporções para redimensionar mantendo o aspecto
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Converte para JPEG com qualidade 70% para reduzir o tamanho
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          setFormData(prev => ({ ...prev, avatar_url: dataUrl }));
          setUploading(false);
        };
        img.onerror = () => {
          alert('Erro ao carregar a imagem.');
          setUploading(false);
        };
      };
      
    } catch (error) {
      console.error(error);
      alert('Erro ao processar a imagem.');
      setUploading(false);
    }
  };

  const formatPhone = (value) => {
    if (!value) return '';
    const phone = value.replace(/\D/g, '');
    if (phone.length <= 2) return `(${phone}`;
    if (phone.length <= 6) return `(${phone.slice(0,2)}) ${phone.slice(2)}`;
    if (phone.length <= 10) return `(${phone.slice(0,2)}) ${phone.slice(2,6)}-${phone.slice(6)}`;
    return `(${phone.slice(0,2)}) ${phone.slice(2,7)}-${phone.slice(7,11)}`;
  };

  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.name === 'phone') {
      value = formatPhone(value);
    }
    setFormData({ ...formData, [e.target.name]: value });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 min-h-screen font-display">
      <div className="flex flex-col lg:flex-row h-[100dvh] overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 bg-background-light relative w-full">
          {/* Header */}
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-200 pb-6 lg:pb-8">
              <div>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">Meu Perfil</h2>
                <p className="text-slate-500 font-medium mt-2 text-sm md:text-base lg:text-lg">Gerencie suas informações e preferências.</p>
              </div>
              <div className="flex items-center gap-4">
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
              <div className="col-span-1 lg:col-span-8 flex flex-col gap-8">
                <div className="bg-white rounded-[2rem] p-10 shadow-sm">
                  <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-slate-800">
                    <User size={24} className="text-primary" /> Dados Pessoais
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Foto de Perfil</label>
                      <div className="flex items-center gap-4">
                        {formData.avatar_url ? (
                          <img src={formData.avatar_url} alt="Avatar Preview" className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold border-2 border-slate-200">
                            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <label className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-sm cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                          {uploading ? 'Carregando...' : 'Fazer Upload'}
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={uploadAvatar}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Nome Completo</label>
                      <input 
                        type="text" 
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        placeholder="Seu nome"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Telefone</label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-4 top-3.5 text-slate-400" />
                        <input 
                          type="text" 
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">E-mail (Não editável)</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-3.5 text-slate-400" />
                        <input 
                          type="email" 
                          value={user?.email || ''}
                          readOnly
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-500 cursor-not-allowed outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                      {successMsg ? (
                        <span className="text-emerald-500 font-bold">{successMsg}</span>
                      ) : <span></span>}
                      
                      <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand-pink text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-[#d84e80] transition-colors shadow-md shadow-brand-pink/20 active:scale-95 flex items-center gap-2"
                      >
                        <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
                <div className="bg-brand-pink text-white rounded-[2rem] p-8 shadow-lg shadow-brand-pink/20 flex flex-col justify-between text-center relative overflow-hidden">
                  <div className="relative z-10 mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/70 mb-3">Sua Energia</h3>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-6xl font-black text-white tracking-tighter">{vitalityScore}<span className="text-2xl opacity-80">%</span></span>
                      <span className="text-base font-bold">
                        Vitalidade
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-mint text-[#004b4c] rounded-[2rem] p-8 shadow-lg shadow-mint/20 flex flex-col justify-between text-center relative overflow-hidden">
                  <div className="relative z-10 mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#004b4c]/70 mb-3">Sua Relação com o Tempo</h3>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-6xl font-black text-[#004b4c] tracking-tighter">{timeScore}<span className="text-2xl opacity-80">%</span></span>
                      <span className="text-base font-bold">
                        Satisfação
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-[2rem] p-8 shadow-sm text-center">
                  <div className="w-24 h-24 mx-auto bg-slate-100 rounded-full border-4 border-white shadow-md overflow-hidden mb-6 flex items-center justify-center">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-primary">{user?.email ? user.email.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">{formData.full_name || 'Usuário'}</h3>
                  <p className="text-slate-400 font-medium text-sm mt-2">{formData.phone}</p>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
