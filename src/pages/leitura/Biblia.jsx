import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import Barra from '../../components/Barra'
import { IconeCheck, IconeMaisSimples } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { dataISO, somarDias, rotuloData, num } from '../../lib/saude'
import { LIVROS_BIBLIA, PLANOS, cronograma, resumoCapitulos, chaveCap, diaDoPlano } from '../../lib/biblia'
import { ouvirLeitura } from '../../lib/leitura'

function LeituraLivre({ eu, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const [livro, setLivro] = useState('Salmos')
  const [de, setDe] = useState('1')
  const [ate, setAte] = useState('1')
  const max = LIVROS_BIBLIA.find(([n]) => n === livro)?.[1] || 1

  async function salvar(e) {
    e.preventDefault()
    const a = Math.max(1, Math.min(parseInt(de, 10) || 1, max))
    const b = Math.max(a, Math.min(parseInt(ate, 10) || a, max))
    const hoje = dataISO()
    const linhas = Array.from({ length: b - a + 1 }, (_, i) => ({ user_id: eu.id, data: hoje, livro, capitulo: a + i }))
    const { error } = await supabase.from('biblia_leituras').insert(linhas)
    if (error) return avisar('Não foi possível salvar.')
    avisar(`${livro} ${a === b ? a : `${a}-${b}`} registrado.`)
    aoSalvar()
  }

  return (
    <Modal titulo="Registrar leitura" aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-grade">
        <label className="campo campo-cheio">
          <span>Livro</span>
          <select value={livro} onChange={(e) => { setLivro(e.target.value); setDe('1'); setAte('1') }}>
            <optgroup label="Antigo Testamento">
              {LIVROS_BIBLIA.slice(0, 39).map(([n]) => <option key={n}>{n}</option>)}
            </optgroup>
            <optgroup label="Novo Testamento">
              {LIVROS_BIBLIA.slice(39).map(([n]) => <option key={n}>{n}</option>)}
            </optgroup>
          </select>
        </label>
        <label className="campo"><span>Do capítulo</span><input inputMode="numeric" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="campo"><span>Até o capítulo</span><input inputMode="numeric" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <p className="suave pequeno campo-cheio">{livro} tem {max} {max === 1 ? 'capítulo' : 'capítulos'}. Conta como leitura da Bíblia de hoje nos desafios.</p>
        <button className="botao botao-cheio campo-cheio">Salvar</button>
      </form>
    </Modal>
  )
}

function CartaoPlano({ plano, leituras, editavel, eu, parceiro, aoMudar }) {
  const avisar = useAviso()
  const info = PLANOS[plano.plano]
  const dias = useMemo(() => cronograma(plano.plano), [plano.plano])
  const lidos = new Set(leituras.filter((l) => l.plano_id === plano.id).map(chaveCap))
  const hoje = dataISO()
  const diaAtual = Math.min(Math.max(diaDoPlano(plano.inicio, hoje), 1), info.dias)
  const total = info.capitulos.length
  const feitos = lidos.size
  const previstos = dias.slice(0, diaAtual).flat()
  const atrasados = previstos.filter((c) => !lidos.has(chaveCap(c)))
  const hojeCaps = dias[diaAtual - 1] || []
  const proximos = atrasados.length ? atrasados : dias.slice(diaAtual).flat().filter((c) => !lidos.has(chaveCap(c))).slice(0, hojeCaps.length || 3)
  const adiantado = !atrasados.length
  const terminou = feitos >= total
  const [salvando, setSalvando] = useState(false)

  async function marcar(caps) {
    if (!caps.length) return
    setSalvando(true)
    const novos = caps.filter((c) => !lidos.has(chaveCap(c)))
    const { error } = await supabase.from('biblia_leituras').insert(
      novos.map((c) => ({ user_id: eu.id, plano_id: plano.id, data: hoje, livro: c.livro, capitulo: c.capitulo }))
    )
    setSalvando(false)
    if (error) return avisar('Não foi possível marcar.')
    const agora = feitos + novos.length
    if (agora >= total) {
      await supabase.from('biblia_planos').update({ concluido_em: hoje, ativo: false }).eq('id', plano.id)
      avisar(`Plano concluído! 🎉 ${info.nome}`)
      if (parceiro?.nome) enviarNotificacao({ para: 'parceiro', titulo: `${eu.nome} concluiu um plano da Bíblia`, corpo: info.nome, url: '/leitura?aba=biblia' }).catch(() => {})
    } else {
      avisar(`${resumoCapitulos(caps)} marcado como lido.`)
    }
    aoMudar()
  }

  async function desmarcar(c) {
    await supabase.from('biblia_leituras').delete().eq('plano_id', plano.id).eq('livro', c.livro).eq('capitulo', c.capitulo)
    aoMudar()
  }

  async function parar() {
    if (!confirm(`Parar o plano "${info.nome}"? O que você já leu fica salvo no histórico.`)) return
    await supabase.from('biblia_planos').update({ ativo: false }).eq('id', plano.id)
    aoMudar()
  }

  return (
    <section className="cartao plano-biblia">
      <div className="cartao-topo">
        <div>
          <p className="rotulo">Dia {diaAtual} de {info.dias}</p>
          <h3 className="titulo-secao">{info.nome}</h3>
        </div>
        <span className="pequeno"><strong>{Math.round((feitos / total) * 100)}%</strong></span>
      </div>
      <Barra valor={feitos} meta={total} />
      <p className="suave pequeno">
        {num(feitos)} de {num(total)} capítulos
        {!terminou && (atrasados.length ? ` · ${atrasados.length} ${atrasados.length === 1 ? 'capítulo atrasado' : 'capítulos atrasados'}` : ' · em dia')}
      </p>

      {!terminou && (
        <div className="leitura-do-dia">
          <p className="rotulo">{adiantado ? 'Em dia! Próxima leitura' : atrasados.length > hojeCaps.length ? 'Para colocar em dia' : 'Leitura de hoje'}</p>
          <p className="leitura-texto">{resumoCapitulos(proximos)}</p>
          {editavel && (
            <>
              <div className="capitulos">
                {proximos.map((c) => (
                  <button key={chaveCap(c)} className="capitulo" onClick={() => marcar([c])} disabled={salvando} title={`${c.livro} ${c.capitulo}`}>
                    <span className="mini-texto">{c.livro.length > 8 ? c.livro.slice(0, 3) : c.livro}</span>
                    <strong>{c.capitulo}</strong>
                  </button>
                ))}
              </div>
              <button className="botao botao-cheio botao-largo" onClick={() => marcar(proximos)} disabled={salvando}>
                <IconeCheck tamanho={16} /> Li tudo
              </button>
            </>
          )}
        </div>
      )}

      {feitos > 0 && (
        <details className="historico">
          <summary className="pequeno">Já lidos</summary>
          <p className="pequeno lidos-resumo">
            {resumoCapitulos(info.capitulos.filter((c) => lidos.has(chaveCap(c))))}
          </p>
          {editavel && (
            <div className="capitulos capitulos-lidos">
              {info.capitulos.filter((c) => lidos.has(chaveCap(c))).slice(-12).map((c) => (
                <button key={chaveCap(c)} className="capitulo feito" onClick={() => desmarcar(c)} title="Desmarcar">
                  <span className="mini-texto">{c.livro.length > 8 ? c.livro.slice(0, 3) : c.livro}</span>
                  <strong>{c.capitulo}</strong>
                </button>
              ))}
            </div>
          )}
        </details>
      )}

      {editavel && <button className="botao botao-texto" onClick={parar}>Parar plano</button>}
    </section>
  )
}

export default function Biblia({ pessoa, eu, parceiro, editavel }) {
  const avisar = useAviso()
  const [planos, setPlanos] = useState(null)
  const [leituras, setLeituras] = useState([])
  const [planosPar, setPlanosPar] = useState([])
  const [livre, setLivre] = useState(false)

  const carregar = useCallback(async () => {
    const [p, l, pp] = await Promise.all([
      supabase.from('biblia_planos').select('*').eq('user_id', pessoa.id).order('criado_em', { ascending: false }),
      supabase.from('biblia_leituras').select('*').eq('user_id', pessoa.id).order('data', { ascending: false }).limit(5000),
      parceiro?.nome ? supabase.from('biblia_planos').select('*').neq('user_id', pessoa.id).eq('ativo', true) : { data: [] },
    ])
    setPlanos(p.data || [])
    setLeituras(l.data || [])
    setPlanosPar(pp.data || [])
  }, [pessoa.id, parceiro?.nome])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => ouvirLeitura(`biblia-${pessoa.id}`, () => carregar()), [carregar, pessoa.id])

  if (!planos) return <div className="carregando-bloco"><div className="carregando" /></div>

  const ativos = planos.filter((p) => p.ativo)
  const concluidos = planos.filter((p) => p.concluido_em)
  const hoje = dataISO()
  const lidosHoje = leituras.filter((l) => l.data === hoje)
  const ultimos = Array.from({ length: 14 }, (_, i) => somarDias(hoje, i - 13))
  const diasComLeitura = new Set(leituras.map((l) => l.data))
  let sequencia = 0
  for (let d = diasComLeitura.has(hoje) ? hoje : somarDias(hoje, -1); diasComLeitura.has(d); d = somarDias(d, -1)) sequencia++

  async function comecar(planoId) {
    const { error } = await supabase.from('biblia_planos').insert({ user_id: eu.id, plano: planoId, inicio: hoje })
    if (error) return avisar('Não foi possível começar o plano.')
    avisar(`Plano começado: ${PLANOS[planoId].nome}`)
    if (parceiro?.nome) {
      enviarNotificacao({ para: 'parceiro', titulo: `${eu.nome} começou um plano da Bíblia`, corpo: `${PLANOS[planoId].nome}. Bora ler junto?`, url: '/leitura?aba=biblia' }).catch(() => {})
    }
    carregar()
  }

  const outroNome = pessoa.id === eu.id ? parceiro?.nome : 'Você'

  return (
    <div className="biblia">
      <section className="cartao resumo-biblia">
        <div>
          <p className="rotulo">Hoje</p>
          <p className="titulo-secao">{lidosHoje.length ? `${lidosHoje.length} ${lidosHoje.length === 1 ? 'capítulo' : 'capítulos'}` : 'Ainda não leu'}</p>
          {lidosHoje.length > 0 && <p className="suave pequeno">{resumoCapitulos([...lidosHoje].sort((a, b) => a.criado_em.localeCompare(b.criado_em)))}</p>}
        </div>
        <div className="sequencia">
          <strong className="numero-grande">{sequencia}</strong>
          <span className="suave pequeno">{sequencia === 1 ? 'dia seguido' : 'dias seguidos'}</span>
        </div>
        <div className="dias-biblia" aria-label="Últimos 14 dias">
          {ultimos.map((d) => <span key={d} className={`dia-desafio ${diasComLeitura.has(d) ? 'cumpriu' : 'livre'}`} title={rotuloData(d)} />)}
        </div>
        {editavel && (
          <button className="botao botao-largo" onClick={() => setLivre(true)}>
            <IconeMaisSimples tamanho={16} /> Registrar leitura livre
          </button>
        )}
      </section>

      {ativos.map((p) => (
        <CartaoPlano key={p.id} plano={p} leituras={leituras} editavel={editavel} eu={eu} parceiro={parceiro} aoMudar={carregar} />
      ))}

      {planosPar.length > 0 && outroNome && (
        <p className="faixa-leve">
          {outroNome} está no plano: {planosPar.map((p) => PLANOS[p.plano].nome).join(', ')}
        </p>
      )}

      {editavel && (
        <section className="bloco-desafios">
          <h2 className="titulo-bloco">{ativos.length ? 'Começar outro plano' : 'Escolha um plano de leitura'}</h2>
          <div className="planos">
            {Object.entries(PLANOS).filter(([id]) => !ativos.some((a) => a.plano === id)).map(([id, info]) => {
              const parFaz = planosPar.some((p) => p.plano === id)
              return (
                <div key={id} className="cartao plano-opcao">
                  <strong>{info.nome}</strong>
                  <span className="suave pequeno">{info.descricao}</span>
                  <span className="pequeno">{info.dias} dias · {num(info.capitulos.length)} capítulos{parFaz && ` · ${parceiro.nome} está nesse plano`}</span>
                  <button className="botao botao-pequeno" onClick={() => comecar(id)}>Começar hoje</button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {!editavel && !ativos.length && <p className="suave pequeno">{pessoa.nome} não está em nenhum plano agora.</p>}

      {concluidos.length > 0 && (
        <section className="bloco-desafios">
          <h2 className="titulo-bloco">Planos concluídos</h2>
          <ul className="lista-simples">
            {concluidos.map((p) => (
              <li key={p.id}>
                <span className="pequeno">🏆 {PLANOS[p.plano].nome}</span>
                <span className="suave pequeno">{rotuloData(p.concluido_em)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {livre && <LeituraLivre eu={eu} aoFechar={() => setLivre(false)} aoSalvar={() => { setLivre(false); carregar() }} />}
    </div>
  )
}
