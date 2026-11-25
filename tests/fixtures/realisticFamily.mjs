// Deterministic synthetic records only. No credentials, Firebase connection, or financial production data.
export function makeFamilyFixtures({now=new Date(),members}){
 if(!(now instanceof Date)||!Number.isFinite(now.getTime())||!Array.isArray(members)||members.length<1||members.length>2||members.some(m=>!m.id||!m.userId)||new Set(members.map(m=>m.id)).size!==members.length||new Set(members.map(m=>m.userId)).size!==members.length)throw new Error('Expected one or two distinct authenticated fixture members');
 const prefix='qa-fixture-v1-';
 const key=(s)=>prefix+s;
 const day=(d)=>d.toISOString().slice(0,10);
 const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 const at=(offset)=>new Date(today.getTime()+offset*86400000);
 const start=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()-6,1));
 const member=(i)=>members[((i%members.length)+members.length)%members.length];
 const owner=(i)=>({memberId:member(i).id,userId:member(i).userId});
 const stamp=(d,h=12)=>new Date(Math.min(d.getTime()+h*3600000,now.getTime())).toISOString();
 const goalId=key('goal-trip');
 const transactions=[];
 const catalog=[['food','Продукты',129945],['grocery_pyaterochka','Пятёрочка',84327,'Пятерочка'],['transport','Проезд',5400],['fuel','Заправка',238065],['coffee','Кофе',29000],['pharmacy','Аптека',67450],['kids','Детский кружок',175000],['restaurants','Семейный обед',185090],['clothes','Одежда',349999],['other','Расходы на дом',78045],['shopping','Заказ для дома',159900]];
 function tx(d,i,suffix,category,note,cents,type='expense',extra={}){
  const row={id:key('tx-'+day(d)+'-'+suffix),date:stamp(d),amount:cents/100,type,category,note,payee:note,rawNote:'QA BANK '+note+' '+day(d),...owner(i),...extra};
  transactions.push(row);
 }
 let idx=0;
 for(let d=new Date(start);d<=today;d=new Date(d.getTime()+86400000),idx++){
  const k=catalog[idx%catalog.length];
  tx(d,idx,'daily',k[0],k[1],k[2]+(idx%17)*111,'expense',k[3]?{subcategory:k[3]}:{});
  if(idx%4===0)tx(d,idx+1,'extra','food','Покупки к ужину',34945+(idx%9)*123);
  if(d.getUTCDate()===5)tx(d,0,'salary-a','salary','Зарплата',9500000,'income');
  if(d.getUTCDate()===20)tx(d,1,'salary-b','salary','Зарплата',7800000,'income');
  if(d.getUTCDate()===10)tx(d,0,'rent','housing','Аренда квартиры',3200000,'expense',{linkedExpenseId:key('bill-rent')});
  if(d.getUTCDate()===15)tx(d,1,'utilities','utilities','Коммунальные услуги',685000,'expense',{linkedExpenseId:key('bill-utilities')});
  if(d.getUTCDate()===22)tx(d,1,'cashback','income_cashback','Кэшбэк',74512,'income');
  if(d.getUTCDate()===23)tx(d,0,'goal','savings','Перевод на накопительный счет',500000,'expense',{linkedGoalId:goalId});
  if(d.getUTCDate()===24)tx(d,0,'goal-return','savings','Возврат с накопительного счета',50000,'income',{linkedGoalId:goalId});
 }
 // A confirmed external transfer must not change the internal savings goal.
 tx(start,0,'external','savings','Перевод на накопительный счет',170025,'expense',{externalSavingsConfirmed:true});
 // Legacy valid record: member ownership is known, optional bank metadata is absent.
 transactions.push({id:key('tx-'+day(today)+'-legacy'),date:stamp(today,11),amount:83.19,type:'expense',category:'transport',note:'Старая банковская операция (QA)',memberId:member(0).id});
 const goalBalance=transactions.filter(r=>r.linkedGoalId===goalId).reduce((sum,r)=>sum+(r.type==='expense'?1:-1)*Math.round(r.amount*100),0)/100;
 const goals=[{id:goalId,title:'Отпуск',targetAmount:150000,currentAmount:goalBalance,memberId:member(0).id,color:'#4A7C59',icon:'PiggyBank'},{id:key('goal-repair'),title:'Ремонт',targetAmount:80000,currentAmount:0,memberId:member(1).id,color:'#A2845E',icon:'Home'}];
 const events=Array.from({length:24},(_,i)=>{
  const offset=[-70,-45,-32,-20,-14,-9,-4,-2,0,0,1,2,3,4,5,7,9,12,15,21,30,45,60,90][i];
  const date=day(at(offset));const titles=['Поездка за город','Встреча с друзьями','Семейный ужин','Сдать документы','Записаться в мастерскую','Прогулка','Занятие в бассейне','Подготовить подарки'];
  return {id:key('event-'+i+'-'+date),title:titles[i%titles.length],description:i%3===0?'Взять документы и уточнить время.':'',date,time:i%2?'18:30':'10:00',duration:i%3===0?90:60,memberIds:i%3===0?members.map(m=>m.id):[member(i).id],userId:member(i).userId,kind:i%3===0?'task':'event',completed:offset<0&&i%2===0, ...(offset<0&&i%2===0?{completedAt:stamp(at(offset))}:{}),recurrence:i===15?'weekly':i===18?'monthly':'none',checklist:[{id:key('check-'+i),text:'Подготовить необходимое',completed:offset<0&&i%2===0}],reminders:[]};
 });
 const shopping=['Молоко','Хлеб','Яблоки','Курица','Рис','Паста','Йогурт','Сыр','Овощи','Чай','Мыло','Средство для стирки','Бумажные полотенца','Кофе','Крупа','Орехи','Масло','Мука'].map((title,i)=>({id:key('shop-'+i),title,amount:String(1+i%3),unit:'шт',category:i<10?'food':'other',priority:['low','medium','high'][i%3],estimatedPrice:(11900+i*790)/100,completed:i%3===0,...(i%3===0?{completedAt:at(-1-i%4).getTime()}:{}),...owner(i)}));
 const pantry=['Рис','Гречка','Макароны','Чай','Мука','Масло'].map((title,i)=>({id:key('pantry-'+i),title,amount:String(1+i%3),unit:i===5?'л':'кг',category:'food',addedDate:day(at(-14)),expiryDate:day(at(i-2))}));
 const debts=[{id:key('debt-1'),memberId:member(0).id,name:'Кредит на технику',totalAmount:60000,currentBalance:27000,interestRate:12,minPayment:4000,monthlyPayment:4000,paymentDay:15,color:'#A2845E',strategy:'fixed',paidThisMonth:false,notifyBefore:0,notifyIfOverdue:false,channels:[]}];
 const subscriptions=['Музыка','Облачное хранилище','Онлайн-кинотеатр'].map((name,i)=>({id:key('sub-'+i),memberId:member(i).id,name,amount:[299,399,599][i],currency:'₽',billingCycle:'monthly',nextPaymentDate:day(at(3+i*7)),category:'subscriptions',icon:'Zap'}));
 const loyalty=['Учебный супермаркет','Учебная аптека','Учебный магазин'].map((name,i)=>({id:key('card-'+i),name,number:'QA-DEMO-000'+i,color:['#4A7C59','#A2845E','#457B9D'][i],icon:'ShoppingBag',barcodeFormat:'code128',note:'Синтетическая карта, не действует'}));
 const meterReadings=['water_hot','water_cold','electricity'].flatMap((type,i)=>[0,1,2].map(j=>({id:key('meter-'+i+'-'+j),type,value:100+i*250+j*12,prevValue:88+i*250+j*12,date:day(at(-60+j*30))})));
 const projects=[{id:key('project-1'),title:'Обновление комнаты',description:'Учебный проект',totalBudget:45000,currency:'₽',status:'active',startDate:day(at(-20)),endDate:day(at(40)),color:'#4A7C59',icon:'Home',expenses:[]}];
 const wishlist=['Настольная лампа','Книги','Рюкзак'].map((title,i)=>({id:key('wish-'+i),title,price:[1990,850,3500][i],currency:'₽',ownerId:member(i).userId,priority:['low','medium','high'][i],createdAt:stamp(at(-3-i))}));
 const chat=['На выходных съездим за город?','Да, возьмём термос.','Добавил продукты в список.','Посмотрим планы на вечер.'].map((text,i)=>({id:key('chat-'+i),topicId:'general',text,userId:member(i).userId,userName:'Участник '+(i%members.length+1),timestamp:at(-4+i).getTime()+36000000,type:'text',heartUsers:[]}));
 return {transactions,goals,events,shopping,pantry,debts,subscriptions,loyalty,meterReadings,projects,wishlist,chat};
}

export function fixtureSettings(members){
 return {
  targetMonthlyBudget:110000,
  categoryBudgets:{food:20000,transport:5000,fuel:8000,restaurants:6000},
  enableSmartReserve:true,
  mandatoryExpenses:[
   {id:'qa-fixture-v1-bill-rent',name:'Аренда квартиры',amount:32000,day:10,remind:false,memberId:members[0].id,expenseType:'regular'},
   {id:'qa-fixture-v1-bill-utilities',name:'Коммунальные услуги',amount:6850,day:15,remind:false,memberId:members.at(-1).id,expenseType:'regular'},
   {id:'qa-fixture-v1-bill-internet',name:'Домашний интернет',amount:750,day:28,remind:false,expenseType:'regular'}
  ]
 };
}
// Existing canonical IDs, not custom fixture IDs. Never overwrite them in production.
export const fixtureCategories=[
 ['income','Доходы','Landmark','#2F855A',null,'income'],
 ['salary','Зарплата','Briefcase','#2F855A','income','income'],
 ['income_cashback','Кэшбэк','CreditCard','#2F855A','income','income'],
 ['food','Продукты','ShoppingBasket','#4A7C59'],
 ['grocery_pyaterochka','Пятерочка','ShoppingBasket','#4A7C59','food'],
 ['transport','Транспорт','Bus','#457B9D'],
 ['fuel','Бензин','Fuel','#E76F51'],
 ['coffee','Кофе','Coffee','#A2845E'],
 ['pharmacy','Аптека','Pill','#4A7C59'],
 ['kids','Дети','Baby','#F4A261'],
 ['restaurants','Кафе и Рестораны','Utensils','#E07A5F'],
 ['clothes','Одежда','Shirt','#D4A373'],
 ['other','Прочее','MoreHorizontal','#8D99AE'],
 ['shopping','Шоппинг','ShoppingBag','#D4A373'],
 ['housing','Аренда/Ипотека','Home','#2A9D8F'],
 ['utilities','ЖКХ','Home','#2A9D8F'],
 ['savings','Накопительный счет','PiggyBank','#7C3AED'],
 ['subscriptions','Подписки','Zap','#457B9D']
].map(([id,label,icon,color,parentId,transactionType])=>({id,label,icon,color,...(parentId?{parentId}:{}),...(transactionType?{transactionType}:{})}));
