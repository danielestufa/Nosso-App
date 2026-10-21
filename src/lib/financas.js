import { supabase } from './supabase'
import { dataISO } from './saude'

export const brl = (v, opcoes = {}) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', ...opcoes })

export const brlCurto = (v) => {
  const n = Number(v || 0)
  if (Math.abs(n) >= 10000) return `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return brl(n, { maximumFractionDigits: 0, minimumFractionDigits: 0 })
}

// "1.234,56" ou "1234.56" -> 1234.56
export function lerValor(texto) {
  if (typeof texto === 'number') return texto
  let s = String(texto || '').trim().replace(/[R$\s]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

export const mesDe = (iso) => `${iso.slice(0, 7)}-01`
export const mesAtual = () => mesDe(dataISO())

export function somarMeses(mesIso, n) {
  const [a, m] = mesIso.split('-').map(Number)
  const d = new Date(a, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function nomeMes(mesIso, curto = false) {
  const [a, m] = mesIso.split('-').map(Number)
  const txt = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', curto ? { month: 'short' } : { month: 'long', year: 'numeric' })
  return txt.replace('.', '').replace(/^./, (c) => c.toUpperCase())
}

export const fimDoMes = (mesIso) => {
  const [a, m] = mesIso.split('-').map(Number)
  return `${mesIso.slice(0, 7)}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}

export const noMes = (iso, mesIso) => iso && iso.slice(0, 7) === mesIso.slice(0, 7)

// Data com o dia ajustado ao último dia do mês, se precisar
export function dataNoMes(mesIso, dia) {
  const [a, m] = mesIso.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return `${mesIso.slice(0, 7)}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

// Mês de vencimento da fatura em que uma compra cai
export function faturaDaCompra(dataIso, cartao) {
  const [, , d] = dataIso.split('-').map(Number)
  let mesFechamento = mesDe(dataIso)
  if (d > cartao.dia_fechamento) mesFechamento = somarMeses(mesFechamento, 1)
  return cartao.dia_vencimento > cartao.dia_fechamento ? mesFechamento : somarMeses(mesFechamento, 1)
}

export async function carregarFinancas() {
  const [cat, contas, cartoes, lanc, div, pagar, orc, caix, mov] = await Promise.all([
    supabase.from('fin_categorias').select('*').order('ordem').order('nome'),
    supabase.from('fin_contas').select('*').order('criado_em'),
    supabase.from('fin_cartoes').select('*').order('criado_em'),
    supabase.from('fin_lancamentos').select('*').order('data', { ascending: false }).order('criado_em', { ascending: false }).limit(10000),
    supabase.from('fin_divisoes').select('*').order('data', { ascending: false }),
    supabase.from('fin_contas_pagar').select('*').order('vencimento'),
    supabase.from('fin_orcamentos').select('*'),
    supabase.from('fin_caixinhas').select('*').order('criado_em'),
    supabase.from('fin_caixinha_mov').select('*').order('data', { ascending: false }),
  ])
  const erro = [cat, contas, cartoes, lanc, div, pagar, orc, caix, mov].find((r) => r.error)
  if (erro) throw erro.error
  return {
    categorias: cat.data,
    contas: contas.data,
    cartoes: cartoes.data,
    lancamentos: lanc.data,
    divisoes: div.data,
    contasPagar: pagar.data,
    orcamentos: orc.data,
    caixinhas: caix.data,
    movimentos: mov.data,
  }
}

// Filtra pelo escopo escolhido na tela
export function doEscopo(lista, escopo, userId) {
  return lista.filter((x) => (escopo === 'casal' ? x.escopo === 'casal' : x.escopo === 'pessoal' && x.user_id === userId))
}

// Gastos do mês (por data da compra), já considerando divisões
export function gastosDoMes(dados, escopo, userId, mes) {
  const itens = []
  for (const l of doEscopo(dados.lancamentos, escopo, userId)) {
    if (l.tipo !== 'despesa' || !noMes(l.data, mes)) continue
    const valor = escopo === 'pessoal' ? Number(l.valor) - Number(l.valor_terceiros || 0) : Number(l.valor)
    if (valor > 0) itens.push({ id: l.id, origem: 'lancamento', descricao: l.descricao, data: l.data, valor, categoria_id: l.categoria_id, ref: l })
  }
  if (escopo === 'pessoal') {
    for (const d of dados.divisoes) {
      if (d.devedor !== userId || !noMes(d.data, mes)) continue
      itens.push({ id: `div-${d.id}`, origem: 'divisao', descricao: d.descricao, data: d.data, valor: Number(d.valor_devido), categoria_id: d.categoria_id, ref: d })
    }
  } else {
    for (const d of dados.divisoes) {
      if (!noMes(d.data, mes)) continue
      itens.push({ id: `div-${d.id}`, origem: 'divisao', descricao: d.descricao, data: d.data, valor: Number(d.valor_total), categoria_id: d.categoria_id, ref: d, compartilhado: true })
    }
  }
  return itens
}

export function receitasDoMes(dados, escopo, userId, mes) {
  return doEscopo(dados.lancamentos, escopo, userId).filter((l) => l.tipo === 'receita' && noMes(l.data, mes))
}

export function porCategoria(itens) {
  const mapa = {}
  for (const i of itens) mapa[i.categoria_id ?? 0] = (mapa[i.categoria_id ?? 0] || 0) + i.valor
  return mapa
}

export function saldoConta(conta, dados) {
  let saldo = Number(conta.saldo_inicial || 0)
  for (const l of dados.lancamentos) {
    if (l.conta_id !== conta.id) continue
    if (l.tipo === 'receita') saldo += Number(l.valor)
    else if (l.tipo === 'ajuste') saldo += Number(l.valor)
    else saldo -= Number(l.valor)
  }
  for (const m of dados.movimentos) {
    if (m.conta_id !== conta.id) continue
    if (m.tipo === 'deposito') saldo -= Number(m.valor)
    if (m.tipo === 'retirada') saldo += Number(m.valor)
  }
  return Math.round(saldo * 100) / 100
}

export function faturaDoMes(cartao, dados, mes) {
  const itens = dados.lancamentos.filter((l) => l.cartao_id === cartao.id && l.tipo === 'despesa' && l.fatura_mes === mes)
  const total = itens.reduce((s, l) => s + Number(l.valor), 0)
  const pagamento = dados.lancamentos.find((l) => l.cartao_id === cartao.id && l.tipo === 'fatura' && l.fatura_mes === mes)
  return { itens, total: Math.round(total * 100) / 100, paga: !!pagamento, pagamento }
}

export function saldoCaixinha(caixinha, dados) {
  return dados.movimentos
    .filter((m) => m.caixinha_id === caixinha.id)
    .reduce((s, m) => s + (m.tipo === 'retirada' ? -1 : 1) * Number(m.valor), 0)
}

// Quanto o outro me deve (positivo) ou eu devo (negativo)
export function saldoEntreNos(dados, userId) {
  let saldo = 0
  for (const d of dados.divisoes) {
    if (d.acertado) continue
    if (d.pagou_por === userId) saldo += Number(d.valor_devido)
    else if (d.devedor === userId) saldo -= Number(d.valor_devido)
  }
  return Math.round(saldo * 100) / 100
}

// Compromissos futuros: faturas (parcelas) + contas a pagar, por mês
export function previsao(dados, escopo, userId, meses = 12) {
  const inicio = mesAtual()
  const cartoes = doEscopo(dados.cartoes, escopo, userId).map((c) => c.id)
  const contas = doEscopo(dados.contasPagar, escopo, userId)
  return Array.from({ length: meses }, (_, i) => {
    const mes = somarMeses(inicio, i)
    const faturas = dados.lancamentos
      .filter((l) => l.tipo === 'despesa' && cartoes.includes(l.cartao_id) && l.fatura_mes === mes)
      .reduce((s, l) => s + Number(l.valor), 0)
    const parcelas = dados.lancamentos
      .filter((l) => l.tipo === 'despesa' && cartoes.includes(l.cartao_id) && l.fatura_mes === mes && l.parcela_total > 1)
      .reduce((s, l) => s + Number(l.valor), 0)
    const pagar = contas.filter((c) => !c.pago && noMes(c.vencimento, mes)).reduce((s, c) => s + Number(c.valor), 0)
    return { mes, faturas, parcelas, contas: pagar, total: faturas + pagar }
  })
}

export function ouvirFinancas(nome, aoMudar) {
  let canal = supabase.channel(`financas-${nome}-${Math.random().toString(36).slice(2)}`)
  for (const t of ['fin_contas', 'fin_cartoes', 'fin_contas_pagar', 'fin_lancamentos', 'fin_divisoes', 'fin_orcamentos', 'fin_caixinhas', 'fin_caixinha_mov']) {
    canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, aoMudar)
  }
  canal.subscribe()
  return () => supabase.removeChannel(canal)
}

// Gera as datas das parcelas de uma conta a pagar
export function gerarVencimentos({ modo, primeiro, quantidade, meses, dia }) {
  if (modo === 'unica') return [primeiro]
  if (modo === 'mensal') {
    const [, , d] = primeiro.split('-').map(Number)
    return Array.from({ length: quantidade }, (_, i) => dataNoMes(somarMeses(mesDe(primeiro), i), d))
  }
  // meses escolhidos: lista de "AAAA-MM-01"
  return [...meses].sort().map((m) => dataNoMes(m, dia))
}
