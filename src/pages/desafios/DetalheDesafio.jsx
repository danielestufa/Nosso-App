import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import { IconeVoltar, IconeLapis } from '../../components/Icones'
import { rotuloData, num, dataISO } from '../../lib/saude'
import { estadoGeral, textoRegra, textoDias } from '../../lib/desafios'
import CheckinDia from './CheckinDia'

const dataCurta = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function Vidas({ total, restantes }) {
  if (total > 10) return <span className="pequeno"><strong>{restantes}</strong> / {total} vidas</span>
  return (
    <span className="vidas" aria-label={`${restantes} de ${total} vidas`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className={`vida ${i < restantes ? 'cheia' : ''}`} />)}
    </span>
  )
}

function Calendario({ dias }) {
  return (
    <div className="calendario-desafio">
      {dias.map((d) => (
        <span key={d.data} className={`dia-desafio ${d.estado}`} title={`${dataCurta(d.data)}: ${d.estado}`} />
      ))}
    </div>
  )
}

export default function DetalheDesafio({ desafio, perfis, eu, parceiro, aoVoltar, aoMudar }) {
  const avisar = useAviso()
  const [editandoAposta, setEditandoAposta] = useState(false)
  const [aposta, setAposta] = useState(desafio.aposta || '')
  const [diaAberto, setDiaAberto] = useState(null)
  const g = estadoGeral(desafio, perfis)
  const souParticipante = g.pessoas?.some((p) => p.id === eu.id)
  const minha = souParticipante ? g.sit[eu.id] : null

  async function salvarAposta() {
    await supabase.from('desafios').update({ aposta: aposta.trim() || null }).eq('id', desafio.id)
    setEditandoAposta(false)
    avisar('Aposta atualizada.')
    aoMudar()
  }

  async function cancelar() {
    if (!confirm('Cancelar este desafio? O histórico fica salvo.')) return
    await supabase.from('desafios').update({ status: 'cancelado' }).eq('id', desafio.id)
    aoMudar()
    aoVoltar()
  }

  const nomeDe = (id) => perfis.find((p) => p.id === id)?.nome || ''

  return (
    <div className="detalhe-desafio">
      <button className="link-voltar" onClick={aoVoltar}><IconeVoltar tamanho={16} /> Desafios</button>

      <header className="cabecalho">
        <p className="rotulo">
          {desafio.formato === 'juntos' ? 'Juntos' : `${nomeDe(desafio.criado_por)} desafiou ${nomeDe(desafio.desafiado)}`}
          {' · '}{dataCurta(desafio.data_inicio)} a {dataCurta(desafio.data_fim)}
        </p>
        <h1 className="titulo-pagina">{desafio.titulo}</h1>
        {desafio.descricao && <p className="suave">{desafio.descricao}</p>}
      </header>

      {g.fase === 'encerrado' && (
        <section className="resultado">
          <p className="rotulo">Resultado</p>
          {desafio.formato === 'juntos' ? (
            g.empate ? <h2 className="titulo-secao">Empate! Ninguém paga.</h2> : (
              <h2 className="titulo-secao">{g.vencedor.nome} venceu! 🏆</h2>
            )
          ) : (
            <h2 className="titulo-secao">{g.completou ? `${g.pessoas[0].nome} cumpriu o desafio! 🏆` : `${g.pessoas[0].nome} não cumpriu.`}</h2>
          )}
          {desafio.aposta && !g.empate && (
            <p>
              {desafio.formato === 'juntos'
                ? `${g.pessoas.find((p) => p.id !== g.vencedor.id)?.nome} paga: ${desafio.aposta}`
                : g.completou ? `${nomeDe(desafio.criado_por)} paga: ${desafio.aposta}` : `${g.pessoas[0].nome} paga: ${desafio.aposta}`}
            </p>
          )}
        </section>
      )}

      {g.fase === 'agendado' && <p className="faixa-leve">Começa {rotuloData(desafio.data_inicio).toLowerCase()} ({dataCurta(desafio.data_inicio)}).</p>}

      <section className="placar-desafio">
        {g.pessoas.map((p) => {
          const s = g.sit[p.id]
          return (
            <div key={p.id} className={`cartao placar-pessoa ${g.vencedor?.id === p.id ? 'vencedor' : ''}`}>
              <div className="cartao-topo">
                <strong>{p.nome}</strong>
                {desafio.modo === 'diario' ? <Vidas total={desafio.vidas} restantes={s.vidasRestantes} /> : (
                  <span className="selo">{s.estado === 'concluiu' ? 'Cumpriu' : s.estado === 'falhou' ? 'Não cumpriu' : 'Em andamento'}</span>
                )}
              </div>
              {desafio.modo === 'diario' && (
                <>
                  <p className="numero-grande">{num(s.pontos)} <span className="suave">pts</span></p>
                  <p className="suave pequeno">
                    {s.cumpridos} {s.cumpridos === 1 ? 'dia cumprido' : 'dias cumpridos'} · {s.falhas} {s.falhas === 1 ? 'falha' : 'falhas'}
                    {s.eliminado && ` · sem vidas desde ${dataCurta(s.eliminadoEm)}`}
                  </p>
                  {s.dias.length > 0 && <Calendario dias={s.dias} />}
                </>
              )}
            </div>
          )
        })}
      </section>
      {desafio.modo === 'diario' && (
        <p className="legenda-calendario suave mini-texto">
          <span className="dia-desafio cumpriu" /> cumpriu <span className="dia-desafio falhou" /> falhou <span className="dia-desafio pendente" /> falta confirmar <span className="dia-desafio livre" /> livre
        </p>
      )}

      {souParticipante && g.fase === 'andamento' && minha && (
        desafio.modo === 'meta' ? (
          minha.estado === 'andamento' && (
            <section className="cartao">
              <h3 className="cartao-titulo">Sua meta</h3>
              <CheckinDia desafio={desafio} eu={eu} parceiro={parceiro} data={dataISO()} aoSalvar={aoMudar} />
            </section>
          )
        ) : minha.pendentes.length > 0 && !minha.eliminado && (
          <section className="cartao">
            <h3 className="cartao-titulo">Confirmar dias</h3>
            {minha.pendentes.map((d) => (
              <div key={d} className="dia-pendente">
                <button className="dia-pendente-topo" onClick={() => setDiaAberto(diaAberto === d ? null : d)}>
                  <span>{rotuloData(d)}</span>
                  <span className="suave pequeno">{diaAberto === d ? 'fechar' : 'confirmar'}</span>
                </button>
                {diaAberto === d && (
                  <CheckinDia desafio={desafio} eu={eu} parceiro={parceiro} data={d} compacto aoSalvar={() => { setDiaAberto(null); aoMudar() }} />
                )}
              </div>
            ))}
          </section>
        )
      )}

      <section className="cartao">
        <h3 className="cartao-titulo">Regras</h3>
        <ul className="regras-lista">
          {desafio.regras.map((r) => (
            <li key={r.id}>
              <span>{textoRegra(r)}</span>
              {desafio.modo === 'diario' && <span className="suave pequeno">{textoDias(r.dias_semana)}</span>}
            </li>
          ))}
        </ul>
        {desafio.modo === 'diario' && (
          <p className="suave pequeno">
            {desafio.vidas} {desafio.vidas === 1 ? 'vida' : 'vidas'} · +{desafio.pontos_dia} pts por dia cumprido · -{desafio.penalidade_vida} pts por vida perdida
          </p>
        )}
      </section>

      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Aposta</h3>
          {!editandoAposta && g.fase !== 'encerrado' && (
            <button className="botao-icone pequeno-icone" onClick={() => setEditandoAposta(true)} aria-label="Editar aposta"><IconeLapis tamanho={15} /></button>
          )}
        </div>
        {editandoAposta ? (
          <div className="linha-form">
            <label className="campo"><span>Valor ou prêmio</span><input value={aposta} onChange={(e) => setAposta(e.target.value)} autoFocus /></label>
            <button className="botao botao-cheio" onClick={salvarAposta}>Salvar</button>
          </div>
        ) : (
          <p>{desafio.aposta || <span className="suave">Sem aposta</span>}</p>
        )}
        {desafio.prenda_recusa && <p className="suave pequeno">Prenda para quem recusar: {desafio.prenda_recusa}</p>}
      </section>

      {desafio.criado_por === eu.id && g.fase !== 'encerrado' && (
        <button className="botao botao-texto botao-largo" onClick={cancelar}>Cancelar desafio</button>
      )}
    </div>
  )
}
