import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth'
import { useAviso } from '../../components/Aviso'
import { IconeMaisSimples, IconeSeta } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { dataISO, somarDias, num } from '../../lib/saude'
import { carregarDesafios, estadoGeral, regrasDoDia, textoRegra, ouvirDesafios } from '../../lib/desafios'
import NovoDesafio from './NovoDesafio'
import DetalheDesafio, { Vidas } from './DetalheDesafio'
import CheckinDia from './CheckinDia'

const dataCurta = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function CartaoDesafio({ desafio, perfis, eu, aoAbrir }) {
  const g = estadoGeral(desafio, perfis)
  const total = Math.round((new Date(desafio.data_fim) - new Date(desafio.data_inicio)) / 86400000) + 1
  const passados = Math.min(Math.max(Math.round((new Date(dataISO()) - new Date(desafio.data_inicio)) / 86400000) + 1, 0), total)
  return (
    <button className="cartao cartao-desafio" onClick={aoAbrir}>
      <div className="cartao-topo">
        <strong>{desafio.titulo}</strong>
        <IconeSeta tamanho={16} />
      </div>
      <p className="suave pequeno">
        {g.fase === 'agendado' ? `Começa em ${dataCurta(desafio.data_inicio)}` : g.fase === 'encerrado' ? `Encerrado em ${dataCurta(desafio.data_fim)}` : `Dia ${passados} de ${total}`}
        {desafio.aposta && ` · ${desafio.aposta}`}
      </p>
      <div className="mini-placar">
        {g.pessoas.map((p) => {
          const s = g.sit[p.id]
          return (
            <div key={p.id} className={`mini-pessoa ${g.vencedor?.id === p.id ? 'vencedor' : ''}`}>
              <span className="pequeno">{p.id === eu.id ? 'Você' : p.nome}</span>
              {desafio.modo === 'diario' ? (
                <>
                  <span className="mini-pontos">{num(s.pontos)} pts</span>
                  <Vidas total={desafio.vidas} restantes={s.vidasRestantes} />
                </>
              ) : (
                <span className="pequeno suave">{s.estado === 'concluiu' ? 'Cumpriu' : s.estado === 'falhou' ? 'Não cumpriu' : 'Em andamento'}</span>
              )}
            </div>
          )
        })}
      </div>
      {g.fase === 'encerrado' && (
        <p className="pequeno">
          {desafio.formato === 'juntos'
            ? g.empate ? 'Empate' : `🏆 ${g.vencedor.id === eu.id ? 'Você venceu' : `${g.vencedor.nome} venceu`}`
            : g.completou ? '🏆 Desafio cumprido' : 'Desafio não cumprido'}
        </p>
      )}
    </button>
  )
}

export default function Desafios() {
  const { perfil, parceiro } = useAuth()
  const avisar = useAviso()
  const [params, setParams] = useSearchParams()
  const [desafios, setDesafios] = useState(null)
  const [criando, setCriando] = useState(false)
  const [respondendo, setRespondendo] = useState(null)

  const perfis = useMemo(() => [perfil, parceiro].filter((p) => p?.nome), [perfil, parceiro])
  const abertoId = params.get('id')

  const carregar = useCallback(async () => {
    try {
      setDesafios(await carregarDesafios())
    } catch {
      setDesafios([])
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => ouvirDesafios('pagina', () => carregar()), [carregar])

  const abrir = (id) => {
    const novo = new URLSearchParams(params)
    if (id) novo.set('id', id)
    else novo.delete('id')
    setParams(novo)
  }

  if (!desafios) return <div className="carregando-bloco"><div className="carregando" /></div>

  if (!parceiro?.nome) {
    return (
      <div className="desafios">
        <h1 className="titulo-pagina">Desafios</h1>
        <p className="suave">Os desafios ficam disponíveis quando o seu par entrar no app.</p>
      </div>
    )
  }

  const aberto = abertoId && desafios.find((d) => d.id === abertoId)
  if (aberto) {
    return (
      <DetalheDesafio desafio={aberto} perfis={perfis} eu={perfil} parceiro={parceiro} aoVoltar={() => abrir(null)} aoMudar={carregar} />
    )
  }

  const hoje = dataISO()
  const convites = desafios.filter((d) => d.status === 'pendente' && d.criado_por !== perfil.id)
  const aguardando = desafios.filter((d) => d.status === 'pendente' && d.criado_por === perfil.id)
  const ativos = desafios.filter((d) => d.status === 'ativo')
  const comEstado = ativos.map((d) => ({ d, g: estadoGeral(d, perfis) }))
  const andamento = comEstado.filter((x) => x.g.fase !== 'encerrado')
  const encerrados = comEstado.filter((x) => x.g.fase === 'encerrado')
  const recusados = desafios.filter((d) => d.status === 'recusado').slice(0, 5)

  // O que eu preciso registrar hoje
  const paraHoje = andamento.filter(({ d, g }) => {
    if (!g.pessoas.some((p) => p.id === perfil.id) || g.fase !== 'andamento') return false
    const s = g.sit[perfil.id]
    if (d.modo === 'meta') return false
    if (s.eliminado) return false
    return regrasDoDia(d.regras, hoje).length > 0 && !d.checkins.some((c) => c.user_id === perfil.id && c.data === hoje)
  })
  const atrasados = andamento.reduce((t, { d, g }) => {
    const s = g.sit[perfil.id]
    return t + (s && !s.eliminado ? s.pendentes.filter((x) => x !== hoje).length : 0)
  }, 0)

  // Placar geral: vitórias e pontos nos desafios juntos
  const placar = Object.fromEntries(perfis.map((p) => [p.id, { vitorias: 0, pontos: 0 }]))
  for (const { d, g } of comEstado) {
    if (d.formato !== 'juntos') continue
    for (const p of g.pessoas) if (d.modo === 'diario') placar[p.id].pontos += g.sit[p.id].pontos
    if (g.vencedor) placar[g.vencedor.id].vitorias++
  }
  for (const { d, g } of encerrados) {
    if (d.formato === 'para_par' && g.completou) placar[d.desafiado].vitorias++
  }

  async function responder(desafio, aceitar) {
    if (aceitar) {
      let { data_inicio, data_fim } = desafio
      if (data_inicio < hoje) {
        const duracao = Math.round((new Date(data_fim) - new Date(data_inicio)) / 86400000)
        data_inicio = hoje
        data_fim = somarDias(hoje, duracao)
      }
      const { error } = await supabase.from('desafios').update({ status: 'ativo', respondido_em: new Date().toISOString(), data_inicio, data_fim }).eq('id', desafio.id)
      if (error) return avisar('Não foi possível aceitar.')
      avisar('Desafio aceito! Bora! 💪')
      enviarNotificacao({ para: 'parceiro', titulo: `${perfil.nome} aceitou o desafio`, corpo: desafio.titulo, url: '/desafios' }).catch(() => {})
    } else {
      const { error } = await supabase.from('desafios').update({ status: 'recusado', respondido_em: new Date().toISOString() }).eq('id', desafio.id)
      if (error) return avisar('Não foi possível recusar.')
      avisar(desafio.prenda_recusa ? `Recusado. Prenda: ${desafio.prenda_recusa}` : 'Desafio recusado.')
      enviarNotificacao({
        para: 'parceiro',
        titulo: `${perfil.nome} recusou o desafio`,
        corpo: `${desafio.titulo}${desafio.prenda_recusa ? ` · Prenda: ${desafio.prenda_recusa}` : ''}`,
        url: '/desafios',
      }).catch(() => {})
    }
    setRespondendo(null)
    carregar()
  }

  return (
    <div className="desafios">
      <header className="cabecalho cabecalho-linha">
        <h1 className="titulo-pagina">Desafios</h1>
        <button className="botao botao-cheio" onClick={() => setCriando(true)}>
          <IconeMaisSimples tamanho={16} /> Novo
        </button>
      </header>

      <section className="placar-geral">
        {perfis.map((p) => (
          <div key={p.id} className="placar-geral-pessoa">
            <span className="rotulo">{p.id === perfil.id ? 'Você' : p.nome}</span>
            <strong className="numero-grande">{placar[p.id].vitorias}</strong>
            <span className="suave pequeno">{placar[p.id].vitorias === 1 ? 'vitória' : 'vitórias'} · {num(placar[p.id].pontos)} pts</span>
          </div>
        ))}
      </section>

      {convites.map((d) => (
        <section key={d.id} className="cartao convite">
          <p className="rotulo">{d.formato === 'juntos' ? `${parceiro.nome} propôs um desafio juntos` : `${parceiro.nome} te desafiou`}</p>
          <h2 className="titulo-secao">{d.titulo}</h2>
          {d.descricao && <p className="suave pequeno">{d.descricao}</p>}
          <ul className="regras-lista">{d.regras.map((r) => <li key={r.id} className="pequeno">{textoRegra(r)}</li>)}</ul>
          <p className="pequeno">
            {dataCurta(d.data_inicio)} a {dataCurta(d.data_fim)}
            {d.modo === 'diario' && ` · ${d.vidas} vidas`}
            {d.aposta && ` · Aposta: ${d.aposta}`}
          </p>
          {respondendo === d.id ? (
            <div className="confirmar-recusa">
              <p className="pequeno">{d.prenda_recusa ? `Se recusar, a prenda é: ${d.prenda_recusa}` : 'Recusar este desafio?'}</p>
              <div className="botoes">
                <button className="botao" onClick={() => responder(d, false)}>Recusar mesmo assim</button>
                <button className="botao botao-texto" onClick={() => setRespondendo(null)}>Voltar</button>
              </div>
            </div>
          ) : (
            <div className="botoes">
              <button className="botao botao-cheio" onClick={() => responder(d, true)}>Aceitar</button>
              <button className="botao" onClick={() => setRespondendo(d.id)}>Recusar</button>
            </div>
          )}
        </section>
      ))}

      {paraHoje.length > 0 && (
        <section className="bloco-desafios">
          <h2 className="titulo-bloco">Registrar hoje</h2>
          {paraHoje.map(({ d }) => (
            <div key={d.id} className="cartao">
              <div className="cartao-topo">
                <strong>{d.titulo}</strong>
                <button className="link pequeno" onClick={() => abrir(d.id)}>ver</button>
              </div>
              <CheckinDia desafio={d} eu={perfil} parceiro={parceiro} data={hoje} compacto aoSalvar={carregar} />
            </div>
          ))}
        </section>
      )}

      {atrasados > 0 && (
        <p className="faixa">
          <span>Você tem {atrasados} {atrasados === 1 ? 'dia' : 'dias'} sem confirmar. Abra o desafio para registrar.</span>
        </p>
      )}

      {andamento.length > 0 && (
        <section className="bloco-desafios">
          <h2 className="titulo-bloco">Em andamento</h2>
          <div className="grade-desafios">
            {andamento.map(({ d }) => <CartaoDesafio key={d.id} desafio={d} perfis={perfis} eu={perfil} aoAbrir={() => abrir(d.id)} />)}
          </div>
        </section>
      )}

      {aguardando.length > 0 && (
        <section className="bloco-desafios">
          <h2 className="titulo-bloco">Aguardando {parceiro.nome}</h2>
          {aguardando.map((d) => (
            <div key={d.id} className="cartao">
              <strong>{d.titulo}</strong>
              <p className="suave pequeno">Enviado. Assim que {parceiro.nome} aceitar, o desafio começa.</p>
              <button className="botao botao-texto" onClick={async () => { await supabase.from('desafios').update({ status: 'cancelado' }).eq('id', d.id); carregar() }}>
                Cancelar convite
              </button>
            </div>
          ))}
        </section>
      )}

      {!andamento.length && !convites.length && !aguardando.length && (
        <section className="vazio-desafios">
          <p className="suave">Nenhum desafio em andamento.</p>
          <button className="botao" onClick={() => setCriando(true)}>Lançar o primeiro desafio</button>
        </section>
      )}

      {encerrados.length > 0 && (
        <section className="bloco-desafios">
          <h2 className="titulo-bloco">Encerrados</h2>
          <div className="grade-desafios">
            {encerrados.map(({ d }) => <CartaoDesafio key={d.id} desafio={d} perfis={perfis} eu={perfil} aoAbrir={() => abrir(d.id)} />)}
          </div>
        </section>
      )}

      {recusados.length > 0 && (
        <section className="bloco-desafios">
          <h2 className="titulo-bloco">Recusados</h2>
          <ul className="lista-simples">
            {recusados.map((d) => (
              <li key={d.id}>
                <span className="pequeno">{d.titulo}</span>
                <span className="suave pequeno">{d.criado_por === perfil.id ? `${parceiro.nome} recusou` : 'Você recusou'}{d.prenda_recusa ? ` · ${d.prenda_recusa}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {criando && <NovoDesafio eu={perfil} parceiro={parceiro} aoFechar={() => setCriando(false)} aoCriar={() => { setCriando(false); carregar() }} />}
    </div>
  )
}
