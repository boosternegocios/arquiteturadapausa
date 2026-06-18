import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { useAuth } from '../contexts/AuthContext'
import { Send, CheckCircle } from 'lucide-react'

export const Contact = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    nome: '',
    email: user?.email || '',
    telefone: '',
    mensagem: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simula o envio
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
    }, 1500)
  }

  return (
    <div className="bg-[#fcfaf5] text-slate-900 h-[100dvh] font-display flex flex-col lg:flex-row overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-20 relative w-full">
        <div className="max-w-2xl mx-auto w-full relative z-10 animate-in fade-in slide-in-from-bottom-10">
          
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter mb-4 font-display">
              Plano de Ação Personalizado
            </h1>
            <p className="text-lg text-slate-600 font-medium">
              Você concluiu sua reflexão! Preencha o formulário abaixo para solicitar um plano de ação personalizado focado na sua jornada de recuperação.
            </p>
          </div>

          {isSuccess ? (
            <div className="bg-[#1ed7a4]/10 border border-[#1ed7a4]/30 rounded-3xl p-10 text-center animate-in zoom-in-95">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1ed7a4] text-[#004b4c] rounded-full mb-6 shadow-lg shadow-[#1ed7a4]/30">
                <CheckCircle size={32} strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-3">Solicitação Enviada!</h2>
              <p className="text-slate-600 mb-8">
                Em breve nossa equipe entrará em contato com você para apresentar seu plano de ação personalizado.
              </p>
              <button
                onClick={() => navigate('/intro')}
                className="bg-[#004b4c] text-[#1ed7a4] hover:bg-[#003b3c] px-8 py-4 rounded-xl font-bold uppercase tracking-widest transition-all shadow-lg hover:-translate-y-1"
              >
                Voltar para o Início
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest pl-4">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({...prev, nome: e.target.value}))}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#eb6496] focus:ring-4 focus:ring-[#eb6496]/10 transition-all shadow-sm"
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest pl-4">E-mail</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#eb6496] focus:ring-4 focus:ring-[#eb6496]/10 transition-all shadow-sm"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest pl-4">Telefone / WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({...prev, telefone: e.target.value}))}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#eb6496] focus:ring-4 focus:ring-[#eb6496]/10 transition-all shadow-sm"
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-widest pl-4">Mensagem (Opcional)</label>
                <textarea
                  value={formData.mensagem}
                  onChange={(e) => setFormData(prev => ({...prev, mensagem: e.target.value}))}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#eb6496] focus:ring-4 focus:ring-[#eb6496]/10 transition-all shadow-sm min-h-[120px] resize-y"
                  placeholder="Conte-nos um pouco sobre seu principal desafio hoje..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#eb6496] text-white hover:bg-[#d55584] disabled:opacity-70 disabled:hover:bg-[#eb6496] px-8 py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-[#eb6496]/30 hover:-translate-y-1 flex items-center justify-center gap-3 text-lg mt-4"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>Solicitar Plano de Ação <Send size={20} strokeWidth={3} /></>
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
