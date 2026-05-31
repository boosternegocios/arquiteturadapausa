import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/Input'
import { Button } from '../components/Button'

export const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      return setError('As senhas não coincidem.')
    }
    
    setIsLoading(true)

    try {
      const { data, error } = await signUp(email, password, { full_name: name, phone: phone })
      if (error) throw error
      
      // If there is no session, it means email confirmation is required
      if (!data?.session) {
        setIsSuccess(true)
      }
      // If session exists, email confirmation is off, and AuthRoute will redirect automatically
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Erro desconhecido ao criar conta.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"/></svg>
        </div>
        <div style={{ color: 'var(--text-primary)' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Quase lá, {name.split(' ')[0]}!</h2>
          <p style={{ lineHeight: '1.6', fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Criamos sua conta. Porém, para a sua segurança, precisamos que você <strong>verifique a sua caixa de entrada</strong> ({email}) e clique no link de confirmação.
          </p>
        </div>
        <Button onClick={() => navigate('/login')} variant="secondary" fullWidth style={{ marginTop: '1rem' }}>
          JÁ CONFIRMEI O E-MAIL
        </Button>
      </div>
    )
  }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', backgroundColor: 'var(--error-bg)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>{error}</div>}
        
        <Input 
          label="NOME COMPLETO" 
          type="text" 
          placeholder="Seu nome" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input 
          label="E-MAIL" 
          type="email" 
          placeholder="seu@email.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input 
          label="TELEFONE" 
          type="tel" 
          placeholder="(11) 99999-9999" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        
        <div>
          <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.375rem', display: 'block' }}>SENHA</label>
          <div style={{ position: 'relative' }}>
            <Input 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '2.5rem' }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.375rem', display: 'block' }}>CONFIRMAR SENHA</label>
          <Input 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" variant="secondary" fullWidth disabled={isLoading} style={{ marginTop: '0.5rem', padding: '1rem', fontWeight: 800 }}>
          {isLoading ? 'CADASTRANDO...' : 'CRIAR CONTA'}
        </Button>
      </form>
      
      <p className="auth-footer-terms" style={{ marginTop: '2rem' }}>
        Ao continuar, você concorda com nossos<br/>
        <a href="#">Termos de Uso</a> e <a href="#">Privacidade</a>.
      </p>
    </>
  )
}
