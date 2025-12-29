import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useState, useEffect } from 'react';
import {
  addWatermarkToPDF,
  addPageNumbersToPDF,
  compressPDF,
  formatFileSize,
} from '../../utils/pdfOperations';
import Modal from '../common/Modal';

type ModalType = 'watermark' | 'pagenumbers' | 'compress' | null;

const EnhanceTab = () => {
  const { outputFiles, updateOutputFile } = useApp();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [watermarkText, setWatermarkText] = useState('');
  const [opacity, setOpacity] = useState('0.5');
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'>('bottom-center');

  useEffect(() => {
    if (activeModal && !selectedFileId && outputFiles.length > 0) {
      setSelectedFileId(outputFiles[0].id);
    }
  }, [activeModal, outputFiles]);

  const closeModal = () => {
    setActiveModal(null);
    setWatermarkText('');
    setOpacity('0.5');
    setPageNumberPosition('bottom-center');
  };

  const openModal = (type: ModalType) => {
    if (outputFiles.length === 0) return;
    setActiveModal(type);
    if (outputFiles.length > 0) {
      setSelectedFileId(outputFiles[0].id);
    }
  };

  const handleExecute = async () => {
    const filesToProcess = selectedFileId === 'all' 
      ? outputFiles 
      : outputFiles.filter(f => f.id === selectedFileId);
      
    if (filesToProcess.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of filesToProcess) {
      try {
        let pdfBytes: Uint8Array | null = null;

        switch (activeModal) {
          case 'watermark': {
            if (!watermarkText) throw new Error('Watermark text is required');
            pdfBytes = await addWatermarkToPDF(file.bytes, watermarkText, parseFloat(opacity));
            break;
          }
          case 'pagenumbers': {
            pdfBytes = await addPageNumbersToPDF(file.bytes, pageNumberPosition);
            break;
          }
          case 'compress': {
            pdfBytes = await compressPDF(file.bytes);
            
            const savings = ((1 - pdfBytes.length / file.size) * 100).toFixed(1);
            if (filesToProcess.length === 1) {
                addToast(
                    `Compressed! Saved ${savings}% (${formatFileSize(file.size)} -> ${formatFileSize(pdfBytes.length)})`,
                    'success'
                );
            }
            break;
          }
        }

        if (pdfBytes) {
          await updateOutputFile(file.id, pdfBytes);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        failCount++;
      }
    }

    setLoading(false);
    
    if (successCount > 0) {
      if (activeModal !== 'compress' || filesToProcess.length > 1) {
         addToast(`Applied changes to ${successCount} file(s)!`, 'success');
      }
    }
    
    if (failCount > 0) {
      addToast(`Failed to process ${failCount} file(s).`, 'error');
    }
    
    closeModal();
  };

  const renderFileSelect = () => (
    <div className="form-group">
      <label className="form-label">Select File</label>
      <select 
        className="form-input file-select" 
        value={selectedFileId} 
        onChange={(e) => setSelectedFileId(e.target.value)}
      >
        {outputFiles.length > 1 && <option value="all">All Export Files ({outputFiles.length})</option>}
        {outputFiles.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
    </div>
  );

  const getModalTitle = () => {
    switch(activeModal) {
      case 'watermark': return 'Add Watermark';
      case 'pagenumbers': return 'Add Page Numbers';
      case 'compress': return 'Compress PDF';
      default: return '';
    }
  };

  return (
    <div className="tab-pane active">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Enhance PDF</h2>
          <p className="tab-subtitle">Add watermarks, page numbers, and optimize</p>
        </div>
      </div>

      <div className="operations-grid">
        <div 
          className="operation-card" 
          onClick={() => openModal('watermark')}
          style={{ cursor: outputFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: outputFiles.length === 0 ? 0.5 : 1 }}
        >
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          </div>
          <h3 className="operation-title">Add Watermark</h3>
          <p className="operation-description">Add text watermark to all pages</p>
        </div>

        <div 
          className="operation-card" 
          onClick={() => openModal('pagenumbers')}
          style={{ cursor: outputFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: outputFiles.length === 0 ? 0.5 : 1 }}
        >
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
          </div>
          <h3 className="operation-title">Page Numbers</h3>
          <p className="operation-description">Add automatic page numbering</p>
        </div>

        <div 
          className="operation-card" 
          onClick={() => openModal('compress')}
          style={{ cursor: outputFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: outputFiles.length === 0 ? 0.5 : 1 }}
        >
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"></polyline><line x1="12" y1="12" x2="12" y2="21"></line><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"></path><polyline points="16 16 12 12 8 16"></polyline></svg>
          </div>
          <h3 className="operation-title">Compress PDF</h3>
          <p className="operation-description">Reduce file size and optimize</p>
        </div>
      </div>

      <Modal
        isOpen={!!activeModal}
        onClose={closeModal}
        title={getModalTitle()}
        footer={
          <>
            <button className="button-secondary" onClick={closeModal}>Cancel</button>
            <button className="button-primary" onClick={handleExecute} disabled={loading}>
              {loading ? 'Processing...' : 'Apply'}
            </button>
          </>
        }
      >
        {activeModal && (
          <>
            {renderFileSelect()}
            
            {activeModal === 'watermark' && (
              <>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Watermark Text</label>
                  <input
                    type="text"
                    className="form-input"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Confidential"
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Opacity ({Math.round(parseFloat(opacity) * 100)}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={opacity}
                    onChange={(e) => setOpacity(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            {activeModal === 'pagenumbers' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Position</label>
                <select 
                  className="form-input" 
                  value={pageNumberPosition} 
                  onChange={e => setPageNumberPosition(e.target.value as 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right')}
                >
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>
            )}
            
            {activeModal === 'compress' && (
              <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
                Compression will remove unused objects and optimize the PDF structure.
                This operation might take a few moments for large files.
              </p>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default EnhanceTab;