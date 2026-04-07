import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return createPortal(
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-header">
          <span className="confirm-title">{title}</span>
        </div>
        <div className="confirm-content">
          <p>{message}</p>
        </div>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>
            取消
          </button>
          <button className="confirm-ok" onClick={onConfirm}>
            确定
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  resolve: ((value: boolean) => void) | null;
}

let confirmCallback: ConfirmState = {
  open: false,
  title: '确认',
  message: '',
  resolve: null,
};

const listeners: Array<(state: ConfirmState) => void> = [];

const notifyListeners = (state: ConfirmState) => {
  listeners.forEach((listener) => listener(state));
};

export const confirm = (message: string, title: string = '确认'): Promise<boolean> => {
  return new Promise((resolve) => {
    confirmCallback = {
      open: true,
      title,
      message,
      resolve,
    };
    notifyListeners(confirmCallback);
  });
};

export const ConfirmDialogManager: React.FC = () => {
  const [state, setState] = useState<ConfirmState>(confirmCallback);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  const handleConfirm = () => {
    confirmCallback.resolve?.(true);
    confirmCallback = { ...confirmCallback, open: false };
    notifyListeners(confirmCallback);
  };

  const handleCancel = () => {
    confirmCallback.resolve?.(false);
    confirmCallback = { ...confirmCallback, open: false };
    notifyListeners(confirmCallback);
  };

  return (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
};
