// Livros da Bíblia com a quantidade de capítulos
export const LIVROS_BIBLIA = [
  ['Gênesis', 50], ['Êxodo', 40], ['Levítico', 27], ['Números', 36], ['Deuteronômio', 34],
  ['Josué', 24], ['Juízes', 21], ['Rute', 4], ['1 Samuel', 31], ['2 Samuel', 24],
  ['1 Reis', 22], ['2 Reis', 25], ['1 Crônicas', 29], ['2 Crônicas', 36], ['Esdras', 10],
  ['Neemias', 13], ['Ester', 10], ['Jó', 42], ['Salmos', 150], ['Provérbios', 31],
  ['Eclesiastes', 12], ['Cânticos', 8], ['Isaías', 66], ['Jeremias', 52], ['Lamentações', 5],
  ['Ezequiel', 48], ['Daniel', 12], ['Oseias', 14], ['Joel', 3], ['Amós', 9],
  ['Obadias', 1], ['Jonas', 4], ['Miqueias', 7], ['Naum', 3], ['Habacuque', 3],
  ['Sofonias', 3], ['Ageu', 2], ['Zacarias', 14], ['Malaquias', 4],
  ['Mateus', 28], ['Marcos', 16], ['Lucas', 24], ['João', 21], ['Atos', 28],
  ['Romanos', 16], ['1 Coríntios', 16], ['2 Coríntios', 13], ['Gálatas', 6], ['Efésios', 6],
  ['Filipenses', 4], ['Colossenses', 4], ['1 Tessalonicenses', 5], ['2 Tessalonicenses', 3], ['1 Timóteo', 6],
  ['2 Timóteo', 4], ['Tito', 3], ['Filemom', 1], ['Hebreus', 13], ['Tiago', 5],
  ['1 Pedro', 5], ['2 Pedro', 3], ['1 João', 5], ['2 João', 1], ['3 João', 1],
  ['Judas', 1], ['Apocalipse', 22],
]

export const INICIO_NT = 39

const capitulosDe = (livros) => livros.flatMap(([livro, n]) => Array.from({ length: n }, (_, i) => ({ livro, capitulo: i + 1 })))

export const PLANOS = {
  evangelhos: {
    nome: 'Os quatro Evangelhos',
    descricao: 'Mateus, Marcos, Lucas e João em 30 dias.',
    dias: 30,
    capitulos: capitulosDe(LIVROS_BIBLIA.slice(39, 43)),
  },
  nt90: {
    nome: 'Novo Testamento em 90 dias',
    descricao: 'De Mateus a Apocalipse, cerca de 3 capítulos por dia.',
    dias: 90,
    capitulos: capitulosDe(LIVROS_BIBLIA.slice(INICIO_NT)),
  },
  biblia90: {
    nome: 'Bíblia toda em 90 dias',
    descricao: 'De Gênesis a Apocalipse, cerca de 13 capítulos por dia.',
    dias: 90,
    capitulos: capitulosDe(LIVROS_BIBLIA),
  },
  anual: {
    nome: 'Bíblia em 1 ano',
    descricao: 'De Gênesis a Apocalipse, cerca de 3 a 4 capítulos por dia.',
    dias: 365,
    capitulos: capitulosDe(LIVROS_BIBLIA),
  },
}

// Divide os capítulos de forma uniforme pelos dias do plano
export function cronograma(planoId) {
  const p = PLANOS[planoId]
  const dias = Array.from({ length: p.dias }, () => [])
  p.capitulos.forEach((c, i) => {
    dias[Math.floor((i * p.dias) / p.capitulos.length)].push(c)
  })
  return dias
}

// Agrupa capítulos em texto: "Gênesis 1-3, Êxodo 1"
export function resumoCapitulos(caps) {
  const grupos = []
  for (const c of caps) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.livro === c.livro && ultimo.fim === c.capitulo - 1) ultimo.fim = c.capitulo
    else grupos.push({ livro: c.livro, inicio: c.capitulo, fim: c.capitulo })
  }
  return grupos.map((g) => (g.inicio === g.fim ? `${g.livro} ${g.inicio}` : `${g.livro} ${g.inicio}-${g.fim}`)).join(', ')
}

export const chaveCap = (c) => `${c.livro}|${c.capitulo}`

export function diaDoPlano(inicio, hojeIso) {
  const [a, m, d] = inicio.split('-').map(Number)
  const [a2, m2, d2] = hojeIso.split('-').map(Number)
  return Math.round((new Date(a2, m2 - 1, d2) - new Date(a, m - 1, d)) / 86400000) + 1
}
