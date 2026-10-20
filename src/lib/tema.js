const CHAVE = 'nosso-app:tema'

export function lerTema() {
  try {
    return localStorage.getItem(CHAVE) || 'sistema'
  } catch {
    return 'sistema'
  }
}

function resolver(tema) {
  if (tema === 'claro' || tema === 'escuro') return tema
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export function aplicarTema(tema = lerTema()) {
  const final = resolver(tema)
  document.documentElement.dataset.theme = final === 'escuro' ? 'dark' : 'light'
  const meta = document.getElementById('meta-tema')
  if (meta) meta.setAttribute('content', final === 'escuro' ? '#000000' : '#ffffff')
}

export function salvarTema(tema) {
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {}
  aplicarTema(tema)
}

// Acompanha a troca de tema do sistema quando estiver em "Sistema"
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (lerTema() === 'sistema') aplicarTema('sistema')
})
