import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { formatFileSize, downloadPDF } from '../utils/pdfOperations';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { UploadedFile } from '../types';
import { useRef, useState } from 'react';
import Modal from './common/Modal';
import PDFThumbnail from './common/PDFThumbnail';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const SortableFileItem = ({ file, onRemove, onDownload, onPreview }: { 
    file: UploadedFile, 
    onRemove: (id: string) => void,
    onDownload: (file: UploadedFile) => void,
    onPreview: (file: UploadedFile) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: file.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="file-item">
      <div className="file-item-info" {...attributes} {...listeners} style={{ cursor: 'grab' }}>
        <div className="file-item-drag-handle" style={{ marginRight: '0.75rem', color: 'var(--color-text-tertiary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="19" r="1" />
          </svg>
        </div>
        <div className="file-item-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div className="file-item-details">
          <div className="file-item-name">{file.name}</div>
          <div className="file-item-size">{formatFileSize(file.size)}</div>
        </div>
      </div>
      
      <div className="file-item-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onPreview(file)}
            className="file-item-action"
            title="Preview"
            style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-tertiary)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          
          <button
            onClick={() => onDownload(file)}
            className="file-item-action"
            title="Download"
            style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-tertiary)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
      
          <button
            onClick={() => onRemove(file.id)}
            className="file-item-remove"
            title="Remove file"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
      </div>
    </div>
  );
};

const FileList = () => {
  const { inputFiles, outputFiles, removeFile, clearAll, reorderOutputFiles, addFiles, showSuccess } = useApp();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = outputFiles.findIndex((f) => f.id === active.id);
      const newIndex = outputFiles.findIndex((f) => f.id === over.id);
      reorderOutputFiles(arrayMove(outputFiles, oldIndex, newIndex));
    }
  };
  
  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
          addFiles(files);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (file: UploadedFile) => {
    downloadPDF(file.bytes, file.name);
    showSuccess("Your file has been downloaded successfully.");
  };

  const handleDownloadAll = async () => {
    if (outputFiles.length === 0) return;

    if (outputFiles.length === 1) {
      handleDownload(outputFiles[0]);
      return;
    }

    try {
      addToast('Preparing ZIP...', 'info');
      const zip = new JSZip();
      outputFiles.forEach((file: UploadedFile) => {
        zip.file(file.name, file.bytes);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'pdf-platypus-export.zip');
      showSuccess("Your files have been bundled and downloaded successfully.");
    } catch (e) {
      console.error('Download all failed', e);
      addToast('Failed to create ZIP.', 'error');
    }
  };

  if (inputFiles.length === 0 && outputFiles.length === 0) return null;

  return (
    <>
    <div className="file-lists-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        <section className="files-status" style={{ margin: 0 }}>
          <div className="files-status-header">
            <span className="files-count">Input PDF(s)</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => fileInputRef.current?.click()} className="button-text" style={{ color: 'var(--color-accent)', padding: '4px 8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Add
                </button>
                <input type="file" ref={fileInputRef} onChange={handleAddFiles} multiple accept=".pdf" style={{ display: 'none' }} />
                <button onClick={clearAll} className="button-text" style={{ padding: '4px 8px' }}>Clear</button>
            </div>
          </div>
          <div className="files-list">
            {inputFiles.map(file => (
              <div key={file.id} className="file-item" style={{ padding: '8px 12px' }}>
                <div className="file-item-info">
                  <div className="file-item-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg></div>
                  <div className="file-item-details">
                    <div className="file-item-name" style={{ fontSize: '0.85rem' }}>{file.name}</div>
                  </div>
                </div>
                <button onClick={() => removeFile(file.id, 'input')} className="file-item-remove"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
              </div>
            ))}
          </div>
        </section>

        <section className="files-status" style={{ margin: 0, borderLeft: '4px solid var(--color-accent-light)' }}>
          <div className="files-status-header">
            <span className="files-count" style={{ color: 'var(--color-accent)' }}>Export PDF(s)</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {outputFiles.length > 1 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic', marginRight: '0.5rem' }}>Drag to reorder</span>
                )}
                <button 
                    onClick={handleDownloadAll} 
                    className="button-text" 
                    disabled={outputFiles.length === 0}
                    style={{ color: 'var(--color-accent)', padding: '4px 8px' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Download
                </button>
            </div>
          </div>
          <div className="files-list">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={outputFiles.map(f => f.id)} strategy={verticalListSortingStrategy}>
                {outputFiles.map(file => (
                  <SortableFileItem 
                    key={file.id} 
                    file={file} 
                    onRemove={(id) => removeFile(id, 'output')}
                    onDownload={handleDownload}
                    onPreview={(f) => setPreviewFile(f)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </section>
    </div>

    <Modal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        title={previewFile ? `Preview: ${previewFile.name}` : 'Preview'}
        footer={
            <button className="button-primary" onClick={() => setPreviewFile(null)}>Close</button>
        }
    >
        {previewFile && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', width: '100%' }}>
                  {Array.from({ length: Math.min(previewFile.doc.getPageCount(), 6) }, (_, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <PDFThumbnail pdfBytes={previewFile.bytes} pageIndex={i} width={150} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Page {i + 1}</span>
                      </div>
                  ))}
               </div>
               {previewFile.doc.getPageCount() > 6 && (
                   <p style={{ color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                       ...and {previewFile.doc.getPageCount() - 6} more pages.
                   </p>
               )}
            </div>
        )}
    </Modal>
    </>
  );
};

export default FileList;
