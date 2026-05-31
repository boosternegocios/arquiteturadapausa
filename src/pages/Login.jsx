import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/Input'
import { Button } from '../components/Button'

export const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepConnected, setKeepConnected] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { error } = await signIn(email, password)
      if (error) throw error
      navigate('/')
    } catch (err) {
      if (err?.message?.includes('Email not confirmed')) {
        setError('Por favor, verifique a sua caixa de e-mail e clique no link de confirmação antes de entrar.')
      } else {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', backgroundColor: 'var(--error-bg)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>{error}</div>}
        
        <Input 
          label="E-MAIL" 
          type="email" 
          placeholder="seu@email.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>SENHA</label>
            <Link to="/reset-password" style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600 }}>Esqueceu a senha?</Link>
          </div>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="keep-connected" 
            checked={keepConnected}
            onChange={(e) => setKeepConnected(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
          />
          <label htmlFor="keep-connected" style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Manter conectado</label>
        </div>

        <Button type="submit" variant="secondary" fullWidth disabled={isLoading} style={{ marginTop: '0.5rem', padding: '1rem', fontWeight: 800 }}>
          {isLoading ? 'ENTRANDO...' : 'Arquitete sua pausa'}
        </Button>
      </form>
      
      <p className="auth-footer-terms">
        Ao continuar, você concorda com nossos<br/>
        <a href="#">Termos de Uso</a> e <a href="#">Privacidade</a>.
      </p>
    </>
  )
}
