
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { TrendingUp, AlertTriangle, Calendar, Wallet, ChevronLeft, RefreshCw, DollarSign } from 'lucide-react';
import { Transaction, AppSettings, MandatoryExpense } from '../types';

interface CashFlowForecastProps {
  transactions: Transaction[];
  settings: AppSettings;
  currentBalance: number;
  savingsRate: number; // New prop
  onClose: () => void;
}

const CashFlowForecast: React.FC<CashFlowForecastProps> = ({ transactions, settings, currentBalance, savingsRate, onClose }) => {
  // 1. Calculate Historical Baselines
  const stats = useMemo(() => {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const recentTx = transactions.filter(t => new Date(t.date) >= lastMonth);
      const incomeTx = recentTx.filter(t => t.type === 'income');
      
      const significantIncomes = incomeTx.filter(t => t.amount > 5000);
      const avgIncome = significantIncomes.length > 0 
          ? significantIncomes.reduce((acc, t) => acc + t.amount, 0) / significantIncomes.length
          : 0;

      const expenseTx = recentTx.filter(t => t.type === 'expense');
      const totalSpent = expenseTx.reduce((acc, t) => acc + t.amount, 0);
      const daysPassed = (now.getTime() - lastMonth.getTime()) / (1000 * 3600 * 24);
      const rawAvgDaily = totalSpent / (daysPassed || 1);
      
      // Rough estimate of discretionary spend
      const mandatoryTotal = (settings.mandatoryExpenses || []).reduce((acc, e) => acc + e.amount, 0);
      const dailyBillBurden = mandatoryTotal / 30;
      const estimatedVariableDaily = Math.max(0, rawAvgDaily - dailyBillBurden);

      return { avgIncome, avgDaily: Math.round(estimatedVariableDaily) || 1000 };
  }, [transactions, settings]);

  // 2. Calculate "Safe Daily Budget" (Matching SmartHeader Logic)
  const safeDailySpend = useMemo(() => {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Calculate Days until salary
      const salaryDates = settings.salaryDates || [1];
      const sortedDates = [...salaryDates].sort((a, b) => a - b);
      let nextSalaryDay = sortedDates.find(d => d > currentDay);
      let targetDate: Date;
      
      if (nextSalaryDay) {
          targetDate = new Date(now.getFullYear(), now.getMonth(), nextSalaryDay);
      } else {
          nextSalaryDay = sortedDates[0];
          targetDate = new Date(now.getFullYear(), now.getMonth() + 1, nextSalaryDay);
      }
      
      const diffTime = targetDate.getTime() - now.getTime();
      const daysUntilSalary = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      // Calculate Remaining Bills (Respecting Manual Paid & Smart Reserve Toggle)
      const unpaidBills = (settings.mandatoryExpenses || []).reduce((sum, exp) => {
           if (settings.enableSmartReserve === false) return sum;

           // Check manual paid status
           const isManuallyPaid = (settings.manualPaidExpenses?.[currentMonthKey] || []).includes(exp.id);
           if (isManuallyPaid) return sum;

           const keywords = exp.keywords || [];
           // Calculate paid amount from transactions
           const currentMonthTx = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'expense';
           });

           const paidAmount = currentMonthTx
               .filter(t => {
                   if (t.linkedExpenseId === exp.id) return true;
                   return keywords.some(k => (t.note || '').toLowerCase().includes(k.toLowerCase()) || (t.rawNote || '').toLowerCase().includes(k.toLowerCase()));
               })
               .reduce((a, b) => a + b.amount, 0);
           
           // Heuristic: if paid > 95% of expected amount, consider it paid
           if (paidAmount >= exp.amount * 0.95) return sum;

           return sum + Math.max(0, exp.amount - paidAmount);
      }, 0);

      // Deduct Savings (Based on SALARY, not Balance)
      const currentMonthSalary = transactions
          .filter(t => {
              const d = new Date(t.date);
              return t.type === 'income' && 
                     t.category === 'salary' && 
                     d.getMonth() === now.getMonth() && 
                     d.getFullYear() === now.getFullYear();
          })
          .reduce((acc, t) => acc + t.amount, 0);

      const savingsAmount = currentMonthSalary * (savingsRate / 100);
      const manualReserved = settings.manualReservedAmount || 0;
      
      const available = currentBalance - unpaidBills - savingsAmount - manualReserved;

      // Safe Daily = Available / Days
      return Math.max(0, Math.floor(available / daysUntilSalary));
  }, [currentBalance, settings, transactions, savingsRate]);

  // 3. Simulation State (Defaults to SAFE amount)
  const [simDailySpend, setSimDailySpend] = useState(safeDailySpend);
  const [simIncome, setSimIncome] = useState(stats.avgIncome);
  const [forecastDays, setForecastDays] = useState(45);

  // 4. Build Projection Data
  const projection = useMemo(() => {
      const data = [];
      let runningBalance = currentBalance;
      const today = new Date();
      const salaryDates = settings.salaryDates || [];
      const mandatory = settings.mandatoryExpenses || [];
      
      let dangerDate = null;
      let minBalance = currentBalance;

      for (let i = 0; i <= forecastDays; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayOfMonth = date.getDate();

          // 1. Subtract Daily Variable Spend
          runningBalance -= simDailySpend;

          // 2. Subtract Mandatory Expenses for this day
          const isCurrentMonth = date.getMonth() === today.getMonth();
          const daysBills = mandatory.filter(m => {
              if (isCurrentMonth && m.day < today.getDate()) return false; // Already passed/handled in initial calc
              return m.day === dayOfMonth;
          });
          
          daysBills.forEach(bill => {
              runningBalance -= bill.amount;
          });

          // 3. Add Income
          if (salaryDates.includes(dayOfMonth)) {
              // Automatically deduct savings from future income in simulation
              const incomeAfterSavings = simIncome * (1 - (savingsRate / 100));
              runningBalance += incomeAfterSavings;
          }

          if (runningBalance < 0 && !dangerDate) {
              dangerDate = date;
          }
          if (runningBalance < minBalance) {
              minBalance = runningBalance;
          }

          data.push({
              date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
              fullDate: date,
              balance: Math.round(runningBalance),
              isSalary: salaryDates.includes(dayOfMonth),
              isBill: daysBills.length > 0
          });
      }

      return { data, dangerDate, minBalance };
  }, [currentBalance, simDailySpend, simIncome, forecastDays, settings, savingsRate]);

  return (
    <div className="space-y-6 w-full">
        {/* Header */}
        <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full text-gray-500 dark:text-white hover:bg-gray-200"><ChevronLeft size={20}/></button>
                    <div>
                        <h3 className="font-black text-xl text-[#1C1C1E] dark:text-white leading-none">Прогноз баланса</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cash Flow Simulator</p>
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 ${projection.dangerDate ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {projection.dangerDate ? <AlertTriangle size={14}/> : <TrendingUp size={14}/>}
                    {projection.dangerDate ? `Минус ${projection.dangerDate.toLocaleDateString()}` : 'Баланс в норме'}
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projection.data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorDanger" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.3} />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#9CA3AF' }} 
                            interval={6}
                        />
                        <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="3 3" />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-white dark:bg-[#2C2C2E] p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 text-xs">
                                            <p className="font-bold mb-1 text-gray-400">{d.date}</p>
                                            <p className={`font-black text-lg ${d.balance < 0 ? 'text-red-500' : 'text-[#1C1C1E] dark:text-white'}`}>
                                                {d.balance.toLocaleString()} {settings.currency}
                                            </p>
                                            <div className="flex gap-2 mt-1">
                                                {d.isSalary && <span className="bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-[9px] font-bold">Зарплата</span>}
                                                {d.isBill && <span className="bg-red-100 text-red-500 px-1.5 py-0.5 rounded text-[9px] font-bold">Счета</span>}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="balance" 
                            stroke={projection.minBalance < 0 ? "#EF4444" : "#3B82F6"} 
                            strokeWidth={3}
                            fill={projection.minBalance < 0 ? "url(#colorDanger)" : "url(#colorBalance)"} 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Simulator Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] shadow-sm border border-white dark:border-white/5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-xl"><Wallet size={18} /></div>
                    <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">Траты в день</span>
                </div>
                <div className="space-y-3">
                    <div className="flex justify-between font-black text-xl text-[#1C1C1E] dark:text-white">
                        {simDailySpend.toLocaleString()} {settings.currency}
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max={Math.max(stats.avgDaily * 3, safeDailySpend * 2, 5000)} 
                        step="100" 
                        value={simDailySpend} 
                        onChange={(e) => setSimDailySpend(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] text-gray-400 font-medium">Безопасный лимит: <b>{safeDailySpend}</b></p>
                        {simDailySpend > safeDailySpend && (
                            <span className="text-[9px] text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">Рискованно</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2rem] shadow-sm border border-white dark:border-white/5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-xl"><DollarSign size={18} /></div>
                    <span className="font-bold text-sm text-[#1C1C1E] dark:text-white">Ожидаемый доход</span>
                </div>
                <div className="space-y-3">
                    <input 
                        type="number" 
                        value={simIncome} 
                        onChange={(e) => setSimIncome(Number(e.target.value))}
                        className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-3 rounded-xl font-black text-xl outline-none text-[#1C1C1E] dark:text-white"
                    />
                    <p className="text-[10px] text-gray-400 font-medium">Прибавляется {(settings.salaryDates || []).join('-го и ')}-го числа</p>
                </div>
            </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-[2rem] flex items-start gap-3">
            <div className="p-2 bg-white dark:bg-white/10 rounded-full text-blue-500 shrink-0"><RefreshCw size={18} /></div>
            <div>
                <h4 className="font-bold text-sm text-blue-700 dark:text-blue-300 mb-1">Совет</h4>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                    {projection.minBalance < 0 
                        ? `При текущих расходах (${simDailySpend} в день) деньги закончатся ${projection.dangerDate?.toLocaleDateString()}. Рекомендуем снизить траты до ${safeDailySpend} ${settings.currency}.`
                        : `Отличная ситуация! Вы укладываетесь в бюджет. Минимальный остаток составит ${projection.minBalance.toLocaleString()} ${settings.currency}.`
                    }
                </p>
            </div>
        </div>
    </div>
  );
};

export default CashFlowForecast;
