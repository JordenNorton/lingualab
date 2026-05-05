do $$
declare
  v_signature regprocedure;
  v_definition text;
begin
  foreach v_signature in array array[
    'public.ensure_billing_profile()'::regprocedure,
    'public.consume_lesson_credit(text)'::regprocedure,
    'public.record_lesson_explanation_usage(text)'::regprocedure,
    'public.refund_lesson_credit(text)'::regprocedure,
    'public.refund_lesson_explanation_usage(text, integer)'::regprocedure
  ]
  loop
    v_definition := pg_get_functiondef(v_signature);
    v_definition := replace(v_definition, 'credits_remaining = least(credits_remaining, v_allowance)', 'credits_remaining = least(billing_profiles.credits_remaining, v_allowance)');
    v_definition := replace(v_definition, 'credits_remaining = monthly_credit_allowance', 'credits_remaining = billing_profiles.monthly_credit_allowance');
    v_definition := replace(v_definition, 'credits_remaining = credits_remaining - 1', 'credits_remaining = billing_profiles.credits_remaining - 1');
    v_definition := replace(v_definition, 'credits_used = credits_used + 1', 'credits_used = billing_profiles.credits_used + 1');
    v_definition := replace(v_definition, 'credits_remaining = least(credits_remaining + 1, monthly_credit_allowance)', 'credits_remaining = least(billing_profiles.credits_remaining + 1, billing_profiles.monthly_credit_allowance)');
    v_definition := replace(v_definition, 'credits_used = greatest(credits_used - 1, 0)', 'credits_used = greatest(billing_profiles.credits_used - 1, 0)');
    execute v_definition;
  end loop;
end;
$$;
