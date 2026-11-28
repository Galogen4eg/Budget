// Deterministic, synthetic visual cases; never load customer financial records.
export function makeVisualDataProfiles({now=new Date(),members}){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime())||!Array.isArray(members)||members.length!==2||members.some(m=>!m.id||!m.userId)||members[0].id===members[1].id||members[0].userId===members[1].userId)throw new Error('Expected two distinct emulator members and valid date');
 const monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
 const previous=new Date(monthStart.getTime()-1000);
 const current=new Date(Math.max(monthStart.getTime(),Math.min(now.getTime(),monthStart.getTime()+3600000)));
 const colors=['#1e211f','#ffffff','#111111','#ff00ff','#ffa500','#808080','#4A7C59','#457B9D'];
 const cats=Array.from({length:16},(_,i)=>({id:'qa-visual-category-'+i,label:i===0?'Переводы между банковскими счетами и получателями':i===1?'Такси':i===2?'Налоги':i===3?'Связь':i===4?'Продукты':'Синтетическая категория '+(i+1),color:colors[i%colors.length],icon:i%2?'Car':'ShoppingBag',transactionType:'expense'}));
 const row=(profile,i,cents,type='expense',category='food',note='Учебная операция',date=current)=>{
  const m=members[i%members.length];
  return {id:'qa-visual-'+profile+'-'+i,amount:cents/100,type,category,date:date.toISOString(),note,payee:note,rawNote:'QA '+note,memberId:m.id,userId:m.userId};
 };
 const profiles=[
  {id:'empty',transactions:[],categories:[],expected:{incomeCents:0,expenseCents:0}},
  {id:'income-only',transactions:[row('income-only',0,1234567,'income','salary','Учебная зарплата')],categories:[],expected:{incomeCents:1234567,expenseCents:0}},
  {id:'kopeck',transactions:[row('kopeck',0,1)],categories:[],expected:{incomeCents:0,expenseCents:1}},
  {id:'skewed',transactions:[row('skewed',0,18000001,'expense',cats[0].id,'Крупный перевод'),...cats.slice(1).map((c,i)=>row('skewed',i+1,20000+i*100,'expense',c.id,c.label)),row('skewed',16,9000000,'income','salary','Учебная зарплата')],categories:cats,expected:{incomeCents:9000000,expenseCents:18310501}},
  {id:'large-and-long',transactions:[row('large-and-long',0,98765432109,'expense','food','Очень длинное синтетическое название организации получателя с дополнительным описанием и уточнением назначения платежа без сокращений'),row('large-and-long',1,123456789,'income','salary','Учебный доход'),row('large-and-long',2,100,'expense','qa-visual-missing-category','Категория удалена')],categories:[],expected:{incomeCents:123456789,expenseCents:98765432209}},
  {id:'month-boundary',transactions:[row('month-boundary',0,10000000,'expense','food','Предыдущий месяц',previous),row('month-boundary',1,101,'expense','food','Текущий месяц')],categories:[],expected:{incomeCents:0,expenseCents:101}}
 ];
 const today=now.toISOString().slice(0,10);
 const shoppingTitle=['Молоко','Яблоки','Средство для ухода за деликатными тканями и домашним текстилем в большой упаковке','Крупа','Чай','Овощи'];
 for(const profile of profiles){
  const count=profile.id==='empty'||profile.id==='income-only'?0:profile.id==='large-and-long'?6:1;
  profile.shopping=Array.from({length:count},(_,i)=>({id:'qa-visual-shop-'+profile.id+'-'+i,title:profile.id==='large-and-long'?shoppingTitle[(i+2)%shoppingTitle.length]:shoppingTitle[i],amount:i===0?'0.75':String(i+1),unit:i===0?'л':'шт',category:'food',priority:'medium',completed:false,memberId:members[i%2].id,userId:members[i%2].userId}));
  const eventCount=profile.id==='empty'||profile.id==='income-only'?0:profile.id==='large-and-long'?4:1;
  profile.events=Array.from({length:eventCount},(_,i)=>({id:'qa-visual-event-'+profile.id+'-'+i,title:profile.id==='large-and-long'&&i===0?'Длинное название семейного события с дополнительным уточнением места и времени встречи':'Учебное событие '+(i+1),description:'Синтетическое событие',date:today,time:'18:'+String(i*10).padStart(2,'0'),duration:1,memberIds:i===0?members.map(m=>m.id):[members[i%2].id],userId:members[i%2].userId,kind:'event',completed:false,recurrence:'none',checklist:[],reminders:[]}));
 }
 return profiles;
}
