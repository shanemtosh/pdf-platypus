import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { PDFDocument } from 'pdf-lib';
import { formatDateForInput } from '../../utils/pdfOperations';
import type { PDFMetadata } from '../../types';

const MetadataTab = () => {
  const { outputFiles, selectedFileId, setSelectedFileId, getSelectedFile, updateOutputFile } = useApp();
  const [formData, setFormData] = useState<PDFMetadata>({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
    creationDate: null,
    modificationDate: null,
  });
  const [originalData, setOriginalData] = useState<PDFMetadata | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedFile = getSelectedFile();

  useEffect(() => {
    if (selectedFile) {
      setFormData(selectedFile.metadata);
      setOriginalData(selectedFile.metadata);
    }
  }, [selectedFile?.id]);

  const handleSave = async (currentData: PDFMetadata) => {
    if (!selectedFile) return;

    try {
      const freshDoc = await PDFDocument.load(selectedFile.bytes, { updateMetadata: false });

      freshDoc.setTitle(currentData.title);
      freshDoc.setAuthor(currentData.author);
      freshDoc.setSubject(currentData.subject);

      const keywordArray = currentData.keywords
        ? currentData.keywords.split(',').map(k => k.trim()).filter(k => k)
        : [];
      freshDoc.setKeywords(keywordArray);

      freshDoc.setCreator(currentData.creator);
      freshDoc.setProducer(currentData.producer);

      if (currentData.creationDate) freshDoc.setCreationDate(currentData.creationDate);
      if (currentData.modificationDate) freshDoc.setModificationDate(currentData.modificationDate);

      const pdfBytes = await freshDoc.save();
      await updateOutputFile(selectedFile.id, pdfBytes);
    } catch (error) {
      console.error('Error auto-saving metadata:', error);
    }
  };

  const debouncedSave = (data: PDFMetadata) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleSave(data);
    }, 1000); 
  };

  const handleInputChange = (field: keyof PDFMetadata, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    debouncedSave(newData);
  };

  const handleDateChange = (field: 'creationDate' | 'modificationDate', value: string) => {
    const newData = { ...formData, [field]: value ? new Date(value) : null };
    setFormData(newData);
    debouncedSave(newData);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        handleSave(formData);
    }
  };

  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
      handleSave(originalData);
    }
  };

  const handleResetField = (field: keyof PDFMetadata) => {
    if (originalData) {
      const newData = { ...formData, [field]: originalData[field] };
      setFormData(newData);
      handleSave(newData);
    }
  };

  const isFieldModified = (field: keyof PDFMetadata): boolean => {
    if (!originalData) return false;
    const original = originalData[field];
    const current = formData[field];

    if (field === 'creationDate' || field === 'modificationDate') {
      const origStr = original ? (original as Date).toISOString() : '';
      const currStr = current ? (current as Date).toISOString() : '';
      return origStr !== currStr;
    }

    return original !== current;
  };

  if (!selectedFile) return null;

  return (
    <div className="tab-pane active">
      <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="tab-title">Document Metadata</h2>
          <p className="tab-subtitle">Edit PDF properties and information (auto-saves)</p>
        </div>
        <button
          onClick={handleReset}
          className="button-text"
          style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
          Reset All Fields
        </button>
      </div>

      {outputFiles.length > 1 && (
        <div className="form-group" style={{ marginBottom: '2rem' }}>
          <label className="form-label">Select File to Edit</label>
          <select
            className="form-input file-select"
            value={selectedFileId || ''}
            onChange={(e) => setSelectedFileId(e.target.value)}
          >
            {outputFiles.map(file => (
              <option key={file.id} value={file.id}>
                {file.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <form className="metadata-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="title" className="form-label">Title</label>
            <div className={`input-wrapper ${isFieldModified('title') ? 'modified' : ''}`}>
              <input
                type="text"
                id="title"
                className="form-input"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                onBlur={handleBlur}
                placeholder="Document title"
              />
              <button
                type="button"
                className="reset-field"
                onClick={() => handleResetField('title')}
                title="Reset to original"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="author" className="form-label">Author</label>
            <div className={`input-wrapper ${isFieldModified('author') ? 'modified' : ''}`}>
              <input
                type="text"
                id="author"
                className="form-input"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                onBlur={handleBlur}
                placeholder="Document author"
              />
              <button
                type="button"
                className="reset-field"
                onClick={() => handleResetField('author')}
                title="Reset to original"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="subject" className="form-label">Subject</label>
            <div className={`input-wrapper ${isFieldModified('subject') ? 'modified' : ''}`}>
              <input
                type="text"
                id="subject"
                className="form-input"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                onBlur={handleBlur}
                placeholder="Document subject"
              />
              <button
                type="button"
                className="reset-field"
                onClick={() => handleResetField('subject')}
                title="Reset to original"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="keywords" className="form-label">Keywords</label>
            <div className={`input-wrapper ${isFieldModified('keywords') ? 'modified' : ''}`}>
              <input
                type="text"
                id="keywords"
                className="form-input"
                value={formData.keywords}
                onChange={(e) => handleInputChange('keywords', e.target.value)}
                onBlur={handleBlur}
                placeholder="Comma-separated keywords"
              />
              <button
                type="button"
                className="reset-field"
                onClick={() => handleResetField('keywords')}
                title="Reset to original"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="creator" className="form-label">Creator</label>
            <div className={`input-wrapper ${isFieldModified('creator') ? 'modified' : ''}`}>
              <input
                type="text"
                id="creator"
                className="form-input"
                value={formData.creator}
                onChange={(e) => handleInputChange('creator', e.target.value)}
                onBlur={handleBlur}
                placeholder="Application that created the PDF"
              />
              <button
                type="button"
                className="reset-field"
                onClick={() => handleResetField('creator')}
                title="Reset to original"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="producer" className="form-label">Producer</label>
            <div className={`input-wrapper ${isFieldModified('producer') ? 'modified' : ''}`}>
              <input
                type="text"
                id="producer"
                className="form-input"
                value={formData.producer}
                onChange={(e) => handleInputChange('producer', e.target.value)}
                onBlur={handleBlur}
                placeholder="Application that produced the PDF"
              />
              <button
                type="button"
                className="reset-field"
                onClick={() => handleResetField('producer')}
                title="Reset to original"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="creationDate" className="form-label">Creation Date</label>
            <div className={`input-wrapper ${isFieldModified('creationDate') ? 'modified' : ''}`}>
              <input
                type="datetime-local"
                id="creationDate"
                className="form-input"
                value={formData.creationDate ? formatDateForInput(formData.creationDate) : ''}
                onChange={(e) => handleDateChange('creationDate', e.target.value)}
                onBlur={handleBlur}
              />
              <button
                type="button"
                className="reset-field"
                onClick={() => handleResetField('creationDate')}
                title="Reset to original"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="modificationDate" className="form-label">Modification Date</label>
            <div className={`input-wrapper ${isFieldModified('modificationDate') ? 'modified' : ''}`}>
              <input
                type="datetime-local"
                id="modificationDate"
                className="form-input"
                value={formData.modificationDate ? formatDateForInput(formData.modificationDate) : ''}
                onChange={(e) => handleDateChange('modificationDate', e.target.value)}
                onBlur={handleBlur}
              />
              <button
                type="button"
                className="reset-field"
                onClick={() => handleResetField('modificationDate')}
                title="Reset to original"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MetadataTab;
