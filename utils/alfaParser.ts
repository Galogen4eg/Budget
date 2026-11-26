
import * as XLSX from 'xlsx';
import { Transaction, AppSettings, LearnedRule, Category } from '../types';
import { getSmartCategory, cleanMerchantName } from './categorizer';
import { classifyAlfaDirection } from './alfaDirection';
import { alfaOperationId } from './alfaIdentity';
import { isAlfaOperationDuplicate } from './alfaDuplicates';
import { analyzeTransaction, matchMerchantBrand } from './analyzerHelper';
import { isCategoryForType } from './categoryCatalog';
import { isEligibleForImport } from './importSafety';
import { newAlfaReport, AlfaStatementRowsError, parseAlfaDate, parseAlfaAmount, rowIsBlank, isAlfaServiceRow, isVerifiedEmptyAlfaSheets, type AlfaParseReport } from './alfaRowValidation';

export const parseAlfaStatement = (
  file: File, 
  mapping: AppSettings['alfaMapping'],
  defaultMemberId: string,
  learnedRules: LearnedRule[] = [],
  categories: Category[],
  existingTransactions: Transaction[] = [],
  onReport?: (report:AlfaParseReport)=>void,
  allowVerifiedEmpty = false
): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Не удалось прочитать файл");

        const workbook = XLSX.read(data, { 
          type: 'array', 
          cellDates: true, 
          dateNF: 'dd.mm.yyyy',
          cellText: false,
          cellNF: true
        });

        let allParsedTransactions: Transaction[] = [];
        const report=newAlfaReport();
        const issue=(sheet:string,row:number,reason:string)=>{report.errors.push({sheet,row,reason});};
        const occurrenceBySignature = new Map<string, number>();

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

          if (!json||json.every(rowIsBlank))continue;

          let headerRowIndex = -1;
          const keywords = {
            date: ['дата', 'date', 'операци', 'день', 'время'],
            time: ['время', 'time'],
            amount: ['сумма', 'amount', 'sum', 'приход', 'расход', 'rub', 'руб', 'платёж'],
            note: ['описание', 'note', 'назначение', 'детали', 'комментарий', 'место', 'merchant', 'получатель', 'основание'],
          };

          // Find header row by checking for presence of date and amount keywords
          for (let i = 0; i < Math.min(json.length, 30); i++) {
            const row = json[i].map(c => String(c).toLowerCase());
            const hasDate = row.some(c => keywords.date.some(k => c.includes(k)));
            const hasAmount = row.some(c => keywords.amount.some(k => c.includes(k)));
            
            if (hasDate && hasAmount) {
              headerRowIndex = i;
              break;
            }
          }

          // Without a reliable header we cannot safely identify all operation columns.
          if (headerRowIndex === -1){
            json.forEach((row,i)=>{if(!rowIsBlank(row)){report.operationRows++;issue(sheetName,i+1,'Не удалось определить заголовок и колонки');}else report.serviceRows++;});
            continue;
          }
          // Preamble and header are service rows, but a date+amount before the header is suspicious.
          for(let i=0;i<=headerRowIndex;i++){
            const row=json[i];
            if(i<headerRowIndex&&row.some(v=>parseAlfaDate(v))&&row.some(v=>parseAlfaAmount(v)!==null)){
              report.operationRows++;issue(sheetName,i+1,'Возможная операция перед заголовком');
            }else report.serviceRows++;
          }

          const headers = json[headerRowIndex].map((h: any) => String(h).toLowerCase().trim());
          
          const findCol = (pref: string, keys: string[]) => {
            if (pref) {
              const idx = headers.findIndex(h => h === pref.toLowerCase());
              if (idx !== -1) return idx;
            }
            return headers.findIndex(h => keys.some(k => h.includes(k)));
          };

          const colDate = findCol(mapping.date, keywords.date);
          const colTime = findCol(mapping.time, keywords.time);
          const colAmount = findCol(mapping.amount, keywords.amount);
          const colNote = findCol(mapping.note, keywords.note);
          const colType = headers.findIndex(h => h === 'тип' || h === 'тип операции' || h === 'направление операции');
          const colCard = headers.findIndex(h => h === 'номер карты');
          const colAccount = headers.findIndex(h => h === 'номер счета' || h === 'номер счёта');
          const colCurrency = headers.findIndex(h => h === 'валюта');
          const colMcc = headers.findIndex(h => h === 'mcc код' || h === 'mcc-код' || h === 'mcc');
          const colBankCategory = headers.findIndex(h => h === 'категория' || h === 'категория операции');

          // If note column not found, find the widest text column as fallback
          let effectiveColNote = colNote;
          if (effectiveColNote === -1 && json.length > headerRowIndex + 5) {
             let maxLen = 0;
             let bestCol = -1;
             for(let c = 0; c < headers.length; c++) {
                 if (c === colDate || c === colAmount) continue;
                 const avgLen = json.slice(headerRowIndex+1, headerRowIndex+6).reduce((sum, row) => sum + String(row[c]||'').length, 0);
                 if (avgLen > maxLen) {
                     maxLen = avgLen;
                     bestCol = c;
                 }
             }
             if (maxLen > 5) effectiveColNote = bestCol;
          }

          if(colDate===-1||colAmount===-1){
            for(let i=headerRowIndex+1;i<json.length;i++)if(!rowIsBlank(json[i])){report.operationRows++;issue(sheetName,i+1,'Не найдены колонки даты и суммы');}else report.serviceRows++;
            continue;
          }

          for (let i = headerRowIndex + 1; i < json.length; i++) {
            const row = json[i];
            if(!row||isAlfaServiceRow(row,colDate,colAmount,effectiveColNote)){report.serviceRows++;continue;}
            report.operationRows++;
            const dateObj=parseAlfaDate(row[colDate],colTime!==-1&&colTime!==colDate?row[colTime]:undefined);
            if(!dateObj){issue(sheetName,i+1,'Некорректная дата или время');continue;}
            const dateStr=dateObj.toISOString();
            const amount=parseAlfaAmount(row[colAmount]);
            if(amount===null){issue(sheetName,i+1,'Некорректная сумма или точность');continue;}

            const rawNote = effectiveColNote !== -1 ? String(row[effectiveColNote] || '').trim() : "Операция";
            
            const type = classifyAlfaDirection(
              colType >= 0 ? row[colType] : '',
              amount,
              headers[colAmount],
              colType >= 0
            );

            const absAmount = Math.abs(amount);
            let note = cleanMerchantName(rawNote, learnedRules);
            // Alfa XLSX provides both bank category and MCC: use them before
            // falling back to the existing analyzer. Never accept its generic
            // "shopping" fallback as a confident automatic classification.
            const rawMcc = colMcc >= 0 ? String(row[colMcc] ?? '').trim() : '';
            const mcc = rawMcc.match(/(?:^|\D)(\d{4})(?:\D|$)/)?.[1];
            const bankCategory = colBankCategory >= 0 ? String(row[colBankCategory] ?? '').trim() : '';
            const suggestion = analyzeTransaction(rawNote, note, mcc, learnedRules, categories, type);
            const merchant = type === 'expense' ? matchMerchantBrand(rawNote, categories) : undefined;
            // Preserve an explicit user's chosen display name. Otherwise use
            // the canonical shop name so recognition is visible in the preview.
            if (merchant && suggestion.source !== 'learned_rule') {
              note = merchant.brandName;
            }
            // Explicit saved rules win. Known merchant chains then override
            // broad bank categories/MCC; otherwise retain existing classification.
            const ownAccountTransfer = /между своими счетами|перевод себе|на свой сч[её]т|между собственными счетами/i.test(rawNote);
            let categoryId = suggestion.source === 'learned_rule' ||
                (ownAccountTransfer && suggestion.suggestedCategoryId !== 'other')
              ? suggestion.suggestedCategoryId
              : (merchant?.categoryId ?? getSmartCategory(rawNote, learnedRules, categories, mcc, bankCategory));
            if (!isCategoryForType(categoryId, categories, type)) categoryId = 'other';
            if (categoryId === 'other' && suggestion.source !== 'fallback' &&
                suggestion.confidence >= 88 &&
                isCategoryForType(suggestion.suggestedCategoryId, categories, type)) {
              categoryId = suggestion.suggestedCategoryId;
            }

            const sourceFields = [
              dateStr, Number(absAmount.toFixed(2)), type, rawNote,
              colCard >= 0 ? String(row[colCard] ?? '') : '',
              colAccount >= 0 ? String(row[colAccount] ?? '') : '',
              colCurrency >= 0 ? String(row[colCurrency] ?? '') : ''
            ];
            const signature = JSON.stringify(sourceFields);
            const occurrence = (occurrenceBySignature.get(signature) || 0) + 1;
            occurrenceBySignature.set(signature, occurrence);
            const id = await alfaOperationId(sourceFields, occurrence);

            const isDuplicate = isAlfaOperationDuplicate(existingTransactions, {
              id, date: dateStr, amount: absAmount, type, rawNote, note
            });

            if (isDuplicate) {report.duplicates++;} else {
              const transaction:Transaction={
                id,
                amount: absAmount,
                type,
                category: categoryId,
                memberId: defaultMemberId,
                note,
                date: dateStr,
                rawNote: rawNote,
                // Preview-only metadata: stripped by ImportModal before persistence.
                ...(mcc ? { mcc } : {})
              };
              allParsedTransactions.push(transaction);
              if(isEligibleForImport(transaction,categories))report.ready++;else report.needsReview++;
            }
          }
        }

        onReport?.(report);
        if(report.errors.length)throw new AlfaStatementRowsError(report);
        if (allParsedTransactions.length === 0) {
          // A generic no-new-rows error is not proof of an empty statement.
          // For destructive cleanup, require a real XLSX container, no hidden
          // formula/error content, the recognized full bank header and zero data rows.
          const bytes = new Uint8Array(data as ArrayBuffer);
          if(allowVerifiedEmpty && report.operationRows===0 && report.duplicates===0 &&
             /\.xlsx$/i.test(file.name) && bytes.length>=4 && bytes[0]===0x50 && bytes[1]===0x4b && bytes[2]===3 && bytes[3]===4){
            const sheets=workbook.SheetNames.map(name=>workbook.Sheets[name]);
            const trustworthy=sheets.every(sheet=>Boolean(sheet)&&Object.entries(sheet).every(([address,cell])=>{
              if(address.startsWith('!'))return true;
              const c=cell as XLSX.CellObject;
              if(!c||typeof c!=='object'||c.f!==undefined||c.F!==undefined||c.t==='e'||c.l||c.c)return false;
              // Do not ignore populated cells outside the declared worksheet range.
              if(c.v===undefined||c.v===null||c.v==='')return true;
              if(!sheet['!ref'])return false;
              const pos=XLSX.utils.decode_cell(address),range=XLSX.utils.decode_range(sheet['!ref']);
              return pos.r>=range.s.r&&pos.r<=range.e.r&&pos.c>=range.s.c&&pos.c<=range.e.c;
            }));
            if(trustworthy&&isVerifiedEmptyAlfaSheets(sheets.map(sheet=>XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:''})))){
              resolve([]);return;
            }
          }
          throw new Error("Новых уникальных операций не найдено.");
        }

        resolve(allParsedTransactions);

      } catch (err) {
        reject(err instanceof Error ? err : new Error("Ошибка при чтении файла"));
      }
    };

    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.readAsArrayBuffer(file);
  });
};
