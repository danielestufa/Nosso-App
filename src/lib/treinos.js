import { supabase } from './supabase'

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// Ordem de exibição começando na segunda
export const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0]

const BASE_IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'
export const urlImagem = (id, n = 0) => (id ? `${BASE_IMG}/${id}/${n}.jpg` : null)

export function diaSemanaDe(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).getDay()
}

// "8-10" -> 8 ; "12 cada perna" -> 12 ; "até a falha" -> null
export function repsSugeridas(texto) {
  const m = String(texto || '').match(/\d+/)
  return m ? Number(m[0]) : null
}

export function formatarDescanso(s) {
  if (!s) return null
  if (s < 60) return `${s}s`
  const min = Math.floor(s / 60)
  const resto = s % 60
  return resto ? `${min}min${String(resto).padStart(2, '0')}` : `${min} min`
}

let cacheExercicios = null
export async function carregarExercicios(forcar = false) {
  if (cacheExercicios && !forcar) return cacheExercicios
  const { data, error } = await supabase.from('exercicios').select('*').order('nome')
  if (error) throw error
  cacheExercicios = data || []
  return cacheExercicios
}
export const limparCacheExercicios = () => { cacheExercicios = null }

// Ficha completa da pessoa: { [dia_semana]: { id, titulo, itens: [...] } }
export async function carregarFicha(userId) {
  const { data, error } = await supabase
    .from('ficha_dias')
    .select('*, ficha_itens(*, exercicios(*))')
    .eq('user_id', userId)
  if (error) throw error
  const ficha = {}
  for (const dia of data || []) {
    ficha[dia.dia_semana] = {
      ...dia,
      itens: [...(dia.ficha_itens || [])].sort((a, b) => a.ordem - b.ordem || a.criado_em.localeCompare(b.criado_em)),
    }
  }
  return ficha
}

export async function carregarTreinoDoDia(userId, data) {
  const { data: treino } = await supabase
    .from('treinos_realizados')
    .select('*')
    .eq('user_id', userId)
    .eq('data', data)
    .maybeSingle()
  let series = []
  if (treino) {
    const r = await supabase.from('series_registradas').select('*').eq('treino_id', treino.id).order('serie')
    series = r.data || []
  }
  return { treino, series }
}

// Última carga usada em cada exercício (antes da data informada)
export async function ultimasCargas(userId, exercicioIds, antesDe) {
  if (!exercicioIds.length) return {}
  const { data } = await supabase
    .from('series_registradas')
    .select('exercicio_id, data, carga_kg, repeticoes, minutos, km')
    .eq('user_id', userId)
    .in('exercicio_id', exercicioIds)
    .lt('data', antesDe)
    .order('data', { ascending: false })
    .limit(400)
  const mapa = {}
  for (const s of data || []) {
    const atual = mapa[s.exercicio_id]
    if (!atual) mapa[s.exercicio_id] = { data: s.data, carga: s.carga_kg, reps: s.repeticoes, minutos: s.minutos, km: s.km }
    else if (atual.data === s.data && Number(s.carga_kg || 0) > Number(atual.carga || 0)) {
      atual.carga = s.carga_kg
      atual.reps = s.repeticoes
    }
  }
  return mapa
}

export async function garantirTreino(userId, data, fichaDia) {
  const existente = await supabase.from('treinos_realizados').select('*').eq('user_id', userId).eq('data', data).maybeSingle()
  if (existente.data) return existente.data
  const { data: novo, error } = await supabase
    .from('treinos_realizados')
    .insert({ user_id: userId, data, ficha_dia_id: fichaDia?.id || null, titulo: fichaDia?.titulo || 'Treino' })
    .select()
    .single()
  if (error) throw error
  return novo
}

// Pontuação de proximidade entre dois exercícios
function proximidade(a, b) {
  if (!a || !b) return 0
  if (a.id === b.id) return 4
  if (a.area === b.area && a.grupo === b.grupo) return 3
  if (a.area === b.area && a.area !== 'Ao ar livre') return 2
  if (a.grupo === b.grupo) return 1
  return 0
}

// Monta pares para treinarem perto: cada exercício meu com o mais próximo do par
export function sugerirPares(meus, deles) {
  const restantes = [...deles]
  const pares = []
  for (const meu of meus) {
    let melhor = -1
    let pontos = 0
    restantes.forEach((outro, i) => {
      const p = proximidade(meu.exercicios, outro.exercicios)
      if (p > pontos) {
        pontos = p
        melhor = i
      }
    })
    if (melhor >= 0) {
      pares.push({ meu, deles: restantes[melhor], pontos })
      restantes.splice(melhor, 1)
    } else {
      pares.push({ meu, deles: null, pontos: 0 })
    }
  }
  // Pares com mais proximidade primeiro, mantendo a ordem original entre iguais
  const juntos = pares.filter((p) => p.pontos >= 2)
  const separados = pares.filter((p) => p.pontos < 2)
  const sobras = restantes.map((r) => ({ meu: null, deles: r, pontos: 0 }))
  return { juntos, separados: [...separados, ...sobras] }
}

// Ordem personalizada só para o treino de hoje (guardada no aparelho)
const chaveOrdem = (userId, data) => `nosso-app:ordem:${userId}:${data}`
export function lerOrdemDoDia(userId, data) {
  try {
    return JSON.parse(localStorage.getItem(chaveOrdem(userId, data)) || 'null')
  } catch {
    return null
  }
}
export function salvarOrdemDoDia(userId, data, ids) {
  try {
    localStorage.setItem(chaveOrdem(userId, data), JSON.stringify(ids))
  } catch {}
}
export function limparOrdemDoDia(userId, data) {
  try {
    localStorage.removeItem(chaveOrdem(userId, data))
  } catch {}
}

export function ouvirTreinos(nome, aoMudar, tabelas = ['treinos_realizados', 'series_registradas', 'ficha_itens', 'ficha_dias']) {
  let canal = supabase.channel(`treinos-${nome}-${Math.random().toString(36).slice(2)}`)
  for (const t of tabelas) canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, aoMudar)
  canal.subscribe()
  return () => supabase.removeChannel(canal)
}
