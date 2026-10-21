import { supabase } from './supabase'

export const STATUS = {
  lendo: 'Lendo',
  quero_ler: 'Quero ler',
  pausado: 'Pausado',
  lido: 'Lido',
}

export const urlCapa = (caminho) =>
  caminho ? supabase.storage.from('capas').getPublicUrl(caminho).data.publicUrl : null

// Todas as leituras do casal com livro e registros
export async function carregarLeituras() {
  const { data, error } = await supabase
    .from('leituras')
    .select('*, livros(*), registros_leitura(*)')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data || []).map((l) => ({ ...l, ...progresso(l) }))
}

export function progresso(l) {
  const lidas = Math.min(
    (l.pagina_inicial || 0) + (l.registros_leitura || []).reduce((s, r) => s + r.paginas, 0),
    l.livros?.total_paginas || 0
  )
  const total = l.livros?.total_paginas || 1
  return { paginasLidas: lidas, paginasFaltam: Math.max(total - lidas, 0), pct: Math.round((lidas / total) * 100) }
}

export async function carregarMetaLeitura(userId) {
  const { data } = await supabase.from('metas_leitura').select('*').eq('user_id', userId).maybeSingle()
  return { paginas_dia: 10, livros_ano: null, ...(data || {}) }
}

export async function paginasNoDia(userId, data) {
  const { data: regs } = await supabase.from('registros_leitura').select('paginas').eq('user_id', userId).eq('data', data)
  return (regs || []).reduce((s, r) => s + r.paginas, 0)
}

export async function capitulosNoDia(userId, data) {
  const { data: regs } = await supabase.from('biblia_leituras').select('livro, capitulo').eq('user_id', userId).eq('data', data)
  return regs || []
}

// Reduz a foto da capa antes de enviar
export async function comprimirCapa(arquivo, max = 900) {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85))
}

export function ouvirLeitura(nome, aoMudar) {
  let canal = supabase.channel(`leitura-${nome}-${Math.random().toString(36).slice(2)}`)
  for (const t of ['livros', 'leituras', 'registros_leitura', 'biblia_planos', 'biblia_leituras']) {
    canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, aoMudar)
  }
  canal.subscribe()
  return () => supabase.removeChannel(canal)
}
