/** Login is an auth identifier, not a member display name. */
export function accountLoginFromEmail(email:string):string {
 return email.toLowerCase().endsWith('@family.local')?email.slice(0,-'@family.local'.length):email;
}
export function normalizeAccountLogin(input:string):string|null {
 const value=input.trim().toLowerCase();
 if(!value||/\s/.test(value))return null;
 if(!value.includes('@'))return /^[a-z0-9._-]+$/.test(value)?value+'@family.local':null;
 return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)?value:null;
}
