import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  Search, 
  User, 
  Mail, 
  Activity, 
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
  Phone,
  ArrowLeft
} from 'lucide-react'
import { 
  Radar as RechartsRadar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer 
} from 'recharts'

export const AdminDashboard = () => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  
  const [usersList, setUsersList] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('habits') // habits, diagnosis, action_plan

  useEffect(() => {
    if (isAdmin === false) {
      navigate('/')
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

  // Get unique users who have evaluations
  const getUniqueUsersWithEvaluations = () => {
    const uniqueMap = {}
    
    // Process evaluations first to get the latest per user
    evaluations.forEach(ev => {
      if (!uniqueMap[ev.user_id]) {
        uniqueMap[ev.user_id] = {
          user_id: ev.user_id,
          latest_evaluation: ev,
          evaluation_count: 1
        }
      } else {
        uniqueMap[ev.user_id].evaluation_count += 1
      }
    })
    
    // Merge with user details from RPC
    return Object.values(uniqueMap).map(item => {
      const userInfo = usersList.find(u => u.user_id === item.user_id)
      return {
        ...item,
        email: userInfo?.email || 'Desconhecido',
        name: userInfo?.name || userInfo?.email?.split('@')[0] || 'Usuário',
        phone: userInfo?.phone || null,
        status: item.latest_evaluation.status
      }
    })
  }

  const mergedUsers = getUniqueUsersWithEvaluations()
  const filteredUsers = mergedUsers.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderHabitsTab = (evaluation) => {
    if (!evaluation) return null
    
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
    if (!evaluation) return null
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

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row lg:lg:h-[100dvh] lg:lg:overflow-hidden bg-background-light items-center justify-center w-full">
        <Sidebar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background-light text-slate-900 min-h-screen font-display flex flex-col lg:flex-row lg:lg:h-[100dvh] lg:lg:overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-y-auto lg:overflow-y-auto lg:h-[100dvh] w-full lg:lg:overflow-hidden relative">
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

        <div className="flex-1 flex overflow-hidden">
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
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-slate-400 mt-10 text-sm">Nenhum usuário encontrado.</p>
              ) : (
                filteredUsers.map(u => (
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
                        {u.status === 'completed' || u.status === 'completed_deep' ? 'Finalizado' : 'Rascunho'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          
          {/* Right Panel: User Details */}
          <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-1 bg-slate-50/50 flex-col overflow-hidden`}>
            {selectedUser ? (
              <div className="flex-1 flex flex-col overflow-hidden">
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
                  </div>
                </div>
                
                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  {activeTab === 'habits' && renderHabitsTab(selectedUser.latest_evaluation)}
                  {activeTab === 'diagnosis' && renderDiagnosisTab(selectedUser.latest_evaluation)}
                  {activeTab === 'action_plan' && renderActionPlanTab(selectedUser.latest_evaluation)}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm mb-6">
                  <User size={40} />
                </div>
                <h3 className="text-2xl font-bold text-slate-700 mb-2">Nenhum usuário selecionado</h3>
                <p className="text-slate-500 max-w-sm">Selecione um usuário na lista à esquerda para visualizar suas respostas e histórico de avaliações.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
