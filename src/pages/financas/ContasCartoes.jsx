import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import Barra from '../../components/Barra'
import { IconeMaisSimples, IconeVoltar, IconeSeta } from '../../components/Icones'
import { dataISO } from '../../lib/saude'
import {
  brl, brlCurto, lerValor, doEscopo, saldoConta, faturaDoMes, previsao, nomeMes, mesAtual, somarMeses,
} from '../../lib/financas'

const TIPOS_CONTA = { corrente: 'Conta corrente', poupanca: 'Poupança', carteira: 'Dinheiro / carteira', investimento: 'Investimento' }

function FormConta({ eu, escopo, inicial, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const [f, setF] = useState({ nome: inicial?.nome || '', tipo: inicial?.tipo || 'corrente', saldo: inicial ? String(inicial.saldo_inicial).replace('.', ',') : '' })
  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return avisar('Dê um nome à conta.')
    const saldo = f.saldo ? lerValor(f.saldo) : 0
    if (Number.isNaN(saldo)) return avisar('Confira o saldo.')
    const dados = { nome: f.nome.trim(), tipo: f.tipo, saldo_inicial: saldo }
    const { error } = inicial
      ? await supabase.from('fin_contas').update(dados).eq('id', inicial.id)
      : await supabase.from('fin_contas').insert({ ...dados, user_id: eu.id, escopo })
    if (error) return avisar('Não foi possível salvar.')
    aoSalvar()
  }
  return (
    <Modal titulo={inicial ? 'Editar conta' : `Nova conta ${escopo === 'casal' ? 'do casal' : 'pessoal'}`} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <label className="campo"><span>Nome</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Nubank, Inter, Carteira" autoFocus /></label>
        <label className="campo"><span>Tipo</span>
          <select value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
            {Object.entries(TIPOS_CONTA).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
          </select>
        </label>
        <label className="campo"><span>{inicial ? 'Saldo inicial' : 'Saldo atual'}</span>
          <div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={f.saldo} onChange={(e) => setF({ ...f, saldo: e.target.value })} placeholder="0,00" /></div>
        </label>
        <button className="botao botao-cheio botao-largo">Salvar</button>
        {inicial && (
          <button type="button" className="botao botao-texto botao-largo" onClick={async () => {
            if (!confirm('Arquivar esta conta? Ela some das listas, mas o histórico fica.')) return
            await supabase.from('fin_contas').update({ ativa: false }).eq('id', inicial.id)
            aoSalvar()
          }}>Arquivar conta</button>
        )}
      </form>
    </Modal>
  )
}

function AjustarSaldo({ conta, saldoAtual, eu, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const [valor, setValor] = useState(String(saldoAtual.toFixed(2)).replace('.', ','))
  async function salvar(e) {
    e.preventDefault()
    const novo = lerValor(valor)
    if (Number.isNaN(novo)) return avisar('Confira o valor.')
    const dif = Math.round((novo - saldoAtual) * 100) / 100
    if (!dif) return aoFechar()
    const { error } = await supabase.from('fin_lancamentos').insert({
      user_id: eu.id, escopo: conta.escopo, tipo: 'ajuste', descricao: 'Ajuste de saldo', valor: dif, data: dataISO(), conta_id: conta.id,
    })
    if (error) return avisar('Não foi possível ajustar.')
    avisar('Saldo ajustado.')
    aoSalvar()
  }
  return (
    <Modal titulo={`Saldo de ${conta.nome}`} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <p className="suave pequeno">Coloque o saldo que aparece no app do banco. A diferença vira um ajuste e não entra nos relatórios de gastos.</p>
        <label className="campo"><span>Saldo atual</span>
          <div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus /></div>
        </label>
        <button className="botao botao-cheio botao-largo">Salvar</button>
      </form>
    </Modal>
  )
}

function FormCartao({ eu, escopo, inicial, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const [f, setF] = useState({
    nome: inicial?.nome || '',
    limite: inicial?.limite ? String(inicial.limite).replace('.', ',') : '',
    fechamento: inicial?.dia_fechamento || '',
    vencimento: inicial?.dia_vencimento || '',
  })
  async function salvar(e) {
    e.preventDefault()
    const fech = parseInt(f.fechamento, 10)
    const venc = parseInt(f.vencimento, 10)
    if (!f.nome.trim() || !(fech >= 1 && fech <= 31) || !(venc >= 1 && venc <= 31)) return avisar('Preencha nome, dia de fechamento e vencimento.')
    const dados = { nome: f.nome.trim(), limite: f.limite ? lerValor(f.limite) : null, dia_fechamento: fech, dia_vencimento: venc }
    const { error } = inicial
      ? await supabase.from('fin_cartoes').update(dados).eq('id', inicial.id)
      : await supabase.from('fin_cartoes').insert({ ...dados, user_id: eu.id, escopo })
    if (error) return avisar('Não foi possível salvar.')
    aoSalvar()
  }
  return (
    <Modal titulo={inicial ? 'Editar cartão' : 'Novo cartão'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <label className="campo"><span>Nome</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Nubank, Mercado Pago" autoFocus /></label>
        <label className="campo"><span>Limite (opcional)</span>
          <div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={f.limite} onChange={(e) => setF({ ...f, limite: e.target.value })} /></div>
        </label>
        <div className="form-grade">
          <label className="campo"><span>Dia que fecha</span><input inputMode="numeric" value={f.fechamento} onChange={(e) => setF({ ...f, fechamento: e.target.value })} /></label>
          <label className="campo"><span>Dia que vence</span><input inputMode="numeric" value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value })} /></label>
        </div>
        <p className="suave pequeno">Com esses dias, o app sabe em qual fatura cada compra cai.</p>
        <button className="botao botao-cheio botao-largo">Salvar</button>
        {inicial && (
          <button type="button" className="botao botao-texto botao-largo" onClick={async () => {
            if (!confirm('Arquivar este cartão?')) return
            await supabase.from('fin_cartoes').update({ ativo: false }).eq('id', inicial.id)
            aoSalvar()
          }}>Arquivar cartão</button>
        )}
      </form>
    </Modal>
  )
}

function DetalheCartao({ cartao, dados, eu, contas, aoVoltar, aoMudar, aoEditar }) {
  const avisar = useAviso()
  const [mes, setMes] = useState(() => {
    // Primeira fatura ainda não paga a partir do mês atual
    for (let i = 0; i < 3; i++) {
      const m = somarMeses(mesAtual(), i)
      const f = faturaDoMes(cartao, dados, m)
      if (!f.paga && (f.total > 0 || i === 0)) return m
    }
    return mesAtual()
  })
  const [pagando, setPagando] = useState(false)
  const [contaPag, setContaPag] = useState(contas[0]?.id || '')
  const f = faturaDoMes(cartao, dados, mes)
  const usado = dados.lancamentos
    .filter((l) => l.cartao_id === cartao.id && l.tipo === 'despesa' && l.fatura_mes >= mesAtual())
    .filter((l) => !faturaDoMes(cartao, dados, l.fatura_mes).paga)
    .reduce((s, l) => s + Number(l.valor), 0)

  async function pagar() {
    const { error } = await supabase.from('fin_lancamentos').insert({
      user_id: eu.id, escopo: cartao.escopo, tipo: 'fatura', descricao: `Fatura ${cartao.nome} ${nomeMes(mes, true)}`,
      valor: f.total, data: dataISO(), conta_id: contaPag || null, cartao_id: cartao.id, fatura_mes: mes,
    })
    if (error) return avisar('Não foi possível registrar.')
    avisar('Fatura paga.')
    setPagando(false)
    aoMudar()
  }

  async function desfazer() {
    if (!confirm('Desmarcar o pagamento desta fatura?')) return
    await supabase.from('fin_lancamentos').delete().eq('id', f.pagamento.id)
    aoMudar()
  }

  return (
    <div className="detalhe-cartao">
      <button className="link-voltar" onClick={aoVoltar}><IconeVoltar tamanho={16} /> Contas e cartões</button>
      <div className="cartao-topo">
        <h2 className="titulo-secao">{cartao.nome}</h2>
        <button className="link pequeno" onClick={aoEditar}>editar</button>
      </div>
      {cartao.limite && (
        <section className="cartao">
          <div className="cartao-topo">
            <span className="pequeno">Limite usado</span>
            <span className="pequeno"><strong>{brl(usado)}</strong> de {brl(cartao.limite)}</span>
          </div>
          <Barra valor={usado} meta={Number(cartao.limite)} fina />
          <span className="suave mini-texto">Disponível: {brl(Number(cartao.limite) - usado)}</span>
        </section>
      )}

      <div className="navegar-data">
        <button className="botao-icone" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Fatura anterior"><IconeVoltar tamanho={20} /></button>
        <span className="navegar-data-rotulo">Fatura de {nomeMes(mes)}</span>
        <button className="botao-icone" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próxima fatura"><IconeSeta tamanho={20} /></button>
      </div>

      <section className="cartao">
        <div className="cartao-topo">
          <div>
            <p className="numero-grande">{brl(f.total)}</p>
            <p className="suave pequeno">Fecha dia {cartao.dia_fechamento} · vence dia {cartao.dia_vencimento}</p>
          </div>
          {f.paga ? <button className="selo selo-cheio" onClick={desfazer}>Paga</button> : f.total > 0 && <span className="selo">Aberta</span>}
        </div>
        {!f.paga && f.total > 0 && !pagando && <button className="botao botao-cheio botao-largo" onClick={() => setPagando(true)}>Pagar fatura</button>}
        {pagando && (
          <div className="linha-form linha-form-quebra">
            <label className="campo">
              <span>Pago com a conta</span>
              <select value={contaPag} onChange={(e) => setContaPag(e.target.value)}>
                <option value="">Não informar</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <button className="botao botao-cheio" onClick={pagar}>Confirmar</button>
          </div>
        )}
        <ul className="lista-lancamentos">
          {f.itens.map((l) => (
            <li key={l.id} className="lancamento">
              <div className="exercicio-texto">
                <span>{l.descricao}</span>
                <span className="suave mini-texto">{l.data.split('-').reverse().slice(0, 2).join('/')}{l.parcela_total > 1 && ` · parcela ${l.parcela_num} de ${l.parcela_total}`}</span>
              </div>
              <strong>{brl(l.valor)}</strong>
            </li>
          ))}
          {!f.itens.length && <li className="suave pequeno">Nenhuma compra nesta fatura.</li>}
        </ul>
      </section>
    </div>
  )
}

function Previsao({ dados, escopo, eu }) {
  const meses = previsao(dados, escopo, eu.id, 12)
  const max = Math.max(...meses.map((m) => m.total), 1)
  if (!meses.some((m) => m.total > 0)) return null
  return (
    <section className="cartao">
      <h3 className="cartao-titulo">Próximos 12 meses</h3>
      <p className="suave pequeno">Faturas já comprometidas (com as parcelas) e contas a pagar.</p>
      <div className="previsao">
        {meses.map((m) => (
          <div key={m.mes} className="previsao-mes" title={`${nomeMes(m.mes)}: ${brl(m.total)}`}>
            <span className="previsao-valor mini-texto">{m.total > 0 ? brlCurto(m.total) : ''}</span>
            <div className="previsao-barras">
              <div className="previsao-barra contas" style={{ height: `${(m.contas / max) * 100}%` }} />
              <div className="previsao-barra faturas" style={{ height: `${(m.faturas / max) * 100}%` }} />
            </div>
            <span className="mini-texto suave">{nomeMes(m.mes, true)}</span>
          </div>
        ))}
      </div>
      <p className="legenda-calendario suave mini-texto">
        <span className="dia-desafio cumpriu" /> faturas <span className="dia-desafio falhou" /> contas a pagar
      </p>
    </section>
  )
}

function ParcelasAtivas({ dados, escopo, eu }) {
  const cartoes = doEscopo(dados.cartoes, escopo, eu.id).map((c) => c.id)
  const grupos = {}
  for (const l of dados.lancamentos) {
    if (!l.grupo_parcela || !cartoes.includes(l.cartao_id) || l.fatura_mes < mesAtual()) continue
    ;(grupos[l.grupo_parcela] ||= []).push(l)
  }
  const lista = Object.values(grupos)
    .map((ls) => {
      const ord = ls.sort((a, b) => a.parcela_num - b.parcela_num)
      const ultima = ord[ord.length - 1]
      return {
        nome: ord[0].descricao.replace(/\s*\(\d+\/\d+\)$/, ''),
        cartao: dados.cartoes.find((c) => c.id === ord[0].cartao_id)?.nome,
        proxima: ord[0].parcela_num,
        total: ord[0].parcela_total,
        valor: Number(ord[0].valor),
        restante: ord.reduce((s, l) => s + Number(l.valor), 0),
        fim: ultima.fatura_mes,
      }
    })
    .sort((a, b) => a.fim.localeCompare(b.fim))
  if (!lista.length) return null
  return (
    <section className="cartao">
      <h3 className="cartao-titulo">Compras parceladas</h3>
      <ul className="lista-lancamentos">
        {lista.map((p, i) => (
          <li key={i} className="lancamento">
            <div className="exercicio-texto">
              <span>{p.nome}</span>
              <span className="suave mini-texto">{p.cartao} · próxima {p.proxima}/{p.total} · termina em {nomeMes(p.fim, true)}</span>
            </div>
            <div className="valor-coluna">
              <strong>{brl(p.valor)}</strong>
              <span className="suave mini-texto">faltam {brl(p.restante)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function ContasCartoes({ dados, escopo, eu, aoMudar }) {
  const [form, setForm] = useState(null)
  const [cartaoAberto, setCartaoAberto] = useState(null)
  const contas = doEscopo(dados.contas, escopo, eu.id).filter((c) => c.ativa)
  const cartoes = doEscopo(dados.cartoes, escopo, eu.id).filter((c) => c.ativo)
  const total = contas.reduce((s, c) => s + saldoConta(c, dados), 0)
  const fechar = () => { setForm(null); aoMudar() }

  const aberto = cartaoAberto && cartoes.find((c) => c.id === cartaoAberto)
  if (aberto) {
    return (
      <>
        <DetalheCartao cartao={aberto} dados={dados} eu={eu} contas={contas} aoVoltar={() => setCartaoAberto(null)} aoMudar={aoMudar}
          aoEditar={() => setForm({ tipo: 'cartao', item: aberto })} />
        {form?.tipo === 'cartao' && <FormCartao eu={eu} escopo={escopo} inicial={form.item} aoFechar={() => setForm(null)} aoSalvar={fechar} />}
      </>
    )
  }

  return (
    <div className="fin-contas">
      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Contas</h3>
          <button className="botao botao-pequeno" onClick={() => setForm({ tipo: 'conta' })}><IconeMaisSimples tamanho={14} /> Conta</button>
        </div>
        {contas.length ? (
          <>
            <ul className="lista-lancamentos">
              {contas.map((c) => {
                const s = saldoConta(c, dados)
                return (
                  <li key={c.id} className="lancamento">
                    <button className="exercicio-texto texto-botao" onClick={() => setForm({ tipo: 'conta', item: c })}>
                      <span>{c.nome}</span>
                      <span className="suave mini-texto">{TIPOS_CONTA[c.tipo]}</span>
                    </button>
                    <button className="valor-coluna texto-botao" onClick={() => setForm({ tipo: 'ajuste', item: c, saldo: s })}>
                      <strong className={s < 0 ? 'valor-negativo' : ''}>{brl(s)}</strong>
                      <span className="suave mini-texto">ajustar</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="cartao-topo total-linha"><span className="pequeno">Total</span><strong>{brl(total)}</strong></div>
          </>
        ) : <p className="suave pequeno">Cadastre suas contas para acompanhar o saldo.</p>}
      </section>

      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Cartões de crédito</h3>
          <button className="botao botao-pequeno" onClick={() => setForm({ tipo: 'cartao' })}><IconeMaisSimples tamanho={14} /> Cartão</button>
        </div>
        {cartoes.length ? (
          <ul className="lista-lancamentos">
            {cartoes.map((c) => {
              let mes = mesAtual()
              let f = faturaDoMes(c, dados, mes)
              for (let i = 1; i < 3 && (f.paga || f.total === 0); i++) {
                const m = somarMeses(mesAtual(), i)
                const fm = faturaDoMes(c, dados, m)
                if (!fm.paga && fm.total > 0) { mes = m; f = fm; break }
              }
              return (
                <li key={c.id} className="lancamento" role="button" tabIndex={0} onClick={() => setCartaoAberto(c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setCartaoAberto(c.id)}>
                  <div className="exercicio-texto">
                    <span>{c.nome}</span>
                    <span className="suave mini-texto">Fatura de {nomeMes(mes, true)} · vence dia {c.dia_vencimento}</span>
                  </div>
                  <div className="valor-coluna">
                    <strong>{brl(f.total)}</strong>
                    <IconeSeta tamanho={14} />
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <p className="suave pequeno">Cadastre seus cartões para acompanhar faturas e parcelas.</p>}
      </section>

      <ParcelasAtivas dados={dados} escopo={escopo} eu={eu} />
      <Previsao dados={dados} escopo={escopo} eu={eu} />

      {form?.tipo === 'conta' && <FormConta eu={eu} escopo={escopo} inicial={form.item} aoFechar={() => setForm(null)} aoSalvar={fechar} />}
      {form?.tipo === 'ajuste' && <AjustarSaldo conta={form.item} saldoAtual={form.saldo} eu={eu} aoFechar={() => setForm(null)} aoSalvar={fechar} />}
      {form?.tipo === 'cartao' && <FormCartao eu={eu} escopo={escopo} inicial={form.item} aoFechar={() => setForm(null)} aoSalvar={fechar} />}
    </div>
  )
}
