
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
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

// Fixed ErrorBoundary class component by using direct import of Component
// and explicit property definition to ensure base class properties like 'props' and 'state' are correctly recognized
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly define props to fix "Property 'props' does not exist on type 'ErrorBoundary'" error
  public props: ErrorBoundaryProps;
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Fix: Properly accessing state property
    if (this.state.hasError) {
      return (
        <main className="terra-boot-error" role="alert">
          <h2>Не удалось загрузить приложение</h2>
          <p>Обновите страницу. Если ошибка повторяется, проверьте соединение.</p>
          <button type="button" onClick={()=>window.location.reload()}>Попробовать снова</button>
        </main>
      );
    }

    // Fix: Accessing children from props which is now recognized by using direct Component import
    return this.props.children || null;
  }
}

// Suppress background non-fatal Firestore internal assertion rejections in iframe/sandbox preview
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      String(event.reason?.message || event.reason).includes('FIRESTORE') ||
      String(event.reason?.message || event.reason).includes('INTERNAL ASSERTION FAILED')
    )) {
      console.warn("Handled background Firestore assertion:", event.reason);
      event.preventDefault();
    }
  });
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
          <MotionConfig reducedMotion="user"><App /></MotionConfig>
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);