import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { emit } from '@tauri-apps/api/event';
import { router } from './router';
import { isTauri } from './lib/runtime/is-tauri';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

if (isTauri()) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void emit('ui-ready').catch(() => {
        // Keep startup resilient when native event bridge is unavailable.
      });
    });
  });
}
