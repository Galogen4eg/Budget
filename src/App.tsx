import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ToastContainer } from 'react-hot-toast';
import { signInAnonymouslyAndSetupRoom } from './config/firebase';

import BudgetPage from './pages/BudgetPage';
import ShoppingPage from './pages/ShoppingPage';
import PlannerPage from './pages/PlannerPage';
import SettingsPage from './pages/SettingsPage';
import Header from './components/Header';

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
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
    h1: {
      fontFamily: [
        'Montserrat',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
    },
    h2: {
      fontFamily: [
        'Montserrat',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
    },
    h3: {
      fontFamily: [
        'Montserrat',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
    },
    h4: {
      fontFamily: [
        'Montserrat',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
    },
    h5: {
      fontFamily: [
        'Montserrat',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
    },
    h6: {
      fontFamily: [
        'Montserrat',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif'
      ].join(','),
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          transition: background-color, color 0.2s ease;
        }
      `,
    },
  },
});

const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Check if we already have a roomId in localStorage
        const existingRoomId = localStorage.getItem('roomId');
        if (existingRoomId) {
          setRoomId(existingRoomId);
          setLoading(false);
          return;
        }

        // Sign in anonymously and setup room
        const { roomId: newRoomId } = await signInAnonymouslyAndSetupRoom();
        setRoomId(newRoomId);
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          Загрузка...
        </div>
      </ThemeProvider>
    );
  }

  if (!roomId) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          Ошибка инициализации приложения
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<BudgetPage roomId={roomId} />} />
          <Route path="/budget" element={<BudgetPage roomId={roomId} />} />
          <Route path="/shopping" element={<ShoppingPage roomId={roomId} />} />
          <Route path="/planner" element={<PlannerPage roomId={roomId} />} />
          <Route path="/settings" element={<SettingsPage roomId={roomId} />} />
        </Routes>
        <ToastContainer position="bottom-right" />
      </Router>
    </ThemeProvider>
  );
};

export default App;