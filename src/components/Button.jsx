import React from 'react';
import './Button.css';

export function Button({ children, variant = 'primary', fullWidth, className = '', ...props }) {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const widthClass = fullWidth ? 'btn-full' : '';
  
  return (
    <button 
      className={`${baseClass} ${variantClass} ${widthClass} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}
