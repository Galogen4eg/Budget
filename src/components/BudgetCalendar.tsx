import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Card, Typography } from '@mui/material';
import { Transaction, RecurringTransaction } from '../types';

interface BudgetCalendarProps {
  month: Date;
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

const BudgetCalendar: React.FC<BudgetCalendarProps> = ({ month, transactions, recurringTransactions }) => {
  // Подготовка событий для календаря
  const calendarEvents = transactions.map(transaction => ({
    title: `${transaction.amount} ₽ - ${transaction.description}`,
    date: transaction.date.toISOString().split('T')[0],
    backgroundColor: transaction.type === 'income' ? '#06d6a0' : '#ef476f',
  }));

  return (
    <Card sx={{ padding: 2, boxShadow: 'var(--shadow)', borderRadius: '8px' }}>
      <Typography variant="h6" gutterBottom>
        Календарь бюджета
      </Typography>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={calendarEvents}
        locale="ru"
        headerToolbar={{
          left: '', // Убираем кнопку "Сегодня"
          center: 'title',
          right: 'prev,next'
        }}
        dayMaxEventRows={true}
        selectable={false}
        editable={false}
        eventStartEditable={false}
        eventResizableFromStart={false}
        eventDragMinDistance={10}
        eventClassNames="budget-calendar-event"
      />
    </Card>
  );
};

export default BudgetCalendar;