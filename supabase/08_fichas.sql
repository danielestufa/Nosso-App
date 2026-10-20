-- =========================================================
-- NOSSO APP · FICHAS DE TREINO DO DAN E DA ISABELLE
-- Só cria se a pessoa ainda não tiver ficha (pode rodar de novo sem duplicar).
-- Usa os e-mails de login para achar cada um.
-- =========================================================

do $$
declare
  dan uuid;
  isa uuid;
  d uuid;
begin
  select id into dan from auth.users where email = 'daniel@nossoapp.com';
  select id into isa from auth.users where email = 'isabelle@nossoapp.com';

  if dan is not null then
  if not exists (select 1 from public.ficha_dias where user_id = dan) then
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (dan, 0, 'Caminhada') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, minutos) select d, dan, id, 0, 1, null, 45 from public.exercicios where nome = 'Caminhada ao ar livre';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (dan, 1, 'Pernas: quadríceps e panturrilha') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 0, 4, '8-10', 120, null from public.exercicios where nome = 'Agachamento livre';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 1, 4, '10-12', 90, null from public.exercicios where nome = 'Leg press 45°';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 2, 3, '10', 90, null from public.exercicios where nome = 'Agachamento hack';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 3, 4, '12-15', 60, 'Última série com drop set' from public.exercicios where nome = 'Cadeira extensora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 4, 3, '10 cada perna', 90, null from public.exercicios where nome = 'Agachamento búlgaro';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 5, 3, '12', 60, null from public.exercicios where nome = 'Cadeira flexora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 6, 4, '12-15', 45, null from public.exercicios where nome = 'Panturrilha em pé';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 7, 3, '15', 45, null from public.exercicios where nome = 'Panturrilha sentado';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (dan, 2, 'Peito e tríceps') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 0, 4, '6-8', 120, null from public.exercicios where nome = 'Supino reto com barra';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 1, 4, '8-10', 90, null from public.exercicios where nome = 'Supino inclinado com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 2, 3, '12', 60, null from public.exercicios where nome = 'Crucifixo na máquina (peck deck)';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 3, 3, '12-15', 60, null from public.exercicios where nome = 'Crossover polia alta';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 4, 3, 'até a falha', 90, null from public.exercicios where nome = 'Paralelas (peito)';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 5, 4, '12', 60, null from public.exercicios where nome = 'Tríceps corda na polia';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 6, 3, '10', 60, null from public.exercicios where nome = 'Tríceps testa com barra W';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 7, 3, '12', 60, null from public.exercicios where nome = 'Tríceps francês na polia';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (dan, 3, 'Costas e bíceps') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 0, 4, 'até a falha', 120, null from public.exercicios where nome = 'Barra fixa';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 1, 4, '10', 90, null from public.exercicios where nome = 'Puxada frontal aberta';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 2, 4, '8', 90, null from public.exercicios where nome = 'Remada curvada com barra';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 3, 3, '10-12', 60, null from public.exercicios where nome = 'Remada baixa sentada';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 4, 3, '10 cada lado', 60, null from public.exercicios where nome = 'Remada unilateral com halter (serrote)';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 5, 3, '12', 60, null from public.exercicios where nome = 'Pulldown braços estendidos';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 6, 4, '8-10', 60, null from public.exercicios where nome = 'Rosca direta com barra';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 7, 3, '10', 60, null from public.exercicios where nome = 'Rosca inclinada com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 8, 3, '12', 60, null from public.exercicios where nome = 'Rosca martelo';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (dan, 4, 'Posterior, glúteos e abdômen') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 0, 4, '8', 120, null from public.exercicios where nome = 'Levantamento terra romeno';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 1, 4, '10-12', 60, null from public.exercicios where nome = 'Mesa flexora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 2, 3, '12', 60, null from public.exercicios where nome = 'Cadeira flexora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 3, 4, '10', 90, null from public.exercicios where nome = 'Elevação pélvica (hip thrust)';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 4, 3, '12 cada perna', 60, null from public.exercicios where nome = 'Afundo com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 5, 4, '15', 45, null from public.exercicios where nome = 'Panturrilha no leg press';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 6, 3, '15', 60, null from public.exercicios where nome = 'Hiperextensão lombar';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 7, 3, '15', 45, null from public.exercicios where nome = 'Abdominal na polia';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (dan, 5, 'Ombros, trapézio e abdômen') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 0, 4, '8-10', 90, null from public.exercicios where nome = 'Desenvolvimento com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 1, 4, '12-15', 45, null from public.exercicios where nome = 'Elevação lateral com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 2, 3, '12', 45, null from public.exercicios where nome = 'Elevação lateral na polia';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 3, 3, '12-15', 60, null from public.exercicios where nome = 'Crucifixo inverso máquina';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 4, 3, '15', 60, null from public.exercicios where nome = 'Face pull';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 5, 4, '12', 60, null from public.exercicios where nome = 'Encolhimento com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 6, 3, '12', 60, null from public.exercicios where nome = 'Remada alta';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 7, 3, '12', 60, null from public.exercicios where nome = 'Elevação de pernas na barra';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, dan, id, 8, 3, '60 s', 45, null from public.exercicios where nome = 'Prancha';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (dan, 6, 'Caminhada') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, minutos) select d, dan, id, 0, 1, null, 45 from public.exercicios where nome = 'Caminhada ao ar livre';
  end if;
  end if;

  if isa is not null then
  if not exists (select 1 from public.ficha_dias where user_id = isa) then
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (isa, 0, 'Caminhada') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, minutos) select d, isa, id, 0, 1, null, 45 from public.exercicios where nome = 'Caminhada ao ar livre';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (isa, 1, 'Quadríceps e glúteos') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 0, 4, '10', 90, null from public.exercicios where nome = 'Agachamento livre';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 1, 4, '12', 90, null from public.exercicios where nome = 'Leg press 45°';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 2, 4, '12-15', 60, 'Última série com drop set' from public.exercicios where nome = 'Cadeira extensora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 3, 3, '10 cada perna', 90, null from public.exercicios where nome = 'Agachamento búlgaro';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 4, 3, '15', 45, null from public.exercicios where nome = 'Cadeira adutora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 5, 4, '15', 45, null from public.exercicios where nome = 'Cadeira abdutora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 6, 3, '15', 45, null from public.exercicios where nome = 'Panturrilha em pé';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (isa, 2, 'Ombros, tríceps e abdômen') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 0, 4, '10', 60, null from public.exercicios where nome = 'Desenvolvimento máquina';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 1, 4, '12-15', 45, null from public.exercicios where nome = 'Elevação lateral com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 2, 3, '12', 45, null from public.exercicios where nome = 'Elevação frontal';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 3, 3, '15', 45, null from public.exercicios where nome = 'Crucifixo inverso máquina';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 4, 4, '12', 60, null from public.exercicios where nome = 'Tríceps corda na polia';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 5, 3, '12', 60, null from public.exercicios where nome = 'Tríceps francês na polia';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 6, 3, '12', 60, null from public.exercicios where nome = 'Mergulho no banco';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 7, 3, '15', 45, null from public.exercicios where nome = 'Abdominal máquina';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (isa, 3, 'Costas e bíceps') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 0, 4, '10-12', 60, null from public.exercicios where nome = 'Puxada frontal aberta';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 1, 3, '12', 60, null from public.exercicios where nome = 'Puxada com triângulo';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 2, 4, '12', 60, null from public.exercicios where nome = 'Remada baixa sentada';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 3, 3, '12', 60, null from public.exercicios where nome = 'Remada máquina';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 4, 3, '15', 45, null from public.exercicios where nome = 'Pulldown braços estendidos';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 5, 3, '12', 60, null from public.exercicios where nome = 'Rosca alternada com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 6, 3, '12', 60, null from public.exercicios where nome = 'Rosca martelo';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 7, 3, '15', 45, null from public.exercicios where nome = 'Hiperextensão lombar';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (isa, 4, 'Glúteos e posterior') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 0, 5, '10', 90, null from public.exercicios where nome = 'Elevação pélvica (hip thrust)';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 1, 4, '10', 90, null from public.exercicios where nome = 'Stiff com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 2, 4, '12', 60, null from public.exercicios where nome = 'Mesa flexora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 3, 4, '12 cada perna', 45, null from public.exercicios where nome = 'Glúteo na polia';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 4, 3, '12', 90, null from public.exercicios where nome = 'Agachamento sumô';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 5, 4, '20', 45, null from public.exercicios where nome = 'Cadeira abdutora';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 6, 3, '12 cada perna', 60, null from public.exercicios where nome = 'Afundo com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 7, 3, '15', 45, null from public.exercicios where nome = 'Panturrilha sentado';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (isa, 5, 'Superiores e abdômen') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 0, 3, '12', 60, null from public.exercicios where nome = 'Supino inclinado com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 1, 3, '12', 60, null from public.exercicios where nome = 'Crucifixo na máquina (peck deck)';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 2, 3, '12', 60, null from public.exercicios where nome = 'Desenvolvimento com halteres';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 3, 3, '15', 45, null from public.exercicios where nome = 'Elevação lateral na polia';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 4, 3, '15', 45, null from public.exercicios where nome = 'Face pull';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 5, 3, '45 s', 45, null from public.exercicios where nome = 'Prancha';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 6, 3, '15', 45, null from public.exercicios where nome = 'Elevação de pernas no banco';
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, descanso_s, observacao) select d, isa, id, 7, 3, '20', 45, null from public.exercicios where nome = 'Rotação russa';
    insert into public.ficha_dias (user_id, dia_semana, titulo) values (isa, 6, 'Caminhada') returning id into d;
    insert into public.ficha_itens (ficha_dia_id, user_id, exercicio_id, ordem, series, repeticoes, minutos) select d, isa, id, 0, 1, null, 45 from public.exercicios where nome = 'Caminhada ao ar livre';
  end if;
  end if;
end $$;
