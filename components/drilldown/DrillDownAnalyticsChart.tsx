import React, { useState, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_TOOLTIP, DASHBOARD_CARD, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_IDLE, FILTER_RAIL, SECTION_HEADING } from '../filterUiTokens';
import { formatBudgetMoney } from '../../utils/budgetFinancialMath';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Store, Search, Building2, ShoppingBag } from 'lucide-react';
import { Transaction, AppSettings, Category } from '../../types';

interface DrillDownAnalyticsChartProps {
  familyTransactions: Transaction[];
  currentMonth?: Date;
  settings: AppSettings;
  activeSubcategoryId?: string | null;
  monthLabel: string;
  categories?: Category[];
}

export const DrillDownAnalyticsChart: React.FC<DrillDownAnalyticsChartProps> = ({
  familyTransactions,
  currentMonth,
  activeSubcategoryId,
  monthLabel,
  categories = []
}) => {
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'weekly'>('daily');
  const [chartSeriesFilter, setChartSeriesFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});
  const [payeeSearchQuery, setPayeeSearchQuery] = useState('');
  const totalExpense = useMemo(() => {
    return Math.round(
      familyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    );
  }, [familyTransactions]);

  // Dynamic Aggregated Chart Data (Daily / Weekly & Peak Day)
  const aggregatedChartData = useMemo(() => {
    const daysInMonth = currentMonth 
      ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
      : 30;

    const monthShort = currentMonth 
      ? currentMonth.toLocaleString('ru-RU', { month: 'short' }).replace('.', '')
      : 'сен';

    interface ChartAggItem {
      id: string;
      label: string;
      dayNum?: number;
      expense: number;
      income: number;
    }

    let list: ChartAggItem[] = [];

    if (chartGranularity === 'daily') {
      const map = new Map<number, ChartAggItem>();
      for (let i = 1; i <= daysInMonth; i++) {
        map.set(i, { id: `${i}`, label: `${i} ${monthShort}`, dayNum: i, expense: 0, income: 0 });
      }

      familyTransactions.forEach(t => {
        const d = new Date(t.date);
        const dayNum = d.getDate();
        const existing = map.get(dayNum);
        if (existing) {
          if (t.type === 'expense') existing.expense += t.amount;
          if (t.type === 'income') existing.income += t.amount;
        }
      });

      list = Array.from(map.values());
    } else {
      const weeksCount = Math.ceil(daysInMonth / 7);
      const weekMap = new Map<number, ChartAggItem>();

      for (let w = 1; w <= weeksCount; w++) {
        const startDay = (w - 1) * 7 + 1;
        const endDay = Math.min(daysInMonth, w * 7);
        weekMap.set(w, {
          id: `week_${w}`,
          label: `${startDay}–${endDay} ${monthShort}`,
          expense: 0,
          income: 0
        });
      }

      familyTransactions.forEach(t => {
        const d = new Date(t.date);
        const dayNum = d.getDate();
        const weekIndex = Math.min(weeksCount, Math.floor((dayNum - 1) / 7) + 1);
        const existing = weekMap.get(weekIndex);
        if (existing) {
          if (t.type === 'expense') existing.expense += t.amount;
          if (t.type === 'income') existing.income += t.amount;
        }
      });

      list = Array.from(weekMap.values());
    }

    let peakItem = list[0];
    let maxVolume = 0;

    list.forEach(item => {
      let vol = item.expense + item.income;
      if (chartSeriesFilter === 'expense') vol = item.expense;
      if (chartSeriesFilter === 'income') vol = item.income;

      if (vol > maxVolume) {
        maxVolume = vol;
        peakItem = item;
      }
    });

    const activeCount = list.filter(i => i.expense > 0 || i.income > 0).length || 1;
    const avgDaily = Math.round(totalExpense / (chartGranularity === 'daily' ? activeCount : daysInMonth));

    return { list, peakItem, avgDaily, activeCount };
  }, [familyTransactions, currentMonth, totalExpense, chartGranularity, chartSeriesFilter]);

  // Group spending by category and nested payees
  const categoryPayeeGroupedData = useMemo(() => {
    const totalExp = familyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0) || 1;

    const catMap = new Map<string, {
      catId: string;
      catName: string;
      catColor: string;
      catIcon: string;
      totalSpent: number;
      percentage: number;
      payeesMap: Map<string, { name: string; spent: number; txCount: number }>;
    }>();

    familyTransactions.forEach(t => {
      if (t.type !== 'expense') return;
      const catObj = categories.find(c => c.id === t.category);
      const catId = catObj?.parentId || t.category || 'other';
      const mainCat = categories.find(c => c.id === catId) || catObj;

      const catName = mainCat?.label || 'Другое';
      const catColor = mainCat?.color || '#3E6543';
      const catIcon = mainCat?.icon || 'ShoppingBag';

      const existingCat = catMap.get(catId) || {
        catId,
        catName,
        catColor,
        catIcon,
        totalSpent: 0,
        percentage: 0,
        payeesMap: new Map()
      };

      const amt = Math.round(t.amount);
      existingCat.totalSpent += amt;

      const payeeName = t.payee || t.note || 'Прочее';
      const existingPayee = existingCat.payeesMap.get(payeeName) || {
        name: payeeName,
        spent: 0,
        txCount: 0
      };

      existingPayee.spent += amt;
      existingPayee.txCount += 1;
      existingCat.payeesMap.set(payeeName, existingPayee);

      catMap.set(catId, existingCat);
    });

    const query = payeeSearchQuery.trim().toLowerCase();

    return Array.from(catMap.values())
      .map(catItem => {
        const catPercent = Math.round((catItem.totalSpent / totalExp) * 100);
        let payeesList = Array.from(catItem.payeesMap.values())
          .map(p => ({
            ...p,
            percentage: Math.round((p.spent / (catItem.totalSpent || 1)) * 100)
          }))
          .sort((a, b) => b.spent - a.spent);

        if (query) {
          payeesList = payeesList.filter(p => p.name.toLowerCase().includes(query));
        }

        return {
          ...catItem,
          percentage: catPercent,
          payeesList
        };
      })
      .filter(c => c.payeesList.length > 0 && c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [familyTransactions, categories, payeeSearchQuery]);

  const showExpense=chartSeriesFilter!=='income';
  const showIncome=chartSeriesFilter!=='expense';
  const chartHasValues=aggregatedChartData.list.some(item=>(showExpense&&item.expense>0)||(showIncome&&item.income>0));
  const chartMax=Math.max(0,...aggregatedChartData.list.map(item=>Math.max(showExpense?item.expense:0,showIncome?item.income:0)));
  const axisAmount=(value:number)=>new Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1}).format(value);
  
  return (
    <div data-testid="terra-analytics-desktop" className={DASHBOARD_CARD+" space-y-4"}>
      <div className="min-w-0">
        <h3 className={SECTION_HEADING}>Доходы и расходы</h3>
        <p className="mt-1 text-sm text-[var(--terra-muted)]">{monthLabel}</p>
      </div>
      <div className="terra-chart-toolbar flex flex-wrap items-center justify-between gap-2">
      <div role="group" aria-label="Состав графика" className={FILTER_RAIL+" terra-chart-rail"}>
        {(['all','expense','income'] as const).map(value=><button type="button" key={value}
          onClick={()=>setChartSeriesFilter(value)} aria-pressed={chartSeriesFilter===value}
          className={FILTER_CHIP+' terra-press '+(chartSeriesFilter===value?FILTER_CHIP_ACTIVE:FILTER_CHIP_IDLE)}>
          {value==='all'?'Все':value==='expense'?'Расходы':'Доходы'}
        </button>)}
      </div>
      <div role="group" aria-label="Группировка аналитики" className={FILTER_RAIL+" terra-chart-rail"}>
        {(['daily','weekly'] as const).map(value=><button type="button" key={value}
          onClick={()=>setChartGranularity(value)} aria-pressed={chartGranularity===value}
          className={FILTER_CHIP+' terra-press '+(chartGranularity===value?FILTER_CHIP_ACTIVE:FILTER_CHIP_IDLE)}>
          {value==='daily'?'По дням':'По неделям'}
        </button>)}
      </div>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-[var(--terra-muted)]">
        {showExpense&&<span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[var(--terra-danger-text)]" aria-hidden="true"/>Расходы</span>}
        {showIncome&&<span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[var(--terra-primary-solid)]" aria-hidden="true"/>Доходы</span>}
      </div>
      <div className="terra-overview-chart-plot w-full min-w-0" data-testid="drilldown-chart">
        {chartHasValues?<ResponsiveContainer width="100%" height="100%">
          <BarChart data={aggregatedChartData.list} margin={{top:8,right:8,left:4,bottom:4}} barCategoryGap="18%" accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--terra-border)" strokeDasharray="3 3"/>
            <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={18} tick={{fontSize:12,fill:'var(--terra-muted)'}}/>
            <YAxis domain={[0,chartMax]} width={80} axisLine={false} tickLine={false} tick={({x,y,payload}: {x:number;y:number;payload:{value:number}})=><text x={x} y={y} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--terra-muted)" data-terra-money-tick="true">{axisAmount(payload.value)}</text>} />
            <Tooltip isAnimationActive={false} cursor={{fill:'var(--terra-soft)',opacity:.5}} content={({active,payload})=>{
              if(!active||!payload?.length)return null;
              const item=payload[0].payload as {label:string;expense:number;income:number};
              return <div className={CHART_TOOLTIP}><div>{item.label}</div>{showExpense&&<div>Расходы: −{formatBudgetMoney(item.expense)} ₽</div>}{showIncome&&<div>Доходы: +{formatBudgetMoney(item.income)} ₽</div>}</div>;
            }}/>
            {showExpense&&<Bar dataKey="expense" fill="var(--terra-danger-text)" radius={[3,3,0,0]} maxBarSize={34} isAnimationActive={false}/>}
            {showIncome&&<Bar dataKey="income" fill="var(--terra-primary-solid)" radius={[3,3,0,0]} maxBarSize={34} isAnimationActive={false}/>}
          </BarChart>
        </ResponsiveContainer>:<p role="status" className="h-full flex items-center justify-center text-sm text-[var(--terra-muted)]">За выбранный период операций нет</p>}
      </div>
      {chartHasValues&&<details className="border-t border-[var(--terra-border)]">
        <summary className="min-h-[44px] flex items-center text-sm font-semibold text-[var(--terra-primary-text)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer">Значения графика</summary>
        <div className="max-h-64 overflow-y-auto divide-y divide-[var(--terra-border)]">
          {aggregatedChartData.list.map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm tabular-nums"><span>{item.label}</span>{showExpense&&<span>−{formatBudgetMoney(item.expense)} ₽</span>}{showIncome&&<span>+{formatBudgetMoney(item.income)} ₽</span>}</div>)}
        </div>
      </details>}

      {/* Category Spending Report with Payee Breakdown */}
      <div className="mt-6 pt-5 border-t border-[#E4E0D8] dark:border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-[#2E3230] dark:text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-[#4A7C59]" />
              <span>Расходы по магазинам</span>
            </h4>
            <p className="text-xs text-[#68726B] dark:text-stone-400 mt-0.5">
              Детализация расходов по магазинам и получателям платежей за {monthLabel}
            </p>
          </div>

          {/* Search Bar for Payee */}
          <div className="relative flex items-center min-w-0 sm:min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 text-[#68726B]" />
            <input 
              type="text"
              value={payeeSearchQuery}
              onChange={(e) => setPayeeSearchQuery(e.target.value)}
              aria-label="Поиск магазина или получателя" placeholder="Поиск магазина или получателя"
              className="w-full min-h-[44px] pl-8 pr-3 py-2 rounded-xl bg-[var(--terra-surface)] text-sm border border-[var(--terra-control-border)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
            />
          </div>
        </div>

        {categoryPayeeGroupedData.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#68726B] dark:text-stone-400 bg-white dark:bg-[#202225] rounded-2xl border border-[#E4E0D8] dark:border-white/10">
            Нет транзакций с контрагентами за выбранный период
          </div>
        ) : (
          <div className="space-y-3">
            {categoryPayeeGroupedData.map(group => {
              const isExpanded = Boolean(expandedCatIds[group.catId]);

              return (
                <div 
                  key={group.catId}
                  className="bg-white dark:bg-[#202225] rounded-2xl border border-[#E4E0D8] dark:border-white/10 overflow-hidden"
                >
                  {/* Category Header Bar */}
                  <button
                    type="button"
                    onClick={() => setExpandedCatIds(prev => ({ ...prev, [group.catId]: !prev[group.catId] }))} aria-expanded={isExpanded}
                    className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-white/5 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs"
                        style={{ backgroundColor: group.catColor }}
                      >
                        {group.catName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2E3230] dark:text-white truncate">
                            {group.catName}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#EAF2EC] dark:bg-green-950/40 text-[#2A4C34] dark:text-green-300">
                            {group.payeesList.length}
                          </span>
                        </div>
                        <div className="w-32 bg-[#EAE6DE] dark:bg-stone-800 h-1.5 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full rounded-full transition-all" 
                            style={{ width: `${group.percentage}%`, backgroundColor: group.catColor }} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#2E3230] dark:text-white block tabular-nums">
                          {group.totalSpent.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="text-[10px] text-[#68726B] font-medium">
                          {group.percentage}% от всех трат
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#68726B]" /> : <ChevronDown className="w-4 h-4 text-[#68726B]" />}
                    </div>
                  </button>

                  {/* Expanded Payee Rows */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-[#E4E0D8]/60 dark:border-white/10 bg-[#FAF8F5] dark:bg-[#1A1A1C] p-3 space-y-2"
                      >
                        {group.payeesList.map(payee => (
                          <div 
                            key={payee.name}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#242428] border border-[#E4E0D8]/50 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-7 h-7 rounded-lg bg-[#F5F1EA] dark:bg-[#2C2C2E] flex items-center justify-center text-[#4A7C59] font-bold text-[11px] shrink-0 border border-[#E4E0D8]/40">
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-[#2E3230] dark:text-white truncate">
                                    {payee.name}
                                  </span>
                                  <span className="text-[11px] font-bold text-[#2E3230] dark:text-white tabular-nums shrink-0">
                                    {payee.spent.toLocaleString('ru-RU')} ₽
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-[#68726B] mt-0.5">
                                  <span>{payee.txCount} {payee.txCount === 1 ? 'операция' : payee.txCount < 5 ? 'операции' : 'операций'}</span>
                                  <span>{payee.percentage}% категории</span>
                                </div>
                                <div className="w-full bg-[#EAE6DE] dark:bg-stone-800 h-1 rounded-full overflow-hidden mt-1">
                                  <div 
                                    className="h-full rounded-full bg-[#4A7C59]" 
                                    style={{ width: `${payee.percentage}%` }} 
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrillDownAnalyticsChart;
