export type ReceiptQr = {fn:string;fd:string;fp:string;date:string;amountKopecks:number;operation:string};
export function parseReceiptQr(input:string):ReceiptQr{
 const raw=input.trim();const query=raw.includes('?')?raw.slice(raw.indexOf('?')+1):raw;
 const params=new URLSearchParams(query);
 const read=(key:string,pattern:RegExp)=>{const values=params.getAll(key);if(values.length!==1||!pattern.test(values[0]))throw new Error('Некорректное поле '+key+' в QR-коде');return values[0];};
 const fn=read('fn',/^\d{16}$/),fd=read('i',/^\d{1,12}$/),fp=read('fp',/^\d{1,12}$/),t=read('t',/^\d{8}T\d{4}(\d{2})?$/),s=read('s',/^\d{1,10}(\.\d{1,2})?$/),operation=read('n',/^[1-4]$/);
 const y=Number(t.slice(0,4)),m=Number(t.slice(4,6)),d=Number(t.slice(6,8)),h=Number(t.slice(9,11)),min=Number(t.slice(11,13)),sec=t.length===15?Number(t.slice(13,15)):0;
 const dt=new Date(Date.UTC(y,m-1,d,h,min,sec));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d||h>23||min>59||sec>59)throw new Error('Некорректная дата чека');
 const [whole,fraction='']=s.split('.');const amountKopecks=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(amountKopecks)||amountKopecks<=0)throw new Error('Некорректная сумма чека');
 return {fn,fd,fp,date:t.slice(6,8)+'.'+t.slice(4,6)+'.'+t.slice(0,4)+' '+t.slice(9,11)+':'+t.slice(11,13),amountKopecks,operation};
}
