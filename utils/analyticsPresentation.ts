/** Bars reflect the actual ratio; zero is never drawn as nonzero. */
export function chartBarPercent(value:number,max:number):number {
 if(!Number.isFinite(value)||!Number.isFinite(max)||max<=0||value<=0)return 0;
 return Math.min(100,value/max*100);
}
