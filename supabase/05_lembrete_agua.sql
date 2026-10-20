-- =========================================================
-- NOSSO APP · LEMBRETE DE ÁGUA (de hora em hora, das 9h às 21h)
-- Rode depois de publicar a fase 2 na Vercel.
-- Troque SEU-LINK e SEU_CRON_SECRET antes de rodar.
-- =========================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('lembrete-agua');
exception when others then null;
end $$;

select cron.schedule(
  'lembrete-agua',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://SEU-LINK.vercel.app/api/cron-agua',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer SEU_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
