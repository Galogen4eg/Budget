import React, { useState, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_TOOLTIP, DASHBOARD_CARD, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_IDLE, FILTER_RAIL, SECTION_HEADING } from '../filterUiTokens';
import { formatBudgetMoney, sumMoney } from '../../utils/budgetFinancialMath';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { Transaction, Category } from '../../types';
import {buildPayeeAnalytics,type AnalyticsPoint,type AnalyticsGranularity,type AnalyticsSeriesFilter} from '../../utils/analyticsPresentation';

interface DrillDownAnalyticsChartProps {
  familyTransactions:Transaction[];
  chartData:AnalyticsPoint[];
  chartGranularity:AnalyticsGranularity;
  setChartGranularity:(value:AnalyticsGranularity)=>void;
  chartSeriesFilter:AnalyticsSeriesFilter;
  setChartSeriesFilter:(value:AnalyticsSeriesFilter)=>void;
  monthLabel:string;
  categories?:Category[];
  mobile?:boolean;
}

export const DrillDownAnalyticsChart:React.FC<DrillDownAnalyticsChartProps>=({
  familyTransactions,chartData,chartGranularity,setChartGranularity,chartSeriesFilter,setChartSeriesFilter,monthLabel,categories=[],mobile=false
})=>{
  const [expandedCatIds,setExpandedCatIds]=useState<Record<string,boolean>>({});
  const [payeeSearchQuery,setPayeeSearchQuery]=useState('');
  const reduced=useReducedMotion();
  const categoryPayeeGroupedData=useMemo(()=>buildPayeeAnalytics(familyTransactions,categories,payeeSearchQuery),[familyTransactions,categories,payeeSearchQuery]);
  const showExpense=chartSeriesFilter!=='income';
  const showIncome=chartSeriesFilter!=='expense';
  const chartHasValues=chartData.some(item=>(showExpense&&item.expense>0)||(showIncome&&item.income>0));
  const chartMax=Math.max(0,...chartData.map(item=>Math.max(showExpense?item.expense:0,showIncome?item.income:0)));
  const volume=(item:AnalyticsPoint)=>sumMoney([showExpense?item.expense:0,showIncome?item.income:0]);
  const peak=chartData.reduce<AnalyticsPoint|null>((best,item)=>volume(item)>0&&(!best||volume(item)>volume(best))?item:best,null);
  const axisAmount=(value:number)=>new Intl.NumberFormat('ru-RU',{notation:'compact',maximumFractionDigits:1}).format(value);
  
  return (
    <div data-testid={mobile?"terra-analytics-mobile":"terra-analytics-desktop"} className="min-w-0 space-y-3">
      <section className={DASHBOARD_CARD+" space-y-3"} aria-label="Динамика операций">
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
        {showExpense&&<span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[var(--terra-expense-chart)]" aria-hidden="true"/>Расходы</span>}
        {showIncome&&<span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-[var(--terra-income-chart)]" aria-hidden="true"/>Доходы</span>}
      </div>
      <div className="terra-overview-chart-plot w-full min-w-0" data-testid="drilldown-chart">
        {chartHasValues?<ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{top:8,right:8,left:4,bottom:4}} barCategoryGap="18%" accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--terra-border)" strokeDasharray="3 3"/>
            <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={mobile?16:12} tickFormatter={value=>String(value).split(" ")[0]} tick={{fontSize:12,fill:'var(--terra-muted)'}}/>
            <YAxis domain={[0,chartMax]} width={mobile?62:80} axisLine={false} tickLine={false} tick={({x,y,payload})=><text x={x} y={y} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--terra-muted)" data-terra-money-tick="true">{axisAmount(Number(payload.value))}</text>} />
            <Tooltip isAnimationActive={false} cursor={{fill:'var(--terra-soft)',opacity:.5}} content={({active,payload})=>{
              if(!active||!payload?.length)return null;
              const item=payload[0].payload as {label:string;expense:number;income:number};
              return <div className={CHART_TOOLTIP}><div>{item.label}</div>{showExpense&&<div>Расходы: −{formatBudgetMoney(item.expense)} ₽</div>}{showIncome&&<div>Доходы: +{formatBudgetMoney(item.income)} ₽</div>}</div>;
            }}/>
            {showExpense&&<Bar dataKey="expense" fill="var(--terra-expense-chart)" radius={[3,3,0,0]} maxBarSize={34} isAnimationActive={false}/>}
            {showIncome&&<Bar dataKey="income" fill="var(--terra-income-chart)" radius={[3,3,0,0]} maxBarSize={34} isAnimationActive={false}/>}
          </BarChart>
        </ResponsiveContainer>:<p role="status" className="h-full flex items-center justify-center text-sm text-[var(--terra-muted)]">За выбранный период операций этого типа нет</p>}
      </div>
      {peak&&<p data-testid="analytics-peak" className="flex flex-wrap justify-between gap-2 text-sm text-[var(--terra-muted)]"><span>Пик · {peak.label} · {chartSeriesFilter==='all'?'оборот':chartSeriesFilter==='expense'?'расходы':'доходы'}</span><strong className="text-[var(--terra-ink)] tabular-nums">{formatBudgetMoney(volume(peak))} ₽</strong></p>}
      {chartHasValues&&<details className="border-t border-[var(--terra-border)]">
        <summary className="min-h-[44px] flex items-center text-sm font-semibold text-[var(--terra-primary-text)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] cursor-pointer">Значения графика</summary>
        <div data-testid="analytics-values" className="max-h-64 overflow-y-auto overscroll-y-contain divide-y divide-[var(--terra-border)]">
          {chartData.map(item=><div key={item.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm tabular-nums"><span>{item.label}</span>{showExpense&&<span>−{formatBudgetMoney(item.expense)} ₽</span>}{showIncome&&<span>+{formatBudgetMoney(item.income)} ₽</span>}</div>)}
        </div>
      </details>}

      </section>
      <section className={DASHBOARD_CARD+" space-y-3"} aria-label="Расходы по магазинам">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={SECTION_HEADING}>Расходы по магазинам</h3>
          <label className="relative min-w-0 w-full sm:max-w-xs">
            <Search size={16} aria-hidden="true" className="absolute left-3 top-3.5 text-[var(--terra-muted)]"/>
            <input type="search" value={payeeSearchQuery} onChange={e=>{setPayeeSearchQuery(e.target.value);setExpandedCatIds({});}}
              aria-label="Поиск магазина или получателя" placeholder="Поиск магазина или получателя"
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl bg-[var(--terra-surface)] text-sm border border-[var(--terra-control-border)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"/>
          </label>
        </div>
        {categoryPayeeGroupedData.length===0?<p role="status" className="py-4 text-sm text-center text-[var(--terra-muted)]">{payeeSearchQuery.trim()&&familyTransactions.some(t=>t.type==='expense'&&t.amount>0)?'Ничего не найдено':'За выбранный период расходов нет'}</p>:
          <div className="divide-y divide-[var(--terra-border)]">
            {categoryPayeeGroupedData.map(group=>{
              const open=expandedCatIds[group.catId]??Boolean(payeeSearchQuery.trim());
              return <div key={group.catId}>
                <button type="button" data-testid="analytics-category-toggle" aria-expanded={open} onClick={()=>setExpandedCatIds(old=>({...old,[group.catId]:!open}))}
                  className="w-full min-h-[56px] py-3 flex items-center gap-3 text-left rounded-lg focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] terra-press">
                  <span aria-hidden="true" className="w-2.5 h-2.5 shrink-0 rounded-full" style={{backgroundColor:group.catColor}}/>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-sm text-[var(--terra-ink)] [overflow-wrap:anywhere]">{group.catName}</span>
                    <span className="block text-xs text-[var(--terra-muted)]">{payeeSearchQuery.trim()?`Найдено: ${group.payeesList.length} из ${group.payeeCount}`:`Получателей: ${group.payeeCount}`}</span>
                    <span aria-hidden="true" className="block mt-2 h-1.5 rounded-full bg-[var(--terra-soft)] overflow-hidden"><span className="block h-full rounded-full terra-progress" style={{width:group.percentage+'%',backgroundColor:group.catColor}}/></span>
                  </span>
                  <span className="text-right min-w-0 max-w-[46%]">
                    <span className="block font-semibold text-sm tabular-nums [overflow-wrap:anywhere]">{formatBudgetMoney(group.totalSpent)} ₽</span>
                    <span className="text-xs text-[var(--terra-muted)]">{Math.round(group.percentage)}%</span>
                  </span>
                  <ChevronDown size={16} aria-hidden="true" className={'shrink-0 text-[var(--terra-muted)] motion-reduce:transition-none transition-transform '+(open?'rotate-180':'')}/>
                </button>
                <AnimatePresence initial={false}>
                  {open&&<motion.div initial={reduced?false:{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduced?0:.18}} className="overflow-hidden">
                    <div className="divide-y divide-[var(--terra-border)] border-t border-[var(--terra-border)] pl-4">
                      {group.payeesList.map(payee=><div key={payee.name} data-testid="analytics-payee-row" className="py-3 flex gap-3 items-center">
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium [overflow-wrap:anywhere]">{payee.name}</p><p className="text-xs text-[var(--terra-muted)]">Операций: {payee.txCount}</p></div>
                        <div className="min-w-0 max-w-[48%] text-right"><p className="text-sm font-semibold tabular-nums [overflow-wrap:anywhere]">{formatBudgetMoney(payee.spent)} ₽</p><p className="text-xs text-[var(--terra-muted)]">{Math.round(payee.percentage)}% категории</p></div>
                      </div>)}
                    </div>
                  </motion.div>}
                </AnimatePresence>
              </div>;
            })}
          </div>}
      </section>
    </div>
  );
};

export default DrillDownAnalyticsChart;
