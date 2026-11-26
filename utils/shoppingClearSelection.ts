type Row = {id:string;completed:boolean};

/** A destructive confirmation must name the same completed rows the user saw. */
export function captureCompletedSelection(rows:readonly Row[]):string[]{
 return [...new Set(rows.filter(row=>row.completed&&row.id).map(row=>row.id))].sort();
}
export function resolveCompletedDeletion(confirmed:readonly string[]|null,visibleRows:readonly Row[]):string[]|null{
 if(!confirmed?.length)return null;
 const visible=captureCompletedSelection(visibleRows);
 return confirmed.length===visible.length&&confirmed.every((id,index)=>id===visible[index])?visible:null;
}
