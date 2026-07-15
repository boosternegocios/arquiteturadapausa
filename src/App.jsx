import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ScrollToTop } from './components/ScrollToTop'
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
import { VitalityRadar } from './pages/VitalityRadar'
import { Profile } from './pages/Profile'
import { AdminDashboard } from './pages/AdminDashboard'

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          {/* Default Route → always land on Autoavaliação */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Introduction />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/dashboard" 
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
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
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

          <Route 
            path="/vitality" 
            element={
              <ProtectedRoute>
                <VitalityRadar />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
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
