export const MENU_TABS = [
  {id:'overview',label:'Обзор',group:'finance'},
  {id:'budget',label:'Бюджет',group:'finance'},
  {id:'plans',label:'Планы',group:'family'},
  {id:'shopping',label:'Покупки',group:'family'},
  {id:'chat',label:'Чат',group:'family'},
  {id:'services',label:'Сервисы',group:'tools'}
] as const;
export type MenuTab=typeof MENU_TABS[number]['id'];
export function visibleMenuTabs(enabled?:readonly string[]):MenuTab[]{
 return MENU_TABS.filter(tab=>tab.id==='overview'||!enabled||enabled.includes(tab.id)).map(tab=>tab.id);
}
export function menuPreferencePatch(enabled:readonly string[]|undefined,startTab:string|undefined,id:MenuTab,checked:boolean){
 const current=visibleMenuTabs(enabled);
 const next=visibleMenuTabs(checked?[...current,id]:current.filter(tab=>tab!==id));
 return {enabledTabs:next,startTab:next.includes(startTab as MenuTab)?startTab as MenuTab:'overview' as const};
}
export function settingsSearchMatches(item:{label:string;subtitle:string;keywords:string},query:string):boolean{
 const normalize=(value:string)=>value.toLocaleLowerCase('ru-RU').replace(/ё/g,'е').trim();
 const haystack=normalize(item.label+' '+item.subtitle+' '+item.keywords);
 return normalize(query).split(/\s+/).every(word=>haystack.includes(word));
}
