import React from 'react';
import { AppBar as MuiAppBar, Toolbar, Typography, Tabs, Tab, Box, IconButton } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';

const AppBar: React.FC = () => {
  const location = useLocation();

  // Соответствие между путями и индексами вкладок
  const getIndexFromPath = (): number => {
    switch(location.pathname) {
      case '/budget':
        return 0;
      case '/shopping':
        return 1;
      case '/planner':
        return 2;
      default:
        return 0;
    }
  };

  return (
    <MuiAppBar 
      position="static" 
      sx={{ 
        backgroundColor: '#fff', 
        color: 'black',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, fontWeight: 'bold', color: '#4361ee' }}
        >
          Семейный бюджет
        </Typography>
        
        <Tabs
          value={getIndexFromPath()}
          indicatorColor="primary"
          textColor="primary"
          aria-label="app tabs"
          sx={{ minHeight: '48px' }}
        >
          <Tab 
            component={Link} 
            to="/budget" 
            label="Бюджет" 
            sx={{ minHeight: '48px', textTransform: 'none', fontSize: '1rem' }} 
          />
          <Tab 
            component={Link} 
            to="/shopping" 
            label="Покупки" 
            sx={{ minHeight: '48px', textTransform: 'none', fontSize: '1rem' }} 
          />
          <Tab 
            component={Link} 
            to="/planner" 
            label="Планировщик" 
            sx={{ minHeight: '48px', textTransform: 'none', fontSize: '1rem' }} 
          />
        </Tabs>
        
        <IconButton
          size="large"
          edge="end"
          color="inherit"
          aria-label="settings"
          component={Link}
          to="/settings"
          sx={{ ml: 2 }}
        >
          <SettingsIcon />
        </IconButton>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;