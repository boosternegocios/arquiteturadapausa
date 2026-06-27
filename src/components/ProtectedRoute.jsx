import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()

  if (!user) {
    // Redirect to login if unauthenticated
    return <Navigate to="/login" replace />
  }

  return children
}

export const AuthRoute = ({ children }) => {
  const { user } = useAuth()

  if (user) {
    // Redirect from login/register to Autoavaliação (main entry point)
    return <Navigate to="/intro" replace />
  }

  return children
}
