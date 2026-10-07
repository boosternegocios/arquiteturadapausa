import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { EvaluationResponseSummary } from '../components/EvaluationResponseSummary'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PATHS } from '../lib/journey'
import { getMissingExerciseFields } from '../lib/exerciseCompletion'
import { 
  Users, 
  Search, 
  User, 
  Mail, 
  Activity, 
  CheckCircle,
  Phone,
  ArrowLeft,
  CreditCard,
  WalletCards,
  ShoppingBag,
  LayoutDashboard,
  Clock3,
  XCircle,
  Pencil,
  PauseCircle,
  PlayCircle,
  TrendingUp,
  Filter,
  FileText
} from 'lucide-react'

const formatDateTime = (value) => {
  if (!value) return 'Data indisponível'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatMoney = (amountCents = 0, currency = 'BRL') => (
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format((amountCents || 0) / 100)
)

const getPaymentStatus = (status) => {
  if (status === 'approved') return { label: 'Aprovado', Icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700' }
  if (status === 'rejected' || status === 'cancelled' || status === 'failed') return { label: 'Não concluído', Icon: XCircle, className: 'bg-rose-100 text-rose-700' }
  if (status === 'refunded' || status === 'charged_back') return { label: 'Estornado', Icon: XCircle, className: 'bg-slate-200 text-slate-700' }
  return { label: 'Pendente', Icon: Clock3, className: 'bg-amber-100 text-amber-700' }
}

const getCreditStatus = (status) => {
  if (status === 'available') return { label: 'Disponível', className: 'bg-emerald-100 text-emerald-700' }
  if (status === 'consumed') return { label: 'Usado', className: 'bg-slate-200 text-slate-700' }
  if (status === 'revoked') return { label: 'Revogado', className: 'bg-rose-100 text-rose-700' }
  return { label: status || 'Registrado', className: 'bg-amber-100 text-amber-700' }
}

const sortFatigueEntries = ([a], [b]) => {
  const indexA = FATIGUE_ORDER.indexOf(a)
  const indexB = FATIGUE_ORDER.indexOf(b)
  const safeA = indexA === -1 ? FATIGUE_ORDER.length : indexA
  const safeB = indexB === -1 ? FATIGUE_ORDER.length : indexB
  return safeA - safeB || a.localeCompare(b)
}

const getExerciseAdminStatus = (category, data) => {
  const missingFields = getMissingExerciseFields(category, data)
  if (missingFields.length === 0) {
    return {
      label: 'Exercício concluído',
      detail: 'Todos os campos obrigatórios foram preenchidos.',
      missingFields,
      className: 'bg-emerald-100 text-emerald-700',
      Icon: CheckCircle,
    }
  }

  const hasAnyData = Boolean(data && Object.keys(data).some(key => key !== 'isCompleted'))
  return {
    label: hasAnyData ? 'Exercício não concluído' : 'Não iniciado',
    detail: `Falta preencher: ${missingFields.join(', ')}.`,
    missingFields,
    className: hasAnyData ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600',
    Icon: hasAnyData ? Clock3 : XCircle,
  }
}

const emptyPlanForm = {
  name: '',
  slug: '',
  description: '',
  evaluation_credits: '1',
  price: '',
  mercado_pago_title: '',
  sort_order: '1',
  is_active: true,
}

const USER_PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const FATIGUE_ORDER = ['fisico', 'mental', 'emocional', 'social', 'espiritual', 'sensorial', 'criativo']
const FATIGUE_LABELS = {
  fisico: 'Cansaço Físico',
  mental: 'Cansaço Mental',
  emocional: 'Cansaço Emocional',
  social: 'Cansaço Social',
  espiritual: 'Cansaço Espiritual',
  sensorial: 'Cansaço Sensorial',
  criativo: 'Cansaço Criativo',
}

const slugify = (value) => (
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
)

const getPlanErrorMessage = (error) => {
  const message = error?.message || ''
  if (message.includes('row-level security')) {
    return 'O Supabase ainda está bloqueando a criação de planos. Rode a policy de admin no SQL Editor para liberar essa ação.'
  }
  if (message.includes('duplicate key') || message.includes('plans_slug_key')) {
    return 'Já existe um plano com esse nome. Altere o nome do plano para gerar outro identificador.'
  }
  return message || 'Não foi possível salvar o plano.'
}

export const AdminDashboard = () => {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  
  const [usersList, setUsersList] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [paymentOrders, setPaymentOrders] = useState([])
  const [evaluationCredits, setEvaluationCredits] = useState([])
  const [automationEvents, setAutomationEvents] = useState([])
  const [plans, setPlans] = useState([])
  const [adminView, setAdminView] = useState('dashboard')
  const [planForm, setPlanForm] = useState(emptyPlanForm)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [planMessage, setPlanMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedAdminEvaluationId, setSelectedAdminEvaluationId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [financeSearch, setFinanceSearch] = useState('')
  const [financeStatus, setFinanceStatus] = useState('all')
  const [userPage, setUserPage] = useState(1)
  const [usersPerPage, setUsersPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('habits') // habits, diagnosis, responses, payments

  useEffect(() => {
    if (isAdmin === false) {
      navigate(PATHS.home)
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // 1. Fetch all users from our secure RPC function
        const { data: usersData, error: usersError } = await supabase.rpc('get_all_users')
        
        if (usersError) {
          console.error("Error fetching users:", usersError)
          setUsersList([{ email: 'Erro RPC', name: usersError.message, user_id: '123' }])
        } else {
          setUsersList(usersData || [])
        }
        
        // 2. Fetch all evaluations (RLS policy for admins will allow this)
        const { data: evalData, error: evalError } = await supabase
          .from('evaluations')
          .select('*')
          .order('created_at', { ascending: false })
          
        if (evalError) throw evalError
        setEvaluations(evalData || [])

        const { data: ordersData, error: ordersError } = await supabase
          .from('payment_orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (ordersError) {
          console.warn('Tabela de pedidos ainda não disponível para o admin:', ordersError.message)
          setPaymentOrders([])
        } else {
          setPaymentOrders(ordersData || [])
        }

        const { data: creditsData, error: creditsError } = await supabase
          .from('evaluation_credits')
          .select('*')
          .order('created_at', { ascending: false })

        if (creditsError) {
          console.warn('Tabela de créditos ainda não disponível para o admin:', creditsError.message)
          setEvaluationCredits([])
        } else {
          setEvaluationCredits(creditsData || [])
        }

        const { data: eventsData, error: eventsError } = await supabase
          .from('automation_events')
          .select('*')
          .eq('event_type', 'plan_requested')
          .order('created_at', { ascending: false })

        if (eventsError) {
          console.warn('Eventos de automação ainda não disponíveis para o admin:', eventsError.message)
          setAutomationEvents([])
        } else {
          setAutomationEvents(eventsData || [])
        }

        const { data: plansData, error: plansError } = await supabase
          .from('plans')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })

        if (plansError) {
          console.warn('Tabela de planos ainda não disponível para o admin:', plansError.message)
          setPlans([])
        } else {
          setPlans(plansData || [])
        }
        
      } catch (err) {
        console.error('Erro ao buscar dados do painel admin:', err)
      } finally {
        setLoading(false)
      }
    }

    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin])

  // Merge users, evaluations, payments and credits into one admin list.
  const getMergedUsers = () => {
    const uniqueMap = {}

    usersList.forEach(userInfo => {
      if (!userInfo.user_id || userInfo.user_id === '123') return
      uniqueMap[userInfo.user_id] = {
        user_id: userInfo.user_id,
        email: userInfo.email || 'Desconhecido',
        name: userInfo.name || userInfo.email?.split('@')[0] || 'Usuário',
        phone: userInfo.phone || null,
        latest_evaluation: null,
        evaluations: [],
        evaluation_count: 0,
        orders: [],
        credits: [],
        planRequests: [],
      }
    })

    evaluations.forEach(ev => {
      if (!uniqueMap[ev.user_id]) {
        uniqueMap[ev.user_id] = {
          user_id: ev.user_id,
          email: 'Desconhecido',
          name: 'Usuário',
          phone: null,
          latest_evaluation: ev,
          evaluations: [ev],
          evaluation_count: 1,
          orders: [],
          credits: [],
          planRequests: [],
        }
      } else {
        if (!uniqueMap[ev.user_id].latest_evaluation) {
          uniqueMap[ev.user_id].latest_evaluation = ev
        }
        uniqueMap[ev.user_id].evaluations.push(ev)
        uniqueMap[ev.user_id].evaluation_count += 1
      }
    })

    paymentOrders.forEach(order => {
      if (!uniqueMap[order.user_id]) {
        uniqueMap[order.user_id] = {
          user_id: order.user_id,
          email: order.user_email || 'Desconhecido',
          name: order.user_email?.split('@')[0] || 'Usuário',
          phone: null,
          latest_evaluation: null,
          evaluations: [],
          evaluation_count: 0,
          orders: [],
          credits: [],
          planRequests: [],
        }
      }
      uniqueMap[order.user_id].orders.push(order)
    })

    evaluationCredits.forEach(credit => {
      if (!uniqueMap[credit.user_id]) {
        uniqueMap[credit.user_id] = {
          user_id: credit.user_id,
          email: 'Desconhecido',
          name: 'Usuário',
          phone: null,
          latest_evaluation: null,
          evaluations: [],
          evaluation_count: 0,
          orders: [],
          credits: [],
          planRequests: [],
        }
      }
      uniqueMap[credit.user_id].credits.push(credit)
    })

    automationEvents.forEach(event => {
      const userId = event.user_id
      if (!userId) return
      if (!uniqueMap[userId]) {
        uniqueMap[userId] = {
          user_id: userId,
          email: event.user_email || 'Desconhecido',
          name: event.payload?.user?.name || event.user_email?.split('@')[0] || 'Usuário',
          phone: event.payload?.user?.phone || null,
          latest_evaluation: null,
          evaluations: [],
          evaluation_count: 0,
          orders: [],
          credits: [],
          planRequests: [],
        }
      }
      uniqueMap[userId].planRequests.push(event)
    })

    return Object.values(uniqueMap).map(item => {
      const userInfo = usersList.find(u => u.user_id === item.user_id)
      const availableCredits = item.credits.filter(credit => credit.status === 'available').length
      const consumedCredits = item.credits.filter(credit => credit.status === 'consumed').length
      const approvedOrders = item.orders.filter(order => order.status === 'approved').length

      return {
        ...item,
        email: userInfo?.email || 'Desconhecido',
        name: userInfo?.name || userInfo?.email?.split('@')[0] || 'Usuário',
        phone: userInfo?.phone || null,
        status: item.latest_evaluation?.status || (approvedOrders > 0 ? 'customer' : 'lead'),
        availableCredits,
        consumedCredits,
        approvedOrders,
      }
    })
  }

  const mergedUsers = getMergedUsers()
  const filteredUsers = mergedUsers.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage))
  const normalizedUserPage = Math.min(userPage, totalUserPages)
  const firstUserIndex = (normalizedUserPage - 1) * usersPerPage
  const paginatedUsers = filteredUsers.slice(firstUserIndex, firstUserIndex + usersPerPage)
  const visibleUserStart = filteredUsers.length === 0 ? 0 : firstUserIndex + 1
  const visibleUserEnd = Math.min(firstUserIndex + usersPerPage, filteredUsers.length)
  const approvedOrders = paymentOrders.filter(order => order.status === 'approved')
  const pendingOrders = paymentOrders.filter(order => !['approved', 'rejected', 'cancelled', 'failed', 'refunded', 'charged_back'].includes(order.status))
  const failedOrders = paymentOrders.filter(order => ['rejected', 'cancelled', 'failed'].includes(order.status))
  const grossRevenueCents = approvedOrders.reduce((sum, order) => sum + Number(order.amount_cents || 0), 0)
  const totalCreditsSold = approvedOrders.reduce((sum, order) => sum + Number(order.credits_purchased || order.quantity || 1), 0)
  const financeRows = paymentOrders.map(order => {
    const userInfo = mergedUsers.find(user => user.user_id === order.user_id)
    return {
      ...order,
      buyerName: userInfo?.name || order.user_email?.split('@')[0] || 'Cliente',
      buyerEmail: userInfo?.email || order.user_email || 'E-mail indisponível',
    }
  })
  const filteredFinanceRows = financeRows.filter(order => {
    const query = financeSearch.toLowerCase()
    const matchesSearch = !query
      || order.buyerName.toLowerCase().includes(query)
      || order.buyerEmail.toLowerCase().includes(query)
      || String(order.plan_name || '').toLowerCase().includes(query)
      || String(order.provider_payment_id || '').toLowerCase().includes(query)
    const matchesStatus = financeStatus === 'all' || order.status === financeStatus
    return matchesSearch && matchesStatus
  })
  const selectedUserEvaluations = selectedUser
    ? [...(selectedUser.evaluations || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : []
  const selectedEvaluation = selectedUserEvaluations.find(evaluation => evaluation.id === selectedAdminEvaluationId)
    || selectedUser?.latest_evaluation
    || selectedUserEvaluations[0]
    || null

  useEffect(() => {
    setUserPage(1)
  }, [searchQuery, usersPerPage])

  useEffect(() => {
    if (userPage > totalUserPages) {
      setUserPage(totalUserPages)
    }
  }, [userPage, totalUserPages])

  const resetPlanForm = () => {
    setPlanForm(emptyPlanForm)
    setEditingPlanId(null)
  }

  const handlePlanNameChange = (value) => {
    setPlanForm(prev => ({
      ...prev,
      name: value,
    }))
  }

  const completePlanNameFields = () => {
    setPlanForm(prev => ({
      ...prev,
      slug: editingPlanId ? (prev.slug || slugify(prev.name)) : slugify(prev.name),
      mercado_pago_title: prev.name.trim(),
    }))
  }

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id)
    setPlanMessage('')
    setPlanForm({
      name: plan.name || '',
      slug: plan.slug || '',
      description: plan.description || '',
      evaluation_credits: String(plan.evaluation_credits || 1),
      price: String(((plan.amount_cents || 0) / 100).toFixed(2)),
      mercado_pago_title: plan.mercado_pago_title || plan.name || '',
      sort_order: String(plan.sort_order || 1),
      is_active: plan.is_active !== false,
    })
  }

  const savePlan = async (event) => {
    event.preventDefault()
    setPlanSaving(true)
    setPlanMessage('')

    try {
      const amountCents = Math.round(Number(String(planForm.price).replace(',', '.')) * 100)
      const credits = Number(planForm.evaluation_credits)
      const sortOrder = Number(planForm.sort_order)
      const nextSortOrder = Math.max(0, ...plans.map(plan => Number(plan.sort_order) || 0)) + 1
      const slug = slugify(planForm.slug || planForm.name)

      if (!planForm.name.trim()) throw new Error('Informe o nome do plano.')
      if (!slug) throw new Error('Informe um slug válido.')
      if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error('Informe um preço válido.')
      if (!Number.isFinite(credits) || credits <= 0) throw new Error('Informe a quantidade de avaliações.')

      const payload = {
        name: planForm.name.trim(),
        slug,
        description: planForm.description.trim() || null,
        evaluation_credits: credits,
        amount_cents: amountCents,
        currency: 'BRL',
        mercado_pago_title: planForm.mercado_pago_title.trim() || planForm.name.trim(),
        sort_order: editingPlanId && Number.isFinite(sortOrder) ? sortOrder : nextSortOrder,
        is_active: planForm.is_active,
      }

      if (editingPlanId) {
        const { data, error } = await supabase
          .from('plans')
          .update(payload)
          .eq('id', editingPlanId)
          .select()
          .single()

        if (error) throw error
        setPlans(prev => prev.map(plan => (plan.id === editingPlanId ? data : plan)))
        setPlanMessage('Plano atualizado com sucesso.')
      } else {
        const { data, error } = await supabase
          .from('plans')
          .insert(payload)
          .select()
          .single()

        if (error) throw error
        setPlans(prev => [...prev, data].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
        setPlanMessage('Plano criado com sucesso.')
      }

      resetPlanForm()
    } catch (error) {
      console.error('Erro ao salvar plano:', error)
      setPlanMessage(getPlanErrorMessage(error))
    } finally {
      setPlanSaving(false)
    }
  }

  const togglePlanStatus = async (plan) => {
    setPlanMessage('')
    try {
      const { data, error } = await supabase
        .from('plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)
        .select()
        .single()

      if (error) throw error
      setPlans(prev => prev.map(item => (item.id === plan.id ? data : item)))
      setPlanMessage(data.is_active ? 'Plano ativado.' : 'Plano pausado.')
    } catch (error) {
      console.error('Erro ao alterar status do plano:', error)
      setPlanMessage(getPlanErrorMessage(error))
    }
  }

  const renderHabitsTab = (evaluation) => {
    if (!evaluation) return (
      <p className="text-slate-500 text-sm mt-4">Nenhuma avaliação registrada para este usuário.</p>
    )
    
    const sat = evaluation.solution_satisfaction || {}
    const time = evaluation.solution_time_relation || {}
    const speed = evaluation.solution_internal_speed || {}
    
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Índice de Satisfação</h4>
            <div className="space-y-3">
              {Object.entries(sat).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="capitalize text-slate-600">{k}</span>
                  <span className="font-bold text-primary">{v * 10}%</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Relação com o Tempo</h4>
            <div className="space-y-3">
              {Object.entries(time).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="capitalize text-slate-600 truncate mr-2" title={k}>{k.replace('_', ' ')}</span>
                  <span className="font-bold text-amber-500">{v}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-4 border-b pb-2">Velocidade Interna</h4>
            <div className="space-y-3">
              {Object.entries(speed).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="capitalize text-slate-600 truncate mr-2" title={k}>{k.replace('_', ' ')}</span>
                  <span className="font-bold text-blue-500">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDiagnosisTab = (evaluation, userDetails) => {
    if (!evaluation) return (
      <p className="text-slate-500 text-sm mt-4">Nenhum diagnóstico registrado para este usuário.</p>
    )
    const scores = evaluation.scores || {}
    const plans = evaluation.top_fatigue_solution || {}
    const fatigueKeys = [...new Set([...Object.keys(scores), ...Object.keys(plans)])].sort((a, b) => sortFatigueEntries([a], [b]))
    const completedExercises = fatigueKeys.filter(category => getExerciseAdminStatus(category, plans[category]).missingFields.length === 0).length
    const planRequested = (userDetails?.planRequests || []).length > 0
    
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h4 className="font-bold text-slate-800">7 Cansaços e exercícios práticos</h4>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Diagnóstico e andamento real dos exercícios relacionados a cada cansaço.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {completedExercises}/{fatigueKeys.length || 7} exercícios concluídos
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${planRequested ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                Plano personalizado: {planRequested ? 'solicitado' : 'não solicitado'}
              </span>
            </div>
          </div>

          {fatigueKeys.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum score ou exercício registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {fatigueKeys.map(category => {
                const score = scores[category]
                const exerciseData = plans[category]
                const status = getExerciseAdminStatus(category, exerciseData)
                const StatusIcon = status.Icon

                return (
                  <div key={category} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h5 className="font-black text-slate-800">{FATIGUE_LABELS[category] || `Cansaço ${category}`}</h5>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${status.className}`}>
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-500">{status.detail}</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Plano personalizado: {planRequested ? 'solicitado pelo usuário' : 'não solicitado pelo usuário'}.
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score</p>
                          <p className="text-2xl font-black text-brand-pink">{score ?? '-'}</p>
                        </div>
                      </div>
                    </div>

                    {exerciseData?.actionPlan && (
                      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
                        {exerciseData.actionPlan.action && (
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ação</p>
                            <p className="text-sm font-bold text-slate-700">{exerciseData.actionPlan.action}</p>
                          </div>
                        )}
                        {exerciseData.actionPlan.when && (
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quando</p>
                            <p className="text-sm font-bold text-slate-700">{exerciseData.actionPlan.when}</p>
                          </div>
                        )}
                        {exerciseData.actionPlan.duration && (
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duração</p>
                            <p className="text-sm font-bold text-slate-700">{exerciseData.actionPlan.duration}</p>
                          </div>
                        )}
                        {exerciseData.actionPlan.metric && (
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Métrica (1-10)</p>
                            <p className="text-sm font-bold text-slate-700">{exerciseData.actionPlan.metric}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderPaymentsTab = (userDetails) => {
    if (!userDetails) return null

    const orders = userDetails.orders || []
    const credits = userDetails.credits || []

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Créditos disponíveis</p>
            <p className="text-3xl font-black text-emerald-600">{userDetails.availableCredits || 0}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Créditos usados</p>
            <p className="text-3xl font-black text-slate-800">{userDetails.consumedCredits || 0}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pedidos aprovados</p>
            <p className="text-3xl font-black text-brand-pink">{userDetails.approvedOrders || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
            <ShoppingBag size={18} className="text-primary" /> Pedidos
          </h4>

          {orders.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum pedido registrado para este usuário.</p>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const status = getPaymentStatus(order.status)
                const StatusIcon = status.Icon

                return (
                  <div key={order.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-black text-slate-800">{order.plan_name || 'Plano'}</span>
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${status.className}`}>
                          <StatusIcon size={12} />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">
                        {formatDateTime(order.created_at)} · {order.credits_purchased || 1} crédito{(order.credits_purchased || 1) === 1 ? '' : 's'}
                      </p>
                      {order.provider_payment_id && (
                        <p className="text-[11px] font-bold text-slate-400 mt-1">MP: {order.provider_payment_id}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-primary">{formatMoney(order.amount_cents, order.currency)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
            <WalletCards size={18} className="text-primary" /> Créditos
          </h4>

          {credits.length === 0 ? (
            <p className="text-slate-500 text-sm">Nenhum crédito registrado para este usuário.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {credits.map(credit => {
                const status = getCreditStatus(credit.status)
                return (
                  <div key={credit.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-xs font-black text-slate-700">Crédito {credit.source_credit_index || 1}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500">Criado em {formatDateTime(credit.created_at)}</p>
                    {credit.consumed_at && (
                      <p className="text-xs font-bold text-slate-500 mt-1">Usado em {formatDateTime(credit.consumed_at)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderDashboardHome = () => {
    const activeCustomers = mergedUsers.filter(user => user.approvedOrders > 0).length
    const recentOrders = financeRows.slice(0, 6)
    const planSales = approvedOrders.reduce((acc, order) => {
      const key = order.plan_name || 'Plano sem nome'
      if (!acc[key]) {
        acc[key] = {
          name: key,
          count: 0,
          revenue: 0,
          credits: 0,
        }
      }
      acc[key].count += 1
      acc[key].revenue += Number(order.amount_cents || 0)
      acc[key].credits += Number(order.credits_purchased || order.quantity || 1)
      return acc
    }, {})
    const topPlans = Object.values(planSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    return (
      <div className="bg-slate-50/70 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Receita aprovada</p>
              <p className="text-3xl font-black text-slate-800">{formatMoney(grossRevenueCents)}</p>
              <p className="text-xs font-bold text-emerald-600 mt-2">{approvedOrders.length} venda{approvedOrders.length === 1 ? '' : 's'} aprovada{approvedOrders.length === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Clientes compradores</p>
              <p className="text-3xl font-black text-slate-800">{activeCustomers}</p>
              <p className="text-xs font-bold text-slate-500 mt-2">Usuários com ao menos 1 compra aprovada</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Créditos vendidos</p>
              <p className="text-3xl font-black text-brand-pink">{totalCreditsSold}</p>
              <p className="text-xs font-bold text-slate-500 mt-2">Total liberado por vendas aprovadas</p>
            </div>
            <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pedidos pendentes</p>
              <p className="text-3xl font-black text-amber-500">{pendingOrders.length}</p>
              <p className="text-xs font-bold text-rose-500 mt-2">{failedOrders.length} não concluído{failedOrders.length === 1 ? '' : 's'}</p>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-2 rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Planos mais vendidos</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Ranking por receita aprovada.</p>
                </div>
                <TrendingUp className="text-brand-pink" size={22} />
              </div>

              {topPlans.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-500">Nenhuma venda aprovada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {topPlans.map(plan => (
                    <div key={plan.name} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-800">{plan.name}</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">{plan.count} venda{plan.count === 1 ? '' : 's'} · {plan.credits} crédito{plan.credits === 1 ? '' : 's'}</p>
                        </div>
                        <span className="text-sm font-black text-primary whitespace-nowrap">{formatMoney(plan.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="xl:col-span-3 rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Últimas transações</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Compras recentes registradas no sistema.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdminView('finance')}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-black"
                >
                  Ver financeiro
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-500">Nenhuma transação registrada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map(order => {
                    const status = getPaymentStatus(order.status)
                    const StatusIcon = status.Icon
                    return (
                      <div key={order.id} className="rounded-xl bg-slate-50 border border-slate-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 truncate">{order.buyerName}</p>
                          <p className="text-xs font-bold text-slate-500 truncate">{order.plan_name || 'Plano'} · {order.buyerEmail}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${status.className}`}>
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                          <span className="text-sm font-black text-primary">{formatMoney(order.amount_cents, order.currency)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    )
  }

  const renderFinanceManager = () => (
    <div className="bg-slate-50/70 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Receita aprovada</p>
            <p className="text-3xl font-black text-slate-800">{formatMoney(grossRevenueCents)}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vendas aprovadas</p>
            <p className="text-3xl font-black text-emerald-600">{approvedOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pendentes</p>
            <p className="text-3xl font-black text-amber-500">{pendingOrders.length}</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Créditos vendidos</p>
            <p className="text-3xl font-black text-brand-pink">{totalCreditsSold}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-800">Financeiro e vendas</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">Quem comprou, o que comprou e o status de cada transação.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={financeSearch}
                    onChange={event => setFinanceSearch(event.target.value)}
                    placeholder="Buscar comprador, plano ou ID..."
                    className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-pink"
                  />
                </div>
                <label className="relative">
                  <Filter size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={financeStatus}
                    onChange={event => setFinanceStatus(event.target.value)}
                    className="w-full sm:w-48 appearance-none bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-brand-pink"
                  >
                    <option value="all">Todos os status</option>
                    <option value="approved">Aprovados</option>
                    <option value="pending">Pendentes</option>
                    <option value="rejected">Rejeitados</option>
                    <option value="cancelled">Cancelados</option>
                    <option value="failed">Falhos</option>
                    <option value="refunded">Estornados</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {filteredFinanceRows.length === 0 ? (
            <p className="p-10 text-center text-sm font-bold text-slate-500">Nenhuma venda encontrada com os filtros atuais.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Comprador</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Plano</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mercado Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFinanceRows.map(order => {
                    const status = getPaymentStatus(order.status)
                    const StatusIcon = status.Icon
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-800">{order.buyerName}</p>
                          <p className="text-xs font-bold text-slate-500">{order.buyerEmail}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-700">{order.plan_name || 'Plano'}</p>
                          <p className="text-xs font-bold text-slate-400">{order.credits_purchased || 1} crédito{(order.credits_purchased || 1) === 1 ? '' : 's'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${status.className}`}>
                            <StatusIcon size={12} />
                            {status.label}
                          </span>
                          {order.provider_status_detail && (
                            <p className="text-[11px] font-bold text-slate-400 mt-1">{order.provider_status_detail}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 font-black text-primary">{formatMoney(order.amount_cents, order.currency)}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-500">{formatDateTime(order.created_at)}</td>
                        <td className="px-6 py-4">
                          <p className="max-w-[170px] truncate text-xs font-bold text-slate-500" title={order.provider_payment_id || order.external_reference || ''}>
                            {order.provider_payment_id || order.external_reference || '-'}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )

  const renderPlansManager = () => (
    <div className="bg-slate-50/70 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-5 gap-6">
        <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-xl font-black text-slate-800 mb-2">
            {editingPlanId ? 'Editar plano' : 'Novo plano'}
          </h3>
          <p className="text-sm font-medium text-slate-500 mb-6">
            Defina quantas autoavaliações serão liberadas e o valor cobrado no checkout.
          </p>

          {planMessage && (
            <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600">
              {planMessage}
            </div>
          )}

          <form onSubmit={savePlan} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Nome</label>
              <input
                value={planForm.name}
                onChange={event => handlePlanNameChange(event.target.value)}
                onBlur={completePlanNameFields}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-pink"
                placeholder="Ex: Avaliação individual"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Descrição</label>
              <textarea
                value={planForm.description}
                onChange={event => setPlanForm(prev => ({ ...prev, description: event.target.value }))}
                className="w-full min-h-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-pink resize-none"
                placeholder="Texto curto exibido para a cliente."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Avaliações</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={planForm.evaluation_credits}
                  onChange={event => setPlanForm(prev => ({ ...prev, evaluation_credits: event.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-pink"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Preço R$</label>
                <input
                  value={planForm.price}
                  onChange={event => setPlanForm(prev => ({ ...prev, price: event.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-brand-pink"
                  placeholder="97,00"
                />
              </div>
            </div>

            <label className="flex items-center justify-between gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 cursor-pointer">
              <span className="text-sm font-black text-slate-700">Plano ativo e visível para compra</span>
              <input
                type="checkbox"
                checked={planForm.is_active}
                onChange={event => setPlanForm(prev => ({ ...prev, is_active: event.target.checked }))}
                className="sr-only peer"
              />
              <span className="relative h-7 w-12 rounded-full bg-slate-300 transition-colors duration-200 peer-checked:bg-brand-pink peer-focus-visible:ring-2 peer-focus-visible:ring-brand-pink/40">
                <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5"></span>
              </span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="submit"
                disabled={planSaving}
                className="flex-1 bg-brand-pink hover:bg-[#d84e80] text-white font-black py-3 rounded-xl transition-transform active:scale-95 disabled:opacity-60"
              >
                {planSaving ? 'Salvando...' : editingPlanId ? 'Salvar alterações' : 'Criar plano'}
              </button>
              {editingPlanId && (
                <button
                  type="button"
                  onClick={resetPlanForm}
                  className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-black hover:bg-slate-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="xl:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-800">Planos cadastrados</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Os planos ativos aparecem na página Meus créditos.</p>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-bold text-slate-500">
              Nenhum plano cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(plan => (
                <div key={plan.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-black text-slate-800">{plan.name}</h4>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${plan.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {plan.is_active ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {plan.evaluation_credits} avaliação{plan.evaluation_credits === 1 ? '' : 'ões'} liberada{plan.evaluation_credits === 1 ? '' : 's'} · {formatMoney(plan.amount_cents, plan.currency)}
                    </p>
                    {plan.description && (
                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{plan.description}</p>
                    )}
                  </div>

                  <div className="grid w-full shrink-0 grid-cols-2 items-center gap-1.5 lg:w-auto lg:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleEditPlan(plan)}
                      className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition-colors hover:border-brand-pink hover:text-brand-pink"
                    >
                      <Pencil size={13} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlanStatus(plan)}
                      className="inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition-colors hover:border-primary hover:text-primary"
                    >
                      {plan.is_active ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
                      {plan.is_active ? 'Pausar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row lg:h-[100dvh] lg:overflow-hidden bg-background-light items-center justify-center w-full">
        <Sidebar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-light text-slate-900 min-h-screen font-display flex flex-col lg:flex-row lg:h-[100dvh] lg:overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto lg:h-[100dvh] w-full relative">
        {/* Header */}
        <header className="flex justify-between items-center p-8 lg:p-12 pb-6 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Users className="text-brand-pink" size={32} />
              Painel Administrativo
            </h2>
            <p className="text-slate-500 font-medium mt-1">Gerencie e visualize as respostas dos usuários.</p>
            {usersList.length > 0 && usersList[0].user_id === '123' && (
              <p className="text-red-500 font-bold mt-2 text-xs">Erro SQL: {usersList[0].name}</p>
            )}
          </div>
        </header>

        <div className="bg-white border-b border-slate-200 px-8 lg:px-12 py-4 grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Usuários</p>
            <p className="text-2xl font-black text-slate-800">{mergedUsers.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Avaliações</p>
            <p className="text-2xl font-black text-slate-800">{evaluations.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pedidos aprovados</p>
            <p className="text-2xl font-black text-emerald-600">{paymentOrders.filter(order => order.status === 'approved').length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Créditos disp.</p>
            <p className="text-2xl font-black text-brand-pink">{evaluationCredits.filter(credit => credit.status === 'available').length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Planos ativos</p>
            <p className="text-2xl font-black text-primary">{plans.filter(plan => plan.is_active).length}</p>
          </div>
        </div>

        <div className="bg-white border-b border-slate-200 px-8 lg:px-12 py-3 shrink-0">
          <div className="inline-flex max-w-full overflow-x-auto rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAdminView('dashboard')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                adminView === 'dashboard'
                  ? 'bg-white text-brand-pink shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
            <button
              type="button"
              onClick={() => setAdminView('users')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                adminView === 'users'
                  ? 'bg-white text-brand-pink shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users size={16} /> Usuários
            </button>
            <button
              type="button"
              onClick={() => setAdminView('plans')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                adminView === 'plans'
                  ? 'bg-white text-brand-pink shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <WalletCards size={16} /> Planos
            </button>
            <button
              type="button"
              onClick={() => setAdminView('finance')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                adminView === 'finance'
                  ? 'bg-white text-brand-pink shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard size={16} /> Financeiro
            </button>
          </div>
        </div>

        {adminView === 'dashboard' ? renderDashboardHome() : adminView === 'plans' ? renderPlansManager() : adminView === 'finance' ? renderFinanceManager() : (
        <div className="flex flex-col md:flex-row bg-slate-50/50">
          {/* Left Panel: User List */}
          <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 md:min-w-[300px] md:max-w-[400px] border-r border-slate-200 bg-white flex-col shrink-0`}>
            <div className="p-6 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar usuário..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-brand-pink/50 focus:border-brand-pink outline-none py-3 pl-11 pr-4 transition-all"
                />
              </div>
            </div>
            
            <div className="p-4 space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-slate-400 mt-10 text-sm">Nenhum usuário encontrado.</p>
              ) : (
                paginatedUsers.map(u => (
                  <button
                    key={u.user_id}
                    onClick={() => {
                      setSelectedUser(u)
                      setSelectedAdminEvaluationId(u.latest_evaluation?.id || u.evaluations?.[0]?.id || null)
                    }}
                    className={`w-full text-left p-4 rounded-xl transition-all flex items-start gap-3 border ${
                      selectedUser?.user_id === u.user_id 
                        ? 'bg-brand-pink/5 border-brand-pink shadow-sm' 
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-bold text-slate-800 truncate">{u.name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full inline-block mt-2 ${
                        u.status === 'completed' || u.status === 'completed_deep' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {u.status === 'completed' || u.status === 'completed_deep' ? 'Finalizado' : u.status === 'customer' ? 'Cliente' : 'Rascunho'}
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-bold text-slate-400">
                        <span>{u.evaluation_count} aval.</span>
                        <span>{u.approvedOrders} compra{u.approvedOrders === 1 ? '' : 's'}</span>
                        <span>{u.availableCredits} crédito{u.availableCredits === 1 ? '' : 's'}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="px-4 pb-5 pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-slate-500">
                <span>{visibleUserStart}-{visibleUserEnd} de {filteredUsers.length}</span>
                <label className="flex items-center gap-2">
                  <span>Ver</span>
                  <select
                    value={usersPerPage}
                    onChange={event => setUsersPerPage(Number(event.target.value))}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-black outline-none focus:border-brand-pink"
                  >
                    {USER_PAGE_SIZE_OPTIONS.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={normalizedUserPage <= 1}
                  onClick={() => setUserPage(prev => Math.max(1, prev - 1))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-pink hover:text-brand-pink"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={normalizedUserPage >= totalUserPages}
                  onClick={() => setUserPage(prev => Math.min(totalUserPages, prev + 1))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-brand-pink hover:text-brand-pink"
                >
                  Próxima
                </button>
              </div>
              <p className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                Página {normalizedUserPage} de {totalUserPages}
              </p>
            </div>
          </div>
          
          {/* Right Panel: User Details */}
          <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-1 bg-slate-50/50 flex-col`}>
            {selectedUser ? (
              <div className="flex flex-col min-h-full">
                {/* User Header */}
                <div className="p-4 md:p-8 bg-white border-b border-slate-200 shrink-0">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedUser(null)} 
                      className="md:hidden p-2 -ml-2 text-slate-500 hover:text-brand-pink"
                    >
                      <ArrowLeft size={24} />
                    </button>
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shrink-0">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-slate-800">{selectedUser.name}</h3>
                      <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mt-1">
                        <p className="text-slate-500 flex items-center gap-2 text-sm md:text-base">
                          <Mail size={14} /> {selectedUser.email}
                        </p>
                        {selectedUser.phone && (
                          <p className="text-slate-500 flex items-center gap-2 text-sm md:text-base">
                            <Phone size={14} /> {selectedUser.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedUserEvaluations.length > 0 && (
                    <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Histórico de avaliações</p>
                          <p className="text-sm font-bold text-slate-600 mt-1">Escolha qual avaliação deseja consultar.</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {selectedUserEvaluations.length} registro{selectedUserEvaluations.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedUserEvaluations.map(evaluation => (
                          <button
                            key={evaluation.id}
                            type="button"
                            onClick={() => setSelectedAdminEvaluationId(evaluation.id)}
                            className={`shrink-0 rounded-xl border px-4 py-3 text-left transition-all ${
                              selectedEvaluation?.id === evaluation.id
                                ? 'border-brand-pink bg-white shadow-sm'
                                : 'border-slate-200 bg-white/70 hover:border-slate-300'
                            }`}
                          >
                            <p className="text-xs font-black text-slate-800">{formatDateTime(evaluation.created_at)}</p>
                            <p className={`mt-1 text-[10px] font-black uppercase tracking-widest ${evaluation.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {evaluation.status === 'completed' ? 'Finalizada' : 'Em andamento'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Tabs */}
                  <div className="flex gap-4 md:gap-6 mt-6 md:mt-8 border-b border-slate-200 overflow-x-auto no-scrollbar whitespace-nowrap">
                    <button 
                      onClick={() => setActiveTab('habits')}
                      className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'habits' ? 'text-brand-pink' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <Activity size={16} className="inline mr-2" /> Hábitos & Comportamentos
                      {activeTab === 'habits' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-pink rounded-t-full"></div>}
                    </button>
                    <button 
                      onClick={() => setActiveTab('diagnosis')}
                      className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'diagnosis' ? 'text-brand-pink' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <Activity size={16} className="inline mr-2" /> 7 Cansaços e Exercícios
                      {activeTab === 'diagnosis' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-pink rounded-t-full"></div>}
                    </button>
                    <button
                      onClick={() => setActiveTab('responses')}
                      className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'responses' ? 'text-brand-pink' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <FileText size={16} className="inline mr-2" /> Respostas
                      {activeTab === 'responses' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-pink rounded-t-full"></div>}
                    </button>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'payments' ? 'text-brand-pink' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <CreditCard size={16} className="inline mr-2" /> Pagamentos & Créditos
                      {activeTab === 'payments' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-pink rounded-t-full"></div>}
                    </button>
                  </div>
                </div>
                
                {/* Tab Content */}
                <div className="p-8">
                  {activeTab === 'habits' && renderHabitsTab(selectedEvaluation)}
                  {activeTab === 'diagnosis' && renderDiagnosisTab(selectedEvaluation, selectedUser)}
                  {activeTab === 'responses' && (
                    <div className="space-y-4 animate-fade-in">
                      <div>
                        <h4 className="text-xl font-black text-slate-800">Respostas e compromissos</h4>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Dados preenchidos na avaliação selecionada, incluindo planos, metas e exercícios.
                        </p>
                      </div>
                      <EvaluationResponseSummary evaluation={selectedEvaluation} />
                    </div>
                  )}
                  {activeTab === 'payments' && renderPaymentsTab(selectedUser)}
                </div>
              </div>
            ) : (
              <div className="min-h-[520px] flex flex-col items-center justify-center text-center p-12">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm mb-6">
                  <User size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-700 mb-2">Nenhum usuário selecionado</h3>
                <p className="text-slate-500 max-w-sm">Selecione um usuário na lista à esquerda para visualizar suas respostas e histórico de avaliações.</p>
              </div>
            )}
          </div>
        </div>
        )}
      </main>
    </div>
  )
}
