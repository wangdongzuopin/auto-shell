import React, { useEffect, useState } from 'react';
import { create } from 'zustand';

interface ToastMessage {
  id: string;
  message: string;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (message: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message) => {
    const id = Math.random().toString(36).slice(2);
    set(state => ({
      toasts: [...state.toasts, { id, message }]
    }));
    // Auto remove after 2.2 seconds
    setTimeout(() => {
      set(state => ({
        toasts: state.toasts.filter(t => t.id !== id)
      }));
    }, 2200);
  },
  removeToast: (id) => set(state => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}));

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast"
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 100;
          pointer-events: none;
        }
        .toast {
          background: var(--bg4);
          border: 1px solid var(--border2);
          color: var(--text);
          font-size: 12px;
          padding: 8px 16px;
          border-radius: 99px;
          white-space: nowrap;
          pointer-events: auto;
          cursor: pointer;
          animation: toast-in 0.2s ease-out;
        }
        .toast:hover {
          background: var(--bg5);
        }
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// Helper function for showing toasts from anywhere
export const toast = (message: string) => {
  useToastStore.getState().addToast(message);
};
