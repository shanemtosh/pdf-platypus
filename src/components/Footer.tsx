import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { downloadPDF } from '../utils/pdfOperations';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { UploadedFile } from '../types';

const Footer = () => {
  const { outputFiles, showSuccess } = useApp();
  const { addToast } = useToast();

  const handleDownloadAll = async () => {
    if (outputFiles.length === 0) return;

    if (outputFiles.length === 1) {
      downloadPDF(outputFiles[0].bytes, outputFiles[0].name);
      showSuccess("Your file has been downloaded successfully.");
      return;
    }

    try {
      addToast('Preparing ZIP...', 'info');
      const zip = new JSZip();
      outputFiles.forEach((file: UploadedFile) => {
        zip.file(file.name, file.bytes);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'pdf-toolkit-export.zip');
      showSuccess("Your files have been bundled and downloaded successfully.");
    } catch (e) {
      console.error('Download all failed', e);
      addToast('Failed to create ZIP.', 'error');
    }
  };

  return (
    <footer className="footer">
      {outputFiles.length > 0 && (
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <button 
            onClick={handleDownloadAll} 
            className="button-primary button-large"
            style={{ width: 'auto', minWidth: '300px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download {outputFiles.length === 1 ? 'Modified PDF' : `All Files (${outputFiles.length})`}
          </button>
        </div>
      )}
      
      <div className="footer-content">
        <div className="footer-links">
          <a href="https://buymeacoffee.com/shanemtosh" target="_blank" rel="noopener" className="footer-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
            Buy me a coffee
          </a>
          <a href="https://mto.sh" target="_blank" rel="noopener" className="footer-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            mto.sh
          </a>
          <a href="mailto:shane@mto.sh" className="footer-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            shane@mto.sh
          </a>
          <a href="https://github.com/shanemtosh/pdf-toolkit" target="_blank" rel="noopener" className="footer-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            GitHub
          </a>
        </div>
        
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <pre style={{ 
                fontFamily: 'monospace', 
                fontSize: '10px', 
                lineHeight: '1', 
                color: 'var(--color-text-tertiary)',
                whiteSpace: 'pre',
                textAlign: 'left'
            }}>
{`         █████████░
 ░░░░░░░███. ██████░ ████████████████████
░░░░░░░░███████████░██████████████████████░░░░░░░░░
 ░░░░░░░░██████████░██████████████████████░░░░░░░░░░
                      ████████████████████░░░░░░░░░
                        █████     █████`}
            </pre>
            <p className="footer-credit" style={{ marginTop: '1rem' }}>PDF Platypus | Made with care | No tracking, no analytics, no BS</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
