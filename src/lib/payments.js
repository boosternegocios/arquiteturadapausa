import { supabase } from './supabase'

export const fetchActivePlans = async () => {
  const { data, error } = await supabase
    .from('plans')
    .select('id, slug, name, description, evaluation_credits, amount_cents, currency, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export const formatPlanPrice = (plan) => (
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: plan.currency || 'BRL',
  }).format((plan.amount_cents || 0) / 100)
)

const getLocalFunctionsUrl = () => import.meta.env.VITE_SUPABASE_FUNCTIONS_URL?.replace(/\/$/, '')

const getPaymentFunctionError = (functionName, result, fallbackMessage) => {
  const rawMessage = result?.error || result?.message || fallbackMessage

  if (functionName === 'process-pix-payment' && /not found|404|não encontrada|non-2xx|failed to fetch|load failed|network/i.test(rawMessage)) {
    return 'O Pix ainda não está ativo no Supabase. Publique a Edge Function process-pix-payment para gerar QR Code.'
  }

  if (functionName === 'create-payment-order' && /Informe o plano escolhido|not found|404|non-2xx|failed to fetch|load failed|network/i.test(rawMessage)) {
    return 'Para retomar um pedido pendente, atualize a Edge Function create-payment-order no Supabase.'
  }

  return rawMessage
}

const invokeLocalFunction = async (functionName, body) => {
  const localFunctionsUrl = getLocalFunctionsUrl()
  if (!localFunctionsUrl) return null

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  const response = await fetch(`${localFunctionsUrl}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(result.error || 'Não foi possível concluir a operação.')
  }
  return result
}

const invokeSupabaseFunction = async (functionName, body) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    throw new Error('Configuração do Supabase ausente.')
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token || anonKey

  let response
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new Error(getPaymentFunctionError(functionName, { message: error?.message }, 'Falha de conexão com a função de pagamento.'))
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(getPaymentFunctionError(functionName, result, 'Não foi possível concluir a operação.'))
  }

  return result
}

export const createEvaluationPaymentOrder = async ({ planId, planSlug, orderId }) => {
  const body = {
    ...(planId ? { plan_id: planId } : {}),
    ...(planSlug ? { plan_slug: planSlug } : {}),
    ...(orderId ? { order_id: orderId } : {}),
  }

  const localResult = await invokeLocalFunction('create-payment-order', body)
  if (localResult) return localResult

  return invokeSupabaseFunction('create-payment-order', body)
}

export const processCardPayment = async ({ orderId, paymentData, additionalData }) => {
  const body = {
    order_id: orderId,
    payment_data: paymentData,
    additional_data: additionalData || null,
  }

  const localResult = await invokeLocalFunction('process-card-payment', body)
  if (localResult) return localResult

  return invokeSupabaseFunction('process-card-payment', body)
}

export const processPixPayment = async ({ orderId }) => {
  const body = {
    order_id: orderId,
  }

  const localResult = await invokeLocalFunction('process-pix-payment', body)
  if (localResult) return localResult

  return invokeSupabaseFunction('process-pix-payment', body)
}
