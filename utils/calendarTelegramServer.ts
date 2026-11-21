import {auth} from '../firebase';
import type {AppSettings,FamilyEvent,FamilyMember} from '../types';

export async function updateTelegramSchedule(input:{
  familyId:string;events:FamilyEvent[];members:FamilyMember[];settings:AppSettings;
}):Promise<void>{
  const current=auth.currentUser;
  if(!current)throw new Error('Необходимо войти в Budget');
  const {settings}=input;
  if(!settings.telegramChatId?.trim()||!settings.telegramBotToken?.trim())
    throw new Error('Сначала настройте Telegram-бота и Chat ID');
  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  const token=await current.getIdToken();
  const response=await fetch('/api/calendar-telegram-sync',{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({
      familyId:input.familyId,
      events:input.events,members:input.members,
      payments:settings.mandatoryExpenses||[],
      paid:settings.manualPaidExpenses||{},
      timeZone,botToken:settings.telegramBotToken,chatId:settings.telegramChatId.trim()
    })
  });
  if(!response.ok)throw new Error('Не удалось сохранить Telegram-расписание на сервере');
}
export async function disableTelegramSchedule():Promise<void>{
  const current=auth.currentUser;
  if(!current)throw new Error('Необходимо войти в Budget');
  const token=await current.getIdToken();
  const response=await fetch('/api/calendar-telegram-sync',{
    method:'DELETE',headers:{Authorization:`Bearer ${token}`}
  });
  if(!response.ok)throw new Error('Не удалось отключить Telegram-расписание');
}
