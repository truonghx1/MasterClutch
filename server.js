import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const host=process.argv.includes('--lan')?'0.0.0.0':'127.0.0.1';
http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(p!==root&&!p.startsWith(root+path.sep))throw Error();const file=p===root?path.join(root,'index.html'):p;const b=await readFile(file);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(b)}catch{res.statusCode=404;res.end('Not found')}}).listen(5173,host,()=>{console.log('http://127.0.0.1:5173');if(host==='0.0.0.0')console.log('LAN enabled: open http://<PC-LAN-IP>:5173 on a phone connected to the same Wi-Fi.')});
