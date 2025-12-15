import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/init';
import { Button, Box, Typography, CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';

interface AuthComponentProps {
  onAuthSuccess: (user: any) => void;
}

const AuthComponent: React.FC<AuthComponentProps> = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Проверяем состояние аутентификации при загрузке
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        // Сохраняем roomId в localStorage если он существует
        const storedRoomId = localStorage.getItem('roomId');
        if (!storedRoomId) {
          // Генерируем новый roomId при успешной аутентификации
          const newRoomId = Math.random().toString(36).substring(2, 10);
          localStorage.setItem('roomId', newRoomId);
        }
        onAuthSuccess(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onAuthSuccess]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setUser(user);
      
      // Проверяем наличие roomId в localStorage, если нет - создаем
      const storedRoomId = localStorage.getItem('roomId');
      if (!storedRoomId) {
        const newRoomId = Math.random().toString(36).substring(2, 10);
        localStorage.setItem('roomId', newRoomId);
      }
      
      onAuthSuccess(user);
      toast.success('Успешный вход через Google');
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      toast.error(error.message || 'Ошибка входа через Google');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      toast.success('Вы вышли из системы');
    } catch (error: any) {
      console.error('Ошибка выхода:', error);
      toast.error(error.message || 'Ошибка выхода из системы');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (user) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" p={3}>
        <Typography variant="h6">Добро пожаловать, {user.displayName}!</Typography>
        <Typography variant="body2" color="textSecondary" mb={2}>Ваш email: {user.email}</Typography>
        <Button variant="outlined" color="secondary" onClick={handleSignOut}>
          Выйти
        </Button>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
      <Typography variant="h5" gutterBottom>
        Семейный бюджет
      </Typography>
      <Typography variant="body1" mb={3}>
        Войдите через Google для начала работы
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleGoogleSignIn}
        startIcon={
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
            <path 
              d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" 
              fill="white"
            />
          </svg>
        }
        sx={{
          backgroundColor: '#4285F4',
          '&:hover': {
            backgroundColor: '#3367D6',
          },
          padding: '10px 20px',
          borderRadius: '4px',
          textTransform: 'none',
          fontSize: '16px'
        }}
      >
        Войти через Google
      </Button>
    </Box>
  );
};

export default AuthComponent;