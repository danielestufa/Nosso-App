import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Barra from '../../components/Barra'
import ImagemExercicio from '../../components/ImagemExercicio'
import { IconeCheck, IconeSeta } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { dataISO, num } from '../../lib/saude'
import {
  DIAS, carregarFicha, carregarTreinoDoDia, ultimasCargas, garantirTreino, diaSemanaDe,
  repsSugeridas, formatarDescanso, lerOrdemDoDia, limparOrdemDoDia, ouvirTreinos,
} from '../../lib/treinos'

const dataCurta = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.2, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18)
      o.connect(g).connect(ctx.destination)
      o.start(ctx.currentTime + t)
      o.stop(ctx.currentTime + t + 0.2)
    })
  } catch {}
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {}
}

function Cronometro({ timer, aoMudar }) {
  const [agora, setAgora] = useState(Date.now())
  const avisou = useRef(false)

  useEffect(() => {
    avisou.current = false
    const t = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(t)
  }, [timer.fim])

  const restante = Math.max(0, Math.ceil((timer.fim - agora) / 1000))
  useEffect(() => {
    if (restante === 0 && !avisou.current) {
      avisou.current = true
      bip()
      setTimeout(() => aoMudar(null), 2500)
    }
  }, [restante, aoMudar])

  const min = Math.floor(restante / 60)
  const seg = String(restante % 60).padStart(2, '0')
  const pct = timer.total ? (1 - restante / timer.total) * 100 : 100

  return (
    <div className={`cronometro ${restante === 0 ? 'cronometro-fim' : ''}`} role="timer" aria-live="polite">
      <div className="cronometro-progresso" style={{ width: `${pct}%` }} />
      <div className="cronometro-conteudo">
        <div>
          <span className="pequeno">{restante === 0 ? 'Bora, próxima série!' : 'Descanso'}</span>
          <strong>{min}:{seg}</strong>
        </div>
        <div className="botoes">
          <button className="botao botao-pequeno" onClick={() => aoMudar({ ...timer, fim: timer.fim + 15000, total: timer.total + 15 })}>
            +15s
          </button>
          <button className="botao botao-pequeno" onClick={() => aoMudar(null)}>Pular</button>
        </div>
      </div>
    </div>
  )
}

function CartaoExercicio({ item, aberto, aoAbrir, series, ultima, editavel, aoMarcar, rascunho, aoRascunho }) {
  const ex = item.exercicios
  const cardio = ex.tipo === 'cardio'
  const total = cardio ? 1 : item.series
  const feitas = series.length
  const completo = feitas >= total

  const meta = cardio
    ? [item.minutos && `${item.minutos} min`, item.km && `${num(item.km, 1)} km`].filter(Boolean).join(' · ')
    : [`${item.series} × ${item.repeticoes || '?'}`, formatarDescanso(item.descanso_s) && `${formatarDescanso(item.descanso_s)} descanso`]
        .filter(Boolean)
        .join(' · ')

  const linhas = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <article className={`exercicio-cartao ${completo ? 'completo' : ''} ${aberto ? 'aberto' : ''}`}>
      <button className="exercicio-topo" onClick={aoAbrir} aria-expanded={aberto}>
        <ImagemExercicio imagem={ex.imagem} nome={ex.nome} tamanho="mini" animar={false} />
        <div className="exercicio-texto">
          <strong>{ex.nome}</strong>
          <span className="suave pequeno">{meta}</span>
          {!cardio && ultima?.carga != null && (
            <span className="pequeno">Última: {num(ultima.carga, 1)} kg · {dataCurta(ultima.data)}</span>
          )}
        </div>
        <span className={`contagem-series ${completo ? 'feito' : ''}`}>
          {completo ? <IconeCheck tamanho={16} /> : `${feitas}/${total}`}
        </span>
      </button>

      {aberto && (
        <div className="exercicio-corpo">
          <ImagemExercicio imagem={ex.imagem} nome={ex.nome} />
          {ex.como_fazer && <p className="pequeno como-fazer">{ex.como_fazer}</p>}
          {item.observacao && <p className="pequeno observacao">{item.observacao}</p>}

          <div className="tabela-series">
            <div className="series-cabecalho">
              <span>Série</span>
              <span>{cardio ? 'Minutos' : 'Carga (kg)'}</span>
              <span>{cardio ? 'Km' : 'Reps'}</span>
              <span />
            </div>
            {linhas.map((s) => {
              const feita = series.find((x) => x.serie === s)
              const chave = `${item.id}-${s}`
              const r = rascunho[chave] || {}
              const valorA = feita
                ? cardio ? feita.minutos ?? '' : feita.carga_kg ?? ''
                : r.a ?? (cardio ? item.minutos ?? '' : ultima?.carga ?? item.carga_kg ?? '')
              const valorB = feita
                ? cardio ? feita.km ?? '' : feita.repeticoes ?? ''
                : r.b ?? (cardio ? item.km ?? '' : repsSugeridas(item.repeticoes) ?? '')
              return (
                <div key={s} className={`serie-linha ${feita ? 'feita' : ''}`}>
                  <span className="serie-numero">{s}</span>
                  <input
                    inputMode="decimal"
                    value={valorA}
                    disabled={!editavel || !!feita}
                    onChange={(e) => aoRascunho(chave, { ...r, a: e.target.value })}
                    aria-label={cardio ? 'Minutos' : 'Carga'}
                  />
                  <input
                    inputMode="decimal"
                    value={valorB}
                    disabled={!editavel || !!feita}
                    onChange={(e) => aoRascunho(chave, { ...r, b: e.target.value })}
                    aria-label={cardio ? 'Quilômetros' : 'Repetições'}
                  />
                  <button
                    className={`check-serie ${feita ? 'feita' : ''}`}
                    disabled={!editavel}
                    onClick={() => aoMarcar(item, s, feita, valorA, valorB)}
                    aria-label={feita ? 'Desmarcar série' : 'Marcar série como feita'}
                  >
                    <IconeCheck tamanho={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </article>
  )
}

export default function TreinoHoje({ pessoa, eu, parceiro, editavel, aoIrParaFicha }) {
  const avisar = useAviso()
  const data = dataISO()
  const diaSemana = diaSemanaDe(data)
  const [ficha, setFicha] = useState(null)
  const [registro, setRegistro] = useState({ treino: null, series: [] })
  const [ultimas, setUltimas] = useState({})
  const [aberto, setAberto] = useState(null)
  const [rascunho, setRascunho] = useState({})
  const [timer, setTimer] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    const [f, r] = await Promise.all([carregarFicha(pessoa.id), carregarTreinoDoDia(pessoa.id, data)])
    setFicha(f)
    setRegistro(r)
    const ids = (f[diaSemana]?.itens || []).map((i) => i.exercicio_id)
    setUltimas(await ultimasCargas(pessoa.id, ids, data))
  }, [pessoa.id, data, diaSemana])

  useEffect(() => {
    setFicha(null)
    carregar()
  }, [carregar])

  useEffect(() => ouvirTreinos(`hoje-${pessoa.id}`, () => carregar(), ['treinos_realizados', 'series_registradas']), [carregar, pessoa.id])

  const diaFicha = ficha?.[diaSemana]
  const ordemSalva = editavel ? lerOrdemDoDia(pessoa.id, data) : null
  const itens = useMemo(() => {
    const base = diaFicha?.itens || []
    if (!ordemSalva) return base
    const pos = (id) => {
      const i = ordemSalva.indexOf(id)
      return i === -1 ? 999 : i
    }
    return [...base].sort((a, b) => pos(a.id) - pos(b.id))
  }, [diaFicha, ordemSalva?.join(',')])

  if (!ficha) return <div className="carregando-bloco"><div className="carregando" /></div>

  const seriesDe = (item) => registro.series.filter((s) => s.exercicio_id === item.exercicio_id)
  const totalSeries = itens.reduce((s, i) => s + (i.exercicios.tipo === 'cardio' ? 1 : i.series), 0)
  const feitas = itens.reduce((s, i) => s + Math.min(seriesDe(i).length, i.exercicios.tipo === 'cardio' ? 1 : i.series), 0)
  const concluido = !!registro.treino?.concluido_em

  async function marcar(item, serie, feita, valorA, valorB) {
    if (!editavel) return
    try {
      if (feita) {
        await supabase.from('series_registradas').delete().eq('id', feita.id)
      } else {
        const treino = registro.treino || (await garantirTreino(pessoa.id, data, diaFicha))
        const cardio = item.exercicios.tipo === 'cardio'
        const n = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))
        const { error } = await supabase.from('series_registradas').insert({
          treino_id: treino.id,
          user_id: pessoa.id,
          exercicio_id: item.exercicio_id,
          data,
          serie,
          ...(cardio
            ? { minutos: n(valorA) != null ? Math.round(n(valorA)) : null, km: n(valorB) }
            : { carga_kg: n(valorA), repeticoes: n(valorB) != null ? Math.round(n(valorB)) : null }),
        })
        if (error) throw error
        if (!cardio && item.descanso_s && serie < item.series) {
          setTimer({ fim: Date.now() + item.descanso_s * 1000, total: item.descanso_s })
        }
        if (seriesDe(item).length + 1 >= (cardio ? 1 : item.series)) {
          const prox = itens.find((i) => i.id !== item.id && seriesDe(i).length < (i.exercicios.tipo === 'cardio' ? 1 : i.series))
          if (prox) setTimeout(() => setAberto(prox.id), 400)
        }
      }
      carregar()
    } catch {
      avisar('Não foi possível salvar a série.')
    }
  }

  async function comecar() {
    setOcupado(true)
    try {
      await garantirTreino(pessoa.id, data, diaFicha)
      setAberto(itens[0]?.id || null)
      if (parceiro?.nome) {
        enviarNotificacao({
          para: 'parceiro',
          titulo: `${eu.nome} começou a treinar`,
          corpo: `${diaFicha.titulo}. Bora junto?`,
          url: '/treinos',
          tag: 'treino-inicio',
        }).catch(() => {})
      }
      carregar()
    } catch {
      avisar('Não foi possível começar.')
    }
    setOcupado(false)
  }

  async function concluir() {
    setOcupado(true)
    const treino = registro.treino || (await garantirTreino(pessoa.id, data, diaFicha))
    const { error } = await supabase.from('treinos_realizados').update({ concluido_em: new Date().toISOString() }).eq('id', treino.id)
    setOcupado(false)
    if (error) return avisar('Não foi possível concluir.')
    setTimer(null)
    limparOrdemDoDia(pessoa.id, data)
    avisar('Treino concluído! 💪')
    if (parceiro?.nome) {
      enviarNotificacao({
        para: 'parceiro',
        titulo: `${eu.nome} concluiu o treino`,
        corpo: `${diaFicha?.titulo || 'Treino'} feito hoje.`,
        url: '/treinos',
        tag: 'treino-fim',
      }).catch(() => {})
    }
    carregar()
  }

  async function reabrir() {
    await supabase.from('treinos_realizados').update({ concluido_em: null }).eq('id', registro.treino.id)
    carregar()
  }

  if (!diaFicha || !itens.length) {
    return (
      <div className="descanso">
        <p className="rotulo">{DIAS[diaSemana]}</p>
        <h2 className="titulo-secao">Dia de descanso</h2>
        <p className="suave">{editavel ? 'Não tem treino na sua ficha para hoje.' : `${pessoa.nome} não tem treino na ficha hoje.`}</p>
        {editavel && (
          <button className="botao" onClick={() => aoIrParaFicha(diaSemana)}>Montar um treino para hoje</button>
        )}
      </div>
    )
  }

  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="treino-hoje">
      <section className="treino-cabecalho cartao">
        <div className="cartao-topo">
          <div>
            <p className="rotulo">{DIAS[diaSemana]}</p>
            <h2 className="titulo-secao">{diaFicha.titulo}</h2>
          </div>
          {concluido ? (
            <span className="selo selo-cheio">Concluído</span>
          ) : registro.treino ? (
            <span className="selo">Em andamento</span>
          ) : null}
        </div>
        <Barra valor={feitas} meta={totalSeries || 1} />
        <p className="suave pequeno">
          {feitas} de {totalSeries} séries
          {registro.treino && ` · começou às ${hora(registro.treino.iniciado_em)}`}
          {concluido && ` · terminou às ${hora(registro.treino.concluido_em)}`}
        </p>
        {ordemSalva && editavel && !concluido && (
          <p className="pequeno">Usando a ordem sugerida para treinar junto.{' '}
            <button className="link" onClick={() => { limparOrdemDoDia(pessoa.id, data); carregar() }}>Voltar à ordem da ficha</button>
          </p>
        )}
        {editavel && !registro.treino && (
          <button className="botao botao-cheio botao-largo" onClick={comecar} disabled={ocupado}>
            Começar treino
          </button>
        )}
      </section>

      <div className="lista-exercicios">
        {itens.map((item) => (
          <CartaoExercicio
            key={item.id}
            item={item}
            aberto={aberto === item.id}
            aoAbrir={() => setAberto(aberto === item.id ? null : item.id)}
            series={seriesDe(item)}
            ultima={ultimas[item.exercicio_id]}
            editavel={editavel && !concluido}
            aoMarcar={marcar}
            rascunho={rascunho}
            aoRascunho={(k, v) => setRascunho((r) => ({ ...r, [k]: v }))}
          />
        ))}
      </div>

      {editavel && registro.treino && !concluido && (
        <button className="botao botao-cheio botao-largo" onClick={concluir} disabled={ocupado}>
          Concluir treino
        </button>
      )}
      {editavel && concluido && (
        <button className="botao botao-texto botao-largo" onClick={reabrir}>Reabrir treino</button>
      )}
      {editavel && (
        <button className="botao botao-texto botao-largo" onClick={() => aoIrParaFicha(diaSemana)}>
          Editar a ficha de {DIAS[diaSemana].toLowerCase()} <IconeSeta tamanho={14} />
        </button>
      )}

      {timer && <Cronometro timer={timer} aoMudar={setTimer} />}
    </div>
  )
}
