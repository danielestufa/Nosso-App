import { admin, enviarPush } from './_lib/servidor.js'

// Chamado pelo agendamento do Supabase (pg_cron) todos os dias às 20h30
export default async function handler(req, res) {
  const segredo = process.env.CRON_SECRET
  const recebido = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!segredo || recebido !== segredo) return res.status(401).json({ erro: 'Não autorizado' })

  try {
    const { data: perfis, error } = await admin().from('profiles').select('id')
    if (error) throw error
    const ids = (perfis || []).map((p) => p.id)

    const resultado = await enviarPush(ids, {
      titulo: 'Como foi o seu dia?',
      corpo: 'Atualize água, alimentação, treino e desafios de hoje.',
      url: '/',
      tag: 'como-foi-o-dia',
    })

    return res.status(200).json(resultado)
  } catch (e) {
    console.error(e)
    return res.status(500).json({ erro: e.message })
  }
}
