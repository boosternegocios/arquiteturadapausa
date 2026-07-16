import React from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import './AuthLayout.css'

export const AuthLayout = () => {
  const location = useLocation();
  return (
    <div className="auth-layout">
      {/* Left Pane: Branding / Hero */}
      <div className="auth-hero">
        <div className="auth-hero-branding">
          <div className="auth-hero-logo">
            <img src="https://noybugsrzlxbzjgstjff.supabase.co/storage/v1/object/public/Imagens/logotipo_carolrocha_branco%20(1).png" alt="Carol Rocha" style={{ maxWidth: '240px', height: 'auto' }} />
          </div>
        </div>
        
        <div className="auth-hero-content">
          <h1>ARQUITETURA<br/>DA PAUSA</h1>
          <p>
            {location.pathname === '/register' ? (
              <>
                Um método que conecta consciência e prática.<br/>
                Um passo a passo que pode mudar sua relação com o tempo, foco e energia.
              </>
            ) : (
              <>
                Reconecte-se com o essencial através da<br/>
                pausa consciente.
              </>
            )}
          </p>
          
          <div className="auth-hero-indicators">
            <span className="indicator active"></span>
            <span className="indicator"></span>
            <span className="indicator"></span>
          </div>
        </div>
      </div>

      {/* Right Pane: Forms */}
      <div className="auth-form-pane">
        <div className="auth-form-container animate-fade-in">
          <div className="auth-header">
            <h2>Bem Vindo</h2>
            <p>Escolha como deseja acessar sua jornada.</p>
          </div>
          
          <div className="auth-tabs">
            <NavLink to="/login" className={({ isActive }) => `auth-tab ${isActive ? 'active' : ''}`}>LOGIN</NavLink>
            <NavLink to="/register" className={({ isActive }) => `auth-tab ${isActive ? 'active' : ''}`}>CADASTRO</NavLink>
          </div>

          <div className="auth-content">
            <Outlet />
          </div>
          

        </div>
      </div>
    </div>
  )
}
