import { Buffer } from 'buffer';
// @ts-expect-error process types are missing
import * as process from 'process';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Buffer: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process: any;
  }
}

window.global = window;
window.Buffer = Buffer;
window.process = process;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
