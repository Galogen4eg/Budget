import React, { useState, useEffect } from 'react';
import { Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { BalanceTileProps, Transaction, CategorySummary } from '../types';
import BudgetCalendar from '../components/BudgetCalendar';
import CategoriesSummary from '../components/CategoriesSummary';
import TransactionHistory from '../components/TransactionHistory';
import TransactionModal from '../components/TransactionModal';
import ExcelUpload from '../components/ExcelUpload';
import TransactionPreviewModal from '../components/TransactionPreviewModal';
import { getTransactions, addTransaction, updateTransaction, deleteTransaction } from '../firebase/services';
import toast from 'react-hot-toast';

// Компонент для отображения плитки баланса
const BalanceTile: React.FC<BalanceTileProps> = ({ title, value, editable = false }) => {
  return (
    <Card sx={{ boxShadow: 'var(--shadow)', borderRadius: '8px' }}>
      <CardContent>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
          {value.toLocaleString('ru-RU')} ₽
        </Typography>
        {editable && (
          <Typography variant="caption" color="textSecondary">
            Только в настройках
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

const BudgetPage: React.FC = () => {
  const [initialBalance] = useState<number>(50000);
  const [currentBalance, setCurrentBalance] = useState<number>(35200);
  const [savingsRate] = useState<number>(10);
  const [savingsAmount] = useState<number>(3520); // currentBalance * (savingsRate / 100)
  const [dailyLimit] = useState<number>(1167); // расчетный ежедневный лимит
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [recurringTransactions] = useState([]);
  const [openTransactionModal, setOpenTransactionModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);
  const [excelTransactions, setExcelTransactions] = useState<Transaction[]>([]);
  const [openExcelPreview, setOpenExcelPreview] = useState(false);

  // Загрузка транзакций при монтировании компонента
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // В реальном приложении здесь будет вызов: 
        // const fetchedTransactions = await getTransactions(roomId);
        // setTransactions(fetchedTransactions);
        
        // Временные данные для демонстрации
        const mockTransactions: Transaction[] = [
          {
            id: '1',
            roomId: 'room1',
            date: new Date(),
            type: 'expense',
            amount: 1500,
            category: 'Продукты',
            description: 'Покупка продуктов в магазине',
            balanceAfter: 33700
          },
          {
            id: '2',
            roomId: 'room1',
            date: new Date(Date.now() - 86400000), // вчера
            type: 'income',
            amount: 50000,
            category: 'Зарплата',
            description: 'Зарплата за октябрь',
            balanceAfter: 35200
          }
        ];
        setTransactions(mockTransactions);
        calculateCategories(mockTransactions);
      } catch (error) {
        console.error('Ошибка загрузки транзакций:', error);
        toast.error('Ошибка загрузки транзакций');
      }
    };

    fetchTransactions();
  }, []);

  // Функция для вычисления категорий
  const calculateCategories = (transactions: Transaction[]) => {
    const categoryMap: { [key: string]: number } = {};
    
    transactions.forEach(tx => {
      if (categoryMap[tx.category]) {
        categoryMap[tx.category] += tx.amount;
      } else {
        categoryMap[tx.category] = tx.amount;
      }
    });
    
    const categoryList: CategorySummary[] = Object.entries(categoryMap).map(([name, amount]) => ({
      name,
      amount
    }));
    
    setCategories(categoryList);
  };

  // Обработчики для транзакций
  const handleAddTransaction = () => {
    setCurrentTransaction(null);
    setOpenTransactionModal(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
    setOpenTransactionModal(true);
  };

  const handleSaveTransaction = async (transaction: Transaction) => {
    try {
      if (transaction.id) {
        // Обновление существующей транзакции
        await updateTransaction(transaction.id, transaction);
        setTransactions(prev => 
          prev.map(tx => tx.id === transaction.id ? transaction : tx)
        );
        toast.success('Транзакция обновлена');
      } else {
        // Добавление новой транзакции
        const newId = await addTransaction(transaction);
        const newTransaction = { ...transaction, id: newId };
        setTransactions(prev => [newTransaction, ...prev]); // Новые транзакции в начало
        toast.success('Транзакция добавлена');
      }
      
      // Пересчитываем категории
      const updatedTransactions = transaction.id 
        ? transactions.map(tx => tx.id === transaction.id ? transaction : tx)
        : [transaction, ...transactions];
      calculateCategories(updatedTransactions);
      
      setOpenTransactionModal(false);
    } catch (error) {
      console.error('Ошибка сохранения транзакции:', error);
      toast.error('Ошибка сохранения транзакции');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(tx => tx.id !== id));
      toast.success('Транзакция удалена');
      
      // Пересчитываем категории
      calculateCategories(transactions.filter(tx => tx.id !== id));
    } catch (error) {
      console.error('Ошибка удаления транзакции:', error);
      toast.error('Ошибка удаления транзакции');
    }
  };

  // Обработчики для Excel
  const handleExcelTransactionsParsed = (transactions: Transaction[]) => {
    setExcelTransactions(transactions);
    setOpenExcelPreview(true);
  };

  const handleImportExcelTransactions = async () => {
    try {
      for (const transaction of excelTransactions) {
        await addTransaction(transaction);
      }
      toast.success(`Импортировано ${excelTransactions.length} транзакций`);
      setOpenExcelPreview(false);
      setExcelTransactions([]);
      
      // Обновляем список транзакций
      const updatedTransactions = [...excelTransactions, ...transactions];
      setTransactions(updatedTransactions);
      calculateCategories(updatedTransactions);
    } catch (error) {
      console.error('Ошибка импорта транзакций:', error);
      toast.error('Ошибка импорта транзакций');
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Плитки для агрегированных данных */}
      <Grid item xs={12} md={3}>
        <BalanceTile 
          title="Начальный остаток" 
          value={initialBalance} 
          editable={false} // Только в настройках
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
          value={savingsAmount} // = currentBalance * (savingsRate / 100)
          editable={false}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <BalanceTile 
          title="Ежедневный лимит" 
          value={dailyLimit} // = (currentBalance - sum(recurringExpenses)) / daysLeftInMonth
          editable={false}
        />
      </Grid>

      {/* Кнопки действий */}
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleAddTransaction}
          >
            Добавить транзакцию
          </Button>
          <ExcelUpload onTransactionsParsed={handleExcelTransactionsParsed} />
        </Box>
      </Grid>

      {/* Календарь бюджета (только месяц) */}
      <Grid item xs={12}>
        <BudgetCalendar 
          month={new Date()} 
          transactions={transactions} 
          recurringTransactions={recurringTransactions}
        />
      </Grid>

      {/* Категории */}
      <Grid item xs={12} md={6}>
        <CategoriesSummary 
          categories={categories}
        />
      </Grid>

      {/* История операций */}
      <Grid item xs={12} md={6}>
        <TransactionHistory 
          transactions={transactions} // Сортировка: новые сверху
          onRowClick={handleEditTransaction} 
          defaultPeriod="currentMonth" // Операции за месяц, выбранный в календаре
        />
      </Grid>
      
      {/* Модальное окно для добавления/редактирования транзакции */}
      <TransactionModal
        open={openTransactionModal}
        transaction={currentTransaction}
        onClose={() => setOpenTransactionModal(false)}
        onSave={handleSaveTransaction}
      />
      
      {/* Модальное окно предварительного просмотра Excel */}
      <TransactionPreviewModal
        open={openExcelPreview}
        transactions={excelTransactions}
        onClose={() => setOpenExcelPreview(false)}
        onConfirm={handleImportExcelTransactions}
      />
    </Grid>
  );
};

export default BudgetPage;