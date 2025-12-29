import * as pdfjsLib from 'pdfjs-dist';

export const convertPDFToImages = async (
  pdfBytes: Uint8Array,
  pageIndices: number[] = [],
  format: 'png' | 'jpeg' = 'png'
): Promise<{ blob: Blob; name: string }[]> => {
  const bytesCopy = new Uint8Array(pdfBytes);
  const loadingTask = pdfjsLib.getDocument({ 
    data: bytesCopy,
    disableAutoFetch: true,
    disableStream: true
  });
  
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  
  const pagesToConvert = pageIndices.length > 0 
    ? pageIndices 
    : Array.from({ length: numPages }, (_, i) => i);
    
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const extension = format;
  
  const results: { blob: Blob; name: string }[] = [];
  
  try {
    for (const pageIndex of pagesToConvert) {
      if (pageIndex < 0 || pageIndex >= numPages) continue;
      
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      if (!context) throw new Error('Could not get canvas context');
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      };
      
      await page.render(renderContext).promise;
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Canvas to Blob failed'));
        }, mimeType, 0.95);
      });

      results.push({
        blob,
        name: `page_${pageIndex + 1}.${extension}`
      });
    }
  } finally {
    await pdf.destroy();
  }
  
  return results;
};


import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const downloadImagesAsZip = async (images: { blob: Blob; name: string }[], filename: string) => {
  const zip = new JSZip();
  
  images.forEach(img => {
    zip.file(img.name, img.blob);
  });
  
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, filename);
};
