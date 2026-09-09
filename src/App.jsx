import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { ScrollToTop } from './components/ScrollToTop'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, AuthRoute } from './components/ProtectedRoute'
import { PATHS, getAssessmentPath, getRecoveryPath, getSpecificSolutionPath } from './lib/journey'
import { AuthLayout } from './pages/AuthLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { UpdatePassword } from './pages/UpdatePassword'
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

const RedirectAssessment = () => {
  const { category } = useParams()
  return <Navigate to={getAssessmentPath(category)} replace />
}

const RedirectRecovery = () => {
  const { step } = useParams()
  return <Navigate to={getRecoveryPath(step)} replace />
}

const RedirectSpecificSolution = () => {
  const { category } = useParams()
  return <Navigate to={category ? getSpecificSolutionPath(category) : PATHS.continueHealing} replace />
}

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
                <Navigate to={PATHS.home} replace />
              </ProtectedRoute>
            } 
          />

          <Route 
            path={PATHS.dashboard}
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path={PATHS.home}
            element={
              <ProtectedRoute>
                <Introduction />
              </ProtectedRoute>
            } 
          />

          <Route 
            path={PATHS.profile}
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/avaliacao/:category"
            element={
              <ProtectedRoute>
                <Assessment />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path={PATHS.result}
            element={
              <ProtectedRoute>
                <Result />
              </ProtectedRoute>
            } 
          />

          <Route 
            path={PATHS.solution}
            element={
              <ProtectedRoute>
                <Solution />
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/recuperacao/:step"
            element={
              <ProtectedRoute>
                <Recovery />
              </ProtectedRoute>
            } 
          />

          <Route 
            path={PATHS.continueHealing}
            element={
              <ProtectedRoute>
                <ContinueHealing />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/exercicio/:category"
            element={
              <ProtectedRoute>
                <SpecificSolution />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path={PATHS.contact}
            element={
              <ProtectedRoute>
                <Contact />
              </ProtectedRoute>
            } 
          />

          <Route 
            path={PATHS.vitality}
            element={
              <ProtectedRoute>
                <VitalityRadar />
              </ProtectedRoute>
            } 
          />

          <Route 
            path={PATHS.admin}
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Auth Routes */}
          <Route element={<AuthRoute><AuthLayout /></AuthRoute>}>
            <Route path={PATHS.login} element={<Login />} />
            <Route path={PATHS.register} element={<Register />} />
            <Route path={PATHS.resetPassword} element={<ResetPassword />} />
          </Route>

          {/* Redefinição de senha — usa o AuthLayout mas SEM AuthRoute, pois o
              link de recuperação cria uma sessão temporária (usuário fica logado)
              e o AuthRoute redirecionaria para a autoavaliação antes de trocar a senha. */}
          <Route element={<AuthLayout />}>
            <Route path={PATHS.updatePassword} element={<UpdatePassword />} />
          </Route>

          {/* Legacy English routes kept as local compatibility redirects. */}
          <Route path="/intro" element={<Navigate to={PATHS.home} replace />} />
          <Route path="/dashboard" element={<Navigate to={PATHS.dashboard} replace />} />
          <Route path="/profile" element={<Navigate to={PATHS.profile} replace />} />
          <Route path="/assessment/:category" element={<RedirectAssessment />} />
          <Route path="/solution" element={<Navigate to={PATHS.solution} replace />} />
          <Route path="/recovery/:step" element={<RedirectRecovery />} />
          <Route path="/specific-solution" element={<Navigate to={PATHS.continueHealing} replace />} />
          <Route path="/specific-solution/:category" element={<RedirectSpecificSolution />} />
          <Route path="/continue-healing" element={<Navigate to={PATHS.continueHealing} replace />} />
          <Route path="/contact" element={<Navigate to={PATHS.contact} replace />} />
          <Route path="/vitality" element={<Navigate to={PATHS.vitality} replace />} />
          <Route path="/login" element={<Navigate to={PATHS.login} replace />} />
          <Route path="/register" element={<Navigate to={PATHS.register} replace />} />
          <Route path="/reset-password" element={<Navigate to={PATHS.resetPassword} replace />} />
          <Route path="/update-password" element={<Navigate to={PATHS.updatePassword} replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
