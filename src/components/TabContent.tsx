import { useApp } from '../context/AppContext';
import MetadataTab from './tabs/MetadataTab';
import PagesTab from './tabs/PagesTab';
import EnhanceTab from './tabs/EnhanceTab';

const TabContent = () => {
  const { outputFiles, currentTab } = useApp();

  if (outputFiles.length === 0) return null;

  return (
    <main className="main">
      <div className="tabs-content">
        <div style={{ display: currentTab === 'metadata' ? 'block' : 'none' }}>
          <MetadataTab />
        </div>
        <div style={{ display: currentTab === 'pages' ? 'block' : 'none' }}>
          <PagesTab />
        </div>
        <div style={{ display: currentTab === 'enhance' ? 'block' : 'none' }}>
          <EnhanceTab />
        </div>
      </div>
    </main>
  );
};

export default TabContent;
