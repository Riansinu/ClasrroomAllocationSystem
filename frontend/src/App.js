import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Allocation from './pages/Allocation';
import AutoScheduler from './pages/AutoScheduler';
import Timetable from './pages/Timetable';
import About from './pages/About';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="app-body">
          <TopBar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/allocation" element={<Allocation />} />
              <Route path="/auto-scheduler" element={<AutoScheduler />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
