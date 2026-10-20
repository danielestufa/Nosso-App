import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

let clienteAdmin = null
let vapidPronto = false

export function admin() {
  if (!clienteAdmin) {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !chave) throw new Error('Variáveis do Supabase não configuradas na Vercel')
    clienteAdmin = createClient(url, chave, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return clienteAdmin
}

function prepararVapid() {
  if (vapidPronto) return
  const publica = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  if (!publica || !privada) throw new Error('Chaves VAPID não configuradas na Vercel')
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:nossoapp@example.com', publica, privada)
  vapidPronto = true
}

// Envia uma notificação para todos os dispositivos dos usuários informados
export async function enviarPush(idsUsuarios, { titulo, corpo = '', url = '/', tag, remetente = null, registrar = true }) {
  prepararVapid()
  const db = admin()

  if (registrar && idsUsuarios.length) {
    await db.from('notificacoes').insert(
      idsUsuarios.map((id) => ({ destinatario: id, remetente, titulo, corpo, url }))
    )
  }

  const { data: dispositivos, error } = await db
    .from('push_subscriptions')
    .select('*')
    .in('user_id', idsUsuarios)
  if (error) throw error

  let enviadas = 0
  await Promise.all(
    (dispositivos || []).map(async (d) => {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify({ titulo, corpo, url, tag }),
          { TTL: 60 * 60 * 12 }
        )
        enviadas++
      } catch (e) {
        // Dispositivo desinstalou ou desativou: remove da lista
        if (e.statusCode === 404 || e.statusCode === 410) {
          await db.from('push_subscriptions').delete().eq('id', d.id)
        } else {
          console.error('Falha no push', e.statusCode, e.body)
        }
      }
    })
  )

  return { enviadas, dispositivos: (dispositivos || []).length }
}

export async function usuarioDoToken(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin().auth.getUser(token)
  if (error) return null
  return data.user
}
