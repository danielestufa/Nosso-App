import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import { IconeMaisSimples } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { dataISO, rotuloData } from '../../lib/saude'
import { brl, lerValor, saldoEntreNos } from '../../lib/financas'

function NovaDivisao({ dados, eu, parceiro, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const [f, setF] = useState({ quem: 'par', descricao: '', total: '', modo: 'metade', parte: '', categoria_id: '', data: dataISO() })
  const total = lerValor(f.total)
  const devido = f.modo === 'metade' ? Math.round((total / 2) * 100) / 100 : f.modo === 'tudo' ? total : lerValor(f.parte)

  async function salvar(e) {
    e.preventDefault()
    if (!f.descricao.trim() || !(total > 0)) return avisar('Preencha descrição e valor.')
    if (!(devido > 0) || devido > total) return avisar('Confira o valor devido.')
    const pagou = f.quem === 'par' ? parceiro.id : eu.id
    const devedor = f.quem === 'par' ? eu.id : parceiro.id
    const { error } = await supabase.from('fin_divisoes').insert({
      criado_por: eu.id, pagou_por: pagou, devedor, descricao: f.descricao.trim(), data: f.data,
      valor_total: total, valor_devido: devido, categoria_id: f.categoria_id ? Number(f.categoria_id) : null,
    })
    if (error) return avisar('Não foi possível salvar.')
    enviarNotificacao({
      para: 'parceiro',
      titulo: f.quem === 'par' ? `${eu.nome} registrou que te deve` : `${eu.nome} dividiu um gasto com você`,
      corpo: `${f.descricao.trim()}: ${brl(devido)}`,
      url: '/financas?aba=acertos',
    }).catch(() => {})
    aoSalvar()
  }

  return (
    <Modal titulo="Registrar gasto dividido" aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <div className="segmentos segmentos-2">
          <button type="button" className={f.quem === 'par' ? 'ativo' : ''} onClick={() => setF({ ...f, quem: 'par' })}>{parceiro.nome} pagou</button>
          <button type="button" className={f.quem === 'eu' ? 'ativo' : ''} onClick={() => setF({ ...f, quem: 'eu' })}>Eu paguei</button>
        </div>
        <p className="suave pequeno">
          {f.quem === 'par'
            ? `Use quando ${parceiro.nome} passou algo no cartão para você e ainda não registrou no app.`
            : 'Para gastos que não precisam entrar nas suas contas. Se pagou com cartão ou conta, prefira lançar o gasto e marcar "dividir".'}
        </p>
        <label className="campo"><span>Descrição</span><input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Ex.: Compra no Mercado Livre" autoFocus /></label>
        <div className="form-grade">
          <label className="campo"><span>Valor total</span><div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></div></label>
          <label className="campo"><span>Data</span><input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></label>
        </div>
        <div className="chips">
          {[['metade', 'Metade'], ['valor', 'Outro valor'], ['tudo', f.quem === 'par' ? 'Tudo meu' : `Tudo de ${parceiro.nome}`]].map(([v, n]) => (
            <button key={v} type="button" className={`chip ${f.modo === v ? 'ativo' : ''}`} onClick={() => setF({ ...f, modo: v })}>{n}</button>
          ))}
        </div>
        {f.modo === 'valor' && (
          <label className="campo"><span>{f.quem === 'par' ? 'Minha parte' : `Parte de ${parceiro.nome}`}</span><div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={f.parte} onChange={(e) => setF({ ...f, parte: e.target.value })} /></div></label>
        )}
        <label className="campo"><span>Categoria</span>
          <select value={f.categoria_id} onChange={(e) => setF({ ...f, categoria_id: e.target.value })}>
            <option value="">Sem categoria</option>
            {dados.categorias.filter((c) => c.tipo === 'despesa').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        {devido > 0 && <p className="pequeno">{f.quem === 'par' ? `Você vai ficar devendo ${brl(devido)} a ${parceiro.nome}.` : `${parceiro.nome} vai ficar te devendo ${brl(devido)}.`}</p>}
        <button className="botao botao-cheio botao-largo">Salvar</button>
      </form>
    </Modal>
  )
}

export default function Acertos({ dados, eu, parceiro, aoMudar }) {
  const avisar = useAviso()
  const [nova, setNova] = useState(false)
  const [verHistorico, setVerHistorico] = useState(false)
  if (!parceiro?.nome) return <p className="suave">Os acertos aparecem quando seu par entrar no app.</p>

  const saldo = saldoEntreNos(dados, eu.id)
  const abertas = dados.divisoes.filter((d) => !d.acertado)
  const acertadas = dados.divisoes.filter((d) => d.acertado).slice(0, 40)
  const nome = (id) => (id === eu.id ? 'Você' : parceiro.nome)
  const devoAoPar = abertas.filter((d) => d.devedor === eu.id).reduce((s, d) => s + Number(d.valor_devido), 0)
  const parMeDeve = abertas.filter((d) => d.pagou_por === eu.id).reduce((s, d) => s + Number(d.valor_devido), 0)

  async function acertar(ids, msg) {
    const { error } = await supabase.from('fin_divisoes').update({ acertado: true, acertado_em: dataISO() }).in('id', ids)
    if (error) return avisar('Não foi possível marcar.')
    avisar(msg)
    enviarNotificacao({ para: 'parceiro', titulo: 'Contas acertadas', corpo: `${eu.nome} marcou ${ids.length === 1 ? 'um gasto' : `${ids.length} gastos`} como acertado.`, url: '/financas?aba=acertos' }).catch(() => {})
    aoMudar()
  }

  async function reabrir(d) {
    await supabase.from('fin_divisoes').update({ acertado: false, acertado_em: null }).eq('id', d.id)
    aoMudar()
  }

  async function apagar(d) {
    if (!confirm('Apagar este registro de divisão?')) return
    await supabase.from('fin_divisoes').delete().eq('id', d.id)
    aoMudar()
  }

  return (
    <div className="fin-acertos">
      <section className={`resultado ${saldo === 0 ? 'resultado-zerado' : ''}`}>
        <p className="rotulo">Entre vocês</p>
        <h2 className="titulo-secao">
          {saldo === 0 ? 'Tudo certo, ninguém deve nada.' : saldo > 0 ? `${parceiro.nome} te deve ${brl(saldo)}` : `Você deve ${brl(-saldo)} a ${parceiro.nome}`}
        </h2>
        {(devoAoPar > 0 && parMeDeve > 0) && (
          <p className="pequeno">Já descontado: {parceiro.nome} te deve {brl(parMeDeve)} e você deve {brl(devoAoPar)}.</p>
        )}
        {abertas.length > 0 && (
          <button className="botao botao-claro" onClick={() => {
            if (confirm(`Marcar ${abertas.length} ${abertas.length === 1 ? 'gasto' : 'gastos'} como acertado${abertas.length === 1 ? '' : 's'}?`)) acertar(abertas.map((d) => d.id), 'Tudo acertado!')
          }}>Marcar tudo como acertado</button>
        )}
      </section>

      <div className="cartao-topo">
        <h2 className="titulo-bloco">Em aberto ({abertas.length})</h2>
        <button className="botao botao-pequeno" onClick={() => setNova(true)}><IconeMaisSimples tamanho={14} /> Registrar</button>
      </div>

      {!abertas.length && <p className="suave pequeno">Nenhum gasto dividido em aberto.</p>}
      <ul className="lista-lancamentos">
        {abertas.map((d) => (
          <li key={d.id} className="lancamento">
            <div className="exercicio-texto">
              <span>{d.descricao}</span>
              <span className="suave mini-texto">{rotuloData(d.data)} · {nome(d.pagou_por)} pagou {brl(d.valor_total)}</span>
            </div>
            <div className="valor-coluna">
              <strong className={d.pagou_por === eu.id ? 'valor-positivo' : 'valor-negativo'}>
                {d.pagou_por === eu.id ? `+${brl(d.valor_devido)}` : `-${brl(d.valor_devido)}`}
              </strong>
              <div className="acoes-conta">
                {!d.lancamento_id && <button className="link mini-texto" onClick={() => apagar(d)}>apagar</button>}
                <button className="link mini-texto" onClick={() => acertar([d.id], 'Marcado como acertado.')}>acertado</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {acertadas.length > 0 && (
        <section className="bloco-desafios">
          <button className="link pequeno" onClick={() => setVerHistorico(!verHistorico)}>{verHistorico ? 'Esconder histórico' : `Ver acertados (${acertadas.length})`}</button>
          {verHistorico && (
            <ul className="lista-lancamentos">
              {acertadas.map((d) => (
                <li key={d.id} className="lancamento">
                  <div className="exercicio-texto">
                    <span>{d.descricao}</span>
                    <span className="suave mini-texto">{nome(d.pagou_por)} pagou · acertado {d.acertado_em ? rotuloData(d.acertado_em).toLowerCase() : ''}</span>
                  </div>
                  <div className="valor-coluna">
                    <strong className="suave">{brl(d.valor_devido)}</strong>
                    <button className="link mini-texto" onClick={() => reabrir(d)}>reabrir</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {nova && <NovaDivisao dados={dados} eu={eu} parceiro={parceiro} aoFechar={() => setNova(false)} aoSalvar={() => { setNova(false); aoMudar() }} />}
    </div>
  )
}
