import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import { IconeCheck } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { rotuloData } from '../../lib/saude'
import { regrasDoDia, sugerirDia, situacao, textoRegra, TIPOS_REGRA } from '../../lib/desafios'

export default function CheckinDia({ desafio, eu, parceiro, data, aoSalvar, compacto = false }) {
  const avisar = useAviso()
  const regras = regrasDoDia(desafio.regras, data)
  const existente = desafio.checkins.find((c) => c.user_id === eu.id && c.data === data)
  const [sugestao, setSugestao] = useState(null)
  const [marcado, setMarcado] = useState({})
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let vivo = true
    sugerirDia(eu.id, data, regras)
      .then((s) => {
        if (!vivo) return
        setSugestao(s)
        const inicial = {}
        for (const r of regras) {
          inicial[r.id] = existente?.resultados?.[r.id] ?? s[r.id]?.ok ?? false
        }
        setMarcado(inicial)
      })
      .catch(() => setSugestao({}))
    return () => { vivo = false }
  }, [desafio.id, data, eu.id])

  async function salvar() {
    const cumpriu = regras.every((r) => marcado[r.id])
    setSalvando(true)
    const antes = situacao(desafio, eu.id)
    const { error } = await supabase.from('desafio_checkins').upsert(
      { desafio_id: desafio.id, user_id: eu.id, data, cumpriu, resultados: marcado },
      { onConflict: 'desafio_id,user_id,data' }
    )
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar.')

    if (cumpriu) {
      avisar(`${rotuloData(data)}: cumprido! +${desafio.pontos_dia} pontos`)
    } else {
      const restantes = antes.vidasRestantes - (existente && !existente.cumpriu ? 0 : 1)
      avisar(restantes > 0 ? `Perdeu uma vida. Restam ${restantes}.` : 'Acabaram as vidas neste desafio.')
      if (parceiro?.nome && !(existente && !existente.cumpriu)) {
        enviarNotificacao({
          para: 'parceiro',
          titulo: restantes > 0 ? `${eu.nome} perdeu uma vida` : `${eu.nome} zerou as vidas`,
          corpo: `${desafio.titulo}${restantes > 0 ? ` · restam ${restantes}` : ''}`,
          url: '/desafios',
          tag: `vida-${desafio.id}`,
        }).catch(() => {})
      }
    }
    aoSalvar?.()
  }

  async function concluirMeta() {
    setSalvando(true)
    const { error } = await supabase.from('desafio_checkins').upsert(
      { desafio_id: desafio.id, user_id: eu.id, data, cumpriu: true, resultados: {} },
      { onConflict: 'desafio_id,user_id,data' }
    )
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar.')
    avisar('Meta cumprida! 🎉')
    if (parceiro?.nome) {
      enviarNotificacao({ para: 'parceiro', titulo: `${eu.nome} cumpriu o desafio`, corpo: desafio.titulo, url: '/desafios' }).catch(() => {})
    }
    aoSalvar?.()
  }

  if (desafio.modo === 'meta') {
    return (
      <div className="checkin">
        <ul className="regras-lista">
          {desafio.regras.map((r) => <li key={r.id} className="pequeno">{textoRegra(r)}</li>)}
        </ul>
        <button className="botao botao-cheio botao-largo" onClick={concluirMeta} disabled={salvando}>
          Cumpri a meta
        </button>
      </div>
    )
  }

  if (!sugestao) return <div className="carregando-bloco"><div className="carregando" /></div>

  const cumpriuTudo = regras.every((r) => marcado[r.id])

  return (
    <div className={`checkin ${compacto ? 'checkin-compacto' : ''}`}>
      {!compacto && <p className="rotulo">{rotuloData(data)}</p>}
      <ul className="lista-check">
        {regras.map((r) => {
          const s = sugestao[r.id]
          const auto = TIPOS_REGRA[r.tipo].auto
          return (
            <li key={r.id}>
              <button
                className={`check ${marcado[r.id] ? 'feito-check' : ''}`}
                onClick={() => setMarcado({ ...marcado, [r.id]: !marcado[r.id] })}
                aria-pressed={!!marcado[r.id]}
              >
                <span className={`check-caixa ${marcado[r.id] ? 'cheia' : ''}`}>{marcado[r.id] && <IconeCheck tamanho={14} />}</span>
                <span className="check-texto">
                  <span>{textoRegra(r)}</span>
                  {auto && s?.detalhe && <span className="suave mini-texto">Pelo app: {s.detalhe}</span>}
                  {!auto && <span className="suave mini-texto">Marque se cumpriu</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <button className={`botao botao-largo ${cumpriuTudo ? 'botao-cheio' : ''}`} onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando...' : existente ? 'Corrigir registro do dia' : cumpriuTudo ? 'Confirmar: cumpri tudo' : 'Confirmar: não cumpri (perde 1 vida)'}
      </button>
    </div>
  )
}
