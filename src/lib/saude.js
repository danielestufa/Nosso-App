import { supabase } from './supabase'

export const REFEICOES = [
  { id: 'cafe', nome: 'Café da manhã', inicio: 5 },
  { id: 'almoco', nome: 'Almoço', inicio: 11 },
  { id: 'lanche', nome: 'Lanche', inicio: 15 },
  { id: 'jantar', nome: 'Jantar', inicio: 18 },
  { id: 'ceia', nome: 'Ceia', inicio: 21 },
  { id: 'extra', nome: 'Fora de hora', inicio: 99 },
]

export const METAS_PADRAO = {
  agua_ml: 3000,
  copo_ml: 250,
  calorias: 2000,
  proteina_g: 150,
  carboidrato_g: 200,
  gordura_g: 60,
  passos: 8000,
  sono_horas: 8,
  lembrete_agua_horas: 3,
  gasto_basal: null,
  meta_gasto_exercicio: null,
}

// Sugere a refeição pelo horário atual
export function refeicaoDoHorario(data = new Date()) {
  const h = data.getHours()
  if (h < 5) return 'ceia'
  if (h < 11) return 'cafe'
  if (h < 15) return 'almoco'
  if (h < 18) return 'lanche'
  if (h < 21) return 'jantar'
  return 'ceia'
}

export function dataISO(d = new Date()) {
  const a = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${a}-${m}-${dia}`
}

export function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number)
  return dataISO(new Date(a, m - 1, d + dias))
}

export function rotuloData(iso) {
  const hoje = dataISO()
  if (iso === hoje) return 'Hoje'
  if (iso === somarDias(hoje, -1)) return 'Ontem'
  if (iso === somarDias(hoje, 1)) return 'Amanhã'
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const num = (v, casas = 0) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })

// Remove acentos para a busca
export const normalizar = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function calcularItem(alimento, gramas) {
  const f = Number(gramas) / 100
  const r = (v) => Math.round(Number(v || 0) * f * 10) / 10
  return {
    kcal: r(alimento.kcal),
    proteina: r(alimento.proteina),
    carboidrato: r(alimento.carboidrato),
    gordura: r(alimento.gordura),
  }
}

export async function carregarMetas(userId) {
  const { data } = await supabase.from('metas_saude').select('*').eq('user_id', userId).maybeSingle()
  return { ...METAS_PADRAO, ...(data || {}), user_id: userId }
}

export async function salvarMetas(userId, metas) {
  const campos = { ...metas, user_id: userId, atualizado_em: new Date().toISOString() }
  const { error } = await supabase.from('metas_saude').upsert(campos, { onConflict: 'user_id' })
  if (error) throw error
}

export async function carregarDia(userId, data) {
  const [agua, itens, dia, suplementos, tomados] = await Promise.all([
    supabase.from('registros_agua').select('*').eq('user_id', userId).eq('data', data).order('criado_em'),
    supabase.from('refeicao_itens').select('*').eq('user_id', userId).eq('data', data).order('criado_em'),
    supabase.from('dia_saude').select('*').eq('user_id', userId).eq('data', data).maybeSingle(),
    supabase.from('suplementos').select('*').eq('user_id', userId).eq('ativo', true).order('criado_em'),
    supabase.from('suplementos_tomados').select('*').eq('user_id', userId).eq('data', data),
  ])
  return {
    agua: agua.data || [],
    itens: itens.data || [],
    dia: dia.data || null,
    suplementos: suplementos.data || [],
    tomados: tomados.data || [],
  }
}

export function resumir(dados) {
  const somar = (campo) => dados.itens.reduce((s, i) => s + Number(i[campo] || 0), 0)
  const itensAcucar = dados.itens.filter((i) => i.contem_acucar)
  const nomesAcucar = [...new Set(itensAcucar.map((i) => i.nome))]
  const acucarManual = dados.dia?.acucar_manual === true
  return {
    aguaMl: dados.agua.reduce((s, r) => s + r.ml, 0),
    kcal: somar('kcal'),
    proteina: somar('proteina'),
    carboidrato: somar('carboidrato'),
    gordura: somar('gordura'),
    comeuAcucar: itensAcucar.length > 0 || acucarManual,
    nomesAcucar,
    acucarDescricao: dados.dia?.acucar_descricao || '',
    sono: dados.dia?.sono_horas,
    passos: dados.dia?.passos,
    exercicio: Number(dados.dia?.calorias_exercicio || 0),
  }
}

// Água e calorias dos últimos 7 dias
export async function carregarSemana(userId, dataFim) {
  const inicio = somarDias(dataFim, -6)
  const [agua, itens] = await Promise.all([
    supabase.from('registros_agua').select('data, ml').eq('user_id', userId).gte('data', inicio).lte('data', dataFim),
    supabase.from('refeicao_itens').select('data, kcal, contem_acucar').eq('user_id', userId).gte('data', inicio).lte('data', dataFim),
  ])
  const dias = []
  for (let i = 0; i < 7; i++) {
    const d = somarDias(inicio, i)
    dias.push({
      data: d,
      aguaMl: (agua.data || []).filter((r) => r.data === d).reduce((s, r) => s + r.ml, 0),
      kcal: (itens.data || []).filter((r) => r.data === d).reduce((s, r) => s + Number(r.kcal), 0),
    })
  }
  return dias
}

export async function salvarDia(userId, data, campos) {
  const { error } = await supabase
    .from('dia_saude')
    .upsert({ user_id: userId, data, ...campos, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id,data' })
  if (error) throw error
}

let cacheAlimentos = null
export async function carregarAlimentos(forcar = false) {
  if (cacheAlimentos && !forcar) return cacheAlimentos
  const { data, error } = await supabase.from('alimentos').select('*').order('nome')
  if (error) throw error
  cacheAlimentos = data || []
  return cacheAlimentos
}

export function limparCacheAlimentos() {
  cacheAlimentos = null
}

// Recarrega quando qualquer tabela de saúde muda (os dois veem em tempo real)
export function ouvirSaude(nome, aoMudar, tabelas = ['registros_agua', 'refeicao_itens', 'dia_saude', 'suplementos_tomados']) {
  let canal = supabase.channel(`saude-${nome}-${Math.random().toString(36).slice(2)}`)
  for (const t of tabelas) {
    canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, aoMudar)
  }
  canal.subscribe()
  return () => supabase.removeChannel(canal)
}

// Referência: 1 kg de gordura corporal guarda cerca de 7.700 kcal
export const KCAL_POR_KG = 7700

// Calorias ingeridas e gastas em atividade, dia a dia, num período
export async function carregarBalanco(userId, dataFim, dias) {
  const inicio = somarDias(dataFim, -(dias - 1))
  const [itens, diasSaude, medidas] = await Promise.all([
    supabase.from('refeicao_itens').select('data, kcal').eq('user_id', userId).gte('data', inicio).lte('data', dataFim),
    supabase.from('dia_saude').select('data, calorias_exercicio').eq('user_id', userId).gte('data', inicio).lte('data', dataFim),
    supabase.from('medidas').select('data, peso_kg, criado_em').eq('user_id', userId).not('peso_kg', 'is', null).order('data').order('criado_em'),
  ])
  const lista = []
  for (let i = 0; i < dias; i++) {
    const d = somarDias(inicio, i)
    const doDia = (itens.data || []).filter((x) => x.data === d)
    lista.push({
      data: d,
      temComida: doDia.length > 0,
      ingerido: doDia.reduce((t, x) => t + Number(x.kcal), 0),
      exercicio: Number((diasSaude.data || []).find((x) => x.data === d)?.calorias_exercicio || 0),
    })
  }
  return { dias: lista, pesos: medidas.data || [] }
}
