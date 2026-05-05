do $$
declare
  v_signature regprocedure;
  v_definition text;
begin
  foreach v_signature in array array[
    'public.record_lesson_explanation_usage(text)'::regprocedure,
    'public.refund_lesson_explanation_usage(text, integer)'::regprocedure
  ]
  loop
    v_definition := pg_get_functiondef(v_signature);
    v_definition := replace(v_definition, 'included_count = included_count + 1', 'included_count = lesson_explanation_usage.included_count + 1');
    v_definition := replace(v_definition, 'extra_credit_count = extra_credit_count + 1', 'extra_credit_count = lesson_explanation_usage.extra_credit_count + 1');
    v_definition := replace(v_definition, 'extra_credit_count = greatest(extra_credit_count - 1, 0)', 'extra_credit_count = greatest(lesson_explanation_usage.extra_credit_count - 1, 0)');
    v_definition := replace(v_definition, 'included_count = greatest(included_count - 1, 0)', 'included_count = greatest(lesson_explanation_usage.included_count - 1, 0)');
    execute v_definition;
  end loop;
end;
$$;
