import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface PDFThumbnailProps {
  pdfBytes: Uint8Array;
  pageIndex: number;
  width?: number;
  className?: string;
}

const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ pdfBytes, pageIndex, width = 150, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadingTaskRef = useRef<pdfjsLib.PDFDocumentLoadingTask | null>(null);

  useEffect(() => {
    let active = true;

    const renderPage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const bytesCopy = new Uint8Array(pdfBytes);
        const loadingTask = pdfjsLib.getDocument({ 
            data: bytesCopy,
            disableAutoFetch: true,
            disableStream: true
        });
        
        loadingTaskRef.current = loadingTask;
        const pdf = await loadingTask.promise;
        
        if (!active) return;

        const page = await pdf.getPage(pageIndex + 1);
        
        if (!active) return;

        const viewport = page.getViewport({ scale: 1.0 });
        const scale = width / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            const renderContext = {
              canvasContext: context,
              viewport: scaledViewport,
              canvas: canvas
            };
            
            await page.render(renderContext).promise;
          }
        }
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'RenderingCancelledException' || error.name === 'WorkerMessageHandler') {
            return;
        }
        console.error('Error rendering thumbnail:', error);
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };

    renderPage();

    return () => {
      active = false;
      if (loadingTaskRef.current) {
        loadingTaskRef.current.destroy().catch(() => {});
      }
    };
  }, [pdfBytes, pageIndex, width]);

  return (
    <div 
      className={`thumbnail-container ${className}`} 
      style={{ 
        width, 
        height: 'auto', 
        minHeight: width * 1.3,
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
        position: 'relative'
      }}
    >
      {loading && (
          <div style={{ position: 'absolute' }}>
            <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2, borderColor: '#ccc', borderTopColor: '#666' }}></div>
          </div>
      )}
      {error && <span style={{ fontSize: '0.75rem', color: '#dc2626', textAlign: 'center', padding: '0.5rem' }}>Error</span>}
      <canvas 
        ref={canvasRef} 
        style={{ 
          display: (loading || error) ? 'none' : 'block',
          width: '100%', 
          height: 'auto' 
        }} 
      />
    </div>
  );
};

export default PDFThumbnail;
