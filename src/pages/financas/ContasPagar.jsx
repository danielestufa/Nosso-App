import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import { IconeMaisSimples, IconeCheck } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { dataISO } from '../../lib/saude'
import { brl, lerValor, doEscopo, gerarVencimentos, mesAtual, somarMeses, nomeMes, mesDe } from '../../lib/financas'

const dataCurta = (iso) => iso.split('-').reverse().slice(0, 2).join('/')

export function FormContaPagar({ dados, eu, parceiro, escopoInicial = 'pessoal', fixo = {}, aoFechar, aoSalvar, titulo }) {
  const avisar = useAviso()
  const catInicial = fixo.categoriaNome ? dados.categorias.find((c) => c.nome === fixo.categoriaNome && c.tipo === 'despesa')?.id : ''
  const [f, setF] = useState({
    descricao: fixo.descricao || '',
    categoria_id: catInicial || '',
    escopo: escopoInicial,
    modo: 'unica',
    valor: '',
    primeiro: dataISO(),
    quantidade: '12',
    dia: '10',
    meses: [],
    temEntrada: false,
    entradaValor: '',
    entradaData: dataISO(),
  })
  const [valoresCustom, setValoresCustom] = useState({})
  const [salvando, setSalvando] = useState(false)
  const mudar = (c) => (e) => setF({ ...f, [c]: e.target.value })
  const opcoesMeses = useMemo(() => Array.from({ length: 30 }, (_, i) => somarMeses(mesAtual(), i)), [])

  const vencimentos = gerarVencimentos({
    modo: f.modo,
    primeiro: f.primeiro,
    quantidade: Math.max(1, Math.min(parseInt(f.quantidade, 10) || 1, 120)),
    meses: f.meses,
    dia: Math.max(1, Math.min(parseInt(f.dia, 10) || 1, 31)),
  })
  const valorPadrao = lerValor(f.valor)
  const valorDe = (d) => (valoresCustom[d] !== undefined ? lerValor(valoresCustom[d]) : valorPadrao)
  const totalGeral = vencimentos.reduce((s, d) => s + (valorDe(d) || 0), 0) + (f.temEntrada ? lerValor(f.entradaValor) || 0 : 0)

  async function salvar(e) {
    e.preventDefault()
    if (!f.descricao.trim()) return avisar('Coloque uma descrição.')
    if (!vencimentos.length) return avisar('Escolha pelo menos um mês.')
    if (vencimentos.some((d) => !(valorDe(d) > 0))) return avisar('Confira o valor das parcelas.')
    if (f.temEntrada && !(lerValor(f.entradaValor) > 0)) return avisar('Confira o valor da entrada.')
    setSalvando(true)
    const grupo = crypto.randomUUID()
    const total = vencimentos.length + (f.temEntrada ? 1 : 0)
    const base = {
      user_id: eu.id, escopo: f.escopo, grupo, categoria_id: f.categoria_id ? Number(f.categoria_id) : null,
      origem: fixo.origem || 'manual', origem_id: fixo.origemId || null,
    }
    const linhas = []
    if (f.temEntrada) linhas.push({ ...base, descricao: `${f.descricao.trim()} (entrada)`, valor: lerValor(f.entradaValor), vencimento: f.entradaData, parcela_num: 0, parcela_total: total })
    vencimentos.forEach((d, i) => {
      linhas.push({
        ...base,
        descricao: vencimentos.length > 1 ? `${f.descricao.trim()} (${i + 1}/${vencimentos.length})` : f.descricao.trim(),
        valor: valorDe(d), vencimento: d, parcela_num: i + 1, parcela_total: total,
      })
    })
    const { error } = await supabase.from('fin_contas_pagar').insert(linhas)
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar.')
    avisar(linhas.length > 1 ? `${linhas.length} pagamentos cadastrados.` : 'Conta cadastrada.')
    if (f.escopo === 'casal' && parceiro?.nome) {
      enviarNotificacao({ para: 'parceiro', titulo: 'Nova conta do casal', corpo: `${f.descricao.trim()}: ${brl(totalGeral)}`, url: '/financas?aba=pagar' }).catch(() => {})
    }
    aoSalvar()
  }

  return (
    <Modal titulo={titulo || 'Nova conta a pagar'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <label className="campo"><span>Descrição</span><input value={f.descricao} onChange={mudar('descricao')} placeholder="Ex.: Internet, Fotógrafo" autoFocus /></label>
        <div className="form-grade">
          <label className="campo"><span>Categoria</span>
            <select value={f.categoria_id} onChange={mudar('categoria_id')}>
              <option value="">Sem categoria</option>
              {dados.categorias.filter((c) => c.tipo === 'despesa').map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          {parceiro?.nome && !fixo.escopoFixo && (
            <label className="campo"><span>De quem</span>
              <select value={f.escopo} onChange={mudar('escopo')}>
                <option value="pessoal">Minha (pessoal)</option>
                <option value="casal">Do casal</option>
              </select>
            </label>
          )}
        </div>

        <div className="campo">
          <span>Como é o pagamento</span>
          <div className="segmentos segmentos-3">
            <button type="button" className={f.modo === 'unica' ? 'ativo' : ''} onClick={() => setF({ ...f, modo: 'unica' })}>Uma vez</button>
            <button type="button" className={f.modo === 'mensal' ? 'ativo' : ''} onClick={() => setF({ ...f, modo: 'mensal' })}>Todo mês</button>
            <button type="button" className={f.modo === 'meses' ? 'ativo' : ''} onClick={() => setF({ ...f, modo: 'meses' })}>Meses escolhidos</button>
          </div>
        </div>

        <label className="campo"><span>Valor {f.modo !== 'unica' ? 'de cada parcela' : ''}</span>
          <div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={f.valor} onChange={mudar('valor')} placeholder="0,00" /></div>
        </label>

        {f.modo !== 'meses' ? (
          <div className="form-grade">
            <label className="campo"><span>{f.modo === 'unica' ? 'Vencimento' : 'Primeiro vencimento'}</span><input type="date" value={f.primeiro} onChange={mudar('primeiro')} /></label>
            {f.modo === 'mensal' && <label className="campo"><span>Quantos meses</span><input inputMode="numeric" value={f.quantidade} onChange={mudar('quantidade')} /></label>}
          </div>
        ) : (
          <>
            <label className="campo"><span>Dia do vencimento</span><input inputMode="numeric" value={f.dia} onChange={mudar('dia')} /></label>
            <div className="campo">
              <span>Toque nos meses de pagamento</span>
              <div className="meses-grade">
                {opcoesMeses.map((m) => {
                  const ativo = f.meses.includes(m)
                  return (
                    <button key={m} type="button" className={`mes-opcao ${ativo ? 'ativo' : ''}`}
                      onClick={() => setF({ ...f, meses: ativo ? f.meses.filter((x) => x !== m) : [...f.meses, m] })}>
                      <span>{nomeMes(m, true)}</span>
                      <span className="mini-texto">{m.slice(0, 4)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        <label className="caixa-marcar">
          <input type="checkbox" checked={f.temEntrada} onChange={(e) => setF({ ...f, temEntrada: e.target.checked })} />
          <span>Tem entrada</span>
        </label>
        {f.temEntrada && (
          <div className="form-grade">
            <label className="campo"><span>Valor da entrada</span><div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={f.entradaValor} onChange={mudar('entradaValor')} /></div></label>
            <label className="campo"><span>Data da entrada</span><input type="date" value={f.entradaData} onChange={mudar('entradaData')} /></label>
          </div>
        )}

        {vencimentos.length > 1 && (
          <details className="historico">
            <summary className="pequeno">Ver parcelas ({vencimentos.length}) e mudar valores</summary>
            <ul className="lista-parcelas">
              {vencimentos.map((d, i) => (
                <li key={d}>
                  <span className="pequeno">{i + 1}ª · {dataCurta(d)}/{d.slice(2, 4)}</span>
                  <div className="entrada-valor pequena">
                    <span>R$</span>
                    <input inputMode="decimal" value={valoresCustom[d] ?? f.valor} onChange={(e) => setValoresCustom({ ...valoresCustom, [d]: e.target.value })} />
                  </div>
                </li>
              ))}
            </ul>
          </details>
        )}

        {totalGeral > 0 && <p className="pequeno">Total: <strong>{brl(totalGeral)}</strong>{vencimentos.length > 1 && ` em ${vencimentos.length + (f.temEntrada ? 1 : 0)} pagamentos`}</p>}

        <button className="botao botao-cheio botao-largo" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </form>
    </Modal>
  )
}

export function PagarConta({ conta, dados, eu, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const contas = doEscopo(dados.contas, conta.escopo, eu.id).filter((c) => c.ativa)
  const [contaId, setContaId] = useState(contas[0]?.id || '')
  const [data, setData] = useState(dataISO())
  const [valor, setValor] = useState(String(conta.valor).replace('.', ','))

  async function pagar(e) {
    e.preventDefault()
    const v = lerValor(valor)
    if (!(v > 0)) return avisar('Confira o valor.')
    const { error } = await supabase.from('fin_lancamentos').insert({
      user_id: eu.id, escopo: conta.escopo, tipo: 'despesa', descricao: conta.descricao, valor: v, data,
      categoria_id: conta.categoria_id, conta_id: contaId || null, conta_pagar_id: conta.id,
    })
    if (error) return avisar('Não foi possível registrar.')
    await supabase.from('fin_contas_pagar').update({ pago: true, pago_em: data, valor: v }).eq('id', conta.id)
    avisar('Pagamento registrado.')
    aoSalvar()
  }

  return (
    <Modal titulo={`Pagar: ${conta.descricao}`} aoFechar={aoFechar}>
      <form onSubmit={pagar} className="form-desafio">
        <label className="campo"><span>Valor pago</span><div className="entrada-valor"><span>R$</span><input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div></label>
        <div className="form-grade">
          <label className="campo"><span>Data</span><input type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
          <label className="campo"><span>Pago com</span>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)}>
              <option value="">Não informar</option>
              {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
        </div>
        <button className="botao botao-cheio botao-largo">Confirmar pagamento</button>
      </form>
    </Modal>
  )
}

export default function ContasPagar({ dados, escopo, eu, parceiro, aoMudar }) {
  const avisar = useAviso()
  const [novo, setNovo] = useState(false)
  const [pagando, setPagando] = useState(null)
  const [verPagas, setVerPagas] = useState(false)
  const hoje = dataISO()
  const todas = doEscopo(dados.contasPagar, escopo, eu.id)
  const abertas = todas.filter((c) => !c.pago)
  const atrasadas = abertas.filter((c) => c.vencimento < hoje)
  const futuras = abertas.filter((c) => c.vencimento >= hoje)
  const pagas = todas.filter((c) => c.pago).sort((a, b) => (b.pago_em || '').localeCompare(a.pago_em || '')).slice(0, 30)

  const porMes = {}
  for (const c of futuras) (porMes[mesDe(c.vencimento)] ||= []).push(c)

  async function desfazer(c) {
    if (!confirm('Desmarcar como paga? O gasto registrado também sai.')) return
    await supabase.from('fin_lancamentos').delete().eq('conta_pagar_id', c.id)
    await supabase.from('fin_contas_pagar').update({ pago: false, pago_em: null }).eq('id', c.id)
    aoMudar()
  }

  async function apagar(c) {
    const grupo = c.grupo && todas.filter((x) => x.grupo === c.grupo && !x.pago).length > 1
    const todasDoGrupo = grupo && confirm('Apagar também as outras parcelas em aberto dessa conta? (Cancelar apaga só esta)')
    if (!grupo && !confirm(`Apagar "${c.descricao}"?`)) return
    const q = supabase.from('fin_contas_pagar').delete()
    const { error } = todasDoGrupo ? await q.eq('grupo', c.grupo).eq('pago', false) : await q.eq('id', c.id)
    if (error) return avisar('Não foi possível apagar.')
    aoMudar()
  }

  const Linha = ({ c, atrasada }) => (
    <li className="lancamento conta-pagar">
      <div className="exercicio-texto">
        <span>{c.descricao}</span>
        <span className={`mini-texto ${atrasada ? 'atrasada' : 'suave'}`}>
          {atrasada ? 'Venceu' : 'Vence'} {dataCurta(c.vencimento)}
          {c.origem === 'casamento' && ' · casamento'}
          {escopo === 'casal' && c.user_id !== eu.id && ` · por ${parceiro?.nome}`}
        </span>
      </div>
      <div className="valor-coluna">
        <strong>{brl(c.valor)}</strong>
        <div className="acoes-conta">
          <button className="link mini-texto" onClick={() => apagar(c)}>apagar</button>
          <button className="botao botao-pequeno botao-cheio" onClick={() => setPagando(c)}><IconeCheck tamanho={14} /> Pagar</button>
        </div>
      </div>
    </li>
  )

  return (
    <div className="fin-pagar">
      <div className="cartao-topo">
        <p className="suave pequeno">{abertas.length ? `${abertas.length} em aberto · ${brl(abertas.reduce((s, c) => s + Number(c.valor), 0))}` : 'Nada em aberto.'}</p>
        <button className="botao botao-cheio botao-pequeno" onClick={() => setNovo(true)}><IconeMaisSimples tamanho={14} /> Conta</button>
      </div>

      {atrasadas.length > 0 && (
        <section className="cartao conta-atrasada">
          <h3 className="cartao-titulo">Atrasadas</h3>
          <ul className="lista-lancamentos">{atrasadas.map((c) => <Linha key={c.id} c={c} atrasada />)}</ul>
        </section>
      )}

      {Object.entries(porMes).map(([mes, lista]) => (
        <section key={mes} className="cartao">
          <div className="cartao-topo">
            <h3 className="cartao-titulo">{nomeMes(mes)}</h3>
            <span className="pequeno"><strong>{brl(lista.reduce((s, c) => s + Number(c.valor), 0))}</strong></span>
          </div>
          <ul className="lista-lancamentos">{lista.map((c) => <Linha key={c.id} c={c} />)}</ul>
        </section>
      ))}

      {pagas.length > 0 && (
        <section className="bloco-desafios">
          <button className="link pequeno" onClick={() => setVerPagas(!verPagas)}>{verPagas ? 'Esconder pagas' : `Ver pagas (${pagas.length})`}</button>
          {verPagas && (
            <ul className="lista-lancamentos">
              {pagas.map((c) => (
                <li key={c.id} className="lancamento">
                  <div className="exercicio-texto">
                    <span>{c.descricao}</span>
                    <span className="suave mini-texto">Paga em {dataCurta(c.pago_em || c.vencimento)}</span>
                  </div>
                  <div className="valor-coluna">
                    <strong>{brl(c.valor)}</strong>
                    <button className="link mini-texto" onClick={() => desfazer(c)}>desfazer</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {novo && <FormContaPagar dados={dados} eu={eu} parceiro={parceiro} escopoInicial={escopo} aoFechar={() => setNovo(false)} aoSalvar={() => { setNovo(false); aoMudar() }} />}
      {pagando && <PagarConta conta={pagando} dados={dados} eu={eu} aoFechar={() => setPagando(null)} aoSalvar={() => { setPagando(null); aoMudar() }} />}
    </div>
  )
}
