import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import Barra from '../../components/Barra'
import { IconeMaisSimples } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { dataISO, rotuloData } from '../../lib/saude'
import { brl, lerValor, doEscopo, saldoCaixinha } from '../../lib/financas'

function FormCaixinha({ eu, escopo, inicial, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const [f, setF] = useState({
    nome: inicial?.nome || '', tipo: inicial?.tipo || 'caixinha',
    meta: inicial?.meta ? String(inicial.meta).replace('.', ',') : '', prazo: inicial?.prazo || '',
  })
  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return avisar('Dê um nome.')
    const dados = { nome: f.nome.trim(), tipo: f.tipo, meta: f.meta ? lerValor(f.meta) : null, prazo: f.prazo || null }
    const { error } = inicial
      ? await supabase.from('fin_caixinhas').update(dados).eq('id', inicial.id)
      : await supabase.from('fin_caixinhas').insert({ ...dados, user_id: eu.id, escopo })
    if (error) return avisar('Não foi possível salvar.')
    aoSalvar()
  }
  return (
    <Modal titulo={inicial ? 'Editar' : `Nova caixinha ${escopo === 'casal' ? 'do casal' : 'pessoal'}`} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <div className="segmentos segmentos-2">
          <button type="button" className={f.tipo === 'caixinha' ? 'ativo' : ''} onClick={() => setF({ ...f, tipo: 'caixinha' })}>Caixinha (meta)</button>
          <button type="button" className={f.tipo === 'investimento' ? 'ativo' : ''} onClick={() => setF({ ...f, tipo: 'investimento' })}>Investimento</button>
        </div>
        <label className="campo"><span>Nome</span><input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder={f.tipo === 'caixinha' ? 'Ex.: Casamento, Viagem, Lua de mel' : 'Ex.: Tesouro Selic, CDB'} autoFocus /></label>
        <div className="form-grade">
          <label className="campo"><span>Meta (opcional)</span><div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={f.meta} onChange={(e) => setF({ ...f, meta: e.target.value })} /></div></label>
          <label className="campo"><span>Até quando (opcional)</span><input type="date" value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} /></label>
        </div>
        <button className="botao botao-cheio botao-largo">Salvar</button>
        {inicial && (
          <button type="button" className="botao botao-texto botao-largo" onClick={async () => {
            if (!confirm('Arquivar esta caixinha?')) return
            await supabase.from('fin_caixinhas').update({ ativa: false }).eq('id', inicial.id)
            aoSalvar()
          }}>Arquivar</button>
        )}
      </form>
    </Modal>
  )
}

function Movimentar({ caixinha, dados, eu, parceiro, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const contas = doEscopo(dados.contas, caixinha.escopo, eu.id).filter((c) => c.ativa)
  const [tipo, setTipo] = useState('deposito')
  const [valor, setValor] = useState('')
  const [contaId, setContaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const movs = dados.movimentos.filter((m) => m.caixinha_id === caixinha.id)

  async function salvar(e) {
    e.preventDefault()
    const v = lerValor(valor)
    if (!(v > 0)) return avisar('Informe o valor.')
    const { error } = await supabase.from('fin_caixinha_mov').insert({
      caixinha_id: caixinha.id, user_id: eu.id, tipo, valor: v, data: dataISO(),
      conta_id: tipo === 'rendimento' ? null : contaId || null, descricao: descricao.trim() || null,
    })
    if (error) return avisar('Não foi possível salvar.')
    avisar(tipo === 'retirada' ? 'Retirada registrada.' : `${brl(v)} guardado em ${caixinha.nome}!`)
    if (caixinha.escopo === 'casal' && tipo === 'deposito' && parceiro?.nome) {
      enviarNotificacao({ para: 'parceiro', titulo: `${eu.nome} guardou dinheiro`, corpo: `${brl(v)} na caixinha ${caixinha.nome}`, url: '/financas?aba=caixinhas' }).catch(() => {})
    }
    aoSalvar()
  }

  const nome = (id) => (id === eu.id ? 'Você' : parceiro?.nome)

  return (
    <Modal titulo={caixinha.nome} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <div className="segmentos segmentos-3">
          <button type="button" className={tipo === 'deposito' ? 'ativo' : ''} onClick={() => setTipo('deposito')}>Guardar</button>
          <button type="button" className={tipo === 'retirada' ? 'ativo' : ''} onClick={() => setTipo('retirada')}>Retirar</button>
          <button type="button" className={tipo === 'rendimento' ? 'ativo' : ''} onClick={() => setTipo('rendimento')}>Rendeu</button>
        </div>
        <label className="campo"><span>Valor</span><div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus /></div></label>
        {tipo !== 'rendimento' && contas.length > 0 && (
          <label className="campo"><span>{tipo === 'deposito' ? 'Saiu da conta' : 'Voltou para a conta'}</span>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)}>
              <option value="">Não informar</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
        )}
        <label className="campo"><span>Observação</span><input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Opcional" /></label>
        <button className="botao botao-cheio botao-largo">Salvar</button>
      </form>
      {movs.length > 0 && (
        <ul className="lista-lancamentos historico-caixinha">
          {movs.slice(0, 20).map((m) => (
            <li key={m.id} className="lancamento">
              <div className="exercicio-texto">
                <span className="pequeno">{m.tipo === 'deposito' ? 'Guardou' : m.tipo === 'retirada' ? 'Retirou' : 'Rendimento'}{caixinha.escopo === 'casal' && ` · ${nome(m.user_id)}`}</span>
                <span className="suave mini-texto">{rotuloData(m.data)}{m.descricao && ` · ${m.descricao}`}</span>
              </div>
              <strong className={m.tipo === 'retirada' ? 'valor-negativo' : 'valor-positivo'}>{m.tipo === 'retirada' ? '-' : '+'}{brl(m.valor)}</strong>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

export default function Caixinhas({ dados, escopo, eu, parceiro, aoMudar }) {
  const [form, setForm] = useState(null)
  const [mov, setMov] = useState(null)
  const lista = doEscopo(dados.caixinhas, escopo, eu.id).filter((c) => c.ativa)
  const total = lista.reduce((s, c) => s + saldoCaixinha(c, dados), 0)
  const fechar = () => { setForm(null); setMov(null); aoMudar() }

  return (
    <div className="fin-caixinhas">
      <section className="fin-numeros">
        <div className="fin-numero destaque">
          <span className="rotulo">Total guardado {escopo === 'casal' ? 'pelo casal' : ''}</span>
          <strong>{brl(total)}</strong>
        </div>
      </section>

      <div className="cartao-topo">
        <h2 className="titulo-bloco">Caixinhas e investimentos</h2>
        <button className="botao botao-cheio botao-pequeno" onClick={() => setForm({})}><IconeMaisSimples tamanho={14} /> Nova</button>
      </div>

      {!lista.length && <p className="suave pequeno">Crie caixinhas para juntar dinheiro: casamento, viagem, lua de mel, reserva de emergência.</p>}

      <div className="grade-desafios">
        {lista.map((c) => {
          const s = saldoCaixinha(c, dados)
          const pct = c.meta ? Math.round((s / Number(c.meta)) * 100) : null
          let porMes = null
          if (c.meta && c.prazo && s < Number(c.meta)) {
            const [a, m] = c.prazo.split('-').map(Number)
            const hoje = new Date()
            const meses = (a - hoje.getFullYear()) * 12 + (m - 1 - hoje.getMonth())
            if (meses > 0) porMes = (Number(c.meta) - s) / meses
          }
          return (
            <article key={c.id} className="cartao caixinha">
              <div className="cartao-topo">
                <div>
                  <p className="rotulo">{c.tipo === 'investimento' ? 'Investimento' : 'Caixinha'}</p>
                  <strong>{c.nome}</strong>
                </div>
                <button className="link mini-texto" onClick={() => setForm(c)}>editar</button>
              </div>
              <p className="numero-grande">{brl(s)}</p>
              {c.meta && (
                <>
                  <div className="barra-grossa"><div style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                  <span className="suave pequeno">
                    {pct}% de {brl(c.meta)}
                    {porMes && ` · guardar ${brl(porMes)}/mês até ${c.prazo.split('-').reverse().slice(1).join('/')}`}
                  </span>
                </>
              )}
              <button className="botao botao-largo" onClick={() => setMov(c)}>Guardar ou retirar</button>
            </article>
          )
        })}
      </div>

      {form && <FormCaixinha eu={eu} escopo={escopo} inicial={form.id ? form : null} aoFechar={() => setForm(null)} aoSalvar={fechar} />}
      {mov && <Movimentar caixinha={mov} dados={dados} eu={eu} parceiro={parceiro} aoFechar={() => setMov(null)} aoSalvar={fechar} />}
    </div>
  )
}
