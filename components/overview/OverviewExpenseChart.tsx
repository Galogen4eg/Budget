import React from 'react';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronRight } from 'lucide-react';
import { CHART_TOOLTIP, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_IDLE, FILTER_RAIL, SECTION_HEADING } from '../filterUiTokens';

type Scale = 'day' | 'week' | 'month';
type Point = { label: string; fullLabel?: string; dateObj: Date; amount: number };
interface OverviewExpenseChartProps {
  scale: Scale;
  setScale: (value: Scale) => void;
  points: Point[];
  subtitle: string;
  average: number;
  maximum: number;
  limit: number;
  limitLabel: string;
  complianceText: string;
  privacyMode: boolean;
  formatAmount: (value: number) => string;
  onPointSelect: (point: Point) => void;
  onOpenBudget: () => void;
  mobile?: boolean;
}
const scales: Scale[] = ['day', 'week', 'month'];
const scaleLabels = { day: 'День', week: 'Неделя', month: 'Месяц' };
const axisAmount = (value: number) => new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export function OverviewExpenseChart({
  scale, setScale, points, subtitle, average, maximum, limit, limitLabel,
  complianceText, privacyMode, formatAmount, onPointSelect, onOpenBudget, mobile = false
}: OverviewExpenseChartProps) {
  const hasExpenses = points.some(point => point.amount > 0);
  const ceiling = Math.max(0, limit, ...points.map(point => point.amount));
  const amount = (value: number) => privacyMode ? '••••••' : formatAmount(value) + ' ₽';
  const selectFromChart = (event: unknown) => {
    const label = (event as {activeLabel?: unknown} | null)?.activeLabel;
    const point = points.find(item => item.label === label);
    if (point) onPointSelect(point);
  };
  return <>
    <div data-overview-section-head className="terra-chart-toolbar terra-overview-section-head flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h3 className={SECTION_HEADING}>Динамика расходов</h3>
        <p className="mt-0.5 text-xs text-[var(--terra-muted)]">{subtitle}</p>
      </div>
      <div role="group" aria-label="Период динамики расходов" className={FILTER_RAIL+" terra-chart-rail"}>
        {scales.map(value => <button key={value} type="button" aria-pressed={scale === value}
          className={FILTER_CHIP + ' terra-press ' + (scale === value ? FILTER_CHIP_ACTIVE : FILTER_CHIP_IDLE)}
          onClick={() => setScale(value)}>{scaleLabels[value]}</button>)}
      </div>
    </div>
    <dl data-overview-chart-metrics className="terra-overview-chart-metrics grid gap-x-3 gap-y-2 text-sm tabular-nums">
      <div className="min-w-0"><dt className="text-[var(--terra-muted)]">Среднее</dt><dd className="text-base font-semibold text-[var(--terra-ink)] [overflow-wrap:anywhere]">{amount(average)}</dd></div>
      <div className="min-w-0"><dt className="text-[var(--terra-muted)]">Максимум</dt><dd className="text-base font-semibold text-[var(--terra-ink)] [overflow-wrap:anywhere]">{amount(maximum)}</dd></div>
      {!privacyMode && limit > 0 && <div className="min-w-0"><dt className="text-[var(--terra-muted)]">Лимит</dt><dd className="font-semibold text-[var(--terra-offline-text)]">{amount(limit)}</dd></div>}
    </dl>
    <div data-testid="overview-chart-plot" className={privacyMode||!hasExpenses?'min-h-[76px] flex items-center justify-center w-full min-w-0':'terra-overview-chart-plot w-full min-w-0'}>
      {privacyMode ? <p role="status" className="text-center px-2 py-3 text-sm text-[var(--terra-muted)]">График скрыт в режиме приватности</p> :
        !hasExpenses ? <p role="status" className="text-center px-2 py-3 text-sm text-[var(--terra-muted)]">За выбранный период расходов нет</p> :
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{top: 8, right: 4, bottom: 0, left: 4}} accessibilityLayer={false}
            onClick={selectFromChart} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--terra-border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={mobile ? 20 : 12}
              tick={{ fontSize: 12, fill: 'var(--terra-muted)' }} />
            <YAxis domain={[0, ceiling]} axisLine={false} tickLine={false} width={mobile ? 62 : 80}
              tick={({x,y,payload})=><text x={x} y={y} textAnchor="end" dominantBaseline="central" fontSize={12} fill="var(--terra-muted)" data-terra-money-tick="true">{axisAmount(Number(payload.value))}</text>} />
            {limit > 0 && <ReferenceLine y={limit} stroke="var(--terra-offline-text)" strokeDasharray="4 4" />}
            <Tooltip isAnimationActive={false} cursor={{fill:'var(--terra-soft)',opacity:.55}}
              content={({active,payload}) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as Point;
                return <div className={CHART_TOOLTIP}><div>{point.fullLabel || point.label}</div><strong className="tabular-nums">{amount(point.amount)}</strong></div>;
              }} />
            <Bar dataKey="amount" name="Расходы" fill="var(--terra-primary-solid)" radius={[3,3,0,0]} maxBarSize={38} isAnimationActive={false} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>}
    </div>
    <div className="terra-overview-chart-footer border-t border-[var(--terra-border)]">
    {!privacyMode && hasExpenses && <details className="terra-overview-chart-disclosure">
      <summary className="min-h-[44px] flex items-center cursor-pointer rounded-lg text-sm font-semibold text-[var(--terra-primary-text)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">Значения графика</summary>
      <div data-testid="overview-chart-values" className="max-h-64 overflow-y-auto overscroll-y-contain divide-y divide-[var(--terra-border)]">
        {points.map((point,index) => <button key={index} type="button" onClick={() => onPointSelect(point)}
          className="min-h-[44px] w-full flex flex-wrap items-center justify-between gap-2 text-left px-2 py-2 text-sm rounded-lg hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
          <span>{point.fullLabel || point.label}</span><span className="font-semibold tabular-nums break-words">{amount(point.amount)}</span>
        </button>)}
      </div>
    </details>}
    <button type="button" onClick={onOpenBudget} className="terra-overview-chart-budget min-h-[44px] px-2 inline-flex items-center justify-end gap-1 text-sm font-semibold rounded-lg text-[var(--terra-primary-text)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]">
        К бюджету<ChevronRight size={15} aria-hidden="true"/>
      </button>
      {!privacyMode && <span className="terra-overview-chart-note text-xs text-[var(--terra-muted)]">{complianceText}</span>}
    </div>
  </>;
}
export default OverviewExpenseChart;
