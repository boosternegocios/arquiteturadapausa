import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { Button } from '../components/Button'

export const ResetPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const { error } = await resetPassword(email)
      if (error) throw error
      setMessage('Instruções de recuperação foram enviadas para o seu e-mail.')
    } catch (err) {
      setError('Falha ao redefinir a senha. Verifique o seu e-mail.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card title="Recuperar Senha" description="Insira seu e-mail para receber um link de redefinição">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1rem', backgroundColor: 'var(--error-bg)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>{error}</div>}
        {message && <div style={{ color: 'var(--primary)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1rem', backgroundColor: 'var(--primary-light)', padding: '0.5rem', borderRadius: 'var(--radius-xs)' }}>{message}</div>}
        
        <Input 
          label="E-mail Cadastrado" 
          type="email" 
          placeholder="seu@email.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Button type="submit" fullWidth disabled={isLoading} style={{ marginTop: '1rem' }}>
          {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
        </Button>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Lembrou a senha? <Link to="/login">Voltar ao Login</Link>
        </div>
      </form>
    </Card>
  )
}
