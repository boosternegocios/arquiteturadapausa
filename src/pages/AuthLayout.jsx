import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import './AuthLayout.css'

export const AuthLayout = () => {
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
            Um espaço desenhado para o seu silêncio.<br/>
            Reconecte-se com o essencial através da<br/>
            pausa consciente.
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
            <h2>BEM-VINDO DE VOLTA</h2>
            <p>Escolha como deseja acessar sua jornada.</p>
          </div>
          
          <div className="auth-tabs">
            <NavLink to="/login" className={({ isActive }) => `auth-tab ${isActive ? 'active' : ''}`}>LOGIN</NavLink>
            <NavLink to="/register" className={({ isActive }) => `auth-tab ${isActive ? 'active' : ''}`}>CADASTRO</NavLink>
          </div>

          <div className="auth-content">
            <Outlet />
          </div>
          
          {/* Floating Action Button */}
          <button className="auth-fab" aria-label="Support">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
