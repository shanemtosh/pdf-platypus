import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { useState, useEffect } from 'react';
import {
  mergePDFs,
  splitPDF,
  rotatePDF,
  deletePagesFromPDF,
  reorderPDF,
  parsePageRange,
} from '../../utils/pdfOperations';
import { convertPDFToImages, downloadImagesAsZip } from '../../utils/imageOperations';
import { PDFDocument } from 'pdf-lib';
import Modal from '../common/Modal';
import { saveAs } from 'file-saver';
import VisualReorderModal from './VisualReorderModal';

type ModalType = 'split' | 'rotate' | 'delete' | 'reorder' | 'images' | null;

const PagesTab = () => {
  const { outputFiles, updateOutputFile, consolidateOutputToMerge } = useApp();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [showVisualReorder, setShowVisualReorder] = useState(false);
  
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [pageRange, setPageRange] = useState('');
  const [rotation, setRotation] = useState('90');
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg'>('png');
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (activeModal && !selectedFileId && outputFiles.length > 0) {
      handleFileSelection(outputFiles[0].id);
    }
  }, [activeModal, outputFiles]);

  const handleFileSelection = async (fileId: string) => {
    setSelectedFileId(fileId);
    const file = outputFiles.find(f => f.id === fileId);
    if (file) {
      try {
        const srcDoc = await PDFDocument.load(file.bytes, { updateMetadata: false });
        const count = srcDoc.getPageCount();
        setTotalPages(count);
      } catch (e) {
        console.error("Error reading PDF for page count", e);
      }
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setPageRange('');
    setRotation('90');
    setImageFormat('png');
  };

  const openModal = (type: ModalType) => {
    if (outputFiles.length === 0) return;
    setActiveModal(type);
    if (outputFiles.length > 0) {
      handleFileSelection(outputFiles[0].id);
    }
  };

  const handleMerge = async () => {
    if (outputFiles.length < 2) {
      addToast('Please upload at least 2 PDF files to merge.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const files = outputFiles.map(f => ({ name: f.name, bytes: f.bytes }));
      const pdfBytes = await mergePDFs(files);
      await consolidateOutputToMerge(pdfBytes, 'merged.pdf');
      addToast('PDFs merged into one result! Check the Export section.', 'success');
    } catch (error) {
      console.error('Error merging PDFs:', error);
      addToast('Failed to merge PDFs. Please try again.', 'error');
    }
    setLoading(false);
  };

  const handleVisualReorderConfirm = async (newOrder: number[]) => {
    setShowVisualReorder(false);
    setActiveModal(null);
    
    const file = outputFiles.find(f => f.id === selectedFileId);
    if (!file) return;

    setLoading(true);
    try {
        const pdfBytes = await reorderPDF(file.bytes, newOrder);
        await updateOutputFile(file.id, pdfBytes);
        addToast('Pages reordered!', 'success');
    } catch (error) {
        console.error("Error reordering:", error);
        addToast('Failed to reorder pages.', 'error');
    }
    setLoading(false);
  };

  const handleExecute = async () => {
    if (activeModal === 'reorder') {
        if (selectedFileId === 'all') {
            addToast("Visual reordering only supports one file at a time.", "warning");
            return;
        }
        setShowVisualReorder(true);
        return;
    }

    const isBatchable = activeModal === 'rotate' || activeModal === 'images';
    const filesToProcess = (isBatchable && selectedFileId === 'all')
      ? outputFiles
      : outputFiles.filter(f => f.id === selectedFileId);

    if (filesToProcess.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of filesToProcess) {
      try {
        const srcDoc = await PDFDocument.load(file.bytes, { updateMetadata: false });
        const currentFileTotalPages = srcDoc.getPageCount();

        let pdfBytes: Uint8Array | null = null;
        let isImage = false;

        switch (activeModal) {
          case 'split': {
            const pageIndices = parsePageRange(pageRange, currentFileTotalPages);
            if (pageIndices.length === 0) throw new Error('Invalid page range');
            pdfBytes = await splitPDF(file.bytes, pageIndices);
            break;
          }
          case 'rotate': {
            const pageIndices = pageRange.toLowerCase() === 'all' || !pageRange.trim()
              ? Array.from({ length: currentFileTotalPages }, (_, i) => i)
              : parsePageRange(pageRange, currentFileTotalPages);
            
            if (pageIndices.length === 0) throw new Error('Invalid page range');
            
            pdfBytes = await rotatePDF(file.bytes, pageIndices, parseInt(rotation));
            break;
          }
          case 'delete': {
            const pagesToDelete = parsePageRange(pageRange, currentFileTotalPages);
            if (pagesToDelete.length === 0) throw new Error('Invalid page range');
            if (pagesToDelete.length >= currentFileTotalPages) throw new Error('Cannot delete all pages');
            
            pdfBytes = await deletePagesFromPDF(file.bytes, pagesToDelete);
            break;
          }
          case 'images': {
            const pageIndices = pageRange.toLowerCase() === 'all' || !pageRange.trim()
              ? [] 
              : parsePageRange(pageRange, currentFileTotalPages);
              
            const images = await convertPDFToImages(file.bytes, pageIndices, imageFormat);
            if (images.length === 0) throw new Error('No images generated');
            
            if (images.length === 1) {
              saveAs(images[0].blob, `${file.name.replace('.pdf', '')}_page${images[0].name}`);
            } else {
              await downloadImagesAsZip(images, `${file.name.replace('.pdf', '')}_images.zip`);
            }
            successCount++;
            isImage = true;
            continue; 
          }
        }

        if (pdfBytes && !isImage) {
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
       if (activeModal === 'images') {
          addToast(`Converted images for ${successCount} file(s)!`, 'success');
       } else {
          addToast(`Updated ${successCount} file(s)!`, 'success');
       }
       closeModal();
    }
    
    if (failCount > 0) {
      addToast(`Failed to process ${failCount} file(s). Check inputs.`, 'error');
    }
  };

  const renderFileSelect = () => {
    const isBatchable = activeModal === 'rotate' || activeModal === 'images';
    
    return (
    <div className="form-group">
      <label className="form-label">Select File</label>
      <select 
        className="form-input file-select" 
        value={selectedFileId} 
        onChange={(e) => handleFileSelection(e.target.value)}
      >
        {isBatchable && outputFiles.length > 1 && <option value="all">All Export Files ({outputFiles.length})</option>}
        {outputFiles.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
    </div>
    );
  };

  const renderPageInput = (label = "Page Range", placeholder = "e.g., 1-3, 5") => (
    <div className="form-group" style={{ marginTop: '1rem' }}>
      <label className="form-label">{label}</label>
      <input
        type="text"
        className="form-input"
        value={pageRange}
        onChange={(e) => setPageRange(e.target.value)}
        placeholder={placeholder}
      />
      {selectedFileId !== 'all' && (
        <p className="editor-subtitle" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
          Total pages: {totalPages}.
        </p>
      )}
    </div>
  );

  const getModalTitle = () => {
    switch(activeModal) {
      case 'split': return 'Split / Extract Pages';
      case 'rotate': return 'Rotate Pages';
      case 'delete': return 'Delete Pages';
      case 'reorder': return 'Reorder Pages';
      case 'images': return 'Convert to Images';
      default: return '';
    }
  };

  return (
    <div className="tab-pane active">
      <div className="tab-header">
        <div>
          <h2 className="tab-title">Page Operations</h2>
          <p className="tab-subtitle">Merge, split, rotate, and organize PDF pages</p>
        </div>
      </div>

      <div className="operations-grid">
        <div className="operation-card" onClick={handleMerge} style={{ cursor: outputFiles.length < 2 ? 'not-allowed' : 'pointer', opacity: outputFiles.length < 2 ? 0.5 : 1 }}>
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </div>
          <h3 className="operation-title">Merge PDFs</h3>
          <p className="operation-description">Combine multiple PDFs into a single file</p>
        </div>

        <div className="operation-card" onClick={() => openModal('split')} style={{ cursor: outputFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: outputFiles.length === 0 ? 0.5 : 1 }}>
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="13" x2="12" y2="18"></line><polyline points="9 16 12 18 15 16"></polyline></svg>
          </div>
          <h3 className="operation-title">Split / Extract</h3>
          <p className="operation-description">Extract pages or split into multiple files</p>
        </div>

        <div className="operation-card" onClick={() => openModal('rotate')} style={{ cursor: outputFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: outputFiles.length === 0 ? 0.5 : 1 }}>
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
          </div>
          <h3 className="operation-title">Rotate Pages</h3>
          <p className="operation-description">Rotate pages 90, 180, or 270 degrees</p>
        </div>

        <div className="operation-card" onClick={() => openModal('delete')} style={{ cursor: outputFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: outputFiles.length === 0 ? 0.5 : 1 }}>
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </div>
          <h3 className="operation-title">Delete Pages</h3>
          <p className="operation-description">Remove unwanted pages from PDF</p>
        </div>

        <div className="operation-card" onClick={() => openModal('reorder')} style={{ cursor: outputFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: outputFiles.length === 0 ? 0.5 : 1 }}>
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <h3 className="operation-title">Reorder Pages</h3>
          <p className="operation-description">Rearrange pages in any order</p>
        </div>

        <div className="operation-card" onClick={() => openModal('images')} style={{ cursor: outputFiles.length === 0 ? 'not-allowed' : 'pointer', opacity: outputFiles.length === 0 ? 0.5 : 1 }}>
          <div className="operation-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </div>
          <h3 className="operation-title">Convert to Images</h3>
          <p className="operation-description">Export pages as PNG or JPEG</p>
        </div>
      </div>

      <Modal
        isOpen={!!activeModal && !showVisualReorder}
        onClose={closeModal}
        title={getModalTitle()}
        footer={
          <>
            <button className="button-secondary" onClick={closeModal}>Cancel</button>
            <button className="button-primary" onClick={handleExecute} disabled={loading}>
              {activeModal === 'reorder' ? 'Launch Visual Editor' : 'Apply'}
            </button>
          </>
        }
      >
        {activeModal && (
          <>
            {renderFileSelect()}
            
            {activeModal === 'split' && renderPageInput('Pages to Keep', 'e.g., 1-3, 5, 7-9')}
            
            {activeModal === 'rotate' && (
              <>
                {renderPageInput('Pages to Rotate', 'Leave empty for all pages')}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Rotation (Clockwise)</label>
                  <select className="form-input" value={rotation} onChange={e => setRotation(e.target.value)}>
                    <option value="90">90 Degrees</option>
                    <option value="180">180 Degrees</option>
                    <option value="270">270 Degrees</option>
                  </select>
                </div>
              </>
            )}

            {activeModal === 'delete' && renderPageInput('Pages to Delete')}

            {activeModal === 'reorder' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <p className="editor-subtitle">
                  Click "Launch Visual Editor" to drag and drop pages into your desired order.
                </p>
              </div>
            )}

            {activeModal === 'images' && (
              <>
                {renderPageInput('Pages to Convert', 'Leave empty for all pages')}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Format</label>
                  <select className="form-input" value={imageFormat} onChange={e => setImageFormat(e.target.value as 'png' | 'jpeg')}>
                    <option value="png">PNG (Best Quality)</option>
                    <option value="jpeg">JPEG (Smaller Size)</option>
                  </select>
                </div>
              </>
            )}
          </>
        )}
      </Modal>
      
      {showVisualReorder && (
        <VisualReorderModal 
            file={outputFiles.find(f => f.id === selectedFileId) || null}
            onConfirm={handleVisualReorderConfirm}
            onCancel={() => setShowVisualReorder(false)}
        />
      )}
    </div>
  );
};

export default PagesTab;