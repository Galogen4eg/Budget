import React from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

export const Header: React.FC = () => {
  const location = useLocation();

  const getTabIndex = () => {
    switch (location.pathname) {
      case '/budget': return 0;
      case '/shopping': return 1;
      case '/planner': return 2;
      case '/settings': return 3;
      default: return 0;
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Family Budget
        </Typography>
        <Tabs value={getTabIndex()} indicatorColor="secondary" textColor="inherit">
          <Tab component={Link} to="/budget" label="Budget" />
          <Tab component={Link} to="/shopping" label="Shopping" />
          <Tab component={Link} to="/planner" label="Planner" />
          <Tab component={Link} to="/settings" label="Settings" />
        </Tabs>
      </Toolbar>
    </AppBar>
  );
};
