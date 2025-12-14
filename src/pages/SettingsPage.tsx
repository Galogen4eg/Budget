import React, { useState } from 'react';
import { Container, Paper, Typography, Tabs, Tab, Box } from '@mui/material';
import InitialBalanceInput from '../components/InitialBalanceInput';
import SavingsRateInput from '../components/SavingsRateInput';
import RecurringTransactionsSection from '../components/RecurringTransactionsSection';
import DangerButton from '../components/DangerButton';
import TelegramSettingsForm from '../components/TelegramSettingsForm';
import ParticipantsManager from '../components/ParticipantsManager';
import TemplatesManager from '../components/TemplatesManager';

interface SettingsPageProps {
  roomId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const SettingsPage: React.FC<SettingsPageProps> = ({ roomId }) => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 3, mb: 3 }}>
      <Paper elevation={3}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="settings tabs"
          variant="fullWidth"
        >
          <Tab label="Бюджет" id="budget-tab" />
          <Tab label="Покупки" id="shopping-tab" />
          <Tab label="Планировщик" id="planner-tab" />
        </Tabs>
        
        <TabPanel value={activeTab} index={0}>
          <Typography variant="h6" gutterBottom>
            Настройки бюджета
          </Typography>
          <InitialBalanceInput 
            value={50000} 
            onChange={(value) => console.log('New initial balance:', value)} 
          />
          <SavingsRateInput 
            value={10} 
            onChange={(value) => console.log('New savings rate:', value)} 
            placeholder="10" 
          />
          <RecurringTransactionsSection 
            items={[
              { id: 'r1', name: 'Аренда', amount: 15000, category: 'Жильё', dayOfMonth: 1 },
              { id: 'r2', name: 'Интернет', amount: 800, category: 'Связь', dayOfMonth: 15 },
            ]}
            onAdd={() => console.log('Add recurring transaction')}
            onEdit={(item) => console.log('Edit recurring transaction:', item)}
            onDelete={(id) => console.log('Delete recurring transaction:', id)}
          />
          <DangerButton 
            label="Очистить операции" 
            onConfirm={() => console.log('Clear all transactions')}
            confirmationText="Удалить все операции за всё время?"
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={1}>
          <Typography variant="h6" gutterBottom>
            Настройки покупок
          </Typography>
          <TelegramSettingsForm 
            botToken="" 
            chatId=""
            onSave={(settings) => console.log('Save Telegram settings:', settings)}
          />
        </TabPanel>
        
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Настройки планировщика
          </Typography>
          <ParticipantsManager 
            participants={[
              { id: 'p1', name: 'Иван', color: '#ff6b6b' },
              { id: 'p2', name: 'Мария', color: '#4ecdc4' },
            ]}
            onAdd={() => console.log('Add participant')}
            onEdit={(participant) => console.log('Edit participant:', participant)}
            onDelete={(id) => console.log('Delete participant:', id)}
          />
          <TemplatesManager 
            templates={[
              { id: 't1', title: 'Работа', start: new Date(), end: new Date(), participantIds: ['p1'], isTemplate: true },
              { id: 't2', title: 'Тренировка', start: new Date(), end: new Date(), participantIds: ['p2'], isTemplate: true },
            ]} 
            onRowClick={(template) => console.log('Edit template:', template)}
          />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default SettingsPage;