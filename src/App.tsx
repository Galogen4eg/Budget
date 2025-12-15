import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';

// Страницы
import BudgetPage from './pages/BudgetPage';
import ShoppingPage from './pages/ShoppingPage';
import PlannerPage from './pages/PlannerPage';
import SettingsPage from './pages/SettingsPage';

// Компоненты
import AppBar from './components/AppBar';
import AuthComponent from './components/AuthComponent';

// Типы
import { Room } from './types';

// Тема Material UI
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
    fontFamily: "'Inter', sans-serif",
    h1: {
      fontFamily: "'Montserrat', sans-serif",
    },
    h2: {
      fontFamily: "'Montserrat', sans-serif",
    },
    h3: {
      fontFamily: "'Montserrat', sans-serif",
    },
    h4: {
      fontFamily: "'Montserrat', sans-serif",
    },
    h5: {
      fontFamily: "'Montserrat', sans-serif",
    },
    h6: {
      fontFamily: "'Montserrat', sans-serif",
    },
  },
});

const App: React.FC = () => {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const handleAuthSuccess = (user: any) => {
    setAuthenticated(true);
    // Проверяем наличие комнаты в localStorage при успешной аутентификации
    const storedRoomId = localStorage.getItem('roomId');
    if (storedRoomId) {
      // Здесь будет логика загрузки комнаты из Firebase
      // Для демонстрации просто создадим временную комнату
      setRoom({
        id: storedRoomId,
        settings: {
          initialBalance: 0,
          savingsRate: 10,
          roomName: 'Моя семья',
          telegram: {
            botToken: '',
            chatId: ''
          }
        },
        participants: []
      });
    } else {
      // Создаем новую комнату
      const newRoomId = Math.random().toString(36).substring(2, 10);
      localStorage.setItem('roomId', newRoomId);
      setRoom({
        id: newRoomId,
        settings: {
          initialBalance: 0,
          savingsRate: 10,
          roomName: 'Моя семья',
          telegram: {
            botToken: '',
            chatId: ''
          }
        },
        participants: []
      });
    }
    setLoading(false);
  };

  if (!authenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthComponent onAuthSuccess={handleAuthSuccess} />
      </ThemeProvider>
    );
  }

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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <AppBar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/budget" />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/shopping" element={<ShoppingPage />} />
            <Route path="/planner" element={<PlannerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        <Toaster position="bottom-right" />
      </div>
    </ThemeProvider>
  );
};

export default App;