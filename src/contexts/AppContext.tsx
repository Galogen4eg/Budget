import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { Room } from '../types';
import { getOrCreateRoom } from '../firebase/services';

interface AppContextType {
  user: User | null;
  room: Room | null;
  loading: boolean;
  setAuthUser: (user: User | null) => void;
  refreshRoom: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  const setAuthUser = (user: User | null) => {
    setUser(user);
  };

  const refreshRoom = async () => {
    if (user) {
      try {
        const roomId = localStorage.getItem('roomId');
        if (roomId) {
          const roomData = await getOrCreateRoom(roomId, user.uid);
          setRoom(roomData);
        }
      } catch (error) {
        console.error('Ошибка загрузки комнаты:', error);
      }
    }
  };

  useEffect(() => {
    // Загружаем комнату при изменении пользователя
    const loadRoom = async () => {
      if (user) {
        await refreshRoom();
      } else {
        setRoom(null);
      }
      setLoading(false);
    };

    loadRoom();
  }, [user]);

  const value = {
    user,
    room,
    loading,
    setAuthUser,
    refreshRoom
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};