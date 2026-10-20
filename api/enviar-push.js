import { admin, enviarPush, usuarioDoToken } from './_lib/servidor.js'

// POST /api/enviar-push
// body: { para: 'eu' | 'parceiro', titulo, corpo, url, tag }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' })

  try {
    const usuario = await usuarioDoToken(req)
    if (!usuario) return res.status(401).json({ erro: 'Faça login novamente' })

    const { para = 'parceiro', titulo, corpo, url, tag } = req.body || {}
    if (!titulo) return res.status(400).json({ erro: 'Título obrigatório' })

    let ids = []
    if (para === 'eu') {
      ids = [usuario.id]
    } else {
      const { data, error } = await admin().from('profiles').select('id').neq('id', usuario.id)
      if (error) throw error
      ids = (data || []).map((p) => p.id)
    }

    if (!ids.length) return res.status(200).json({ enviadas: 0, dispositivos: 0, semParceiro: true })

    const resultado = await enviarPush(ids, {
      titulo: String(titulo).slice(0, 120),
      corpo: corpo ? String(corpo).slice(0, 300) : '',
      url: typeof url === 'string' && url.startsWith('/') ? url : '/',
      tag,
      remetente: usuario.id,
    })

    return res.status(200).json(resultado)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ erro: e.message || 'Erro ao enviar' })
  }
}
