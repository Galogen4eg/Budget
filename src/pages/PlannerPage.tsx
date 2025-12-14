import React, { useState } from 'react';
import { Container, Box } from '@mui/material';
import CalendarViewSwitcher from '../components/CalendarViewSwitcher';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

interface PlannerPageProps {
  roomId: string;
}

const PlannerPage: React.FC<PlannerPageProps> = ({ roomId }) => {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  
  const events = [
    {
      id: '1',
      title: 'Встреча с друзьями',
      start: new Date(new Date().setHours(15, 0, 0, 0)),
      end: new Date(new Date().setHours(17, 0, 0, 0)),
    },
    {
      id: '2',
      title: 'Прогулка',
      start: new Date(new Date().setDate(new Date().getDate() + 2)),
      end: new Date(new Date().setDate(new Date().getDate() + 2)),
    },
  ];

  const handleDateClick = (arg: any) => {
    // Convert to local time without UTC offset
    const localDate = new Date(arg.date.valueOf() + arg.date.getTimezoneOffset() * 60000);
    console.log('Date clicked:', localDate);
    // Open event modal here
  };

  const renderEventContent = (eventInfo: any) => {
    return (
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {eventInfo.event.title}
      </div>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
      <Box>
        <CalendarViewSwitcher 
          views={['dayGridMonth', 'timeGridWeek', 'timeGridDay']} 
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          events={events}
          dateClick={handleDateClick}
          eventContent={renderEventContent}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: ''
          }}
          slotDuration="01:00:00"
          selectable={true}ф
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          locale="ru"
        />
      </Box>
    </Container>
  );
};

export default PlannerPage;
