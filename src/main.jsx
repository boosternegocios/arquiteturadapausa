import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// Clear any orphaned Supabase locks to prevent hanging
try {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('lock:sb-')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
} catch (e) {
  console.error('Failed to clear locks', e)
}

import { supabase } from './lib/supabase'

console.log("TESTING SUPABASE QUERY FROM MAIN.JSX...");
supabase.from('admins').select('*').limit(1).then(({ data, error }) => {
  console.log("SUPABASE QUERY RESULT:", data, error);
}).catch(err => {
  console.error("SUPABASE QUERY THREW EXCEPTION:", err);
});

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
