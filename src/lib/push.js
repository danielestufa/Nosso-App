import { supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function suportaPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function ehIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function estaInstalado() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function registrarSW() {
  if (!('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('SW não registrado', e))
  })
}

function base64ParaUint8(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(b64)
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)))
}

function nomeDispositivo() {
  const ua = navigator.userAgent
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  if (/android/i.test(ua)) return 'Android'
  if (/mac/i.test(ua)) return 'Mac'
  if (/windows/i.test(ua)) return 'Windows'
  return 'Navegador'
}

// 'ativo' | 'inativo' | 'bloqueado' | 'sem-suporte' | 'instalar-primeiro'
export async function statusPush() {
  if (!suportaPush()) return ehIOS() && !estaInstalado() ? 'instalar-primeiro' : 'sem-suporte'
  if (Notification.permission === 'denied') return 'bloqueado'
  const reg = await navigator.serviceWorker.getRegistration()
  const inscricao = reg ? await reg.pushManager.getSubscription() : null
  return inscricao && Notification.permission === 'granted' ? 'ativo' : 'inativo'
}

export async function ativarPush(userId) {
  if (!VAPID) throw new Error('Chave de notificação não configurada (VITE_VAPID_PUBLIC_KEY).')
  const permissao = await Notification.requestPermission()
  if (permissao !== 'granted') throw new Error('Permissão de notificação não concedida.')

  let reg = await navigator.serviceWorker.getRegistration()
  if (!reg) reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  let inscricao = await reg.pushManager.getSubscription()
  if (!inscricao) {
    inscricao = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ParaUint8(VAPID),
    })
  }

  const json = inscricao.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      dispositivo: nomeDispositivo(),
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
}

export async function desativarPush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const inscricao = reg ? await reg.pushManager.getSubscription() : null
  if (!inscricao) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', inscricao.endpoint)
  await inscricao.unsubscribe()
}

// para: 'eu' | 'parceiro'
export async function enviarNotificacao({ para = 'parceiro', titulo, corpo, url = '/', tag }) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const resposta = await fetch('/api/enviar-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ para, titulo, corpo, url, tag }),
  })
  const corpoResposta = await resposta.json().catch(() => ({}))
  if (!resposta.ok) throw new Error(corpoResposta.erro || 'Não foi possível enviar.')
  return corpoResposta
}
