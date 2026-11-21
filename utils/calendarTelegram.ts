import type { DueReminder } from './calendarReminders.ts';

/** A per-user, per-family, per-chat switch and delivery history. */
export function telegramReminderKey(familyId:string,uid:string,chatId:string):string {
  return `budget:telegram-calendar:${encodeURIComponent(familyId)}:${encodeURIComponent(uid)}:${encodeURIComponent(chatId.trim())}`;
}
export function telegramReminderText(reminder:DueReminder):string {
  const days=Math.floor(reminder.leadMinutes/1440);
  const hours=Math.floor((reminder.leadMinutes%1440)/60);
  const minutes=reminder.leadMinutes%60;
  const parts=[days&&`${days} дн.`,hours&&`${hours} ч`,minutes&&`${minutes} мин`].filter(Boolean);
  const when=reminder.leadMinutes===0?'Сейчас':`Через ${parts.join(' ')}`;
  return `🔔 Напоминание Budget\n${String(reminder.title).slice(0,400)}\n📅 ${reminder.date}\n⏰ ${when}`;
}

/** Avoid replaying a large backlog if the browser was suspended for days. */
export function telegramReminderSince(now:Date,lastChecked:number|null):Date {
  const ms=now.getTime();
  if(lastChecked!==null&&Number.isFinite(lastChecked)&&lastChecked>0&&lastChecked<=ms){
    return new Date(Math.max(lastChecked,ms-3600000));
  }
  return new Date(ms-120000);
}
