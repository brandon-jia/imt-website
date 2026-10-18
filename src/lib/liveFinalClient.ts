import { adminSignIn, getPortalSession, PortalClientError } from './testPortalClient';
export const isFinalDemo = document.body.dataset.finalDemo === 'true';
export const finalDemoUser = document.body.dataset.finalDemoUser || '';
let boundAccount: string | undefined;
export async function finalRequest<T>(admin: boolean, body?: Record<string, unknown>): Promise<T> {
  const path = admin ? '/api/test-portal/admin/final' : '/api/test-portal/final';
  const headers = new Headers({ Accept:'application/json' });
  if (body) headers.set('Content-Type','application/json');
  if (isFinalDemo) {
    // Production routes never recognize this demonstration header.
    headers.set('X-Final-Demo-User',finalDemoUser);
  } else {
    const session=await getPortalSession();
    if(!session?.access_token){if(admin)adminSignIn();throw new PortalClientError(401,'AUTH_REQUIRED','Sign in to continue. Your unconfirmed answer will be kept.');}
    if(boundAccount&&boundAccount!==session.user.id)throw new PortalClientError(401,'FINAL_ACCOUNT_CHANGED','The signed-in account changed. Reload this page before continuing.');
    boundAccount=session.user.id;
    headers.set('Authorization',`Bearer ${session.access_token}`);
  }
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),10000);
  try {
    const response=await fetch(path,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{}),headers,signal:controller.signal});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){if(admin&&response.status===401&&!isFinalDemo)adminSignIn();throw new PortalClientError(response.status,data.code||'FINAL_REQUEST_FAILED',data.error||'The request failed. Please try again.');}
    if(!data||typeof data!=='object'||!('server_now' in data||'state' in data))throw new Error('The response could not be confirmed. Please try again.');
    return data as T;
  } catch(error) {
    if(controller.signal.aborted)throw new Error('The connection timed out. Check your last submission before sending another answer.');
    throw error;
  } finally {window.clearTimeout(timeout);}
}
export async function finalAccountKey() {
  if (isFinalDemo) return 'demo:' + finalDemoUser;
  const session = await getPortalSession();
  if(session)boundAccount=session.user.id;
  return session ? session.user.id : null;
}
export function finalClock(closesAt: string | null | undefined, offset: number) {
  const seconds = closesAt ? Math.max(0,Math.ceil((Date.parse(closesAt)-Date.now()-offset)/1000)) : 0;
  return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
}
export function setupFinalDemoToolbar() {
  if (!isFinalDemo) return;
  const toolbar = document.getElementById('final-demo-toolbar');
  if (!toolbar) return;
  toolbar.hidden = false;
  toolbar.querySelector<HTMLElement>('[data-demo-user]')!.textContent = finalDemoUser;
  toolbar.querySelectorAll<HTMLButtonElement>('[data-demo-action]').forEach(button => button.addEventListener('click', async () => {
    const label = toolbar.querySelector<HTMLElement>('[data-demo-status]')!;
    button.disabled = true;
    try {
      const response = await fetch('/__final-demo/' + button.dataset.demoAction,{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true}) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      label.textContent = data.message;
      if (button.dataset.demoAction === 'reset') location.reload();
    } catch (error) { label.textContent = error instanceof Error ? error.message : 'Demo action failed.'; }
    finally { button.disabled = false; }
  }));
}
