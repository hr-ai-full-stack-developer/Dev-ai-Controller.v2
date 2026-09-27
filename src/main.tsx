import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { AdminProtectiveWrapper } from './components/AdminProtectiveWrapper.js';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminProtectiveWrapper><App /></AdminProtectiveWrapper>
  </StrictMode>,
);
