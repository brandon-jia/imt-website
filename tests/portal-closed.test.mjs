import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { closedPortalRoute, adminReturnPath, PARTICIPANT_PORTAL_OPEN, PORTAL_CLOSED_MESSAGE } from '../src/lib/portalAccess.ts';

test('closed participant routes include direct links and APIs while retaining admin routes', () => {
  assert.equal(PARTICIPANT_PORTAL_OPEN, false);
  for (const path of ['/test-portal', '/test-portal/', '/test-portal/final', '/test-portal/tests/id', '/test-portal/attempts/id', '/test-portal/admin-imposter', '/test-portal/%66inal', '/test-portal/admin/../final']) assert.equal(closedPortalRoute(path), 'page', path);
  for (const path of ['/api/test-portal/final', '/api/test-portal/tests/id/start', '/api/test-portal/attempts/id/answers', '/api/test-portal/admin-imposter']) assert.equal(closedPortalRoute(path), 'api', path);
  for (const path of ['/test-portal/admin', '/test-portal/admin/login', '/test-portal/admin/final', '/test-portal/admin/attempts/id', '/api/test-portal/admin/final', '/api/test-portal/me', '/test-portal/closed', '/competitions/fall-2026']) assert.equal(closedPortalRoute(path), null, path);
});
test('admin return destinations stay inside the admin workspace', () => {
  assert.equal(adminReturnPath('/test-portal/admin/final?round=1'), '/test-portal/admin/final?round=1');
  for (const path of ['https://evil.invalid/test-portal/admin', '//evil.invalid', '/test-portal/admin-imposter', '/test-portal/final', '/test-portal/admin/login?next=/test-portal/admin/login', '/test-portal/admin/../final']) assert.equal(adminReturnPath(path), '/test-portal/admin', path);
});

// Execute the actual authentication helper with a mocked identity service and admin table.
const source = readFileSync(new URL('../src/lib/testPortalAuth.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '');
const compiled = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.None}}).outputText;
function authFixture({admin=false, lookupError=null, valid=true}={}) {
  let rateCalls=0;
  const user={id:'person-1',email_confirmed_at:'2026-01-01',user_metadata:{is_admin:true}};
  const service={auth:{getUser:async()=>({data:{user:valid?user:null},error:valid?null:Error('invalid')})},
    from(table){assert.equal(table,'test_admins');return {select(){return this;},eq(field,id){assert.equal(field,'user_id');assert.equal(id,user.id);return this;},async maybeSingle(){return {data:admin?{user_id:user.id}:null,error:lookupError};}};},
    rpc(){rateCalls++;return {single:async()=>({data:{allowed:true},error:null})};}};
  const authenticate = new Function('createServerClient','readBoundedText','PARTICIPANT_PORTAL_OPEN','PORTAL_CLOSED_MESSAGE',compiled+'\nreturn authenticatePortalRequest;')(()=>service,()=>{},PARTICIPANT_PORTAL_OPEN,PORTAL_CLOSED_MESSAGE);
  return {authenticate,rateCalls:()=>rateCalls};
}
const request=()=>new Request('https://www.integratedmath.org/api/test-portal/admin/tests',{method:'POST',headers:{Authorization:'Bearer example'}});
test('participants cannot enter or mutate after closure even if metadata claims admin', async()=>{
  const fixture=authFixture();
  await assert.rejects(fixture.authenticate(request()),{status:403,code:'PORTAL_CLOSED'});
  await assert.rejects(fixture.authenticate(request(),{admin:true}),{status:403,code:'ADMIN_REQUIRED'});
  assert.equal(fixture.rateCalls(),0);
});
test('verified administrators retain authenticated access and mutation protections',async()=>{
  const fixture=authFixture({admin:true});
  const result=await fixture.authenticate(request(),{admin:true});
  assert.equal(result.isAdmin,true);assert.equal(fixture.rateCalls(),1);
});
test('invalid sessions and failed admin lookups remain denied',async()=>{
  await assert.rejects(authFixture({valid:false}).authenticate(request()),{status:401});
  await assert.rejects(authFixture({lookupError:Error('offline')}).authenticate(request()),{status:500,code:'ADMIN_LOOKUP_FAILED'});
  await assert.rejects(authFixture().authenticate(new Request('https://www.integratedmath.org/api/test-portal/me')),{status:401,code:'AUTH_REQUIRED'});
});
