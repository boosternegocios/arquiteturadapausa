import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PATHS } from '../lib/journey'
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
  Clock3,
  XCircle,
  Pencil,
  PauseCircle,
  PlayCircle
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
  const [plans, setPlans] = useState([])
  const [adminView, setAdminView] = useState('users')
  const [planForm, setPlanForm] = useState(emptyPlanForm)
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [planSaving, setPlanSaving] = useState(false)
  const [planMessage, setPlanMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [usersPerPage, setUsersPerPage] = useState(10)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('habits') // habits, diagnosis, action_plan, payments

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
        evaluation_count: 0,
        orders: [],
        credits: [],
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
          evaluation_count: 1,
          orders: [],
          credits: [],
        }
      } else {
        if (!uniqueMap[ev.user_id].latest_evaluation) {
          uniqueMap[ev.user_id].latest_evaluation = ev
        }
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
          evaluation_count: 0,
          orders: [],
          credits: [],
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
          evaluation_count: 0,
          orders: [],
          credits: [],
        }
      }
      uniqueMap[credit.user_id].credits.push(credit)
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

  const renderDiagnosisTab = (evaluation) => {
    if (!evaluation) return (
      <p className="text-slate-500 text-sm mt-4">Nenhum diagnóstico registrado para este usuário.</p>
    )
    const scores = evaluation.scores || {}
    
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h4 className="font-bold text-slate-800 mb-6 border-b pb-2">Scores dos 7 Cansaços</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(scores).map(([k, v]) => (
              <div key={k} className="bg-slate-50 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{k}</p>
                <p className="text-3xl font-black text-brand-pink">{v}</p>
              </div>
            ))}
            {Object.keys(scores).length === 0 && (
              <p className="text-slate-500 col-span-4 text-sm">Nenhum score registrado ainda.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderActionPlanTab = (evaluation) => {
    if (!evaluation || !evaluation.top_fatigue_solution) return (
      <p className="text-slate-500 text-sm mt-4">Nenhum exercício prático registrado.</p>
    )
    
    const plans = evaluation.top_fatigue_solution
    
    return (
      <div className="space-y-6 animate-fade-in">
        {Object.entries(plans).map(([category, data]) => (
          <div key={category} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-lg text-slate-800 mb-4 capitalize flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-500" /> Cansaço {category}
              {data.isCompleted && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase ml-2">Concluído</span>}
            </h4>
            
            {data.actionPlan ? (
              <div className="space-y-4">
                {data.actionPlan.action && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ação</p>
                    <p className="text-slate-700">{data.actionPlan.action}</p>
                  </div>
                )}
                {data.actionPlan.when && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quando</p>
                    <p className="text-slate-700">{data.actionPlan.when}</p>
                  </div>
                )}
                {data.actionPlan.duration && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duração</p>
                    <p className="text-slate-700">{data.actionPlan.duration}</p>
                  </div>
                )}
                {data.actionPlan.metric && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Métrica (1-10)</p>
                    <p className="text-slate-700">{data.actionPlan.metric}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Apenas selecionado, sem plano preenchido.</p>
            )}
          </div>
        ))}
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
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setAdminView('users')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
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
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
                adminView === 'plans'
                  ? 'bg-white text-brand-pink shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <WalletCards size={16} /> Planos
            </button>
          </div>
        </div>

        {adminView === 'plans' ? renderPlansManager() : (
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
                    onClick={() => setSelectedUser(u)}
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
                      <Activity size={16} className="inline mr-2" /> 7 Cansaços
                      {activeTab === 'diagnosis' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-pink rounded-t-full"></div>}
                    </button>
                    <button 
                      onClick={() => setActiveTab('action_plan')}
                      className={`pb-3 font-bold text-sm transition-colors relative ${activeTab === 'action_plan' ? 'text-brand-pink' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      <CheckCircle size={16} className="inline mr-2" /> Exercícios Práticos
                      {activeTab === 'action_plan' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-pink rounded-t-full"></div>}
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
                  {activeTab === 'habits' && renderHabitsTab(selectedUser.latest_evaluation)}
                  {activeTab === 'diagnosis' && renderDiagnosisTab(selectedUser.latest_evaluation)}
                  {activeTab === 'action_plan' && renderActionPlanTab(selectedUser.latest_evaluation)}
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
