import React, { useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCircle, Clock3, Link2, RefreshCw, Save, Send, Timer, Webhook, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const AUTOMATION_EVENT_OPTIONS = [
  {
    event_type: 'user_registered',
    label: 'Cadastro realizado',
    description: 'Dispara depois que a pessoa cria a conta no sistema.',
  },
  {
    event_type: 'fatigue_assessment_started',
    label: 'Autoavaliação iniciada',
    description: 'Dispara quando uma avaliação começa e o crédito é consumido.',
  },
  {
    event_type: 'assessment_draft_stale',
    label: 'Autoavaliação parada em rascunho',
    description: 'Dispara se a avaliação continuar em andamento após o prazo configurado.',
  },
  {
    event_type: 'fatigue_assessment_completed',
    label: 'Autoavaliação concluída',
    description: 'Dispara sempre que uma autoavaliação é finalizada.',
  },
  {
    event_type: 'plan_requested',
    label: 'Plano personalizado solicitado',
    description: 'Dispara quando a pessoa envia o formulário de plano de ação.',
  },
]

const DELAY_UNITS = [
  { value: 'minutes', label: 'minutos', multiplier: 60 },
  { value: 'hours', label: 'horas', multiplier: 3600 },
  { value: 'days', label: 'dias', multiplier: 86400 },
]

const getDefaultConfig = (event) => ({
  ...event,
  webhook_url: '',
  delay_amount: event.event_type === 'assessment_draft_stale' ? '24' : '0',
  delay_unit: event.event_type === 'assessment_draft_stale' ? 'hours' : 'minutes',
  is_active: false,
})

const secondsToDelayFields = (seconds = 0) => {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const unit = [...DELAY_UNITS].reverse().find(item => safeSeconds > 0 && safeSeconds % item.multiplier === 0) || DELAY_UNITS[0]
  return {
    delay_amount: String(safeSeconds ? safeSeconds / unit.multiplier : 0),
    delay_unit: unit.value,
  }
}

const toDelaySeconds = (amount, unitValue) => {
  const unit = DELAY_UNITS.find(item => item.value === unitValue) || DELAY_UNITS[0]
  const parsed = Number(String(amount).replace(',', '.'))
  return Math.max(0, Math.round((Number.isFinite(parsed) ? parsed : 0) * unit.multiplier))
}

const getDeliveryStatus = (status) => {
  if (status === 'sent') return { label: 'Enviado', Icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700' }
  if (status === 'failed') return { label: 'Falhou', Icon: XCircle, className: 'bg-rose-100 text-rose-700' }
  if (status === 'skipped') return { label: 'Ignorado', Icon: XCircle, className: 'bg-slate-200 text-slate-700' }
  return { label: 'Pendente', Icon: Clock3, className: 'bg-amber-100 text-amber-700' }
}

const formatDateTime = (value) => {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export const AdminWebhookManager = () => {
  const [configs, setConfigs] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingType, setSavingType] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const configByType = useMemo(() => (
    configs.reduce((acc, config) => {
      acc[config.event_type] = config
      return acc
    }, {})
  ), [configs])

  const fetchAutomationData = async () => {
    setLoading(true)
    setMessage('')
    try {
      const { data: configRows, error: configError } = await supabase
        .from('automation_webhook_configs')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (configError) throw configError

      const mergedConfigs = AUTOMATION_EVENT_OPTIONS.map((event, index) => {
        const saved = (configRows || []).find(config => config.event_type === event.event_type)
        if (!saved) return { ...getDefaultConfig(event), sort_order: index + 1 }
        return {
          ...getDefaultConfig(event),
          ...saved,
          ...secondsToDelayFields(saved.delay_seconds),
          label: saved.label || event.label,
          description: saved.description || event.description,
        }
      })

      setConfigs(mergedConfigs)

      const { data: deliveryRows, error: deliveryError } = await supabase
        .from('automation_webhook_deliveries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30)

      if (deliveryError) {
        console.warn('Entregas de webhook ainda não disponíveis:', deliveryError.message)
        setDeliveries([])
      } else {
        setDeliveries(deliveryRows || [])
      }
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error)
      setMessage(error?.message || 'Não foi possível carregar as configurações de webhook.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAutomationData()
  }, [])

  const updateConfig = (eventType, changes) => {
    setConfigs(prev => prev.map(config => (
      config.event_type === eventType ? { ...config, ...changes } : config
    )))
  }

  const saveConfig = async (eventType) => {
    const config = configByType[eventType]
    if (!config) return

    setSavingType(eventType)
    setMessage('')
    try {
      if (config.is_active && !String(config.webhook_url || '').trim()) {
        throw new Error('Informe a URL do webhook antes de ativar este gatilho.')
      }

      const payload = {
        event_type: config.event_type,
        label: config.label,
        description: config.description,
        webhook_url: String(config.webhook_url || '').trim() || null,
        delay_seconds: toDelaySeconds(config.delay_amount, config.delay_unit),
        is_active: config.is_active,
        sort_order: config.sort_order || AUTOMATION_EVENT_OPTIONS.findIndex(item => item.event_type === eventType) + 1,
      }

      const { data, error } = await supabase
        .from('automation_webhook_configs')
        .upsert(payload, { onConflict: 'event_type' })
        .select()
        .single()

      if (error) throw error

      setConfigs(prev => prev.map(item => (
        item.event_type === eventType
          ? { ...item, ...data, ...secondsToDelayFields(data.delay_seconds) }
          : item
      )))
      setMessage('Webhook salvo com sucesso.')
    } catch (error) {
      console.error('Erro ao salvar webhook:', error)
      setMessage(error?.message || 'Não foi possível salvar este webhook.')
    } finally {
      setSavingType(null)
    }
  }

  const processPendingDeliveries = async () => {
    setProcessing(true)
    setMessage('')
    try {
      const { data, error } = await supabase.functions.invoke('process-automation-webhooks', { body: {} })
      if (error) throw error
      setMessage(`Processamento concluído. ${data?.processed || 0} entrega(s) verificadas.`)
      await fetchAutomationData()
    } catch (error) {
      console.error('Erro ao processar webhooks:', error)
      setMessage(error?.message || 'Não foi possível processar os webhooks pendentes.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-50/70 p-8">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="bg-slate-50/70 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="rounded-2xl bg-[#004b4c] text-white p-6 md:p-8 shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-brand-pink mb-3">Automações</p>
              <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Webhooks da jornada</h3>
              <p className="mt-3 max-w-3xl text-sm md:text-base font-medium text-white/75">
                Configure a URL e o atraso de cada gatilho. O sistema registra o evento, agenda o envio e entrega o payload para sua automação de e-mail.
              </p>
            </div>
            <button
              type="button"
              onClick={processPendingDeliveries}
              disabled={processing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-pink px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-brand-pink/20 disabled:opacity-60"
            >
              <RefreshCw size={16} className={processing ? 'animate-spin' : ''} />
              {processing ? 'Processando...' : 'Processar pendentes'}
            </button>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-brand-pink/20 bg-white px-5 py-4 text-sm font-bold text-brand-pink shadow-sm">
            {message}
          </div>
        )}

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {AUTOMATION_EVENT_OPTIONS.map(event => {
            const config = configByType[event.event_type] || getDefaultConfig(event)
            const isSaving = savingType === event.event_type
            return (
              <div key={event.event_type} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-[#004b4c]">
                      <Webhook size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-800">{event.label}</h4>
                      <p className="mt-1 text-sm font-medium text-slate-500">{event.description}</p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                    <input
                      type="checkbox"
                      checked={Boolean(config.is_active)}
                      onChange={e => updateConfig(event.event_type, { is_active: e.target.checked })}
                      className="h-4 w-4 accent-brand-pink"
                    />
                    Ativo
                  </label>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <Link2 size={13} /> URL do webhook
                    </span>
                    <input
                      type="url"
                      value={config.webhook_url || ''}
                      onChange={e => updateConfig(event.event_type, { webhook_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-brand-pink focus:bg-white"
                    />
                  </label>

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <label className="block">
                      <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Timer size={13} /> Atraso
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={config.delay_amount}
                        onChange={e => updateConfig(event.event_type, { delay_amount: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-brand-pink focus:bg-white"
                      />
                    </label>
                    <label className="block min-w-[130px]">
                      <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Unidade</span>
                      <select
                        value={config.delay_unit}
                        onChange={e => updateConfig(event.event_type, { delay_unit: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-brand-pink focus:bg-white"
                      >
                        {DELAY_UNITS.map(unit => (
                          <option key={unit.value} value={unit.value}>{unit.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => saveConfig(event.event_type)}
                    disabled={isSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-black disabled:opacity-60"
                  >
                    <Save size={15} />
                    {isSaving ? 'Salvando...' : 'Salvar webhook'}
                  </button>
                </div>
              </div>
            )
          })}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h4 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <BellRing size={23} className="text-brand-pink" /> Últimos envios
              </h4>
              <p className="mt-1 text-sm font-medium text-slate-500">Fila de webhooks agendados, enviados ou com erro.</p>
            </div>
            <button
              type="button"
              onClick={fetchAutomationData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:border-brand-pink hover:text-brand-pink"
            >
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>

          {deliveries.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500">
              Nenhum webhook agendado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {deliveries.map(delivery => {
                const status = getDeliveryStatus(delivery.status)
                const StatusIcon = status.Icon
                const config = AUTOMATION_EVENT_OPTIONS.find(item => item.event_type === delivery.event_type)
                return (
                  <div key={delivery.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-800">{config?.label || delivery.event_type}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Agendado para {formatDateTime(delivery.scheduled_for)}
                          {delivery.delivered_at ? ` · enviado em ${formatDateTime(delivery.delivered_at)}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${status.className}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          <Send size={12} />
                          {delivery.attempt_count || 0} tentativa{(delivery.attempt_count || 0) === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>
                    {delivery.error_message && (
                      <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">{delivery.error_message}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

