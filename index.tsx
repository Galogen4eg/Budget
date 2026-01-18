import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';

interface ErrorBoundaryProps {
  // Fix: Make children optional to avoid "missing property" error when used as a JSX wrapper
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fix: Use React.Component to ensure TypeScript correctly recognizes inherited properties like 'props'
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare the state property to ensure TypeScript recognizes it on the class instance
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  // Fix: Add return type for static lifecycle method
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Fix: State and props access is now correctly recognized by TypeScript
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

    // Fix: Accessing children via this.props now recognized correctly
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
    {/* Fix: Usage of ErrorBoundary with children between tags satisfies requirement when property is optional */}
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);