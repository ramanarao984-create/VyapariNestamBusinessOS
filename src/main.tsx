import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { AuthProvider } from './auth/AuthProvider.tsx';
import { TenantProvider } from './auth/TenantProvider.tsx';
import { RequireAuth } from './auth/AuthMiddleware.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TenantProvider>
        <RequireAuth>
          <App />
        </RequireAuth>
      </TenantProvider>
    </AuthProvider>
  </StrictMode>,
);

