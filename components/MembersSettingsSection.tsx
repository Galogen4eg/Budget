import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Users, UserPlus, Mail, Check, X, 
  Trash2, Copy, AlertCircle, ChevronRight, Link as LinkIcon, 
  Send, User, CheckCircle2, Palette, Sparkles, ChevronDown
} from 'lucide-react';
import { FamilyMember, Transaction } from '../types';
import { MemberMarker } from '../constants';
import { createInvitation, deleteItem } from '../utils/db';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

/** Константы ограничений и настроек по умолчанию */
export const MIN_MEMBER_NAME_LENGTH = 2;
export const MAX_MEMBER_NAME_LENGTH = 40;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GUEST_MODE_ID = 'guest';

export const MEMBER_PRESET_COLORS: readonly string[] = [
  '#4A7C59', '#007AFF', '#FF2D55', '#AF52DE', 
  '#FF9500', '#FF3B30', '#5856D6', '#00C7BE', 
  '#8E8E93', '#BF5AF2', '#10B981', '#6366F1'
];

export interface ValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
}

export interface MemberStats {
  readonly transactionCount: number;
  readonly totalExpense: number;
  readonly totalIncome: number;
}

/**
 * Валидация имени участника.
 * Чистая функция без побочных эффектов.
 */
export function validateMemberName(rawName: string): ValidationResult {
  const name = rawName.trim();
  if (name.length < MIN_MEMBER_NAME_LENGTH) {
    return { 
      isValid: false, 
      error: `Имя должно содержать минимум ${MIN_MEMBER_NAME_LENGTH} символа` 
    };
  }
  if (name.length > MAX_MEMBER_NAME_LENGTH) {
    return { 
      isValid: false, 
      error: `Имя не должно превышать ${MAX_MEMBER_NAME_LENGTH} символов` 
    };
  }
  return { isValid: true };
}

/**
 * Валидация e-mail участника (для облачной синхронизации и инвайтов).
 * Чистая функция без побочных эффектов.
 */
export function validateMemberEmail(rawEmail: string): ValidationResult {
  const email = rawEmail.trim();
  if (!email) return { isValid: true };
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Введите корректный адрес электронной почты' };
  }
  return { isValid: true };
}

/**
 * Проверка допустимости удаления участника.
 * Чистая функция: защищает от удаления единственного участника.
 */
export function canDeleteMember(
  targetMemberId: string, 
  members: readonly FamilyMember[]
): { readonly canDelete: boolean; readonly reason?: string } {
  if (members.length <= 1) {
    return { 
      canDelete: false, 
      reason: 'Нельзя удалить единственного участника пространства' 
    };
  }
  const exists = members.some(m => m.id === targetMemberId);
  if (!exists) {
    return { canDelete: false, reason: 'Участник не найден в списке' };
  }
  return { canDelete: true };
}

/**
 * Подсчет финансовой активности участника по списку операций.
 * Чистая функция без побочных эффектов.
 */
export function calculateMemberStats(
  memberId: string, 
  transactions: readonly Transaction[]
): MemberStats {
  let count = 0;
  let totalExpense = 0;
  let totalIncome = 0;

  for (const tx of transactions) {
    if (tx.memberId === memberId) {
      count++;
      if (tx.type === 'expense') {
        totalExpense += tx.amount;
      } else if (tx.type === 'income') {
        totalIncome += tx.amount;
      }
    }
  }

  return { transactionCount: count, totalExpense, totalIncome };
}

/**
 * Форматирование суммы в рублях.
 */
export function formatCurrencyRub(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Генерация уникального идентификатора участника.
 */
export function generateMemberId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Определение участника, с которым сопоставлена текущая сессия.
 * Чистая функция без побочных эффектов.
 */
export function findMappedMember(
  members: readonly FamilyMember[],
  userId?: string | null,
  userEmail?: string | null
): FamilyMember | null {
  if (!members || members.length === 0) return null;
  if (userId) {
    const byUserId = members.find(m => m.userId === userId);
    if (byUserId) return byUserId;
  }
  if (userEmail) {
    const byEmail = members.find(m => m.email?.toLowerCase() === userEmail.toLowerCase());
    if (byEmail) return byEmail;
  }
  return null;
}

/**
 * Привязка профиля участника к текущему аккаунту/сессии.
 * Чистая функция: возвращает новый неизменяемый массив участников.
 */
export function bindMemberToUser(
  targetMemberId: string,
  members: readonly FamilyMember[],
  userId?: string | null
): FamilyMember[] {
  if (targetMemberId === GUEST_MODE_ID) {
    return members.map(m => (m.userId === userId ? { ...m, userId: null } : m));
  }
  return members.map(m => {
    if (m.id === targetMemberId) {
      return { ...m, userId: userId || 'local-user' };
    }
    if (userId && m.userId === userId) {
      return { ...m, userId: null };
    }
    return m;
  });
}

/**
 * Компонент блока «Текущая сессия аккаунта».
 * Отображает статус сопоставления и селектор привязки профиля.
 */
interface CurrentSessionBlockProps {
  readonly currentUserEmail: string;
  readonly mappedMember: FamilyMember | null;
  readonly members: readonly FamilyMember[];
  readonly onBindProfile: (memberId: string) => void;
}

export const CurrentSessionBlock: React.FC<CurrentSessionBlockProps> = ({
  currentUserEmail,
  mappedMember,
  members,
  onBindProfile,
}) => {
  return (
    <section className="bg-white dark:bg-[#202225] rounded-2xl p-4 sm:p-5 border border-stone-200 dark:border-white/10 shadow-sm space-y-4">
      {/* Статус сессии и почта */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-white/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4A7C59] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4A7C59]" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#4A7C59] dark:text-emerald-400">
            Текущая сессия
          </span>
        </div>
        <span className="text-xs font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-stone-200/50 dark:border-white/10 truncate max-w-[200px]">
          {currentUserEmail}
        </span>
      </div>

      {/* Описание привязки */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
          Вы авторизованы и сопоставлены с профилем:
        </p>
        <p className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
          {mappedMember ? (
            <>
              <span 
                className="w-3 h-3 rounded-full shrink-0 shadow-xs" 
                style={{ backgroundColor: mappedMember.color }} 
              />
              <span>{mappedMember.name}</span>
            </>
          ) : (
            <span className="text-stone-500">Гостевой режим без сопоставления</span>
          )}
        </p>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-normal pt-1">
          Все созданные вами операции и записи привязываются к этому маркеру
        </p>
      </div>

      {/* Селектор связки */}
      <div className="pt-1">
        <label 
          htmlFor="account-select" 
          className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1.5 uppercase tracking-wide"
        >
          Связать с:
        </label>
        <div className="relative">
          <select 
            id="account-select"
            value={mappedMember ? mappedMember.id : GUEST_MODE_ID}
            onChange={(e) => onBindProfile(e.target.value)}
            className="w-full appearance-none bg-stone-50 dark:bg-[#18191C] border border-stone-200 dark:border-white/10 text-stone-900 dark:text-white font-semibold text-sm rounded-xl py-3 pl-3.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59] cursor-pointer"
          >
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} {mappedMember?.id === m.id ? '(Текущий профиль)' : ''}
              </option>
            ))}
            <option value={GUEST_MODE_ID}>Гостевой режим без сопоставления</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-500 dark:text-stone-400">
            <ChevronDown size={18} />
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * Карточка участника в мобильном стиле из макета.
 */
interface MemberCardItemProps {
  readonly member: FamilyMember;
  readonly isMappedCurrent: boolean;
  readonly stats: MemberStats;
  readonly onEdit: () => void;
  readonly onColorPick: (color: string) => void;
}

export const MemberCardItem: React.FC<MemberCardItemProps> = ({
  member,
  isMappedCurrent,
  stats,
  onEdit,
  onColorPick,
}) => {
  const initial = member.name.trim().charAt(0).toUpperCase() || 'У';

  return (
    <article 
      onClick={onEdit}
      className={`bg-white dark:bg-[#202225] rounded-2xl p-4 border transition-all cursor-pointer shadow-sm relative group hover:border-[#4A7C59]/60 ${
        isMappedCurrent 
          ? 'border-2 border-[#4A7C59]/50 dark:border-[#4A7C59]/60 bg-emerald-50/20 dark:bg-emerald-950/10' 
          : 'border-stone-200 dark:border-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Аватар с первой буквой имени, цветом и статусом */}
          <div 
            className="relative flex size-12 shrink-0 items-center justify-center rounded-full text-white font-bold text-lg shadow-sm"
            style={{ backgroundColor: member.color }}
          >
            <span>{initial}</span>
            {isMappedCurrent && (
              <span 
                className="absolute bottom-0 right-0 size-3 rounded-full bg-[#4A7C59] ring-2 ring-white dark:ring-[#202225]" 
                title="Текущая сессия" 
              />
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base font-bold text-stone-900 dark:text-white leading-tight truncate">
                {member.name}
              </h4>
              {isMappedCurrent && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7C59] bg-[#4A7C59]/10 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                  Ваш профиль
                </span>
              )}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
              {member.email ? member.email : 'Локальный профиль'}
            </p>

            <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-500 dark:text-stone-400">
              <span>Операций: <strong className="text-stone-800 dark:text-stone-200">{stats.transactionCount}</strong></span>
              {stats.totalExpense > 0 && (
                <span>Расход: <strong className="text-stone-800 dark:text-stone-200">{formatCurrencyRub(stats.totalExpense)}</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Правая часть: быстрый свотч цвета и стрелка */}
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <div 
            className="size-5 rounded-full border-2 border-white dark:border-[#202225] shadow-xs shrink-0"
            style={{ backgroundColor: member.color }}
            title={`Цвет: ${member.color}`}
          />
          <ChevronRight size={18} className="text-stone-400 group-hover:text-stone-600 dark:group-hover:text-stone-200 transition-colors" />
        </div>
      </div>
    </article>
  );
};

/**
 * Модальное окно / шторка приглашения участника.
 */
interface InviteMemberModalProps {
  readonly isOpen: boolean;
  readonly currentFamilyId: string | null;
  readonly onClose: () => void;
  readonly onSendEmailInvite: (email: string) => Promise<void>;
  readonly onCreateLocalMember: (name: string, email: string, color: string) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  currentFamilyId,
  onClose,
  onSendEmailInvite,
  onCreateLocalMember,
}) => {
  const [tab, setTab] = useState<'link' | 'email' | 'new'>('new');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedColor, setSelectedColor] = useState(MEMBER_PRESET_COLORS[0]);
  const [isSending, setIsSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const inviteUrl = currentFamilyId 
    ? `${window.location.origin}/?join=${currentFamilyId}` 
    : '';

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Ссылка-приглашение скопирована в буфер обмена');
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateMemberEmail(email);
    if (!validation.isValid || !email.trim()) {
      setFormError(validation.error || 'Укажите e-mail адрес');
      return;
    }
    setFormError(null);
    setIsSending(true);
    try {
      await onSendEmailInvite(email.trim());
      setEmail('');
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateMemberName(name);
    const emailVal = validateMemberEmail(email);
    if (!nameVal.isValid) {
      setFormError(nameVal.error || 'Неверное имя');
      return;
    }
    if (!emailVal.isValid) {
      setFormError(emailVal.error || 'Неверный e-mail');
      return;
    }
    setFormError(null);
    onCreateLocalMember(name.trim(), email.trim(), selectedColor);
    setName('');
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        className="w-full max-w-md bg-white dark:bg-[#1E2023] rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-white/10 space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#4A7C59] flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <h3 id="invite-modal-title" className="text-base font-bold text-stone-900 dark:text-white">
              Приглашение участника
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Переключатель вкладок */}
        <div className="grid grid-cols-3 gap-1 bg-stone-100 dark:bg-[#141517] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setTab('new'); setFormError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'new' 
                ? 'bg-white dark:bg-[#202225] text-stone-900 dark:text-white shadow-xs' 
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Добавить
          </button>
          <button
            type="button"
            onClick={() => { setTab('email'); setFormError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'email' 
                ? 'bg-white dark:bg-[#202225] text-stone-900 dark:text-white shadow-xs' 
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            По e-mail
          </button>
          <button
            type="button"
            onClick={() => { setTab('link'); setFormError(null); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'link' 
                ? 'bg-white dark:bg-[#202225] text-stone-900 dark:text-white shadow-xs' 
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            Ссылка
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Контент вкладок */}
        {tab === 'new' && (
          <form onSubmit={handleCreateNew} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                Имя участника <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Мария"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#18191C] border border-stone-200 dark:border-white/10 text-sm font-semibold text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                E-mail (необязательно)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#18191C] border border-stone-200 dark:border-white/10 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-2">
                Цвет маркера
              </label>
              <div className="grid grid-cols-6 gap-2">
                {MEMBER_PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`h-8 rounded-lg flex items-center justify-center transition-transform ${
                      selectedColor === c ? 'ring-2 ring-offset-2 ring-[#4A7C59] scale-105' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {selectedColor === c && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full mt-2 py-3 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              Создать профиль
            </button>
          </form>
        )}

        {tab === 'email' && (
          <form onSubmit={handleSendEmail} className="space-y-4 pt-1">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Отправьте приглашение родственнику на его электронную почту для совместного ведения бюджета.
            </p>
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-stone-300 mb-1">
                E-mail родственника
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rodstvennik@mail.ru"
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#18191C] border border-stone-200 dark:border-white/10 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSending || !email.trim()}
              className="w-full py-3 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send size={15} />
              <span>{isSending ? 'Отправка...' : 'Отправить приглашение'}</span>
            </button>
          </form>
        )}

        {tab === 'link' && (
          <div className="space-y-3.5 pt-1">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Поделитесь ссылкой в Telegram или WhatsApp. При переходе родственник автоматически подключится к пространству.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl || 'Семейный ID не инициализирован'}
                className="flex-1 px-3 py-2.5 rounded-xl bg-stone-50 dark:bg-[#18191C] border border-stone-200 dark:border-white/10 text-xs font-mono text-stone-700 dark:text-stone-300 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!inviteUrl}
                className="px-4 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                <Copy size={14} />
                <span>Копия</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Шторка / модальное окно редактирования выбранного участника.
 */
interface MemberEditSheetProps {
  readonly member: FamilyMember | null;
  readonly canDelete: boolean;
  readonly deleteReason?: string;
  readonly onClose: () => void;
  readonly onSave: (name: string, email: string, color: string) => void;
  readonly onDelete: (memberId: string) => void;
}

export const MemberEditSheet: React.FC<MemberEditSheetProps> = ({
  member,
  canDelete,
  deleteReason,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [color, setColor] = useState(member?.color || MEMBER_PRESET_COLORS[0]);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    if (member) {
      setName(member.name);
      setEmail(member.email || '');
      setColor(member.color || MEMBER_PRESET_COLORS[0]);
      setErrors({});
    }
  }, [member]);

  if (!member) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    const result = validateMemberName(val);
    setErrors(prev => ({ ...prev, name: result.isValid ? undefined : result.error }));
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const result = validateMemberEmail(val);
    setErrors(prev => ({ ...prev, email: result.isValid ? undefined : result.error }));
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    // Мгновенно сохраняем выбранный цвет
    onSave(name, email, newColor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateMemberName(name);
    const emailVal = validateMemberEmail(email);

    if (!nameVal.isValid || !emailVal.isValid) {
      setErrors({ name: nameVal.error, email: emailVal.error });
      return;
    }

    onSave(name.trim(), email.trim(), color);
    onClose();
  };

  const previewInitial = name.trim().charAt(0).toUpperCase() || 'У';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-member-title"
        className="w-full max-w-md bg-white dark:bg-[#1E2023] rounded-3xl p-5 sm:p-6 shadow-2xl border border-stone-200 dark:border-white/10 space-y-4"
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div 
              className="size-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-xs"
              style={{ backgroundColor: color }}
            >
              {previewInitial}
            </div>
            <div>
              <h3 id="edit-member-title" className="text-base font-bold text-stone-900 dark:text-white leading-tight">
                Настройка профиля
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Имя, e-mail и персональный цвет
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Имя */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Имя участника <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Имя"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#18191C] border text-sm font-semibold text-stone-900 dark:text-white focus:outline-none transition-colors ${
                errors.name ? 'border-red-400' : 'border-stone-200 dark:border-white/10 focus:ring-2 focus:ring-[#4A7C59]'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.name}
              </p>
            )}
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              E-mail для синхронизации
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="user@example.com"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-stone-50 dark:bg-[#18191C] border text-sm text-stone-900 dark:text-white focus:outline-none transition-colors ${
                errors.email ? 'border-red-400' : 'border-stone-200 dark:border-white/10 focus:ring-2 focus:ring-[#4A7C59]'
              }`}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.email}
              </p>
            )}
          </div>

          {/* Палитра цветов: мгновенный выбор и сохранение */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Palette size={14} className="text-[#4A7C59]" />
                <span>Персональный цвет маркера</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-stone-500 uppercase">
                {color}
              </span>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {MEMBER_PRESET_COLORS.map(c => {
                const isSelected = color.toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleColorChange(c)}
                    className={`h-9 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                      isSelected ? 'ring-2 ring-offset-2 ring-[#4A7C59] scale-105' : 'hover:scale-102 opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                    title={`Выбрать цвет ${c}`}
                  >
                    {isSelected && <Check size={16} className="text-white drop-shadow-sm" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Действия */}
          <div className="pt-2 border-t border-stone-100 dark:border-white/5 flex items-center gap-2">
            <button
              type="button"
              disabled={!canDelete}
              title={deleteReason || 'Удалить участника'}
              onClick={() => onDelete(member.id)}
              className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !!errors.name || !!errors.email}
              className="flex-1 py-3 px-4 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              <span>Сохранить изменения</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export interface MembersSettingsSectionProps {
  readonly members: FamilyMember[];
  readonly onUpdateMembers: (members: FamilyMember[]) => void;
  readonly currentFamilyId: string | null;
  readonly transactions?: Transaction[];
}

/**
 * Главный компонент настройки участников с мобильной адаптацией.
 */
export const MembersSettingsSection: React.FC<MembersSettingsSectionProps> = ({
  members,
  onUpdateMembers,
  currentFamilyId,
  transactions = [],
}) => {
  const { user } = useAuth();
  const currentUserEmail = user?.email || 'Локальная сессия';
  const currentUserId = user?.uid || null;

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  // Определение участника, привязанного к текущей сессии
  const mappedMember = useMemo(() => {
    return findMappedMember(members, currentUserId, user?.email);
  }, [members, currentUserId, user?.email]);

  // Обработка связывания текущей сессии с участником
  const handleBindProfile = useCallback((targetMemberId: string) => {
    const updated = bindMemberToUser(targetMemberId, members, currentUserId);
    onUpdateMembers(updated);
    if (targetMemberId === GUEST_MODE_ID) {
      toast.success('Сессия переключена в гостевой режим');
    } else {
      const selected = members.find(m => m.id === targetMemberId);
      toast.success(`Сессия успешно привязана к профилю «${selected?.name || ''}»`);
    }
  }, [members, currentUserId, onUpdateMembers]);

  // Быстрое создание участника
  const handleCreateLocalMember = useCallback(async (newName: string, newEmail: string, newColor: string) => {
    const newId = generateMemberId();
    const newMember: FamilyMember = {
      id: newId,
      name: newName,
      email: newEmail || undefined,
      color: newColor,
    };
    onUpdateMembers([...members, newMember]);
    toast.success(`Участник «${newName}» успешно добавлен`);

    if (currentFamilyId && newEmail) {
      try {
        await createInvitation(currentFamilyId, newEmail, newId);
        toast.success(`Инвайт отправлен на ${newEmail}`);
      } catch (err: any) {
        console.error('Invite error:', err);
      }
    }
  }, [members, onUpdateMembers, currentFamilyId]);

  // Отправка прямого инвайта по почте
  const handleSendEmailInvite = useCallback(async (email: string) => {
    if (!currentFamilyId) {
      toast.error('Семейный контур не инициализирован');
      return;
    }
    const tempId = generateMemberId();
    await createInvitation(currentFamilyId, email, tempId);
    toast.success(`Приглашение отправлено на ${email}`);
  }, [currentFamilyId]);

  // Сохранение изменений профиля участника
  const handleSaveMemberDetails = useCallback((newName: string, newEmail: string, newColor: string) => {
    if (!editingMemberId) return;
    const cleanEmail = newEmail.trim().toLowerCase() || undefined;
    const updated = members.map(m => m.id === editingMemberId ? {
      ...m,
      name: newName.trim(),
      email: cleanEmail,
      color: newColor,
    } : m);
    onUpdateMembers(updated);
    toast.success('Профиль участника обновлен');
  }, [editingMemberId, members, onUpdateMembers]);

  // Удаление участника
  const handleDeleteMember = useCallback(async (memberId: string) => {
    const check = canDeleteMember(memberId, members);
    if (!check.canDelete) {
      toast.error(check.reason || 'Нельзя удалить участника');
      return;
    }
    const target = members.find(m => m.id === memberId);
    const updated = members.filter(m => m.id !== memberId);
    onUpdateMembers(updated);

    if (currentFamilyId) {
      try {
        await deleteItem(currentFamilyId, 'members', memberId);
      } catch (err) {
        console.error('Cloud delete failed:', err);
      }
    }

    setEditingMemberId(null);
    toast.success(`Участник «${target?.name || ''}» удален`);
  }, [members, onUpdateMembers, currentFamilyId]);

  const memberBeingEdited = useMemo(() => {
    return members.find(m => m.id === editingMemberId) || null;
  }, [members, editingMemberId]);

  const deletePermission = useMemo(() => {
    if (!editingMemberId) return { canDelete: false, reason: '' };
    return canDeleteMember(editingMemberId, members);
  }, [editingMemberId, members]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-8">
      {/* Верхний блок: Заголовок контекста и кнопка приглашения */}
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3 pt-1">
          <div>
            <h2 className="text-stone-900 dark:text-white font-headline font-bold text-2xl tracking-tight leading-tight">
              Участники пространства
            </h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1 leading-relaxed">
              Управление профилями и сопоставление авторизованных аккаунтов
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-[#4A7C59] hover:bg-[#3d6749] text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-colors text-sm cursor-pointer active:scale-98"
        >
          <UserPlus size={18} />
          <span>Пригласить участника</span>
        </button>
      </section>

      {/* Блок 1: Текущая сессия аккаунта */}
      <CurrentSessionBlock
        currentUserEmail={currentUserEmail}
        mappedMember={mappedMember}
        members={members}
        onBindProfile={handleBindProfile}
      />

      {/* Блок 2: Список участников */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold font-headline text-stone-900 dark:text-white">
            Список участников ({members.length})
          </h3>
          <span className="text-xs text-stone-500 font-medium">
            Нажмите для редактирования
          </span>
        </div>

        <div className="space-y-3">
          {members.map(m => {
            const stats = calculateMemberStats(m.id, transactions);
            const isMapped = mappedMember?.id === m.id;
            return (
              <MemberCardItem
                key={m.id}
                member={m}
                isMappedCurrent={isMapped}
                stats={stats}
                onEdit={() => setEditingMemberId(m.id)}
                onColorPick={(newColor) => {
                  const updated = members.map(item => item.id === m.id ? { ...item, color: newColor } : item);
                  onUpdateMembers(updated);
                }}
              />
            );
          })}
        </div>
      </section>

      {/* Модальное окно приглашения / добавления */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        currentFamilyId={currentFamilyId}
        onClose={() => setIsInviteModalOpen(false)}
        onSendEmailInvite={handleSendEmailInvite}
        onCreateLocalMember={handleCreateLocalMember}
      />

      {/* Модальное окно / шторка редактирования выбранного участника */}
      <MemberEditSheet
        member={memberBeingEdited}
        canDelete={deletePermission.canDelete}
        deleteReason={deletePermission.reason}
        onClose={() => setEditingMemberId(null)}
        onSave={handleSaveMemberDetails}
        onDelete={handleDeleteMember}
      />
    </div>
  );
};

export default MembersSettingsSection;
