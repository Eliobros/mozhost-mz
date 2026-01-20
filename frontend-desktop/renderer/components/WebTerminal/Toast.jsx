// src/components/WebTerminal/Toast.jsx
import React, { createContext, useContext, useState } from 'react';
import './toast.css';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const toast = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning')
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(({ id, message, type }) => (
          <div key={id} className={`toast toast-${type}`}>
            <span className="toast-icon">
              {type === 'success' && '✅'}
              {type === 'error' && '❌'}
              {type === 'info' && 'ℹ️'}
              {type === 'warning' && '⚠️'}
            </span>
            <span className="toast-message">{message}</span>
            <button 
              onClick={() => removeToast(id)}
              className="toast-close"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
