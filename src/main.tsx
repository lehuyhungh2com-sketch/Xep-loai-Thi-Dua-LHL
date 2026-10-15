import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Yêu cầu 4: Xóa sạch cache localStorage liên quan đến Tiêu chí khi ứng dụng khởi động
if (typeof window !== 'undefined') {
  try {
    const keysToRemove = [
      'lhl_criteria_list',
      'lhl_criteria_versions',
      'criteria_cache',
      'lhl_criteria_cache',
      'lhl_criteria_db',
      'lhl_criteria',
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('lhl_crit') || key.startsWith('criteria_'))) {
        localStorage.removeItem(key);
      }
    }
  } catch {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
