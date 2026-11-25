import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Bell, Settings, Plus, Upload, Mic, Send, Sparkles } from 'lucide-react';
import { TerraPageHeader, TerraHeaderAction } from './TerraPageHeader';

type FixtureProps = { title: string; primary?: string; secondary?: 'import' | 'voice' | 'telegram' | 'assistant' };
function Fixture({ title, primary, secondary }: FixtureProps) {
  const [result, setResult] = useState('');
  const action = (label: string, icon: React.ReactNode, main = false) =>
    <TerraHeaderAction label={label} icon={icon} variant={main ? 'primary' : 'secondary'} showLabel={main} onClick={() => setResult(label)} />;
  const other = secondary === 'import' ? action('Импорт выписки', <Upload size={18}/>)
    : secondary === 'voice' ? action('Голосовой ввод', <Mic size={18}/>)
    : secondary === 'telegram' ? action('Отправить список в Telegram', <Send size={18}/>)
    : secondary === 'assistant' ? action('AI Ассистент', <Sparkles size={18}/>) : null;
  return <>
    <TerraPageHeader title={title}
      globalActions={<>{action('Уведомления', <Bell size={18}/>)}{action('Настройки и профиль', <Settings size={18}/>)}</>}
      actions={primary || other ? <>{primary && action(primary, <Plus size={20}/>, true)}{other}</> : undefined}/>
    <div data-testid="terra-action-result" role="status" className="p-4">{result && <span>{result}</span>}</div>
  </>;
}

const meta = { title: 'Terra/PageHeader', component: Fixture } satisfies Meta<typeof Fixture>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = { args: { title: 'Обзор', primary: 'Добавить операцию', secondary: 'assistant' } };
export const Budget: Story = { args: { title: 'Бюджет', primary: 'Добавить операцию', secondary: 'import' } };
export const Plans: Story = { args: { title: 'Планы', primary: 'Добавить событие', secondary: 'voice' } };
export const Shopping: Story = { args: { title: 'Покупки', primary: 'Добавить товар', secondary: 'telegram' } };
export const Chat: Story = { args: { title: 'Чат' } };
export const Services: Story = { args: { title: 'Сервисы' } };
