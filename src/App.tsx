import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import CreateEvent from './pages/CreateEvent';
import OrganizerDashboard from './pages/OrganizerDashboard';
import BigScreen from './pages/BigScreen';
import AttendeeRegistration from './pages/AttendeeRegistration';
import PassView from './pages/PassView';
import GateStaffView from './pages/GateStaffView';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function AppContent() {
  const location = useLocation();
  const isScreen = location.pathname.startsWith('/screen');
  const isRegister = location.pathname.startsWith('/register');
  const isPass = location.pathname.startsWith('/pass');
  const isGate = location.pathname.startsWith('/gate');

  const hideNavFooter = isScreen || isRegister || isPass || isGate;

  return (
    <div className={`min-h-screen flex flex-col bg-background text-white font-body selection:bg-go/30 ${isScreen ? 'cursor-none overflow-hidden' : ''}`}>
      {!hideNavFooter && <Navbar />}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/organizer/:eventId" element={<OrganizerDashboard />} />
          <Route path="/screen/:eventId" element={<BigScreen />} />
          <Route path="/register/:eventId" element={<AttendeeRegistration />} />
          <Route path="/pass/:passId" element={<PassView />} />
          <Route path="/gate/:eventId/:gateId" element={<GateStaffView />} />
        </Routes>
      </main>
      {!hideNavFooter && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
