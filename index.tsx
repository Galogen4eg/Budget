import React, { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fix: Explicitly extend React.Component with props and state interfaces to ensure inheritance of 'props' and 'state'.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly initialize state with type.
  state: ErrorBoundaryState = { hasError: false, error: null };

  // Fix: Standard Error Boundary static method to update state after an error occurs.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Fix: Access state correctly through this.state, inherited from React.Component.
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Что-то пошло не так 😔</h2>
          <div style={{ maxWidth: '400px', background: '#FFEEEE', color: 'red', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', wordBreak: 'break-word' }}>
            {this.state.error?.message}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '12px 24px', 
              borderRadius: '16px', 
              background: '#007AFF', 
              color: 'white', 
              border: 'none', 
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,122,255,0.3)'
            }}
          >
            Перезагрузить приложение
          </button>
        </div>
      );
    }

    // Fix: Access children from this.props which is correctly inherited from React.Component.
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);