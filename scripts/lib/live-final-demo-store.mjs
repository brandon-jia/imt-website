import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { mutateLiveFinal, readLiveFinal } from '../../src/lib/liveFinal.ts';

export const demoPeople = ['admin','alice','bob','charlie','dana','eli'];
export const demoCode = 'FINAL-DEMO-2026';
export function demoIdentity(name) {
  const index=demoPeople.indexOf(name);
  if(index<0)return null;
  return {id:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,name:name==='admin'?'Demo organizer':name[0].toUpperCase()+name.slice(1),email:name+'@example.invalid',isAdmin:name==='admin'};
}
export const sampleQuestions = [
  ['Compute $6\\times 7$.','42'],['Compute $3^2+2^3$.','17'],['Find $x$ if $2x+13=3$.','-5'],['How many permutations are there of five distinct objects?','120'],['Compute $2^8$.','256'],['Find the positive integer $x$ such that $x^2=169$.','13'],['Compute $3^4$.','81'],['Compute $10^3$.','1000'],['How many days are in one week?','7'],['Compute $4^3$.','64'],
];

export async function createFinalDemoStore() {
  const db=new PGlite();
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
    CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.test_admins(user_id uuid PRIMARY KEY REFERENCES auth.users(id));`);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261016000100_fall_live_final.sql',import.meta.url),'utf8'));
  for(const name of demoPeople)await db.query('INSERT INTO auth.users VALUES($1)',[demoIdentity(name).id]);
  await db.query('INSERT INTO test_admins VALUES($1)',[demoIdentity('admin').id]);
  const allowed=new Set(['get_live_final_state','get_live_final_admin_state','join_live_final','submit_live_final','control_live_final']);
  const adapter={rpc:async(name,args)=>{
    if(!allowed.has(name))throw Error('Unsupported demo database function.');
    const entries=Object.entries(args);
    if(entries.some(([key])=>!/^p_[a-z_]+$/.test(key)))throw Error('Invalid database argument.');
    try{return {data:(await db.query(`SELECT public.${name}(${entries.map(([key],i)=>`${key}=>$${i+1}`).join(',')}) AS result`,entries.map(([,value])=>value))).rows[0].result,error:null};}
    catch(error){return {data:null,error};}
  }};
  const admin=demoIdentity('admin');
  let state=(await mutateLiveFinal(adapter,admin,{action:'initialize'},true)).state;
  state=(await mutateLiveFinal(adapter,admin,{action:'set_code',version:state.round.version,code:demoCode},true)).state;
  for(let i=0;i<sampleQuestions.length;i++)state=(await mutateLiveFinal(adapter,admin,{action:'save_question',version:state.round.version,number:i+1,prompt:sampleQuestions[i][0],answer:sampleQuestions[i][1]},true)).state;
  await mutateLiveFinal(adapter,admin,{action:'open_lobby',version:state.round.version},true);
  return {
    db,adapter,
    read:(person,adminView)=>readLiveFinal(adapter,person,adminView),
    mutate:(person,body,adminView)=>mutateLiveFinal(adapter,person,body,adminView),
    async expire(){
      const state=await readLiveFinal(adapter,admin,true),q=state.questions.find(q=>q.number===state.round.current_question);
      if(!q?.active)throw Error('Open a question first.');
      // This is an isolated demonstration control, never a production API action.
      await db.query("UPDATE live_final_questions SET closes_at=clock_timestamp()-interval '1 second' WHERE round_id='fall-2026-final' AND number=$1",[q.number]);
      return 'The demonstration timer expired. No further answers will be accepted for this question.';
    },
    async simulate(){
      const state=await readLiveFinal(adapter,admin,true),q=state.questions.find(q=>q.number===state.round.current_question);
      if(!q?.active)throw Error('Open a question before simulating participant answers.');
      const pattern=[0,1,0,1,3];
      for(const [i,name] of demoPeople.slice(1).entries()){
        const person=demoIdentity(name);await mutateLiveFinal(adapter,person,{action:'join',code:demoCode});
        const own=await readLiveFinal(adapter,person);if(own.own.solved)continue;
        for(let wrong=0;wrong<pattern[i];wrong++)await mutateLiveFinal(adapter,person,{action:'submit',question:q.number,answer:String(BigInt(q.answer)+100n+BigInt(wrong)),request_id:randomUUID()});
        await mutateLiveFinal(adapter,person,{action:'submit',question:q.number,answer:q.answer,request_id:randomUUID()});
      }
      return 'Five participant views submitted answers. See the organizer report for finish order, wrong-answer penalties, and zero-floor scoring.';
    },
    close:()=>db.close(),
  };
}
