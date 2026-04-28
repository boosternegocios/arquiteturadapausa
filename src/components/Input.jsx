import React, { forwardRef } from 'react';
import './Input.css';

export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="input-group">
      {label && <label className="input-label">{label}</label>}
      <input 
        ref={ref}
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
