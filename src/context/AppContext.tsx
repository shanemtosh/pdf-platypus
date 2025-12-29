import React, { createContext, useContext, useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import type { UploadedFile, TabType, PDFMetadata } from '../types';

interface AppContextType {
  inputFiles: UploadedFile[];
  outputFiles: UploadedFile[];
  selectedFileId: string | null;
  currentTab: TabType;
  addFiles: (files: File[]) => Promise<void>;
  removeFile: (fileId: string, type: 'input' | 'output') => void;
  clearAll: () => void;
  setSelectedFileId: (fileId: string | null) => void;
  setCurrentTab: (tab: TabType) => void;
  getSelectedFile: () => UploadedFile | undefined;
  reorderOutputFiles: (newOrder: UploadedFile[]) => void;
  updateOutputFile: (fileId: string, newBytes: Uint8Array, newName?: string) => Promise<void>;
  consolidateOutputToMerge: (mergedBytes: Uint8Array, name: string) => Promise<void>;
  successModal: { isOpen: boolean; message: string };
  showSuccess: (message?: string) => void;
  hideSuccess: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

let fileIdCounter = 0;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inputFiles, setInputFiles] = useState<UploadedFile[]>([]);
  const [outputFiles, setOutputFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('metadata');
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  const showSuccess = useCallback((message = "Operation completed successfully.") => {
    setSuccessModal({ isOpen: true, message });
  }, []);

  const hideSuccess = useCallback(() => {
    setSuccessModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const reorderOutputFiles = useCallback((newOrder: UploadedFile[]) => {
    setOutputFiles(newOrder);
  }, []);

  const updateOutputFile = useCallback(async (fileId: string, newBytes: Uint8Array, newName?: string) => {
    let doc: PDFDocument;
    try {
        doc = await PDFDocument.load(newBytes, { updateMetadata: false });
    } catch (e) {
        console.error("Failed to reload PDF from bytes", e);
        return;
    }
    
    const rawKeywords = doc.getKeywords() || '';
    const keywordsForDisplay = rawKeywords
          ? rawKeywords.split(/\s+/).filter(k => k).join(', ')
          : '';

    const metadata: PDFMetadata = {
          title: doc.getTitle() || '',
          author: doc.getAuthor() || '',
          subject: doc.getSubject() || '',
          keywords: keywordsForDisplay,
          creator: doc.getCreator() || '',
          producer: doc.getProducer() || '',
          creationDate: doc.getCreationDate() || null,
          modificationDate: doc.getModificationDate() || null,
    };
    
    setOutputFiles(prev => prev.map(f => {
        if (f.id === fileId) {
            return {
                ...f,
                name: newName || f.name,
                size: newBytes.length,
                bytes: newBytes,
                doc,
                metadata
            };
        }
        return f;
    }));
  }, []);

  const consolidateOutputToMerge = useCallback(async (mergedBytes: Uint8Array, name: string) => {
    const doc = await PDFDocument.load(mergedBytes, { updateMetadata: false });
    const metadata: PDFMetadata = {
        title: doc.getTitle() || '',
        author: doc.getAuthor() || '',
        subject: doc.getSubject() || '',
        keywords: '',
        creator: 'PDF Platypus',
        producer: 'PDF Platypus',
        creationDate: new Date(),
        modificationDate: new Date(),
    };

    const newFile: UploadedFile = {
        id: `merged-${++fileIdCounter}-${Date.now()}`,
        name,
        size: mergedBytes.length,
        bytes: mergedBytes,
        doc,
        metadata
    };

    setOutputFiles([newFile]);
    setSelectedFileId(newFile.id);
  }, []);

  const addFiles = useCallback(async (files: File[]) => {
    const newFiles: UploadedFile[] = [];

    for (const file of files) {
      if (file.type !== 'application/pdf') continue;
      if (file.size > 50 * 1024 * 1024) continue;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const doc = await PDFDocument.load(bytes, { updateMetadata: false });

        const rawKeywords = doc.getKeywords() || '';
        const keywordsForDisplay = rawKeywords
          ? rawKeywords.split(/\s+/).filter(k => k).join(', ')
          : '';

        const metadata: PDFMetadata = {
          title: doc.getTitle() || '',
          author: doc.getAuthor() || '',
          subject: doc.getSubject() || '',
          keywords: keywordsForDisplay,
          creator: doc.getCreator() || '',
          producer: doc.getProducer() || '',
          creationDate: doc.getCreationDate() || null,
          modificationDate: doc.getModificationDate() || null,
        };

        const fileObj: UploadedFile = {
          id: `file-${++fileIdCounter}-${Date.now()}`,
          name: file.name,
          size: file.size,
          bytes,
          doc,
          metadata,
        };

        newFiles.push(fileObj);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    }

    if (newFiles.length > 0) {
        setInputFiles(prev => [...prev, ...newFiles]);
        setOutputFiles(prev => {
            const updated = [...prev, ...newFiles];
            if (prev.length === 0) setSelectedFileId(newFiles[0].id);
            return updated;
        });
    }
  }, []);

  const removeFile = useCallback((fileId: string, type: 'input' | 'output') => {
    if (type === 'input') {
        setInputFiles(prev => prev.filter(f => f.id !== fileId));
        setOutputFiles(prev => {
            const updated = prev.filter(f => f.id !== fileId);
            setSelectedFileId(current => (current === fileId ? (updated.length > 0 ? updated[0].id : null) : current));
            return updated;
        });
    } else {
        setOutputFiles(prev => {
            const updated = prev.filter(f => f.id !== fileId);
            setSelectedFileId(current => (current === fileId ? (updated.length > 0 ? updated[0].id : null) : current));
            return updated;
        });
    }
  }, []);

  const clearAll = useCallback(() => {
    setInputFiles([]);
    setOutputFiles([]);
    setSelectedFileId(null);
  }, []);

  const getSelectedFile = useCallback(() => {
    return outputFiles.find(f => f.id === selectedFileId);
  }, [outputFiles, selectedFileId]);

  const value: AppContextType = {
    inputFiles,
    outputFiles,
    selectedFileId,
    currentTab,
    addFiles,
    removeFile,
    clearAll,
    setSelectedFileId,
    setCurrentTab,
    getSelectedFile,
    reorderOutputFiles,
    updateOutputFile,
    consolidateOutputToMerge,
    successModal,
    showSuccess,
    hideSuccess,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
