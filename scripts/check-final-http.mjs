import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {default:app}=await import(pathToFileURL(resolve('.vercel/output/_functions/entry.mjs')).href);
const origin='https://www.integratedmath.org';
for(const path of ['/api/test-portal/final','/api/test-portal/admin/final']){
  const response=await app.fetch(new Request(origin+path,{headers:{'X-Final-Demo-User':'admin'}}));
  const closed = path === '/api/test-portal/final';
  assert.equal(response.status,closed ? 403 : 401,`${path} must not recognize demo identities`);
  assert.equal((await response.json()).code,closed ? 'PORTAL_CLOSED' : 'AUTH_REQUIRED');
}
const hostile=await app.fetch(new Request(origin+'/api/test-portal/admin/final',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({action:'initialize'})}));
assert.equal(hostile.status,403);
const noLogin=await app.fetch(new Request(origin+'/api/test-portal/admin/final',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Final-Demo-User':'admin'},body:JSON.stringify({action:'initialize'})}));
assert.equal(noLogin.status,401);
for(const path of ['/test-portal/final','/test-portal/admin/final']){
  const response=await app.fetch(new Request(origin+path+'?as=admin'));
  assert.equal(response.status,200);assert.match(response.headers.get('x-robots-tag'),/noindex/);
  assert.doesNotMatch(await response.text(),/data-final-demo="true"/);
}
console.log('Built final routes: authentication, cross-origin protection, noindex, and production rejection of demo identities passed.');
