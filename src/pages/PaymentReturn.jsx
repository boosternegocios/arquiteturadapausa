import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock, XCircle, ArrowRight, CreditCard } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { supabase } from '../lib/supabase'
import { PATHS } from '../lib/journey'

const STATUS_COPY = {
  success: {
    Icon: CheckCircle2,
    title: 'Pagamento recebido',
    text: 'Assim que o Mercado Pago confirmar o pagamento, o crédito de avaliação fica disponível na sua conta.',
    tone: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  },
  pending: {
    Icon: Clock,
    title: 'Pagamento em análise',
    text: 'O Mercado Pago ainda está processando essa compra. A confirmação costuma chegar automaticamente pelo webhook.',
    tone: 'text-amber-600 bg-amber-50 border-amber-100',
  },
  failure: {
    Icon: XCircle,
    title: 'Pagamento não concluído',
    text: 'Não recebemos confirmação dessa compra. Você pode tentar novamente pelo seu perfil.',
    tone: 'text-rose-600 bg-rose-50 border-rose-100',
  },
  mock: {
    Icon: CreditCard,
    title: 'Checkout simulado',
    text: 'Este retorno é apenas para teste local. Nenhuma cobrança real foi criada.',
    tone: 'text-primary bg-mint/20 border-mint/40',
  },
}

export const PaymentReturn = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') || 'pending'
  const orderId = searchParams.get('pedido')
  const copy = STATUS_COPY[status] || STATUS_COPY.pending
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(Boolean(orderId))

  const fetchOrder = useCallback(async () => {
    if (!orderId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('payment_orders')
        .select('id, status, plan_name, credits_purchased, amount_cents, currency, created_at, provider_status, provider_status_detail')
        .eq('id', orderId)
        .maybeSingle()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.warn('Erro ao buscar pedido:', error)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const amountLabel = useMemo(() => {
    if (!order?.amount_cents && order?.amount_cents !== 0) return null
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: order.currency || 'BRL',
    }).format(order.amount_cents / 100)
  }, [order])

  const Icon = copy.Icon

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 min-h-screen font-display">
      <div className="flex flex-col lg:flex-row lg:h-[100dvh] lg:overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 bg-background-light relative w-full">
          <div className="max-w-3xl mx-auto min-h-full flex items-center justify-center">
            <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-slate-100 w-full">
              <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center mb-6 ${copy.tone}`}>
                <Icon size={32} strokeWidth={2.5} />
              </div>

              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">Mercado Pago</p>
              <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-4">
                {copy.title}
              </h1>
              <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed mb-8">
                {copy.text}
              </p>

              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 mb-8">
                {loading ? (
                  <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
                ) : order ? (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pedido</span>
                      <span className="font-bold text-slate-700">{order.id.slice(0, 8)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Plano</span>
                      <span className="font-bold text-slate-700">{order.plan_name || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</span>
                      <span className="font-bold text-slate-700">{order.status}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Valor</span>
                      <span className="font-bold text-slate-700">{amountLabel}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Créditos</span>
                      <span className="font-bold text-slate-700">{order.credits_purchased || 1}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-bold text-slate-500">
                    O pedido ainda não apareceu para esta sessão local.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => navigate(PATHS.profile)}
                  className="bg-[#1f1a1a] hover:bg-black text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl"
                >
                  Ver meu perfil <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => fetchOrder()}
                  disabled={!orderId || loading}
                  className="border border-slate-200 bg-white text-slate-700 font-bold py-4 px-6 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  Atualizar status
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
