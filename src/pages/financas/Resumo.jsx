import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import Barra from '../../components/Barra'
import { IconeSeta, IconeLapis } from '../../components/Icones'
import { dataISO, somarDias } from '../../lib/saude'
import {
  brl, doEscopo, gastosDoMes, receitasDoMes, porCategoria, saldoConta, faturaDoMes, saldoEntreNos,
  saldoCaixinha, lerValor, mesAtual,
} from '../../lib/financas'

function Orcamentos({ dados, escopo, eu, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const atuais = doEscopo(dados.orcamentos, escopo, eu.id)
  const categorias = dados.categorias.filter((c) => c.tipo === 'despesa')
  const [valores, setValores] = useState(() =>
    Object.fromEntries(categorias.map((c) => [c.id, (() => {
      const o = atuais.find((x) => x.categoria_id === c.id)
      return o ? String(o.valor).replace('.', ',') : ''
    })()]))
  )
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    try {
      for (const c of categorias) {
        const v = valores[c.id] ? lerValor(valores[c.id]) : 0
        const existente = atuais.find((x) => x.categoria_id === c.id)
        if (existente && !(v > 0)) await supabase.from('fin_orcamentos').delete().eq('id', existente.id)
        else if (existente && v !== Number(existente.valor)) await supabase.from('fin_orcamentos').update({ valor: v }).eq('id', existente.id)
        else if (!existente && v > 0) await supabase.from('fin_orcamentos').insert({ user_id: eu.id, escopo, categoria_id: c.id, valor: v })
      }
      avisar('Orçamentos salvos.')
      aoSalvar()
    } catch {
      avisar('Não foi possível salvar.')
    }
    setSalvando(false)
  }

  return (
    <Modal titulo={`Orçamento mensal ${escopo === 'casal' ? 'do casal' : 'pessoal'}`} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <p className="suave pequeno">Defina o limite por mês de cada categoria. Deixe vazio para não controlar. Quando chegar a 80% e quando passar, chega uma notificação.</p>
        <div className="lista-orcamentos">
          {categorias.map((c) => (
            <label key={c.id} className="orcamento-linha">
              <span>{c.nome}</span>
              <div className="entrada-valor pequena">
                <span>R$</span>
                <input inputMode="decimal" value={valores[c.id]} onChange={(e) => setValores({ ...valores, [c.id]: e.target.value })} placeholder="sem limite" />
              </div>
            </label>
          ))}
        </div>
        <button className="botao botao-cheio botao-largo" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar orçamentos'}</button>
      </form>
    </Modal>
  )
}

export default function Resumo({ dados, escopo, eu, parceiro, mes, irPara, aoMudar }) {
  const [editandoOrc, setEditandoOrc] = useState(false)
  const gastos = gastosDoMes(dados, escopo, eu.id, mes)
  const receitas = receitasDoMes(dados, escopo, eu.id, mes)
  const totalGastos = gastos.reduce((s, g) => s + g.valor, 0)
  const totalReceitas = receitas.reduce((s, r) => s + Number(r.valor), 0)
  const cat = porCategoria(gastos)
  const orcamentos = doEscopo(dados.orcamentos, escopo, eu.id)
  const contas = doEscopo(dados.contas, escopo, eu.id).filter((c) => c.ativa)
  const saldoContas = contas.reduce((s, c) => s + saldoConta(c, dados), 0)
  const caixinhas = doEscopo(dados.caixinhas, escopo, eu.id).filter((c) => c.ativa)
  const guardado = caixinhas.reduce((s, c) => s + saldoCaixinha(c, dados), 0)
  const cartoes = doEscopo(dados.cartoes, escopo, eu.id).filter((c) => c.ativo)
  const faturas = cartoes.map((c) => ({ c, f: faturaDoMes(c, dados, mes) })).filter((x) => x.f.total > 0)
  const hoje = dataISO()
  const limite = somarDias(hoje, 30)
  const proximas = doEscopo(dados.contasPagar, escopo, eu.id).filter((c) => !c.pago && c.vencimento <= limite).slice(0, 6)
  const entreNos = parceiro?.nome ? saldoEntreNos(dados, eu.id) : 0
  const nomeCat = (id) => dados.categorias.find((c) => c.id === Number(id))?.nome || 'Sem categoria'
  const ehMesAtual = mes === mesAtual()

  const linhasOrc = orcamentos
    .map((o) => ({ id: o.categoria_id, nome: nomeCat(o.categoria_id), gasto: cat[o.categoria_id] || 0, limite: Number(o.valor) }))
    .sort((a, b) => b.gasto / b.limite - a.gasto / a.limite)
  const semOrc = Object.entries(cat)
    .filter(([id]) => !orcamentos.some((o) => String(o.categoria_id) === id))
    .map(([id, v]) => ({ id, nome: nomeCat(id), gasto: v }))
    .sort((a, b) => b.gasto - a.gasto)
  const estourados = linhasOrc.filter((l) => l.gasto > l.limite)

  const dataCurta = (iso) => {
    const [a, m, d] = iso.split('-').map(Number)
    return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  }

  return (
    <div className="fin-resumo">
      {estourados.length > 0 && (
        <p className="faixa">
          <span>Orçamento estourado em {estourados.map((e) => e.nome).join(', ')}.</span>
        </p>
      )}

      <section className="fin-numeros">
        <div className="fin-numero destaque">
          <span className="rotulo">Saldo em contas</span>
          <strong>{brl(saldoContas)}</strong>
          {guardado > 0 && <span className="pequeno">+ {brl(guardado)} guardado</span>}
        </div>
        <div className="fin-numero">
          <span className="rotulo">Entradas</span>
          <strong>{brl(totalReceitas)}</strong>
        </div>
        <div className="fin-numero">
          <span className="rotulo">Gastos</span>
          <strong>{brl(totalGastos)}</strong>
        </div>
        <div className="fin-numero">
          <span className="rotulo">Sobra do mês</span>
          <strong>{brl(totalReceitas - totalGastos)}</strong>
        </div>
      </section>

      {parceiro?.nome && entreNos !== 0 && (
        <button className="cartao fin-acerto" onClick={() => irPara('acertos')}>
          <span>
            {entreNos > 0 ? `${parceiro.nome} te deve` : `Você deve a ${parceiro.nome}`}
            <strong> {brl(Math.abs(entreNos))}</strong>
          </span>
          <IconeSeta tamanho={16} />
        </button>
      )}

      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Gastos por categoria</h3>
          <button className="botao botao-pequeno" onClick={() => setEditandoOrc(true)}><IconeLapis tamanho={14} /> Orçamentos</button>
        </div>
        {!linhasOrc.length && !semOrc.length && <p className="suave pequeno">Nenhum gasto neste mês.</p>}
        <div className="categorias-lista">
          {linhasOrc.map((l) => (
            <div key={l.id} className={`categoria-linha ${l.gasto > l.limite ? 'estourou' : ''}`}>
              <div className="cartao-topo">
                <span>{l.nome}</span>
                <span className="pequeno"><strong>{brl(l.gasto)}</strong> <span className="suave">de {brl(l.limite)}</span></span>
              </div>
              <Barra valor={l.gasto} meta={l.limite} fina />
              <span className="suave mini-texto">
                {l.gasto > l.limite ? `${brl(l.gasto - l.limite)} acima` : `Restam ${brl(l.limite - l.gasto)}`}
              </span>
            </div>
          ))}
          {semOrc.map((l) => (
            <div key={l.id} className="categoria-linha sem-orcamento">
              <div className="cartao-topo">
                <span>{l.nome}</span>
                <span className="pequeno"><strong>{brl(l.gasto)}</strong></span>
              </div>
              <Barra valor={l.gasto} meta={totalGastos || 1} fina />
            </div>
          ))}
        </div>
      </section>

      {proximas.length > 0 && (
        <section className="cartao">
          <div className="cartao-topo">
            <h3 className="cartao-titulo">Contas a pagar</h3>
            <button className="link pequeno" onClick={() => irPara('pagar')}>ver todas</button>
          </div>
          <ul className="lista-simples">
            {proximas.map((c) => (
              <li key={c.id}>
                <span className="pequeno">
                  {c.descricao}
                  <span className={`suave ${c.vencimento < hoje ? 'atrasada' : ''}`}> · {c.vencimento < hoje ? 'venceu' : 'vence'} {dataCurta(c.vencimento)}</span>
                </span>
                <strong className="pequeno">{brl(c.valor)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {faturas.length > 0 && (
        <section className="cartao">
          <div className="cartao-topo">
            <h3 className="cartao-titulo">Faturas {ehMesAtual ? 'deste mês' : 'do mês'}</h3>
            <button className="link pequeno" onClick={() => irPara('contas')}>ver cartões</button>
          </div>
          <ul className="lista-simples">
            {faturas.map(({ c, f }) => (
              <li key={c.id}>
                <span className="pequeno">{c.nome} <span className="suave">· vence dia {c.dia_vencimento}{f.paga ? ' · paga' : ''}</span></span>
                <strong className="pequeno">{brl(f.total)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {caixinhas.length > 0 && (
        <section className="cartao">
          <div className="cartao-topo">
            <h3 className="cartao-titulo">Caixinhas</h3>
            <button className="link pequeno" onClick={() => irPara('caixinhas')}>ver todas</button>
          </div>
          {caixinhas.slice(0, 4).map((c) => {
            const s = saldoCaixinha(c, dados)
            return (
              <div key={c.id} className="categoria-linha">
                <div className="cartao-topo">
                  <span>{c.nome}</span>
                  <span className="pequeno"><strong>{brl(s)}</strong>{c.meta && <span className="suave"> de {brl(c.meta)}</span>}</span>
                </div>
                {c.meta && <Barra valor={s} meta={Number(c.meta)} fina />}
              </div>
            )
          })}
        </section>
      )}

      {editandoOrc && <Orcamentos dados={dados} escopo={escopo} eu={eu} aoFechar={() => setEditandoOrc(false)} aoSalvar={() => { setEditandoOrc(false); aoMudar() }} />}
    </div>
  )
}
