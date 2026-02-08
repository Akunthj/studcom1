import NotesMaker from "@/pages/NotesMaker";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';


import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { StudyDashboard } from '@/pages/StudyDashboard';
import { Profile } from '@/pages/Profile';
import { Settings } from '@/pages/Settings';
import NotesCenter from '@/pages/NotesCenter';
import NoteView from '@/pages/NoteView';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/study" element={<StudyDashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/notes" element={<NotesMaker />} />
            <Route path="/notes-center" element={<NotesCenter />} />
            <Route path="/notes-center/:id" element={<NoteView />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
