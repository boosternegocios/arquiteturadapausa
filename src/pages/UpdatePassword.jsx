import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Input } from '../components/Input'
import { Button } from '../components/Button'

export const UpdatePassword = () => {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const { updatePassword, signOut, user } = useAuth()
  const navigate = useNavigate()

  // O link do e-mail traz um token de recuperação na URL. O cliente Supabase
  // o processa automaticamente e cria uma sessão temporária — então quando
  // houver um usuário na sessão, liberamos o formulário para trocar a senha.
  useEffect(() => {
    if (user) setReady(true)
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setIsLoading(true)
    try {
      const { error } = await updatePassword(password)
      if (error) throw error
      setMessage('Senha alterada com sucesso! Redirecionando para o login...')
      // Encerra a sessão de recuperação e leva ao login para entrar com a nova senha
      setTimeout(async () => {
        try { await signOut() } catch { /* ignora */ }
        navigate('/login')
      }, 2000)
    } catch (err) {
      console.error('Erro ao atualizar senha:', err)
      setError('Não foi possível alterar a senha. O link pode ter expirado — solicite um novo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Redefinir Senha</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Crie uma nova senha para a sua conta.</p>
      </div>

      {!ready && !message ? (
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
          Validando o link de recuperação...
          <div style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
            Se esta mensagem não sumir, o link pode ter expirado.{' '}
            <span onClick={() => navigate('/reset-password')} style={{ color: 'var(--secondary)', fontWeight: 600, cursor: 'pointer' }}>
              Solicitar um novo link
            </span>.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', backgroundColor: 'var(--error-bg)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>{error}</div>}
          {message && <div style={{ color: 'var(--primary)', fontSize: '0.875rem', textAlign: 'center', backgroundColor: 'var(--primary-light)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>{message}</div>}

          <div style={{ position: 'relative' }}>
            <Input
              label="NOVA SENHA"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '1rem', top: '2.4rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Input
            label="CONFIRMAR NOVA SENHA"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <Button type="submit" variant="secondary" fullWidth disabled={isLoading || !!message} style={{ marginTop: '0.5rem', padding: '1rem', fontWeight: 800 }}>
            {isLoading ? 'SALVANDO...' : 'Salvar nova senha'}
          </Button>
        </form>
      )}
    </>
  )
}
