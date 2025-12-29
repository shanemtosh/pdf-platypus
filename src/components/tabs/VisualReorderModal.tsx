import React, { useState, useEffect } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PDFThumbnail from '../common/PDFThumbnail';
import { PDFDocument } from 'pdf-lib';

interface VisualReorderModalProps {
  file: { bytes: Uint8Array; name: string } | null;
  onConfirm: (newOrder: number[]) => void;
  onCancel: () => void;
}

interface PageItem {
  id: string;
  originalIndex: number;
}

const SortablePage = ({ page, bytes }: { page: PageItem; bytes: Uint8Array }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="page-sort-item"
      {...attributes}
      {...listeners}
    >
      <PDFThumbnail pdfBytes={bytes} pageIndex={page.originalIndex} width={100} />
      <div className="page-number-badge">{page.originalIndex + 1}</div>
    </div>
  );
};

const VisualReorderModal: React.FC<VisualReorderModalProps> = ({ file, onConfirm, onCancel }) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPages = async () => {
      if (!file) return;
      try {
        const pdfDoc = await PDFDocument.load(file.bytes);
        const count = pdfDoc.getPageCount();
        const items = Array.from({ length: count }, (_, i) => ({
          id: `page-${i}`,
          originalIndex: i,
        }));
        setPages(items);
      } catch (e) {
        console.error("Error loading PDF for reorder", e);
      } finally {
        setLoading(false);
      }
    };
    loadPages();
  }, [file]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = () => {
    const newOrder = pages.map(p => p.originalIndex);
    onConfirm(newOrder);
  };

  if (!file) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3 className="modal-title">Reorder Pages</h3>
          <button className="modal-close" onClick={onCancel}>x</button>
        </div>
        
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', minHeight: '300px' }}>
          {loading ? (
             <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>Loading pages...</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                <div className="pages-grid">
                  {pages.map((page) => (
                    <SortablePage key={page.id} page={page} bytes={file.bytes} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="modal-footer">
          <button className="button-secondary" onClick={onCancel}>Cancel</button>
          <button className="button-primary" onClick={handleSave}>Save Order</button>
        </div>
      </div>
    </div>
  );
};

export default VisualReorderModal;
