import React, { Component, ErrorInfo, ReactNode } from 'react';
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

// Fix: Explicitly using React.Component with generics to ensure properties like 'props' and 'state' are correctly inherited and recognized.
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declaring the state property to resolve "Property 'state' does not exist on type 'ErrorBoundary'" errors.
  state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Fix: Correctly initializing state within the constructor.
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Fix: Accessing state via this.state which is now properly defined and inherited.
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Что-то пошло не так 😔</h2>
          <div style={{ maxWidth: '400px', background: '#FFEEEE', color: 'red', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', wordBreak: 'break-word' }}>
            {/* Fix: Accessing error property from the recognized state. */}
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

    // Fix: Accessing children through this.props which is now properly inherited from React.Component.
    return this.props.children || null;
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