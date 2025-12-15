import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { PlannerEvent, Participant } from '../types';
import { 
  getPlannerEvents, 
  addPlannerEvent, 
  updatePlannerEvent, 
  deletePlannerEvent,
  getParticipants
} from '../firebase/services';
import toast from 'react-hot-toast';

const PlannerPage: React.FC = () => {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      try {
        // В реальном приложении roomId будет получаться из контекста или localStorage
        const roomId = localStorage.getItem('roomId') || 'room1';
        
        // Загрузка событий
        const loadedEvents = await getPlannerEvents(roomId);
        setEvents(loadedEvents);
        
        // Загрузка участников
        const loadedParticipants = await getParticipants(roomId);
        setParticipants(loadedParticipants);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        toast.error('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Обработчик клика по ячейке календаря
  const handleDateClick = (info: any) => {
    // Конвертация в локальное время без смещения UTC
    const localDate = new Date(info.date.valueOf() + info.date.getTimezoneOffset() * 60000);
    alert(`Создать событие на ${localDate.toLocaleString('ru-RU')}`);
  };
  
  // Рендеринг содержимого события
  const renderEventContent = (eventInfo: any) => {
    // Определяем цвет события на основе участников
    const participant = participants.find(p => 
      eventInfo.event.extendedProps.participantIds?.includes(p.id)
    );
    const backgroundColor = participant ? participant.color : '#4361ee';
    
    return (
      <Box 
        sx={{ 
          backgroundColor,
          color: 'white', 
          padding: '2px 4px', 
          borderRadius: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        <Typography variant="caption" component="span">
          {eventInfo.event.title}
        </Typography>
      </Box>
    );
  };

  if (loading) {
    return (
      <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px', height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Планировщик
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" height="70vh">
            <Typography>Загрузка...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px', height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Планировщик
        </Typography>
        <Box sx={{ height: '70vh' }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
            initialView="dayGridMonth"
            events={events.map(event => ({
              id: event.id,
              title: event.title,
              start: event.start,
              end: event.end,
              extendedProps: {
                participantIds: event.participantIds
              }
            }))}
            locale="ru"
            headerToolbar={{
              left: 'prev,next',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            dayMaxEventRows={true}
            selectable={true}
            dateClick={handleDateClick}
            eventContent={renderEventContent}
            slotDuration="01:00:00" // Шаг 1 час в режиме недели
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default PlannerPage;