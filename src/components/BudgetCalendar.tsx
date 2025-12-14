import React from 'react';
import { Paper, Typography } from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

interface BudgetCalendarProps {
  transactions: any[];
  recurringTransactions: any[];
  month?: Date;
}

const BudgetCalendar: React.FC<BudgetCalendarProps> = ({ 
  transactions, 
  recurringTransactions,
  month = new Date()
}) => {
  // Prepare calendar events from transactions
  const calendarEvents = transactions.map((tx, index) => ({
    id: `tx-${tx.id || index}`,
    title: `${tx.amount} ₽`,
    date: tx.date.toISOString().split('T')[0],
    backgroundColor: tx.type === 'income' ? '#06d6a0' : '#ef476f',
  }));

  // Add recurring transactions as events (for visualization)
  const recurringEvents = recurringTransactions.map((rt, index) => {
    // Get the date for this recurring transaction in the current month
    const currentMonth = month.getMonth();
    const currentYear = month.getFullYear();
    const dayOfMonth = rt.dayOfMonth;
    
    // Create a date for this recurring transaction in the current month
    const date = new Date(currentYear, currentMonth, dayOfMonth);
    
    return {
      id: `rec-${rt.id || index}`,
      title: `${rt.amount} ₽`,
      date: date.toISOString().split('T')[0],
      backgroundColor: '#4361ee',
    };
  });

  const allEvents = [...calendarEvents, ...recurringEvents];

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={allEvents}
        locale="ru"
        headerToolbar={{
          left: '',
          center: 'title',
          right: ''
        }}
        dayCellContent={(args) => {
          return (
            <div className="fc-daygrid-day-frame">
              <div className="fc-daygrid-day-number">{args.dayNumberText}</div>
              {allEvents.some(event => 
                event.date === args.date.toISOString().split('T')[0]
              ) && (
                <div style={{ marginTop: '4px' }}>
                  <span 
                    style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      backgroundColor: allEvents.find(e => 
                        e.date === args.date.toISOString().split('T')[0]
                      )?.backgroundColor || '#ccc',
                      display: 'inline-block' 
                    }}
                  ></span>
                </div>
              )}
            </div>
          );
        }}
      />
    </Paper>
  );
};

export default BudgetCalendar;