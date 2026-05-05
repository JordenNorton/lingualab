do $$
declare
  v_signature regprocedure;
  v_definition text;
begin
  foreach v_signature in array array[
    'public.ensure_billing_profile()'::regprocedure,
    'public.consume_lesson_credit(text)'::regprocedure,
    'public.record_lesson_explanation_usage(text)'::regprocedure
  ]
  loop
    v_definition := pg_get_functiondef(v_signature);
    v_definition := replace(v_definition, 'on conflict (user_id) do nothing', 'on conflict on constraint billing_profiles_pkey do nothing');
    v_definition := replace(v_definition, 'on conflict (user_id, lesson_key) do nothing', 'on conflict on constraint lesson_explanation_usage_pkey do nothing');
    execute v_definition;
  end loop;
end;
$$;
