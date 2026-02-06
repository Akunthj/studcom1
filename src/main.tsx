import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { SubjectProvider } from '@/contexts/SubjectContext';
import { ResourceTypeProvider } from '@/contexts/ResourceTypeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SubjectProvider>
      <ResourceTypeProvider>
        <App />
      </ResourceTypeProvider>
    </SubjectProvider>
  </StrictMode>
);