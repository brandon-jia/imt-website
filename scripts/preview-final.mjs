// This separate loopback-only server has no production authentication bypass.
// It serves the built final pages and uses an isolated in-memory PostgreSQL database.
import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,sep,extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createFinalDemoStore,demoIdentity,demoPeople } from './lib/live-final-demo-store.mjs';
import { FinalError } from '../src/lib/liveFinal.ts';

const port=Number(process.env.FINAL_DEMO_PORT||4174),origin=`http://127.0.0.1:${port}`;
const root=resolve('.vercel/output/static');
const {default:app}=await import(pathToFileURL(resolve('.vercel/output/_functions/entry.mjs')).href);
let store=await createFinalDemoStore(),queue=Promise.resolve();
function serialized(task){const result=queue.then(task);queue=result.catch(()=>{});return result;}
const mime={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req){let size=0,text='';for await(const chunk of req){size+=chunk.length;if(size>120000)throw new FinalError(413,'BODY_TOO_LARGE','Request is too large.');text+=chunk;}try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw new FinalError(400,'INVALID_JSON','Use a JSON object.');}}
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url||'/',origin);
    if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`){json(res,{error:'Use the local demonstration address.'},403);return;}
    if(!['GET','HEAD','POST'].includes(req.method)){json(res,{error:'Method not allowed.'},405);return;}
    if(req.method==='POST'&&req.headers.origin!==`http://${req.headers.host}`){json(res,{error:'Cross-origin submission blocked.'},403);return;}
    if(url.pathname.startsWith('/__final-demo/')){
      if(req.method!=='POST'){json(res,{error:'Use POST.'},405);return;}
      const input=await body(req);if(input.confirm!==true){json(res,{error:'Confirmation is required.'},400);return;}
      const message=await serialized(async()=>{
        if(url.pathname==='/__final-demo/simulate')return store.simulate();
        if(url.pathname==='/__final-demo/expire')return store.expire();
        if(url.pathname==='/__final-demo/reset'){const old=store;store=await createFinalDemoStore();await old.close();return 'Demonstration reset.';}
        throw new FinalError(404,'NOT_FOUND','Unknown demonstration control.');
      });json(res,{message});return;
    }
    if(url.pathname==='/api/test-portal/final'||url.pathname==='/api/test-portal/admin/final'){
      const person=demoIdentity(req.headers['x-final-demo-user']);if(!person){json(res,{error:'Choose a demonstration view.'},401);return;}
      const admin=url.pathname.includes('/admin/');const input=req.method==='POST'?await body(req):null;
      const result=await serialized(()=>input?store.mutate(person,input,admin):store.read(person,admin));json(res,result);return;
    }
    if(url.pathname.startsWith('/api/')){json(res,{error:'Only isolated final-round demo APIs are available here.'},404);return;}
    const file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(file!==root&&!file.startsWith(root+sep)){json(res,{error:'Forbidden.'},403);return;}
    let exists=false;try{exists=(await stat(file)).isFile();}catch{}
    if(exists){res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:await readFile(file));return;}
    if(!['/','/test-portal/final','/test-portal/admin/final'].includes(url.pathname)){res.writeHead(302,{Location:'/'}).end();return;}
    if(url.pathname==='/'){
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IMT final-round demonstration</title><style>body{max-width:760px;margin:4rem auto;padding:1rem;font:18px/1.7 'Segoe UI',Arial,sans-serif;background:#f7f4ec;color:#203d32}a{color:inherit}li{margin:.6rem 0}code{background:white;padding:.2rem .4rem}</style><h1>Final-round demonstration</h1><p>This uses sample questions and an isolated local database. No live accounts, attempts, or results are changed. Shared code: <code>FINAL-DEMO-2026</code>.</p><ol><li>Open the <a href="/test-portal/admin/final?as=admin">organizer controls</a> and click “Open question 1”.</li><li>Open a participant view below and enter the code. The first sample answer is <strong>42</strong>.</li><li>Submit a wrong answer, then the correct answer. Watch the solver count and awarded points.</li><li>Use “Simulate participant answers” to populate the report, or “Expire current timer” to check the deadline.</li><li>Open the next question manually and inspect totals and per-question breakdowns.</li></ol><nav>${demoPeople.slice(1).map(name=>`<p><a target="_blank" rel="noopener" href="/test-portal/final?as=${name}">View as ${name}</a></p>`).join('')}</nav></html>`);return;
    }
    const person=demoPeople.includes(url.searchParams.get('as'))?url.searchParams.get('as'):url.pathname.includes('/admin/')?'admin':'alice';
    const response=await app.fetch(new Request(url,{headers:req.headers}));
    const headers=Object.fromEntries(response.headers);headers['cache-control']='no-store';headers['content-security-policy']=(headers['content-security-policy']||"default-src 'self'").replace(/connect-src[^;]+/,"connect-src 'self'");
    const html=(await response.text()).replace('<body ',`<body data-final-demo="true" data-final-demo-user="${person}" `);
    res.writeHead(response.status,headers);res.end(req.method==='HEAD'?undefined:html);
  }catch(error){json(res,{error:error.message||'Demonstration request failed.',code:error.code||'DEMO_ERROR'},error instanceof FinalError?error.status:400);}
});
server.listen(port,'127.0.0.1',()=>console.log(`Isolated final-round demonstration: ${origin}\nOrganizer: ${origin}/test-portal/admin/final?as=admin\nParticipant: ${origin}/test-portal/final?as=alice`));
process.on('SIGINT',()=>{server.close();void queue.then(()=>store.close()).finally(()=>process.exit(0));});
