import { useApp } from '../context/AppContext';
import { useEffect, useRef } from 'react';

const Tabs = () => {
  const { currentTab, setCurrentTab, outputFiles } = useApp();
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateSlider = () => {
        const activeButton = document.querySelector('.tab-button.active');
        const nav = document.querySelector('.tabs-nav');
    
        if (activeButton && nav && sliderRef.current) {
          const navRect = nav.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          const left = buttonRect.left - navRect.left;
          const width = buttonRect.width;
    
          sliderRef.current.style.left = `${left}px`;
          sliderRef.current.style.width = `${width}px`;
          sliderRef.current.style.opacity = '1';
        }
    };

    updateSlider();
    setTimeout(updateSlider, 50);

    window.addEventListener('resize', updateSlider);
    return () => window.removeEventListener('resize', updateSlider);
  }, [currentTab, outputFiles.length]);

  if (outputFiles.length === 0) return null;

  return (
    <nav className="tabs-nav">
      <div className="tabs-slider" ref={sliderRef} style={{ opacity: 0 }}></div>
      <button
        className={`tab-button ${currentTab === 'metadata' ? 'active' : ''}`}
        onClick={() => setCurrentTab('metadata')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        <span>Metadata</span>
      </button>
      <button
        className={`tab-button ${currentTab === 'pages' ? 'active' : ''}`}
        onClick={() => setCurrentTab('pages')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <span>Pages</span>
      </button>
      <button
        className={`tab-button ${currentTab === 'enhance' ? 'active' : ''}`}
        onClick={() => setCurrentTab('enhance')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6"></path>
        </svg>
        <span>Enhance</span>
      </button>
    </nav>
  );
};

export default Tabs;
