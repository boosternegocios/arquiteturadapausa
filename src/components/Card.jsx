import React from 'react';
import './Card.css';

export function Card({ children, className = '', title, description }) {
  return (
    <div className={`card ${className}`}>
      {(title || description) && (
        <div className="card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {description && <p className="card-description">{description}</p>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}
