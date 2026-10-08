import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock3, Copy, CreditCard, ExternalLink, FileText, QrCode, ShoppingBag, WalletCards, X, XCircle } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAssessmentPath } from '../lib/journey';
import { clearLocalJourneyBackups, ensureSignupEvaluationCredit, startPaidEvaluation } from '../lib/evaluationCredits';
import { formatEvaluationDate } from '../lib/evaluationHistory';
import { createEvaluationPaymentOrder, fetchActivePlans, formatPlanPrice, processCardPayment, processPixPayment } from '../lib/payments';
import { loadMercadoPagoSdk } from '../lib/mercadoPagoSdk';

const getPaymentStatus = (status) => {
  if (status === 'approved') return { label: 'Aprovado', Icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' };
  if (status === 'rejected' || status === 'cancelled' || status === 'failed') return { label: 'Não concluído', Icon: XCircle, className: 'bg-rose-100 text-rose-700' };
  if (status === 'refunded' || status === 'charged_back') return { label: 'Estornado', Icon: XCircle, className: 'bg-slate-200 text-slate-700' };
  return { label: 'Pendente', Icon: Clock3, className: 'bg-amber-100 text-amber-700' };
};

const getPaymentUiError = (error) => {
  const message = error?.message || '';

  if (message.includes('process-pix-payment')) {
    return 'Pix ainda não está ativo no Supabase. Publique a Edge Function process-pix-payment para gerar QR Code.';
  }

  if (message.includes('create-payment-order')) {
    return 'A função de retomar pedido pendente ainda não foi publicada no Supabase. Atualize create-payment-order.';
  }

  if (message.includes('non-2xx')) {
    return 'A função de pagamento retornou erro no Supabase. Verifique se as Edge Functions atualizadas foram publicadas.';
  }

  return message || 'Não foi possível concluir a operação.';
};

export const Credits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const paymentControllerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [startLoading, setStartLoading] = useState(false);
  const [creditSummary, setCreditSummary] = useState({ total: 0, available: 0, consumed: 0 });
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [paymentSession, setPaymentSession] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [pixPayment, setPixPayment] = useState(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccess, setCheckoutSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [brickReady, setBrickReady] = useState(false);
  const [refreshingCredits, setRefreshingCredits] = useState(false);

  const unmountPaymentBrick = useCallback(() => {
    try {
      if (paymentControllerRef.current?.unmount) {
        paymentControllerRef.current.unmount();
      }
    } catch (error) {
      console.warn('Mercado Pago Brick já estava desmontado:', error);
    } finally {
      paymentControllerRef.current = null;
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    if (!user) return null;

    try {
      setLoading(true);
      await ensureSignupEvaluationCredit();

      const { data: creditData, error: creditError } = await supabase
        .from('evaluation_credits')
        .select('id, status, created_at, consumed_at')
        .eq('user_id', user.id);

      if (creditError) throw creditError;

      const credits = creditData || [];
      const available = credits.filter(credit => credit.status === 'available').length;
      const consumed = credits.filter(credit => credit.status === 'consumed').length;
      const nextSummary = { total: credits.length, available, consumed };
      setCreditSummary(nextSummary);

      const { data: orderData, error: orderError } = await supabase
        .from('payment_orders')
        .select('id, created_at, status, plan_id, plan_slug, plan_name, credits_purchased, amount_cents, currency, provider_status_detail')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(12);

      if (orderError) throw orderError;
      setPaymentOrders(orderData || []);

      const activePlans = await fetchActivePlans();
      setPlans(activePlans);

      return {
        summary: nextSummary,
        orders: orderData || [],
      };
    } catch (error) {
      console.error('Erro ao carregar créditos:', error);
      setCreditSummary({ total: 0, available: 0, consumed: 0 });
      setPaymentOrders([]);
      setPlans([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const closePaymentSession = useCallback(() => {
    unmountPaymentBrick();
    setPaymentSession(null);
    setPaymentMethod('pix');
    setPixPayment(null);
    setPixLoading(false);
    setPaymentError('');
    setPaymentStatus('');
    setBrickReady(false);
  }, [unmountPaymentBrick]);

  const confirmCreditsAndClose = useCallback(async () => {
    if (!paymentSession?.order_id) return;

    setRefreshingCredits(true);
    setPaymentError('');

    try {
      const previousAvailable = creditSummary.available;
      const result = await fetchCredits();
      const currentOrder = result?.orders?.find(order => order.id === paymentSession.order_id);
      const nextAvailable = result?.summary?.available ?? previousAvailable;
      const releasedCredits = Number(currentOrder?.credits_purchased) || Math.max(1, nextAvailable - previousAvailable);

      if (currentOrder?.status === 'approved' || nextAvailable > previousAvailable) {
        closePaymentSession();
        setCheckoutSuccess(
          `Pagamento confirmado! ${releasedCredits} crédito${releasedCredits === 1 ? '' : 's'} liberado${releasedCredits === 1 ? '' : 's'} para sua conta.`
        );
        return;
      }

      setPaymentStatus('Ainda não identificamos a confirmação do pagamento. Aguarde alguns instantes e tente atualizar de novo.');
    } catch (error) {
      console.error('Erro ao atualizar créditos:', error);
      setPaymentError(error.message || 'Não foi possível atualizar os créditos agora.');
    } finally {
      setRefreshingCredits(false);
    }
  }, [closePaymentSession, creditSummary.available, fetchCredits, paymentSession?.order_id]);

  useEffect(() => {
    if (!paymentSession?.public_key || !paymentSession?.order_id || paymentMethod !== 'card') {
      unmountPaymentBrick();
      return undefined;
    }

    let cancelled = false;
    setBrickReady(false);
    setPaymentError('');
    setPaymentStatus('');

    const renderBrick = async () => {
      try {
        const MercadoPago = await loadMercadoPagoSdk();
        if (cancelled) return;

        unmountPaymentBrick();

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
                      await confirmCreditsAndClose();
                    } else if (result?.status === 'pending') {
                      setPaymentStatus('Pagamento enviado. Assim que o Mercado Pago confirmar, o crédito aparece aqui.');
                      await fetchCredits();
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
      unmountPaymentBrick();
    };
  }, [confirmCreditsAndClose, fetchCredits, paymentMethod, paymentSession, unmountPaymentBrick, user?.email]);

  const handleCreateCheckout = async (planOrOrder, options = {}) => {
    setCheckoutLoading(true);
    setCheckoutPlanId(planOrOrder?.id || null);
    setCheckoutError('');
    setCheckoutSuccess('');
    try {
      const session = options.orderId
        ? await createEvaluationPaymentOrder({ orderId: options.orderId })
        : await createEvaluationPaymentOrder({ planId: planOrOrder?.id });

      if (!options.orderId && !planOrOrder?.id) throw new Error('Escolha um plano para continuar.');
      if (!session?.public_key || !session?.order_id) {
        throw new Error('Pedido criado sem dados para abrir o checkout transparente.');
      }
      setPaymentMethod(options.method || 'pix');
      setPixPayment(null);
      setPaymentError('');
      setPaymentSession(session);
    } catch (error) {
      console.error('Erro ao criar checkout:', error);
      setCheckoutError(getPaymentUiError(error));
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

  const handleCreatePixPayment = async () => {
    if (!paymentSession?.order_id) return;
    setPixLoading(true);
    setPaymentError('');
    setPaymentStatus('');

    try {
      const result = await processPixPayment({ orderId: paymentSession.order_id });
      setPixPayment(result);
      if (result?.status === 'approved') {
        await confirmCreditsAndClose();
      } else {
        setPaymentStatus('Pix gerado. Depois do pagamento, a confirmação pode levar alguns instantes.');
        await fetchCredits();
      }
    } catch (error) {
      console.error('Erro ao gerar Pix:', error);
      setPaymentError(getPaymentUiError(error));
    } finally {
      setPixLoading(false);
    }
  };

  const openPixTab = () => {
    setPaymentMethod('pix');
    if (!pixPayment && !pixLoading) {
      setTimeout(() => handleCreatePixPayment(), 0);
    }
  };

  const copyPixCode = async () => {
    if (!pixPayment?.qr_code) return;
    await navigator.clipboard.writeText(pixPayment.qr_code);
    setPaymentStatus('Código Pix copiado.');
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 min-h-screen font-display">
      {paymentSession && (
        <div className="fixed inset-0 z-[120] bg-slate-950/55 p-0 sm:px-4 sm:py-6 flex items-stretch sm:items-center justify-center">
          <div className="bg-white rounded-none sm:rounded-[1.75rem] shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 border-b border-slate-100 px-5 md:px-7 py-4 flex items-start justify-between gap-4 sm:rounded-t-[1.75rem]">
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
              <div className="grid grid-cols-2 gap-2 mb-5 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`rounded-xl px-4 py-2.5 text-sm font-black transition-colors ${paymentMethod === 'card' ? 'bg-white text-brand-pink shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Cartão
                </button>
                <button
                  type="button"
                  onClick={openPixTab}
                  className={`rounded-xl px-4 py-2.5 text-sm font-black transition-colors ${paymentMethod === 'pix' ? 'bg-white text-brand-pink shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Pix
                </button>
              </div>

              {paymentMethod === 'card' && !brickReady && (
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

              {paymentMethod === 'card' ? (
                <div id="cardPaymentBrick_container" />
              ) : (
                <div className="space-y-4">
                  {pixLoading && (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                      Gerando QR Code Pix...
                    </div>
                  )}

                  {!pixLoading && !pixPayment && (
                    <button
                      type="button"
                      onClick={handleCreatePixPayment}
                      className="w-full bg-brand-pink hover:bg-[#d84e80] text-white font-black py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                      <QrCode size={18} />
                      Gerar Pix
                    </button>
                  )}

                  {pixPayment && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                      {pixPayment.qr_code_base64 ? (
                        <img
                          src={`data:image/jpeg;base64,${pixPayment.qr_code_base64}`}
                          alt="QR Code Pix"
                          className="w-56 h-56 mx-auto bg-white rounded-2xl border border-slate-200 p-3"
                        />
                      ) : (
                        <div className="w-56 h-56 mx-auto rounded-2xl border border-dashed border-slate-200 bg-white flex items-center justify-center text-slate-400">
                          <QrCode size={56} />
                        </div>
                      )}

                      <p className="text-sm font-bold text-slate-600 mt-4">Escaneie o QR Code ou copie o código Pix.</p>

                      {pixPayment.qr_code && (
                        <div className="mt-4">
                          <textarea
                            readOnly
                            value={pixPayment.qr_code}
                            className="w-full h-24 resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={copyPixCode}
                            className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-white flex items-center justify-center gap-2"
                          >
                            <Copy size={16} />
                            Copiar código Pix
                          </button>
                        </div>
                      )}

                      {pixPayment.ticket_url && (
                        <a
                          href={pixPayment.ticket_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 flex items-center justify-center gap-2"
                        >
                          <ExternalLink size={16} />
                          Abrir instruções do Pix
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={confirmCreditsAndClose}
                        disabled={refreshingCredits}
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-60"
                      >
                        {refreshingCredits ? 'Atualizando créditos...' : 'Já paguei, atualizar créditos'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:h-[100dvh] lg:overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 bg-background-light relative w-full">
          <div className="max-w-7xl mx-auto space-y-6 lg:space-y-10">
            <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 border-b border-slate-200 pb-6 lg:pb-8">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-3">Sua jornada continua</p>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-800 tracking-tight">Meus créditos</h2>
                <p className="text-slate-500 font-medium mt-2 text-sm md:text-base lg:text-lg max-w-2xl">
                  Compre novas autoavaliações, acompanhe créditos disponíveis e inicie uma nova leitura quando quiser.
                </p>
              </div>

              {creditSummary.available > 0 && (
                <button
                  type="button"
                  onClick={handleStartPaidEvaluation}
                  disabled={startLoading}
                  className="bg-brand-pink hover:bg-[#d84e80] text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-60 shadow-md shadow-brand-pink/20"
                >
                  <FileText size={18} />
                  {startLoading ? 'Iniciando...' : 'Iniciar nova avaliação'}
                </button>
              )}
            </header>

            {checkoutError && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                {checkoutError}
              </div>
            )}

            {checkoutSuccess && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                {checkoutSuccess}
              </div>
            )}

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Disponíveis</p>
                <p className="text-4xl font-black text-slate-800">{loading ? '--' : creditSummary.available}</p>
                <p className="text-sm font-bold text-slate-500 mt-2">Prontos para iniciar uma nova avaliação.</p>
              </div>
              <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Usados</p>
                <p className="text-4xl font-black text-slate-800">{loading ? '--' : creditSummary.consumed}</p>
                <p className="text-sm font-bold text-slate-500 mt-2">Avaliações extras já consumidas.</p>
              </div>
              <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Total de créditos</p>
                <p className="text-4xl font-black text-slate-800">{loading ? '--' : creditSummary.total}</p>
                <p className="text-sm font-bold text-slate-500 mt-2">Soma dos créditos liberados para sua conta.</p>
              </div>
            </section>

            <section className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                    <WalletCards size={24} className="text-primary" /> Comprar avaliações
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-2">
                    Escolha um plano e pague com segurança sem sair do sistema.
                  </p>
                </div>
              </div>

              {plans.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm font-bold text-slate-500">
                  Nenhum plano ativo configurado ainda. Assim que um plano for cadastrado, ele aparece aqui para compra.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-5">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-black text-slate-800 text-lg">{plan.name}</h4>
                          <span className="text-base font-black text-primary whitespace-nowrap">{formatPlanPrice(plan)}</span>
                        </div>
                        {plan.description && (
                          <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">{plan.description}</p>
                        )}
                        <p className="text-xs font-black text-slate-500 mt-4">
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
                        {checkoutLoading && checkoutPlanId === plan.id ? 'Abrindo checkout...' : 'Comprar avaliação'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm">
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
                        <div className="flex flex-col md:items-end gap-2">
                          <span className="text-sm font-black text-primary">{formatPlanPrice(order)}</span>
                          {order.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleCreateCheckout(order, { orderId: order.id })}
                              disabled={checkoutLoading}
                              className="rounded-xl bg-[#1f1a1a] px-4 py-2 text-xs font-black text-white hover:bg-black disabled:opacity-60"
                            >
                              Pagar agora
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};
