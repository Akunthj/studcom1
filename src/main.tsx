import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { SubjectProvider } from '@/contexts/SubjectContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SubjectProvider>
      <App />
    </SubjectProvider>
  </StrictMode>
);