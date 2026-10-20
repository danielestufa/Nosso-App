export function hojeLocal() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// "2027-09-09" -> Date local
export function lerDataISO(iso) {
  const [a, m, d] = String(iso).split('-').map(Number)
  return new Date(a, m - 1, d)
}

export function diasEntre(inicio, fim) {
  return Math.round((fim - inicio) / 86400000)
}

function somarMeses(data, meses) {
  return new Date(data.getFullYear(), data.getMonth() + meses, data.getDate())
}

// Quebra a distância em meses e dias
export function mesesEDias(inicio, fim) {
  let meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth())
  if (somarMeses(inicio, meses) > fim) meses--
  const dias = diasEntre(somarMeses(inicio, meses), fim)
  return { meses: Math.max(meses, 0), dias: Math.max(dias, 0) }
}

export function dataPorExtenso(data, opcoes = { day: 'numeric', month: 'long', year: 'numeric' }) {
  return data.toLocaleDateString('pt-BR', opcoes)
}

export function saudacao() {
  const h = new Date().getHours()
  if (h < 5) return 'Boa noite'
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
