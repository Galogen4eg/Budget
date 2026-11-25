import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {parseAlfaDate,parseAlfaAmount,isAlfaServiceRow,newAlfaReport} from '../utils/alfaRowValidation.ts';
test('dates must exist on the calendar and time cannot roll over',()=>{
 for(const raw of ['31.02.2026','00.11.2026','12.13.2026','12.11.2026 25:00','12.11.2026 12:80','abc12.11.2026'])assert.equal(parseAlfaDate(raw),null,raw);
 assert.equal(parseAlfaDate('12.11.2026','25:00'),null);
 assert.equal(parseAlfaDate('29.02.2024').getDate(),29);
 assert.equal(parseAlfaDate('2026-11-12').getMonth(),10);
});
test('amount parsing rejects corrupt values and preserves localized cents',()=>{
 for(const raw of ['12abc','1e3','1,2,3','0','12.345','Infinity','1 2','-',''])assert.equal(parseAlfaAmount(raw),null,raw);
 for(const [raw,n] of [['-1\u202f234,56',-1234.56],['1.234,56',1234.56],['1,234.56',1234.56],['125,50 ₽',125.5],[12.34,12.34]])assert.equal(parseAlfaAmount(raw),n,raw);
});
for(const bookType of ['xlsx','biff8'])test('real '+bookType+' workbook retains malformed rows and separates totals',()=>{
 const book=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([['Дата','Сумма','Описание'],['12.11.2026','-12,34','Магазин'],['31.02.2026','100','Ошибка даты'],['12.11.2026','12abc','Ошибка суммы'],['','5','Без даты'],['Итого','112,34','']]),'Выписка');
 const loaded=XLSX.read(XLSX.write(book,{type:'buffer',bookType}),{type:'buffer'});
 const rows=XLSX.utils.sheet_to_json(loaded.Sheets['Выписка'],{header:1,raw:false,defval:''});
 const report=newAlfaReport();
 for(const row of rows.slice(1)){
  if(isAlfaServiceRow(row,0,1,2)){report.serviceRows++;continue;}
  report.operationRows++;
  if(!parseAlfaDate(row[0])||parseAlfaAmount(row[1])===null)report.errors.push({sheet:'Выписка',row:report.operationRows+1,reason:'invalid'});else report.ready++;
 }
 assert.equal(report.operationRows,4);assert.equal(report.serviceRows,1);assert.equal(report.ready,1);assert.equal(report.errors.length,3);
});
