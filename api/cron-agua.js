import { admin, enviarPush } from './_lib/servidor.js'

// Chamado de hora em hora pelo agendamento do Supabase (pg_cron).
// 1) Entre 9h e 21h, se alguém passou do limite de horas sem registrar água,
//    avisa a própria pessoa e o par.
// 2) No horário de treino escolhido por cada um, avisa nos dias com treino na ficha.
const FUSO_HORAS = -3 // horário de Brasília

function agoraBrasilia() {
  return new Date(Date.now() + FUSO_HORAS * 3600000)
}

export default async function handler(req, res) {
  const segredo = process.env.CRON_SECRET
  const recebido = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!segredo || recebido !== segredo) return res.status(401).json({ erro: 'Não autorizado' })

  try {
    const br = agoraBrasilia()
    const hora = br.getUTCHours()
    const hoje = br.toISOString().slice(0, 10)
    const db = admin()

    const treinos = await lembrarTreinos(db, hora, hoje, br.getUTCDay())
    const contas = hora === 9 ? await lembrarContas(db, hoje) : []
    if (hora < 9 || hora > 21) return res.status(200).json({ treinos, contas, agua: 'fora do horário' })

    const { data: perfis } = await db.from('profiles').select('id, nome')
    const { data: metas } = await db.from('metas_saude').select('user_id, agua_ml, lembrete_agua_horas')
    const lista = (perfis || []).filter((p) => p.nome)
    const resultado = []

    for (const pessoa of lista) {
      const meta = (metas || []).find((m) => m.user_id === pessoa.id) || {}
      const limiteHoras = meta.lembrete_agua_horas ?? 3
      const metaMl = meta.agua_ml ?? 3000
      if (!limiteHoras || limiteHoras <= 0) continue

      const { data: registros } = await db
        .from('registros_agua')
        .select('ml, criado_em')
        .eq('user_id', pessoa.id)
        .eq('data', hoje)
        .order('criado_em', { ascending: false })

      const total = (registros || []).reduce((s, r) => s + r.ml, 0)
      if (total >= metaMl) continue

      // Sem registro hoje: conta a partir das 8h
      const inicioDia = new Date(`${hoje}T08:00:00-03:00`)
      const ultimo = registros?.[0] ? new Date(registros[0].criado_em) : inicioDia
      const horasSem = (Date.now() - ultimo.getTime()) / 3600000
      if (horasSem < limiteHoras) continue

      const desde = new Date(Date.now() - limiteHoras * 3600000).toISOString()
      const { data: recentes } = await db
        .from('alertas_enviados')
        .select('id')
        .eq('user_id', pessoa.id)
        .eq('tipo', 'agua')
        .gte('enviado_em', desde)
        .limit(1)
      if (recentes?.length) continue

      const h = Math.floor(horasSem)
      const parceiros = lista.filter((p) => p.id !== pessoa.id)

      await enviarPush([pessoa.id], {
        titulo: 'Hora da água',
        corpo: `Faz ${h}h que você não registra água. Bora um copo?`,
        url: '/saude',
        tag: 'agua-propria',
      })

      if (parceiros.length) {
        await enviarPush(
          parceiros.map((p) => p.id),
          {
            titulo: `${pessoa.nome} está sem beber água`,
            corpo: `Faz ${h}h que ${pessoa.nome} não registra água. Que tal lembrar?`,
            url: '/',
            tag: `agua-${pessoa.id}`,
          }
        )
      }

      await db.from('alertas_enviados').insert({ user_id: pessoa.id, tipo: 'agua' })
      resultado.push({ pessoa: pessoa.nome, horasSem: h })
    }

    return res.status(200).json({ treinos, contas, agua: resultado })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ erro: e.message })
  }
}

async function lembrarTreinos(db, hora, hoje, diaSemana) {
  const { data: configs } = await db.from('config_treino').select('user_id, lembrete_hora').eq('lembrete_hora', hora)
  const avisados = []
  for (const c of configs || []) {
    const { data: dia } = await db
      .from('ficha_dias')
      .select('titulo, ficha_itens(id)')
      .eq('user_id', c.user_id)
      .eq('dia_semana', diaSemana)
      .maybeSingle()
    if (!dia?.ficha_itens?.length) continue

    const { data: feito } = await db.from('treinos_realizados').select('id').eq('user_id', c.user_id).eq('data', hoje).maybeSingle()
    if (feito) continue

    const { data: jaAvisou } = await db
      .from('alertas_enviados')
      .select('id')
      .eq('user_id', c.user_id)
      .eq('tipo', 'treino')
      .gte('enviado_em', `${hoje}T00:00:00-03:00`)
      .limit(1)
    if (jaAvisou?.length) continue

    await enviarPush([c.user_id], {
      titulo: 'Hora do treino',
      corpo: `Hoje é dia de ${dia.titulo.toLowerCase()}. Bora?`,
      url: '/treinos',
      tag: 'lembrete-treino',
    })
    await db.from('alertas_enviados').insert({ user_id: c.user_id, tipo: 'treino' })
    avisados.push(c.user_id)
  }
  return avisados
}

// Às 9h: contas a pagar que vencem hoje ou amanhã
async function lembrarContas(db, hoje) {
  const amanha = new Date(`${hoje}T12:00:00Z`)
  amanha.setUTCDate(amanha.getUTCDate() + 1)
  const ate = amanha.toISOString().slice(0, 10)
  const { data: contas } = await db
    .from('fin_contas_pagar')
    .select('id, user_id, escopo, descricao, valor, vencimento')
    .eq('pago', false)
    .gte('vencimento', hoje)
    .lte('vencimento', ate)
  if (!contas?.length) return []
  const { data: perfis } = await db.from('profiles').select('id, nome')
  const todos = (perfis || []).filter((p) => p.nome).map((p) => p.id)
  const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  for (const c of contas) {
    const para = c.escopo === 'casal' ? todos : [c.user_id]
    await enviarPush(para, {
      titulo: c.vencimento === hoje ? 'Conta vence hoje' : 'Conta vence amanhã',
      corpo: `${c.descricao}: ${fmt(c.valor)}`,
      url: '/financas?aba=pagar',
      tag: `conta-${c.id}`,
    })
  }
  return contas.map((c) => c.id)
}
