-- Additive final-round tables only. Qualifier attempts, RPCs and uploads are untouched.
BEGIN;

CREATE TABLE public.live_final_rounds (
  id text PRIMARY KEY CHECK (id = 'fall-2026-final'),
  title text NOT NULL DEFAULT 'Fall 2026 Final Round',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','lobby','running','finished')),
  current_question integer NOT NULL DEFAULT 0 CHECK (current_question BETWEEN 0 AND 10),
  version integer NOT NULL DEFAULT 0,
  access_code_hash text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.live_final_questions (
  round_id text NOT NULL REFERENCES public.live_final_rounds(id),
  number integer NOT NULL CHECK (number BETWEEN 1 AND 10),
  prompt text NOT NULL DEFAULT '' CHECK (length(prompt) <= 20000),
  answer text,
  opened_at timestamptz,
  closes_at timestamptz,
  closed_at timestamptz,
  PRIMARY KEY(round_id,number),
  CHECK (answer IS NULL OR answer ~ '^-?[0-9]{1,100}$')
);
CREATE TABLE public.live_final_participants (
  round_id text NOT NULL REFERENCES public.live_final_rounds(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 160),
  email text NOT NULL CHECK (length(email) <= 320),
  joined_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(round_id,user_id)
);
CREATE TABLE public.live_final_scores (
  round_id text NOT NULL,
  question_number integer NOT NULL,
  user_id uuid NOT NULL,
  incorrect_count integer NOT NULL DEFAULT 0 CHECK (incorrect_count >= 0),
  finish_order integer CHECK (finish_order > 0),
  base_points integer NOT NULL DEFAULT 0 CHECK (base_points IN (0,4,6,8,10)),
  points integer NOT NULL DEFAULT 0 CHECK (points BETWEEN 0 AND 10),
  solved_at timestamptz,
  PRIMARY KEY(round_id,question_number,user_id),
  UNIQUE(round_id,question_number,finish_order),
  FOREIGN KEY(round_id,question_number) REFERENCES public.live_final_questions(round_id,number),
  FOREIGN KEY(round_id,user_id) REFERENCES public.live_final_participants(round_id,user_id)
);
CREATE TABLE public.live_final_submissions (
  round_id text NOT NULL,
  question_number integer NOT NULL,
  user_id uuid NOT NULL,
  request_id uuid NOT NULL,
  answer text NOT NULL,
  correct boolean NOT NULL,
  points integer NOT NULL,
  accepted_at timestamptz NOT NULL,
  PRIMARY KEY(round_id,user_id,request_id),
  FOREIGN KEY(round_id,question_number,user_id) REFERENCES public.live_final_scores(round_id,question_number,user_id)
);
CREATE INDEX live_final_submissions_history ON public.live_final_submissions(round_id,user_id,accepted_at);
CREATE TABLE public.live_final_admin_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id text NOT NULL REFERENCES public.live_final_rounds(id),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  question_number integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.live_final_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_final_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_final_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_final_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_final_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_final_admin_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_final_rounds,public.live_final_questions,public.live_final_participants,public.live_final_scores,public.live_final_submissions,public.live_final_admin_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.live_final_rounds,public.live_final_questions,public.live_final_participants,public.live_final_scores,public.live_final_submissions,public.live_final_admin_events TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.live_final_admin_events_id_seq TO service_role;

CREATE FUNCTION public.live_final_integer(p_value text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path = public,pg_temp AS $$
BEGIN
  IF p_value IS NULL OR btrim(p_value) !~ '^[+-]?[0-9]{1,100}$' THEN
    RAISE EXCEPTION 'FINAL_INVALID_INTEGER: Enter an integer with at most 100 digits.';
  END IF;
  RETURN (btrim(p_value)::numeric)::text;
END $$;

CREATE FUNCTION public.get_live_final_state(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE
  r live_final_rounds; q live_final_questions; s live_final_scores;
  t timestamptz := clock_timestamp(); joined boolean; active boolean; last_result boolean;
BEGIN
  SELECT * INTO r FROM live_final_rounds WHERE id='fall-2026-final';
  IF NOT FOUND THEN RETURN jsonb_build_object('available',false,'joined',false,'server_now',t); END IF;
  SELECT EXISTS(SELECT 1 FROM live_final_participants WHERE round_id=r.id AND user_id=p_user_id) INTO joined;
  IF NOT joined THEN
    RETURN jsonb_build_object('available',true,'joined',false,'server_now',t,'round',jsonb_build_object('title',r.title,'status',r.status));
  END IF;
  SELECT * INTO q FROM live_final_questions WHERE round_id=r.id AND number=r.current_question;
  SELECT * INTO s FROM live_final_scores WHERE round_id=r.id AND question_number=r.current_question AND user_id=p_user_id;
  active := coalesce(r.status='running' AND q.opened_at IS NOT NULL AND q.closed_at IS NULL AND t<q.closes_at,false);
  SELECT correct INTO last_result FROM live_final_submissions WHERE round_id=r.id AND user_id=p_user_id AND question_number=r.current_question ORDER BY accepted_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'available',true,'joined',true,'server_now',t,
    'round',jsonb_build_object('title',r.title,'status',r.status,'current_question',r.current_question),
    'question',CASE WHEN q.number IS NULL THEN NULL ELSE jsonb_build_object('number',q.number,'prompt',CASE WHEN active THEN q.prompt ELSE '' END,'opened_at',q.opened_at,'closes_at',least(q.closes_at,coalesce(q.closed_at,q.closes_at)),'active',active,'solved_count',(SELECT count(*) FROM live_final_scores WHERE round_id=r.id AND question_number=q.number AND solved_at IS NOT NULL)) END,
    'own',jsonb_build_object('solved',s.solved_at IS NOT NULL,'question_points',coalesce(s.points,0),'total_points',(SELECT coalesce(sum(points),0) FROM live_final_scores WHERE round_id=r.id AND user_id=p_user_id),'last_result',last_result)
  );
END $$;

CREATE FUNCTION public.join_live_final(p_user_id uuid,p_code_hash text,p_name text,p_email text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE r live_final_rounds;
BEGIN
  SELECT * INTO r FROM live_final_rounds WHERE id='fall-2026-final' FOR UPDATE;
  IF NOT FOUND OR r.status NOT IN ('lobby','running') THEN RAISE EXCEPTION 'FINAL_ACCESS_CLOSED: Final-round access is not open.'; END IF;
  IF EXISTS(SELECT 1 FROM live_final_participants WHERE round_id=r.id AND user_id=p_user_id) THEN RETURN get_live_final_state(p_user_id); END IF;
  IF p_code_hash IS NULL OR r.access_code_hash IS NULL OR p_code_hash<>r.access_code_hash THEN RAISE EXCEPTION 'FINAL_ACCESS_CODE: That access code is incorrect.'; END IF;
  INSERT INTO live_final_participants(round_id,user_id,display_name,email) VALUES(r.id,p_user_id,left(coalesce(nullif(btrim(p_name),''),'Participant'),160),left(coalesce(p_email,''),320));
  RETURN get_live_final_state(p_user_id);
END $$;

CREATE FUNCTION public.submit_live_final(p_user_id uuid,p_question integer,p_answer text,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE r live_final_rounds; q live_final_questions; s live_final_scores; old live_final_submissions;
  value text; t timestamptz; correct boolean; finish integer; base integer;
BEGIN
  value := live_final_integer(p_answer);
  IF p_request_id IS NULL THEN RAISE EXCEPTION 'FINAL_REQUEST_ID: A submission identifier is required.'; END IF;
  -- One lock serializes accepted submissions and organizer controls. Rank and
  -- deadline checks cannot be raced by parallel tabs or different API workers.
  SELECT * INTO r FROM live_final_rounds WHERE id='fall-2026-final' FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM live_final_participants WHERE round_id=r.id AND user_id=p_user_id) THEN RAISE EXCEPTION 'FINAL_JOIN_REQUIRED: Enter the finalist access code first.'; END IF;
  SELECT * INTO old FROM live_final_submissions WHERE round_id=r.id AND user_id=p_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF old.answer<>value OR old.question_number<>p_question THEN RAISE EXCEPTION 'FINAL_REQUEST_CONFLICT: This submission identifier was already used for a different answer.'; END IF;
    RETURN jsonb_build_object('result',to_jsonb(old)-'user_id'-'round_id','state',get_live_final_state(p_user_id));
  END IF;
  t := clock_timestamp();
  SELECT * INTO q FROM live_final_questions WHERE round_id=r.id AND number=r.current_question;
  IF r.status<>'running' OR p_question IS DISTINCT FROM r.current_question OR q.opened_at IS NULL OR q.closed_at IS NOT NULL OR t>=q.closes_at THEN RAISE EXCEPTION 'FINAL_QUESTION_CLOSED: This question is closed. Wait for the organizer.'; END IF;
  INSERT INTO live_final_scores(round_id,question_number,user_id) VALUES(r.id,p_question,p_user_id) ON CONFLICT DO NOTHING;
  SELECT * INTO s FROM live_final_scores WHERE round_id=r.id AND question_number=p_question AND user_id=p_user_id;
  IF s.solved_at IS NOT NULL THEN RAISE EXCEPTION 'FINAL_ALREADY_SOLVED: You have already answered this question correctly.'; END IF;
  correct := value=q.answer;
  IF correct THEN
    SELECT count(*)+1 INTO finish FROM live_final_scores WHERE round_id=r.id AND question_number=p_question AND solved_at IS NOT NULL;
    base := CASE finish WHEN 1 THEN 10 WHEN 2 THEN 8 WHEN 3 THEN 6 ELSE 4 END;
    UPDATE live_final_scores SET finish_order=finish,base_points=base,points=greatest(0,base-2*incorrect_count),solved_at=t WHERE round_id=r.id AND question_number=p_question AND user_id=p_user_id RETURNING * INTO s;
  ELSE
    UPDATE live_final_scores SET incorrect_count=incorrect_count+1 WHERE round_id=r.id AND question_number=p_question AND user_id=p_user_id RETURNING * INTO s;
  END IF;
  INSERT INTO live_final_submissions(round_id,question_number,user_id,request_id,answer,correct,points,accepted_at) VALUES(r.id,p_question,p_user_id,p_request_id,value,correct,s.points,t) RETURNING * INTO old;
  RETURN jsonb_build_object('result',to_jsonb(old)-'user_id'-'round_id','state',get_live_final_state(p_user_id));
END $$;

CREATE FUNCTION public.get_live_final_admin_state(p_admin_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE r live_final_rounds; t timestamptz:=clock_timestamp();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM test_admins WHERE user_id=p_admin_id) THEN RAISE EXCEPTION 'FINAL_ADMIN_REQUIRED: Administrator access is required.'; END IF;
  SELECT * INTO r FROM live_final_rounds WHERE id='fall-2026-final';
  IF NOT FOUND THEN RETURN jsonb_build_object('available',false,'server_now',t); END IF;
  RETURN jsonb_build_object('available',true,'server_now',t,'round',(to_jsonb(r)-'access_code_hash')||jsonb_build_object('has_access_code',r.access_code_hash IS NOT NULL),
    'questions',(SELECT coalesce(jsonb_agg(to_jsonb(q)||jsonb_build_object('active',q.opened_at IS NOT NULL AND q.closed_at IS NULL AND t<q.closes_at,'solved_count',(SELECT count(*) FROM live_final_scores s WHERE s.round_id=r.id AND s.question_number=q.number AND s.solved_at IS NOT NULL)) ORDER BY q.number),'[]'::jsonb) FROM live_final_questions q WHERE q.round_id=r.id),
    'participants',(SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('total_points',(SELECT coalesce(sum(points),0) FROM live_final_scores s WHERE s.round_id=r.id AND s.user_id=p.user_id),'scores',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY question_number),'[]'::jsonb) FROM live_final_scores s WHERE s.round_id=r.id AND s.user_id=p.user_id),'submissions',(SELECT coalesce(jsonb_agg(to_jsonb(sub) ORDER BY accepted_at),'[]'::jsonb) FROM live_final_submissions sub WHERE sub.round_id=r.id AND sub.user_id=p.user_id)) ORDER BY lower(p.display_name),p.user_id),'[]'::jsonb) FROM live_final_participants p WHERE p.round_id=r.id),
    'events',(SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY id DESC),'[]'::jsonb) FROM live_final_admin_events e WHERE e.round_id=r.id));
END $$;

CREATE FUNCTION public.control_live_final(p_admin_id uuid,p_action text,p_expected_version integer DEFAULT NULL,p_question integer DEFAULT NULL,p_prompt text DEFAULT NULL,p_answer text DEFAULT NULL,p_code_hash text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,pg_temp AS $$
DECLARE r live_final_rounds; q live_final_questions; t timestamptz;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM test_admins WHERE user_id=p_admin_id) THEN RAISE EXCEPTION 'FINAL_ADMIN_REQUIRED: Administrator access is required.'; END IF;
  IF p_action='initialize' THEN
    INSERT INTO live_final_rounds(id) VALUES('fall-2026-final') ON CONFLICT DO NOTHING;
    INSERT INTO live_final_questions(round_id,number) SELECT 'fall-2026-final',n FROM generate_series(1,10) n ON CONFLICT DO NOTHING;
    RETURN get_live_final_admin_state(p_admin_id);
  END IF;
  SELECT * INTO r FROM live_final_rounds WHERE id='fall-2026-final' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'FINAL_NOT_CONFIGURED: Create the final round first.'; END IF;
  IF p_expected_version IS DISTINCT FROM r.version THEN RAISE EXCEPTION 'FINAL_STALE_CONTROL: Another organizer changed the round. Refresh before trying again.'; END IF;
  SELECT * INTO q FROM live_final_questions WHERE round_id=r.id AND number=r.current_question;
  t:=clock_timestamp();
  IF p_action='save_question' THEN
    IF p_question IS NULL OR p_question NOT BETWEEN 1 AND 10 OR coalesce(length(btrim(p_prompt)),0)=0 OR length(p_prompt)>20000 THEN RAISE EXCEPTION 'FINAL_INVALID_QUESTION: Supply a question number, problem statement, and integer key.'; END IF;
    IF p_question<=r.current_question THEN RAISE EXCEPTION 'FINAL_QUESTIONS_LOCKED: This question has already opened. Its text and answer key are locked.'; END IF;
    UPDATE live_final_questions SET prompt=btrim(p_prompt),answer=live_final_integer(p_answer) WHERE round_id=r.id AND number=p_question;
  ELSIF p_action='set_code' THEN
    IF r.status='finished' OR p_code_hash IS NULL OR p_code_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'FINAL_INVALID_CODE: Set a valid finalist access code before the final finishes.'; END IF;
    UPDATE live_final_rounds SET access_code_hash=p_code_hash WHERE id=r.id;
  ELSIF p_action='open_lobby' THEN
    IF r.status<>'draft' OR r.access_code_hash IS NULL OR (SELECT count(*) FROM live_final_questions WHERE round_id=r.id AND btrim(prompt)<>'' AND answer IS NOT NULL)<>10 THEN RAISE EXCEPTION 'FINAL_NOT_READY: Save all 10 questions and an access code before opening access.'; END IF;
    UPDATE live_final_rounds SET status='lobby' WHERE id=r.id;
  ELSIF p_action='open_next' THEN
    IF r.status NOT IN ('lobby','running') OR r.current_question>=10 THEN RAISE EXCEPTION 'FINAL_NO_NEXT: There is no next question to open.'; END IF;
    IF q.opened_at IS NOT NULL AND q.closed_at IS NULL AND t<q.closes_at THEN RAISE EXCEPTION 'FINAL_STILL_OPEN: End the current question before opening another.'; END IF;
    IF (SELECT count(*) FROM live_final_questions WHERE round_id=r.id AND btrim(prompt)<>'' AND answer IS NOT NULL)<>10 THEN RAISE EXCEPTION 'FINAL_NOT_READY: Save all 10 questions before starting.'; END IF;
    UPDATE live_final_rounds SET current_question=current_question+1,status='running' WHERE id=r.id RETURNING * INTO r;
    UPDATE live_final_questions SET opened_at=t,closes_at=t+interval '8 minutes' WHERE round_id=r.id AND number=r.current_question;
  ELSIF p_action='end_question' THEN
    IF r.status<>'running' OR q.number IS NULL OR q.closed_at IS NOT NULL OR t>=q.closes_at THEN RAISE EXCEPTION 'FINAL_QUESTION_CLOSED: This question has already closed.'; END IF;
    UPDATE live_final_questions SET closed_at=t WHERE round_id=r.id AND number=r.current_question;
  ELSIF p_action='finish' THEN
    IF r.status<>'running' OR r.current_question<>10 OR (q.closed_at IS NULL AND t<q.closes_at) THEN RAISE EXCEPTION 'FINAL_NOT_FINISHED: Close question 10 before finishing the round.'; END IF;
    UPDATE live_final_rounds SET status='finished' WHERE id=r.id;
  ELSE RAISE EXCEPTION 'FINAL_INVALID_ACTION: Unknown organizer action.';
  END IF;
  UPDATE live_final_rounds SET version=version+1 WHERE id=r.id;
  INSERT INTO live_final_admin_events(round_id,admin_id,action,question_number) VALUES(r.id,p_admin_id,p_action,coalesce(p_question,r.current_question));
  RETURN get_live_final_admin_state(p_admin_id);
END $$;

-- Only authenticated, authorized server routes can call these functions.
REVOKE ALL ON FUNCTION public.live_final_integer(text),public.get_live_final_state(uuid),public.join_live_final(uuid,text,text,text),public.submit_live_final(uuid,integer,text,uuid),public.get_live_final_admin_state(uuid),public.control_live_final(uuid,text,integer,integer,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.live_final_integer(text),public.get_live_final_state(uuid),public.join_live_final(uuid,text,text,text),public.submit_live_final(uuid,integer,text,uuid),public.get_live_final_admin_state(uuid),public.control_live_final(uuid,text,integer,integer,text,text,text) TO service_role;
COMMIT;
