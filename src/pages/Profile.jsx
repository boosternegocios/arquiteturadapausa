import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { EvaluationResponseSummary } from '../components/EvaluationResponseSummary';
import { EvaluationComparisonTable } from '../components/EvaluationComparisonTable';
import { User, Save, Mail, Phone, CalendarClock, Gauge, HeartPulse, FileText, CreditCard, WalletCards, ShoppingBag, CheckCircle2, Clock3, XCircle, X } from 'lucide-react';
import { PATHS, getAssessmentPath } from '../lib/journey';
import {
  buildEvaluationScopedPath,
  calculateTimeScore,
  calculateVitalityScore,
  formatEvaluationDate,
  hasCompleteFatigueScores,
  hasCompleteSpeedRadar,
} from '../lib/evaluationHistory';
import { clearLocalJourneyBackups, startPaidEvaluation } from '../lib/evaluationCredits';
import { createEvaluationPaymentOrder, fetchActivePlans, formatPlanPrice, processCardPayment } from '../lib/payments';
import { loadMercadoPagoSdk } from '../lib/mercadoPagoSdk';

const getEvaluationStatusLabel = (status) => {
  if (status === 'completed') return 'Finalizada';
  if (status === 'draft') return 'Em andamento';
  return 'Registrada';
};

const getPaymentStatus = (status) => {
  if (status === 'approved') return { label: 'Aprovado', Icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' };
  if (status === 'rejected' || status === 'cancelled' || status === 'failed') return { label: 'Não concluído', Icon: XCircle, className: 'bg-rose-100 text-rose-700' };
  if (status === 'refunded' || status === 'charged_back') return { label: 'Estornado', Icon: XCircle, className: 'bg-slate-200 text-slate-700' };
  return { label: 'Pendente', Icon: Clock3, className: 'bg-amber-100 text-amber-700' };
};

export const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [vitalityScore, setVitalityScore] = useState(0);
  const [timeScore, setTimeScore] = useState(0);
  const [evaluations, setEvaluations] = useState([]);
  const [openEvaluationId, setOpenEvaluationId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [startLoading, setStartLoading] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [creditSummary, setCreditSummary] = useState({ total: 0, available: 0, consumed: 0 });
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [brickReady, setBrickReady] = useState(false);
  const [profileTab, setProfileTab] = useState('plans');
  const paymentControllerRef = useRef(null);

  const fetchEnergy = useCallback(async () => {
    if (!user) return;
    try {
      setHistoryLoading(true);
      const { data } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12);

      setEvaluations(data || []);

      const { data: creditData, error: creditError } = await supabase
        .from('evaluation_credits')
        .select('id, status, created_at, consumed_at')
        .eq('user_id', user.id);

      if (creditError) {
        console.warn('Créditos de avaliação ainda não disponíveis neste banco:', creditError.message);
        setAvailableCredits(0);
        setCreditSummary({ total: 0, available: 0, consumed: 0 });
      } else {
        const credits = creditData || [];
        const available = credits.filter(credit => credit.status === 'available').length;
        const consumed = credits.filter(credit => credit.status === 'consumed').length;
        setAvailableCredits(available);
        setCreditSummary({ total: credits.length, available, consumed });
      }

      const { data: orderData, error: orderError } = await supabase
        .from('payment_orders')
        .select('id, created_at, status, plan_name, credits_purchased, amount_cents, currency, provider_status_detail')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (orderError) {
        console.warn('Pedidos ainda não disponíveis neste banco:', orderError.message);
        setPaymentOrders([]);
      } else {
        setPaymentOrders(orderData || []);
      }

      try {
        const activePlans = await fetchActivePlans();
        setPlans(activePlans);
      } catch (planError) {
        console.warn('Planos ainda não disponíveis neste banco:', planError.message);
        setPlans([]);
      }

      if (data && data.length > 0) {
        const evalData = data.find(evaluation => evaluation.status === 'completed') || null;
        
        if (evalData?.scores) {
          const nextVitalityScore = calculateVitalityScore(evalData.scores);
          setVitalityScore(nextVitalityScore ?? 0);
        } else {
          setVitalityScore(0);
        }

        if (evalData?.solution_time_relation) {
          const nextTimeScore = calculateTimeScore(evalData.solution_time_relation);
          setTimeScore(nextTimeScore ?? 0);
        } else {
          setTimeScore(0);
        }
      } else {
        setVitalityScore(0);
        setTimeScore(0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.user_metadata?.full_name || '',
        phone: user.user_metadata?.phone || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      });
      fetchEnergy();
    }
  }, [user, fetchEnergy]);

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
        img.onload = async () => {
          try {
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
            const nextData = { ...formData, avatar_url: dataUrl };
            
            setFormData(nextData);

            const { error } = await supabase.auth.updateUser({
              data: {
                full_name: nextData.full_name,
                phone: nextData.phone,
                avatar_url: dataUrl,
              },
            });

            if (error) throw error;

            setSuccessMsg('Foto atualizada com sucesso!');
            setTimeout(() => setSuccessMsg(''), 3000);
          } catch (error) {
            console.error(error);
            alert('Erro ao salvar a foto do perfil.');
          } finally {
            setUploading(false);
          }
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

  useEffect(() => {
    if (!paymentSession?.public_key || !paymentSession?.order_id) return undefined;

    let cancelled = false;
    setBrickReady(false);
    setPaymentError('');
    setPaymentStatus('');

    const renderBrick = async () => {
      try {
        const MercadoPago = await loadMercadoPagoSdk();
        if (cancelled) return;

        if (paymentControllerRef.current?.unmount) {
          paymentControllerRef.current.unmount();
          paymentControllerRef.current = null;
        }

        const mp = new MercadoPago(paymentSession.public_key, { locale: 'pt-BR' });
        const bricksBuilder = mp.bricks();

        paymentControllerRef.current = await bricksBuilder.create('cardPayment', 'cardPaymentBrick_container', {
          initialization: {
            amount: paymentSession.amount,
            payer: {
              email: paymentSession.payer?.email || user?.email || '',
            },
          },
          customization: {
            visual: {
              style: {
                theme: 'default',
              },
            },
            paymentMethods: {
              minInstallments: 1,
              maxInstallments: 12,
            },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setBrickReady(true);
            },
            onSubmit: (cardFormData, additionalData) => (
              new Promise((resolve, reject) => {
                setPaymentStatus('Processando pagamento...');
                setPaymentError('');

                processCardPayment({
                  orderId: paymentSession.order_id,
                  paymentData: cardFormData,
                  additionalData,
                })
                  .then(async (result) => {
                    if (cancelled) return;
                    if (result?.status === 'approved') {
                      setPaymentStatus('Pagamento aprovado. Crédito liberado na sua conta.');
                      await fetchEnergy();
                    } else if (result?.status === 'pending') {
                      setPaymentStatus('Pagamento enviado. Assim que o Mercado Pago confirmar, o crédito aparece aqui.');
                      await fetchEnergy();
                    } else {
                      setPaymentStatus('');
                      setPaymentError('Pagamento não aprovado. Confira os dados e tente novamente.');
                    }
                    resolve(result);
                  })
                  .catch((error) => {
                    if (!cancelled) {
                      setPaymentStatus('');
                      setPaymentError(error.message || 'Não foi possível processar o pagamento.');
                    }
                    reject(error);
                  });
              })
            ),
            onError: (error) => {
              console.error('Erro no Card Payment Brick:', error);
              if (!cancelled) setPaymentError('O formulário de pagamento encontrou um erro. Tente novamente.');
            },
          },
        });
      } catch (error) {
        console.error('Erro ao carregar checkout transparente:', error);
        if (!cancelled) {
          setPaymentError(error.message || 'Não foi possível carregar o checkout transparente.');
          setBrickReady(true);
        }
      }
    };

    renderBrick();

    return () => {
      cancelled = true;
      if (paymentControllerRef.current?.unmount) {
        paymentControllerRef.current.unmount();
        paymentControllerRef.current = null;
      }
    };
  }, [fetchEnergy, paymentSession, user?.email]);

  const handleCreateCheckout = async (plan) => {
    setCheckoutLoading(true);
    setCheckoutPlanId(plan?.id || null);
    try {
      if (!plan?.id) throw new Error('Escolha um plano para continuar.');
      const session = await createEvaluationPaymentOrder({ planId: plan.id });
      if (!session?.public_key || !session?.order_id) {
        throw new Error('Pedido criado sem dados para abrir o checkout transparente.');
      }
      setPaymentSession(session);
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      alert(error.message || 'Não foi possível iniciar o pagamento. Tente novamente.');
    } finally {
      setCheckoutLoading(false);
      setCheckoutPlanId(null);
    }
  };

  const handleStartPaidEvaluation = async () => {
    setStartLoading(true);
    try {
      await startPaidEvaluation();
      clearLocalJourneyBackups(user?.id);
      navigate(getAssessmentPath('fisico'));
    } catch (error) {
      console.error('Erro ao iniciar avaliação paga:', error);
      alert(error.message || 'Não foi possível iniciar uma nova avaliação. Verifique se há crédito disponível.');
    } finally {
      setStartLoading(false);
    }
  };

  const closePaymentSession = () => {
    if (paymentControllerRef.current?.unmount) {
      paymentControllerRef.current.unmount();
      paymentControllerRef.current = null;
    }
    setPaymentSession(null);
    setPaymentError('');
    setPaymentStatus('');
    setBrickReady(false);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 min-h-screen font-display">
      {paymentSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/55 px-4 py-6 flex items-center justify-center">
          <div className="bg-white rounded-[1.75rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-5 md:px-7 py-4 flex items-start justify-between gap-4 rounded-t-[1.75rem]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Checkout transparente</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800">{paymentSession.plan?.name || 'Plano'}</h3>
                <p className="text-sm font-bold text-slate-500 mt-1">
                  {formatPlanPrice(paymentSession.plan)} · {paymentSession.plan?.evaluation_credits || 1} crédito{(paymentSession.plan?.evaluation_credits || 1) === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={closePaymentSession}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-colors"
                aria-label="Fechar checkout"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 md:p-7">
              {!brickReady && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-500 mb-4">
                  Carregando pagamento seguro...
                </div>
              )}

              {paymentError && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 p-4 text-sm font-bold mb-4">
                  {paymentError}
                </div>
              )}

              {paymentStatus && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 p-4 text-sm font-bold mb-4">
                  {paymentStatus}
                </div>
              )}

              <div id="cardPaymentBrick_container" />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:h-[100dvh] lg:overflow-hidden">
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

            <div className="flex flex-col gap-6 lg:gap-8">
              <div className="flex flex-col gap-6 lg:gap-8">
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

                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <WalletCards size={24} className="text-primary" /> Créditos
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-2">
                        Acompanhe seus créditos e inicie novas autoavaliações.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Disponíveis</p>
                      <p className="text-3xl font-black text-slate-800">{creditSummary.available}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Usados</p>
                      <p className="text-3xl font-black text-slate-800">{creditSummary.consumed}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total comprado</p>
                      <p className="text-3xl font-black text-slate-800">{creditSummary.total}</p>
                    </div>
                  </div>

                  {availableCredits > 0 && (
                    <button
                      type="button"
                      onClick={handleStartPaidEvaluation}
                      disabled={startLoading}
                      className="w-full mb-6 bg-brand-pink hover:bg-[#d84e80] text-white font-bold py-4 px-5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60 shadow-md shadow-brand-pink/20"
                    >
                      <FileText size={18} />
                      {startLoading ? 'Iniciando...' : 'Iniciar nova avaliação'}
                    </button>
                  )}
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'plans', label: 'Créditos e planos' },
                      { id: 'orders', label: 'Pedidos recentes' },
                      { id: 'history', label: 'Histórico de avaliações' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProfileTab(tab.id)}
                        className={`rounded-2xl px-3 py-3 text-center font-antonio text-xs font-semibold uppercase tracking-[0.14em] transition-colors md:text-sm ${
                          profileTab === tab.id
                            ? 'bg-primary text-white shadow-md shadow-primary/15'
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-primary'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {profileTab === 'plans' && (
                  <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                          <WalletCards size={24} className="text-primary" /> Créditos e planos
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-2">
                          Escolha um plano para liberar novas autoavaliações.
                        </p>
                      </div>
                    </div>

                    {plans.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                        Nenhum plano ativo configurado ainda.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {plans.map((plan) => (
                          <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-4">
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="font-black text-slate-800">{plan.name}</h4>
                                <span className="text-sm font-black text-primary whitespace-nowrap">{formatPlanPrice(plan)}</span>
                              </div>
                              {plan.description && (
                                <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{plan.description}</p>
                              )}
                              <p className="text-xs font-black text-slate-500 mt-3">
                                {plan.evaluation_credits} autoavaliação{plan.evaluation_credits === 1 ? '' : 'ões'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCreateCheckout(plan)}
                              disabled={checkoutLoading}
                              className="bg-[#1f1a1a] hover:bg-black text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60 shadow-xl mt-auto"
                            >
                              <CreditCard size={18} />
                              {checkoutLoading && checkoutPlanId === plan.id ? 'Criando checkout...' : 'Comprar plano'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'orders' && (
                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <ShoppingBag size={24} className="text-primary" /> Pedidos recentes
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-2">
                        Acompanhe compras aprovadas, pendentes ou não concluídas.
                      </p>
                    </div>
                  </div>

                  {paymentOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <CreditCard size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-slate-500">Nenhum pedido registrado ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentOrders.map((order) => {
                        const status = getPaymentStatus(order.status);
                        const StatusIcon = status.Icon;

                        return (
                          <div key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="font-black text-slate-800">{order.plan_name || 'Plano'}</span>
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${status.className}`}>
                                  <StatusIcon size={12} />
                                  {status.label}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-500">
                                {formatEvaluationDate(order.created_at)} · {order.credits_purchased || 1} crédito{(order.credits_purchased || 1) === 1 ? '' : 's'}
                              </p>
                            </div>
                            <span className="text-sm font-black text-primary">{formatPlanPrice(order)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                )}

                {profileTab === 'history' && (
                <div className="space-y-4">
                {!historyLoading && evaluations.length > 0 && (
                  <EvaluationComparisonTable evaluations={evaluations} />
                )}

                <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <CalendarClock size={24} className="text-primary" /> Histórico de avaliações
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-2">
                        Revise diagnósticos e radares já registrados na sua conta.
                      </p>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {evaluations.length} registro{evaluations.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {historyLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                      ))}
                    </div>
                  ) : evaluations.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                      <FileText size={36} className="mx-auto text-slate-300 mb-3" />
                      <p className="font-bold text-slate-500">Nenhuma avaliação registrada ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {evaluations.map((evaluation) => {
                        const fatigueReady = hasCompleteFatigueScores(evaluation.scores || {});
                        const speedReady = hasCompleteSpeedRadar(evaluation);
                        const historicalVitality = calculateVitalityScore(evaluation.scores || {});
                        const historicalTime = calculateTimeScore(evaluation.solution_time_relation || {});

                        return (
                          <div key={evaluation.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 md:p-5">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-sm font-black text-slate-800">
                                    Iniciada em {formatEvaluationDate(evaluation.created_at)}
                                  </span>
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${evaluation.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {getEvaluationStatusLabel(evaluation.status)}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                                  <span className="inline-flex items-center gap-1.5">
                                    <HeartPulse size={14} className="text-brand-pink" />
                                    Vitalidade: {historicalVitality ?? '--'}%
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <Gauge size={14} className="text-primary" />
                                    Tempo: {historicalTime ?? '--'}%
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                <button
                                  type="button"
                                  disabled={!fatigueReady}
                                  onClick={() => navigate(buildEvaluationScopedPath(PATHS.result, evaluation.id))}
                                  className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-700 hover:border-brand-pink hover:text-brand-pink disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-colors"
                                >
                                  Resultado
                                </button>
                                <button
                                  type="button"
                                  disabled={!speedReady}
                                  onClick={() => navigate(buildEvaluationScopedPath(PATHS.dashboard, evaluation.id))}
                                  className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-colors"
                                >
                                  Velocidade
                                </button>
                                <button
                                  type="button"
                                  disabled={!fatigueReady}
                                  onClick={() => navigate(buildEvaluationScopedPath(PATHS.vitality, evaluation.id))}
                                  className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-700 hover:border-mint hover:text-[#004b4c] disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-colors"
                                >
                                  Vitalidade
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setOpenEvaluationId(prev => prev === evaluation.id ? null : evaluation.id)}
                                  className="px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-slate-200 bg-white text-slate-700 hover:border-brand-pink hover:text-brand-pink transition-colors"
                                >
                                  {openEvaluationId === evaluation.id ? 'Ocultar respostas' : 'Ver respostas'}
                                </button>
                              </div>
                            </div>

                            {openEvaluationId === evaluation.id && (
                              <div className="mt-5 border-t border-slate-200 pt-5">
                                <div className="mb-4">
                                  <h4 className="text-lg font-black text-slate-800">Respostas e compromissos</h4>
                                  <p className="mt-1 text-sm font-medium text-slate-500">
                                    Consulte o que foi preenchido nesta avaliação, incluindo planos, metas e exercícios.
                                  </p>
                                </div>
                                <EvaluationResponseSummary evaluation={evaluation} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                </div>
                )}
              </div>
              
              <div className="order-first grid grid-cols-1 gap-4 md:grid-cols-3">
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
                
                <div className="bg-white rounded-[2rem] p-6 shadow-sm flex items-center gap-5 text-left">
                  <div className="w-20 h-20 shrink-0 bg-slate-100 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black text-primary">{user?.email ? user.email.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-black text-slate-800 leading-tight truncate">{formData.full_name || 'Usuário'}</h3>
                    <p className="text-slate-400 font-medium text-sm mt-2 truncate">{formData.phone || user?.email}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
