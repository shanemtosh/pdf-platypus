import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Header from './components/Header';
import Tabs from './components/Tabs';
import FileList from './components/FileList';
import Upload from './components/Upload';
import TabContent from './components/TabContent';
import Footer from './components/Footer';
import SuccessModal from './components/common/SuccessModal';
import { useApp } from './context/AppContext';
import './App.css';

function AppContent() {
  const { successModal, hideSuccess } = useApp();
  
  return (
    <div className="container">
      <Header />
      <Tabs />
      <FileList />
      <Upload />
      <TabContent />
      <Footer />
      <SuccessModal 
        isOpen={successModal.isOpen} 
        onClose={hideSuccess} 
        message={successModal.message} 
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <div className="grain"></div>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}

export default App;
