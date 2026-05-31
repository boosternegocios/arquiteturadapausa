import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, AuthRoute } from './components/ProtectedRoute'
import { AuthLayout } from './pages/AuthLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { Assessment } from './pages/Assessment'
import { Result } from './pages/Result'
import { Solution } from './pages/Solution'
import { Recovery } from './pages/Recovery'
import { SpecificSolution } from './pages/SpecificSolution'
import { ContinueHealing } from './pages/ContinueHealing'
import { Introduction } from './pages/Introduction'
import { Contact } from './pages/Contact'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Default Route */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/intro" 
            element={
              <ProtectedRoute>
                <Introduction />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/assessment/:category" 
            element={
              <ProtectedRoute>
                <Assessment />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/resultado" 
            element={
              <ProtectedRoute>
                <Result />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/solution" 
            element={
              <ProtectedRoute>
                <Solution />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/recovery/:step" 
            element={
              <ProtectedRoute>
                <Recovery />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/specific-solution" 
            element={
              <ProtectedRoute>
                <SpecificSolution />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/specific-solution/:category" 
            element={
              <ProtectedRoute>
                <SpecificSolution />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/continue-healing" 
            element={
              <ProtectedRoute>
                <ContinueHealing />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/contact" 
            element={
              <ProtectedRoute>
                <Contact />
              </ProtectedRoute>
            } 
          />

          {/* Auth Routes */}
          <Route element={<AuthRoute><AuthLayout /></AuthRoute>}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
