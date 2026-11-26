export type AlfaRowIssue={sheet:string;row:number;reason:string};
export type AlfaParseReport={operationRows:number;ready:number;needsReview:number;duplicates:number;errors:AlfaRowIssue[];serviceRows:number};
export function newAlfaReport():AlfaParseReport{return {operationRows:0,ready:0,needsReview:0,duplicates:0,errors:[],serviceRows:0};}
export class AlfaStatementRowsError extends Error{
 readonly report:AlfaParseReport;
 constructor(report:AlfaParseReport){super('Выписка содержит ошибки: '+report.errors.length+' строк. Импорт не начат.');this.name='AlfaStatementRowsError';this.report=report;}
}
export function rowIsBlank(row:readonly unknown[]){return row.every(v=>String(v??'').trim()==='');}
export function parseAlfaDate(raw:unknown,time?:unknown):Date|null{
 if(raw instanceof Date&&!Number.isNaN(raw.getTime()))return new Date(raw);
 const text=String(raw??'').trim();
 const match=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
 const iso=text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
 if(!match&&!iso)return null;
 const fields=match??iso!;
 const day=Number(match?fields[1]:fields[3]),month=Number(fields[2])-1;
 let year=Number(match?fields[3]:fields[1]);if(year<100)year+=2000;
 let h=Number(fields[4]??0),m=Number(fields[5]??0),s=Number(fields[6]??0);
 if(String(time??'').trim()){
  const separate=String(time).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if(!separate)return null;
  h=Number(separate[1]);m=Number(separate[2]);s=Number(separate[3]??0);
 }
 if(h>23||m>59||s>59)return null;
 const date=new Date(year,month,day,h,m,s);
 return date.getFullYear()===year&&date.getMonth()===month&&date.getDate()===day&&date.getHours()===h&&date.getMinutes()===m&&date.getSeconds()===s?date:null;
}
export function parseAlfaAmount(raw:unknown):number|null{
 let value=String(raw??'').trim().replace(/\s*(?:₽|RUB|руб\.?)$/i,'').trim().replace(/\u2212/g,'-');
 // Require conventional groups of three when thousands are separated.
 if(/[ \u00a0\u202f]/.test(value)){
  if(!/^[+-]?\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d{1,2})?$/.test(value))return null;
  value=value.replace(/[ \u00a0\u202f]/g,'');
 }
 if(/^[+-]?\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(value))value=value.replace(/\./g,'').replace(',','.');
 else if(/^[+-]?\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(value))value=value.replace(/,/g,'');
 else if(/^[+-]?\d+(?:[.,]\d{1,2})?$/.test(value))value=value.replace(',','.');
 else return null;
 const n=Number(value);
 return Number.isFinite(n)&&n!==0&&Number.isSafeInteger(Math.round(n*100))&&Math.abs(n*100-Math.round(n*100))<=0.000001?n:null;
}
export function isAlfaServiceRow(row:readonly unknown[],dateIndex:number,amountIndex:number,noteIndex:number):boolean{
 // Never exclude a row with a date or merchant description merely because its amount is bad.
 if(rowIsBlank(row))return true;
 const labels=row.map(x=>String(x??'').trim());
 const known=/^(?:итого(?: по операциям)?|всего(?: по операциям)?|входящий остаток|исходящий остаток|начальный остаток|конечный остаток)$/i;
 return labels.some(x=>known.test(x))&&!parseAlfaDate(row[dateIndex])&&(noteIndex<0||!labels[noteIndex]||known.test(labels[noteIndex]))&&
 labels.every((v,i)=>!v||i===amountIndex||known.test(v));
}

// Empty cleanup is deliberately stricter than normal import. A fuzzy header,
// blank workbook, totals, unexplained preamble, or any populated data row
// is not sufficient evidence to discard a statement.
const emptyHeaderAliases:Record<string,string>={
 'дата':'date','дата операции':'date','время':'time','время операции':'time',
 'сумма':'amount','сумма операции':'amount','тип':'type','тип операции':'type','направление операции':'type',
 'описание':'note','описание операции':'note','номер карты':'card','номер счета':'account','номер счёта':'account',
 'валюта':'currency','mcc код':'mcc','mcc-код':'mcc','mcc':'mcc','категория':'category','категория операции':'category'
};
export function isVerifiedEmptyAlfaSheets(sheets:readonly (readonly (readonly unknown[])[])[]):boolean{
 let recognized=0;
 for(const sheet of sheets){
  const populated=sheet.filter(row=>!rowIsBlank(row));
  if(!populated.length)continue;
  if(populated.length!==1)return false;
  const cells=populated[0].filter(value=>String(value??'').trim()!=='');
  const columns=new Set<string>();
  for(const cell of cells){
   if(typeof cell!=='string')return false;
   const name=cell.trim().toLowerCase().replace(/\s+/g,' ');
   if(!Object.prototype.hasOwnProperty.call(emptyHeaderAliases,name))return false;
   const key=emptyHeaderAliases[name];
   if(columns.has(key))return false;
   columns.add(key);
  }
  if(!['date','amount','type','note','mcc','category'].every(key=>columns.has(key)))return false;
  recognized++;
 }
 return recognized>0;
}
