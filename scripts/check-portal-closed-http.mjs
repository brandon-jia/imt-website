import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {default:app}=await import(pathToFileURL(resolve('.vercel/output/_functions/entry.mjs')).href);
const origin='https://www.integratedmath.org';
const pagePaths=['/test-portal','/test-portal/','/test-portal/final?as=admin','/test-portal/tests/00000000-0000-4000-8000-000000000001','/test-portal/attempts/00000000-0000-4000-8000-000000000001','/test-portal/admin-imposter','/test-portal/%66inal'];
for(const path of pagePaths){
  const response=await app.fetch(new Request(origin+path));
  assert.equal(response.status,200,path);
  assert.match(response.headers.get('x-robots-tag'),/noindex/);
  assert.match(response.headers.get('cache-control'),/no-store/);
  const html=await response.text();
  assert.match(html,/The competition has concluded/);
  assert.doesNotMatch(html,/Administrator sign-in/);
  assert.match(html,/href="\/register"[^>]*>Email updates/);
  assert.doesNotMatch(html,/id="(?:final-answer|login-form|signup-form)"/);
}
for(const [path,method] of [
  ['/api/test-portal/tests','GET'],['/api/test-portal/tests/id/start','POST'],
  ['/api/test-portal/attempts/id','GET'],['/api/test-portal/attempts/id/answers','PUT'],
  ['/api/test-portal/attempts/id/proof','POST'],['/api/test-portal/attempts/id/submit','POST'],
  ['/api/test-portal/attempts/id/scratch','POST'],['/api/test-portal/attempts/id/events','POST'],
  ['/api/test-portal/attempts/id/heartbeat','POST'],['/api/test-portal/final','POST'],
]){
  const response=await app.fetch(new Request(origin+path+'?as=admin',{method,headers:{Authorization:'Bearer forged','X-Final-Demo-User':'admin',Origin:origin}}));
  assert.equal(response.status,403,`${method} ${path}`);
  assert.equal((await response.json()).code,'PORTAL_CLOSED');
  assert.match(response.headers.get('cache-control'),/no-store/);
}
for(const path of ['/api/test-portal/me','/api/test-portal/admin/tests','/api/test-portal/admin/final']){
  const response=await app.fetch(new Request(origin+path));assert.equal(response.status,401,path);
}
for(const path of ['/test-portal/admin','/test-portal/admin/login','/test-portal/admin/final','/test-portal/admin/grading','/test-portal/admin/overview']){
  const response=await app.fetch(new Request(origin+path));assert.equal(response.status,200,path);
  assert.doesNotMatch(await response.text(),/The competition has concluded/);
}
console.log('Built portal: participant pages and APIs closed; admin pages, sign-in and API authentication preserved.');
