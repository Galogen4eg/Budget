import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography } from '@mui/material';
import BalanceTile from '../components/BalanceTile';
import BudgetCalendar from '../components/BudgetCalendar';
import CategoriesSummary from '../components/CategoriesSummary';
import TransactionHistory from '../components/TransactionHistory';
import SearchBar from '../components/SearchBar';

interface BudgetPageProps {
  roomId: string;
}

export const BudgetPage: React.FC<BudgetPageProps> = ({ roomId }) => {
  // Mock data - these would come from Firebase in real implementation
  const [initialBalance, setInitialBalance] = useState<number>(50000);
  const [currentBalance, setCurrentBalance] = useState<number>(35200);
  const [savingsRate, setSavingsRate] = useState<number>(10);
  const [savingsAmount, setSavingsAmount] = useState<number>(3520);
  const [dailyLimit, setDailyLimit] = useState<number>(1173);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // In a real implementation, these would be loaded from Firebase
  useEffect(() => {
    // Mock loading data
    setTimeout(() => {
      setTransactions([
        { id: '1', date: new Date(), type: 'expense', amount: 1200, category: 'Продукты', description: 'Покупка продуктов' },
        { id: '2', date: new Date(Date.now() - 86400000), type: 'income', amount: 50000, category: 'Зарплата', description: 'Зарплата за октябрь' },
        { id: '3', date: new Date(Date.now() - 172800000), type: 'expense', amount: 3500, category: 'Транспорт', description: 'Проезд' },
      ]);
      
      setRecurringTransactions([
        { id: 'r1', name: 'Аренда', amount: 15000, category: 'Жильё', dayOfMonth: 1 },
        { id: 'r2', name: 'Интернет', amount: 800, category: 'Связь', dayOfMonth: 15 },
      ]);
      
      setCategories([
        { name: 'Продукты', amount: 15200 },
        { name: 'Транспорт', amount: 3500 },
        { name: 'Жильё', amount: 15000 },
        { name: 'Связь', amount: 800 },
      ]);
    }, 500);
  }, []);

  const filteredTransactions = transactions.filter(tx => 
    tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
      <Grid container spacing={3}>
        {/* Balance tiles */}
        <Grid item xs={12} md={3}>
          <BalanceTile 
            title="Начальный остаток" 
            value={initialBalance} 
            editable={false}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <BalanceTile 
            title="Текущий баланс" 
            value={currentBalance} 
            editable={false}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <BalanceTile 
            title="Накопления" 
            value={savingsAmount} 
            editable={false}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <BalanceTile 
            title="Ежедневный лимит" 
            value={dailyLimit} 
            editable={false}
          />
        </Grid>

        {/* Budget calendar */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Календарь бюджета
            </Typography>
            <BudgetCalendar 
              transactions={transactions} 
              recurringTransactions={recurringTransactions}
            />
          </Paper>
        </Grid>

        {/* Categories and Transaction History */}
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Категории
            </Typography>
            <CategoriesSummary categories={categories} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              История операций
            </Typography>
            <SearchBar 
              searchTerm={searchTerm} 
              onSearch={setSearchTerm} 
              placeholder="Поиск операций..." 
            />
            <TransactionHistory 
              transactions={filteredTransactions} 
              onRowClick={() => {}} 
            />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
