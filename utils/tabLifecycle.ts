export interface TabVisits {scope:string;tabs:readonly string[]}
export function rememberTabVisit(previous:TabVisits,scope:string,tab:string):TabVisits {
 if(previous.scope!==scope)return {scope,tabs:[tab]};
 if(previous.tabs.includes(tab))return previous;
 return {scope,tabs:[...previous.tabs,tab]};
}
export function shouldMountTab(previous:TabVisits,scope:string,activeTab:string,tab:string):boolean {
 return tab===activeTab||(previous.scope===scope&&previous.tabs.includes(tab));
}
