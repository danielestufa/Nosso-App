import { supabase } from './supabase'
import { carregarDia, carregarMetas, resumir, dataISO, somarDias } from './saude'

export const TIPOS_REGRA = {
  sem_acucar: { nome: 'Sem açúcar', auto: true, temMeta: false },
  agua: { nome: 'Beber água', auto: true, temMeta: true, unidade: 'ml', dica: 'Vazio = usa a meta de água de cada um' },
  calorias_max: { nome: 'Calorias até o limite', auto: true, temMeta: true, unidade: 'kcal', dica: 'Vazio = usa a meta de calorias de cada um' },
  treino: { nome: 'Treinar', auto: true, temMeta: false, dica: 'Conta o treino do dia concluído na aba Treinos' },
  passos: { nome: 'Passos', auto: true, temMeta: true, unidade: 'passos' },
  leitura_paginas: { nome: 'Ler páginas', auto: false, temMeta: true, unidade: 'páginas' },
  biblia: { nome: 'Leitura da Bíblia', auto: false, temMeta: false },
  personalizada: { nome: 'Outra regra', auto: false, temMeta: false },
}

export const DIAS_LETRA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
export const TODOS_DIAS = [0, 1, 2, 3, 4, 5, 6]
export const DIAS_UTEIS = [1, 2, 3, 4, 5]
export const FIM_DE_SEMANA = [0, 6]

export function textoRegra(r) {
  const t = TIPOS_REGRA[r.tipo]
  if (r.tipo === 'personalizada') return r.descricao || 'Regra personalizada'
  let txt = t.nome
  if (r.meta) txt += r.tipo === 'calorias_max' ? ` (até ${Number(r.meta).toLocaleString('pt-BR')} ${t.unidade})` : ` (${Number(r.meta).toLocaleString('pt-BR')} ${t.unidade})`
  if (r.descricao) txt += ` · ${r.descricao}`
  return txt
}

export function textoDias(dias) {
  const s = [...dias].sort().join(',')
  if (s === '0,1,2,3,4,5,6') return 'todos os dias'
  if (s === '1,2,3,4,5') return 'de segunda a sexta'
  if (s === '0,6') return 'sábado e domingo'
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
  return [...dias].sort().map((d) => nomes[d]).join(', ')
}

const diaSemana = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).getDay()
}

export const regrasDoDia = (regras, iso) => regras.filter((r) => (r.dias_semana || TODOS_DIAS).includes(diaSemana(iso)))

export function participantes(desafio, perfis) {
  if (desafio.formato === 'para_par') return perfis.filter((p) => p.id === desafio.desafiado)
  return perfis.filter((p) => p?.nome)
}

export async function carregarDesafios() {
  const { data, error } = await supabase
    .from('desafios')
    .select('*, desafio_regras(*), desafio_checkins(*)')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data || []).map((d) => ({
    ...d,
    regras: [...(d.desafio_regras || [])].sort((a, b) => a.ordem - b.ordem),
    checkins: d.desafio_checkins || [],
  }))
}

// Situação de uma pessoa dentro de um desafio
export function situacao(desafio, userId, hoje = dataISO()) {
  const encerradoPorData = hoje > desafio.data_fim
  const checkins = desafio.checkins.filter((c) => c.user_id === userId)
  const porData = Object.fromEntries(checkins.map((c) => [c.data, c]))

  if (desafio.modo === 'meta') {
    const feito = checkins.find((c) => c.cumpriu)
    let estado = 'andamento'
    if (feito) estado = 'concluiu'
    else if (encerradoPorData) estado = 'falhou'
    return { modo: 'meta', estado, feito, dias: [], pontos: feito ? desafio.pontos_dia : 0, vidasRestantes: null, pendentes: [], encerrado: !!feito || encerradoPorData }
  }

  const fim = encerradoPorData ? desafio.data_fim : hoje
  const dias = []
  let falhas = 0
  let cumpridos = 0
  let eliminadoEm = null
  const pendentes = []

  for (let d = desafio.data_inicio; d <= fim; d = somarDias(d, 1)) {
    if (eliminadoEm) {
      dias.push({ data: d, estado: 'fora' })
      continue
    }
    const regras = regrasDoDia(desafio.regras, d)
    const c = porData[d]
    let estado
    if (!regras.length) estado = 'livre'
    else if (c) estado = c.cumpriu ? 'cumpriu' : 'falhou'
    else if (d === hoje) estado = 'hoje'
    else if (encerradoPorData) estado = 'falhou'
    else estado = 'pendente'

    if (estado === 'cumpriu') cumpridos++
    if (estado === 'falhou') {
      falhas++
      if (falhas >= desafio.vidas) eliminadoEm = d
    }
    if (estado === 'pendente' || estado === 'hoje') pendentes.push(d)
    dias.push({ data: d, estado })
  }

  const vidasRestantes = Math.max(desafio.vidas - falhas, 0)
  return {
    modo: 'diario',
    dias,
    cumpridos,
    falhas,
    vidasRestantes,
    eliminado: !!eliminadoEm,
    eliminadoEm,
    pendentes,
    pontos: cumpridos * desafio.pontos_dia - falhas * desafio.penalidade_vida,
    encerrado: encerradoPorData || !!eliminadoEm,
  }
}

export function estadoGeral(desafio, perfis, hoje = dataISO()) {
  if (desafio.status !== 'ativo') return { fase: desafio.status }
  const pessoas = participantes(desafio, perfis)
  const sit = Object.fromEntries(pessoas.map((p) => [p.id, situacao(desafio, p.id, hoje)]))
  const comeca = desafio.data_inicio > hoje
  const encerrado = pessoas.length > 0 && pessoas.every((p) => sit[p.id].encerrado)
  let vencedor = null
  let empate = false
  if (encerrado && desafio.formato === 'juntos' && pessoas.length === 2) {
    const [a, b] = pessoas
    const sa = sit[a.id]
    const sb = sit[b.id]
    const va = desafio.modo === 'meta' ? (sa.estado === 'concluiu' ? 1 : 0) : sa.pontos
    const vb = desafio.modo === 'meta' ? (sb.estado === 'concluiu' ? 1 : 0) : sb.pontos
    if (va > vb) vencedor = a
    else if (vb > va) vencedor = b
    else empate = true
  }
  let completou = null
  if (encerrado && desafio.formato === 'para_par' && pessoas[0]) {
    const s = sit[pessoas[0].id]
    completou = desafio.modo === 'meta' ? s.estado === 'concluiu' : !s.eliminado
  }
  return { fase: comeca ? 'agendado' : encerrado ? 'encerrado' : 'andamento', pessoas, sit, vencedor, empate, completou }
}

// Sugestão automática a partir do que foi registrado no app
export async function sugerirDia(userId, data, regras) {
  const precisaSaude = regras.some((r) => ['sem_acucar', 'agua', 'calorias_max', 'passos'].includes(r.tipo))
  const precisaTreino = regras.some((r) => r.tipo === 'treino')
  const [dia, metas, treino] = await Promise.all([
    precisaSaude ? carregarDia(userId, data) : null,
    precisaSaude ? carregarMetas(userId) : null,
    precisaTreino
      ? supabase.from('treinos_realizados').select('concluido_em').eq('user_id', userId).eq('data', data).maybeSingle()
      : null,
  ])
  const r = dia ? resumir(dia) : null
  const resultado = {}
  for (const regra of regras) {
    let ok = null
    let detalhe = ''
    if (regra.tipo === 'sem_acucar') {
      ok = !r.comeuAcucar
      detalhe = r.comeuAcucar ? `registrou açúcar${r.nomesAcucar.length ? `: ${r.nomesAcucar.join(', ')}` : ''}` : 'nenhum açúcar registrado'
    } else if (regra.tipo === 'agua') {
      const meta = Number(regra.meta || metas.agua_ml)
      ok = r.aguaMl >= meta
      detalhe = `${r.aguaMl.toLocaleString('pt-BR')} de ${meta.toLocaleString('pt-BR')} ml`
    } else if (regra.tipo === 'calorias_max') {
      const meta = Number(regra.meta || metas.calorias)
      ok = r.kcal > 0 && r.kcal <= meta
      detalhe = r.kcal > 0 ? `${Math.round(r.kcal).toLocaleString('pt-BR')} de ${meta.toLocaleString('pt-BR')} kcal` : 'nenhuma refeição registrada'
    } else if (regra.tipo === 'passos') {
      const meta = Number(regra.meta || metas.passos)
      ok = Number(r.passos || 0) >= meta
      detalhe = `${Number(r.passos || 0).toLocaleString('pt-BR')} de ${meta.toLocaleString('pt-BR')} passos`
    } else if (regra.tipo === 'treino') {
      ok = !!treino?.data?.concluido_em
      detalhe = ok ? 'treino concluído' : 'nenhum treino concluído'
    }
    resultado[regra.id] = { ok, detalhe }
  }
  return resultado
}

export function ouvirDesafios(nome, aoMudar) {
  let canal = supabase.channel(`desafios-${nome}-${Math.random().toString(36).slice(2)}`)
  for (const t of ['desafios', 'desafio_regras', 'desafio_checkins']) {
    canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, aoMudar)
  }
  canal.subscribe()
  return () => supabase.removeChannel(canal)
}

export const MODELOS = [
  {
    id: 'acucar90',
    titulo: '90 dias sem açúcar na semana',
    descricao: 'Açúcar liberado só no sábado e domingo.',
    formato: 'juntos', modo: 'diario', dias: 90, vidas: 3,
    regras: [{ tipo: 'sem_acucar', dias_semana: DIAS_UTEIS }],
  },
  {
    id: 'completo90',
    titulo: 'Desafio 90 dias',
    descricao: 'Academia de segunda a sexta, caminhada no fim de semana, leitura, Bíblia, água e calorias todos os dias.',
    formato: 'juntos', modo: 'diario', dias: 90, vidas: 5,
    regras: [
      { tipo: 'treino', dias_semana: TODOS_DIAS, descricao: 'academia na semana, caminhada no fim de semana' },
      { tipo: 'leitura_paginas', meta: 10, dias_semana: TODOS_DIAS },
      { tipo: 'biblia', dias_semana: TODOS_DIAS },
      { tipo: 'agua', dias_semana: TODOS_DIAS },
      { tipo: 'calorias_max', dias_semana: TODOS_DIAS },
    ],
  },
  {
    id: 'agua30',
    titulo: '30 dias bebendo 3 litros',
    descricao: '',
    formato: 'juntos', modo: 'diario', dias: 30, vidas: 3,
    regras: [{ tipo: 'agua', meta: 3000, dias_semana: TODOS_DIAS }],
  },
  {
    id: 'leitura',
    titulo: 'Ler 30 páginas',
    descricao: 'Ler 30 páginas até a data final.',
    formato: 'para_par', modo: 'meta', dias: 3, vidas: 1,
    regras: [{ tipo: 'leitura_paginas', meta: 30, dias_semana: TODOS_DIAS }],
  },
]
