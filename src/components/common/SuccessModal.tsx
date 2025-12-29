import React from 'react';
import { createPortal } from 'react-dom';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, message = "Operation completed successfully." }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="success-overlay" onClick={onClose}>
      <div className="success-content" onClick={e => e.stopPropagation()}>
        <div className="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h3 className="success-title">Success!</h3>
        <p className="success-message">{message}</p>

        <div className="success-actions">
          <a href="https://buymeacoffee.com/shanemtosh" target="_blank" rel="noopener" className="coffee-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
            <span>Buy Me a Coffee</span>
          </a>
          <button onClick={onClose} className="button-text">Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SuccessModal;
