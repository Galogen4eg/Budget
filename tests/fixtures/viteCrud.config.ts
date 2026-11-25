import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export default defineConfig({
 root,
 plugins:[react()],
 resolve:{alias:[{find:/^(?:\.\/|\.\.\/)firebase$/,replacement:fileURLToPath(new URL('./firebaseCrud.ts',import.meta.url))}]},
 server:{host:'127.0.0.1',port:4174,strictPort:true}
});
