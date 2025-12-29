import { PDFDocument } from 'pdf-lib';

export interface PDFMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: Date | null;
  modificationDate: Date | null;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  doc: PDFDocument;
  metadata: PDFMetadata;
}

export type TabType = 'metadata' | 'pages' | 'enhance';

export interface AppState {
  uploadedFiles: UploadedFile[];
  selectedFileId: string | null;
  currentTab: TabType;
}

export interface PageOperation {
  type: 'split' | 'rotate' | 'delete' | 'reorder' | 'extract';
  fileId: string;
  pages?: number[];
  angle?: number;
  newOrder?: number[];
}

export interface EnhanceOperation {
  type: 'watermark' | 'pageNumbers' | 'compress';
  fileId: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  pageNumberPosition?: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right';
}
