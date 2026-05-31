import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logger } from './lib/logger';

window.addEventListener('error', (event) => {
  logger.error(event.error || event.message, 'GlobalError');
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error(event.reason, 'UnhandledRejection');
});

logger.info('Application starting');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
