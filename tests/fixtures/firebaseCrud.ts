// Used exclusively by the isolated CRUD test Vite configuration.
import {initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,connectAuthEmulator} from 'firebase/auth';
import {initializeFirestore,memoryLocalCache,connectFirestoreEmulator} from 'firebase/firestore';
if(typeof location==='undefined'||location.hostname!=='127.0.0.1')throw new Error('CRUD test Firebase must run on loopback');
const app=initializeApp({apiKey:'demo-key',projectId:'demo-budget',authDomain:'demo-budget.firebaseapp.com',appId:'demo-crud-browser'});
export const auth=getAuth(app);
connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
export const db=initializeFirestore(app,{localCache:memoryLocalCache(),ignoreUndefinedProperties:true});
connectFirestoreEmulator(db,'127.0.0.1',8080);
export const googleProvider=new GoogleAuthProvider();
export const messaging=null;
