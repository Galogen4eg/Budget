export type WorkspaceCollection='shopping'|'pantry'|'events'|'members'|'loyalty';
export type WorkspaceStatus='loading'|'ready'|'stale'|'error';
export type WorkspaceRead={scope:string|null;states:Record<WorkspaceCollection,WorkspaceStatus>};
export function initialWorkspaceRead(scope:string|null):WorkspaceRead{
 return {scope,states:{shopping:'loading',pantry:'loading',events:'loading',members:'loading',loyalty:'loading'}};
}
export function updateWorkspaceRead(state:WorkspaceRead,scope:string,kind:WorkspaceCollection,status:WorkspaceStatus):WorkspaceRead{
 return state.scope!==scope||state.states[kind]===status?state:{scope,states:{...state.states,[kind]:status}};
}
export function workspaceStatus(state:WorkspaceRead,scope:string|null,kinds:readonly WorkspaceCollection[]):WorkspaceStatus{
 if(scope===null)return 'ready';
 if(state.scope!==scope)return 'loading';
 const statuses=kinds.map(k=>state.states[k]);
 return statuses.includes('error')?'error':statuses.includes('stale')?'stale':statuses.every(s=>s==='ready')?'ready':'loading';
}
