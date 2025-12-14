import React from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, IconButton } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';

const Header: React.FC = () => {
  const location = useLocation();

  const getTabIndex = () => {
    switch (location.pathname) {
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
    <AppBar 
      position="static" 
      sx={{ 
        backgroundColor: '#ffffff', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e0e0e0'
      }}
    >
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            color: '#333',
            fontWeight: 600
          }}
        >
          Семейный бюджет
        </Typography>
        
        <Tabs
          value={getTabIndex()}
          aria-label="main tabs"
          indicatorColor="primary"
          textColor="primary"
          sx={{ minHeight: 'auto', '& .MuiTab-root': { minWidth: 'auto', px: 2 } }}
        >
          <Tab 
            component={Link} 
            to="/budget" 
            label="Бюджет" 
            sx={{ textTransform: 'none', fontSize: '1rem' }} 
          />
          <Tab 
            component={Link} 
            to="/shopping" 
            label="Покупки" 
            sx={{ textTransform: 'none', fontSize: '1rem' }} 
          />
          <Tab 
            component={Link} 
            to="/planner" 
            label="Планировщик" 
            sx={{ textTransform: 'none', fontSize: '1rem' }} 
          />
        </Tabs>
        
        <IconButton
          edge="end"
          color="inherit"
          aria-label="settings"
          component={Link}
          to="/settings"
          sx={{ ml: 1 }}
        >
          <SettingsIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header;