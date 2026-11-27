/** Mask money and ratios at the presentation boundary. Never mutate stored values. */
export function privateAmount(value:number,hidden:boolean,format:(value:number)=>string):string {
 return hidden?'•••':format(value);
}
export function privatePercentage(value:number,hidden:boolean):number {
 return hidden?0:value;
}
