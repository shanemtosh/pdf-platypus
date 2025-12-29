import Modal from './common/Modal';
import { useState } from 'react';

const Header = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <header className="header">
      <div className="header-brand">
        <h1 className="title">PDF Platypus</h1>
        <p className="subtitle">Edit, merge, split, and enhance PDFs in your browser</p>
      </div>
      <div 
        className="privacy-badge" 
        onClick={() => setShowPrivacyModal(true)}
        style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
        title="Learn more about our privacy policy"
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <span>Zero Data Retention</span>
      </div>

      <Modal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Privacy & Security"
        footer={
          <button className="button-primary" onClick={() => setShowPrivacyModal(false)}>Got it!</button>
        }
      >
        <div style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
          <p style={{ marginBottom: '1rem', fontWeight: '600', color: 'var(--color-text-primary)' }}>
            Your files never leave your computer.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            PDF Platypus is a 100% client-side application. This means all PDF processing -- merging, splitting, metadata editing, and image conversion -- happens directly in your web browser.
          </p>
          <div style={{ 
            background: 'var(--color-bg)', 
            padding: '1rem', 
            borderRadius: 'var(--radius-md)', 
            borderLeft: '4px solid var(--color-accent)',
            marginBottom: '1.5rem'
          }}>
            <p style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
              <strong>Airplane Mode Test:</strong> You can load this page, turn off your internet (or go into Airplane Mode), and every single tool will continue to work perfectly. 
            </p>
          </div>
          <ul style={{ paddingLeft: '1.2rem', marginBottom: '1rem' }}>
            <li style={{ marginBottom: '0.5rem' }}><strong>No Uploads:</strong> Your files are never sent to a server.</li>
            <li style={{ marginBottom: '0.5rem' }}><strong>No Storage:</strong> We do not store any of your data or PDFs.</li>
            <li style={{ marginBottom: '0.5rem' }}><strong>No Tracking:</strong> We use no analytics, no cookies, and no tracking scripts.</li>
          </ul>
          <p>
            This is the most secure way to handle sensitive documents because the data remains under your total control at all times.
          </p>
        </div>
      </Modal>
    </header>
  );
};

export default Header;
