import React from 'react';
import { ToggleButton, ToggleButtonGroup, Box } from '@mui/material';

interface CalendarViewSwitcherProps {
  views: ('dayGridMonth' | 'timeGridWeek' | 'timeGridDay')[];
  currentView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  onViewChange: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => void;
}

const CalendarViewSwitcher: React.FC<CalendarViewSwitcherProps> = ({ 
  views, 
  currentView, 
  onViewChange 
}) => {
  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | null
  ) => {
    if (newView !== null) {
      onViewChange(newView);
    }
  };

  const getViewLabel = (view: string) => {
    switch (view) {
      case 'dayGridMonth':
        return 'Месяц';
      case 'timeGridWeek':
        return 'Неделя';
      case 'timeGridDay':
        return 'День';
      default:
        return view;
    }
  };

  return (
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
      <ToggleButtonGroup
        value={currentView}
        exclusive
        onChange={handleViewChange}
        aria-label="calendar view"
      >
        {views.map((view) => (
          <ToggleButton 
            key={view} 
            value={view} 
            aria-label={getViewLabel(view)}
          >
            {getViewLabel(view)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default CalendarViewSwitcher;