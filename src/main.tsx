// Self-hosted Noto Sans Sinhala for Sinhala text; Latin text uses the system font (SPEC §9.1).
import './ui/styles/fonts.css';
import './ui/styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element in index.html');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
