import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const parsePageRange = (rangeStr: string, maxPages: number): number[] => {
  const pages = new Set<number>();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
      if (isNaN(start) || isNaN(end)) continue;
      for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
        pages.add(i - 1);
      }
    } else {
      const pageNum = parseInt(trimmed);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        pages.add(pageNum - 1);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
};

export const downloadPDF = (pdfBytes: Uint8Array, filename: string): void => {
  const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const mergePDFs = async (files: Array<{ name: string; bytes: Uint8Array }>): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const srcDoc = await PDFDocument.load(file.bytes, { updateMetadata: false });
    const pageCount = srcDoc.getPageCount();
    const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
    const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
    copiedPages.forEach(page => mergedPdf.addPage(page));
  }

  mergedPdf.setTitle('Merged PDF');
  mergedPdf.setProducer('PDF Platypus');
  mergedPdf.setCreator('PDF Platypus');
  mergedPdf.setCreationDate(new Date());

  return await mergedPdf.save();
};

export const splitPDF = async (
  bytes: Uint8Array,
  pageIndices: number[]
): Promise<Uint8Array> => {
  const srcDoc = await PDFDocument.load(bytes, { updateMetadata: false });
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcDoc, pageIndices);
  copiedPages.forEach(page => newPdf.addPage(page));

  newPdf.setProducer('PDF Platypus');
  newPdf.setCreationDate(new Date());

  return await newPdf.save();
};

export const rotatePDF = async (
  bytes: Uint8Array,
  pageIndices: number[],
  angle: number
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });

  pageIndices.forEach(index => {
    const page = pdfDoc.getPage(index);
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees((currentRotation + angle) % 360));
  });

  return await pdfDoc.save();
};

export const deletePagesFromPDF = async (
  bytes: Uint8Array,
  pagesToDelete: number[]
): Promise<Uint8Array> => {
  const srcDoc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pageCount = srcDoc.getPageCount();
  const allPages = Array.from({ length: pageCount }, (_, i) => i);
  const pagesToKeep = allPages.filter(i => !pagesToDelete.includes(i));

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcDoc, pagesToKeep);
  copiedPages.forEach(page => newPdf.addPage(page));

  newPdf.setProducer('PDF Platypus');
  newPdf.setCreationDate(new Date());

  return await newPdf.save();
};

export const reorderPDF = async (
  bytes: Uint8Array,
  newOrder: number[]
): Promise<Uint8Array> => {
  const srcDoc = await PDFDocument.load(bytes, { updateMetadata: false });
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcDoc, newOrder);
  copiedPages.forEach(page => newPdf.addPage(page));

  newPdf.setProducer('PDF Platypus');
  newPdf.setCreationDate(new Date());

  return await newPdf.save();
};

export const addWatermarkToPDF = async (
  bytes: Uint8Array,
  text: string,
  opacity: number = 0.5
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  pages.forEach(page => {
    const { width, height } = page.getSize();
    const fontSize = Math.min(width, height) / 10;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity,
      rotate: degrees(-45),
    });
  });

  return await pdfDoc.save();
};

export const addPageNumbersToPDF = async (
  bytes: Uint8Array,
  position: 'bottom-center' | 'bottom-right' | 'top-center' | 'top-right' = 'bottom-center'
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const text = `${index + 1}`;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    let x: number, y: number;
    const margin = 30;

    if (position === 'bottom-center') {
      x = (width - textWidth) / 2;
      y = margin;
    } else if (position === 'bottom-right') {
      x = width - textWidth - margin;
      y = margin;
    } else if (position === 'top-center') {
      x = (width - textWidth) / 2;
      y = height - margin - fontSize;
    } else {
      x = width - textWidth - margin;
      y = height - margin - fontSize;
    }

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  });

  return await pdfDoc.save();
};

export const compressPDF = async (bytes: Uint8Array): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });

  return await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
};
