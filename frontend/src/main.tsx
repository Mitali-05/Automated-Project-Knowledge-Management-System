window.onerror = function(message, source, lineno, colno, error) {
  document.body.innerHTML = `<div style="color:red; padding:20px; background:white; z-index:9999; position:absolute; top:0; left:0; width:100%; height:100%;"><pre>Error: ${message}\nSource: ${source}\nLine: ${lineno}\nStack: ${error?.stack}</pre></div>`;
};

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router/index';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { BackendDownAlert } from './components/ui/BackendDownAlert';
import { ActivityTracker } from './components/ui/ActivityTracker';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <BackendDownAlert />
        <ActivityTracker />
        <RouterProvider router={router} />
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>
);
