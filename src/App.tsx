import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BudgetPage } from './pages/BudgetPage';
import { ShoppingListPage } from './pages/ShoppingListPage';
import { PlannerPage } from './pages/PlannerPage';
import { SettingsPage } from './pages/SettingsPage';
import { Header } from './components/Header';
import { auth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from './config/firebase';
import { Toaster } from './mock-toast';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4361ee',
    },
    secondary: {
      main: '#06d6a0',
    },
    error: {
      main: '#ef476f',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    h1: {
      fontFamily: 'Montserrat, sans-serif',
    },
  },
});

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('App initialized');
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, []);

  if (!roomId) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading...</p>
        <button onClick={() => {
          signInWithPopup(auth, new GoogleAuthProvider());
        }}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Navigate to="/budget" replace />} />
          <Route path="/budget" element={<BudgetPage roomId={roomId} />} />
          <Route path="/shopping" element={<ShoppingListPage roomId={roomId} />} />
          <Route path="/planner" element={<PlannerPage roomId={roomId} />} />
          <Route path="/settings" element={<SettingsPage roomId={roomId} />} />
        </Routes>
        <Toaster position="bottom-right" />
      </Router>
    </ThemeProvider>
  );
}

export default App;
