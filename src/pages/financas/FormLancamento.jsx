import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import { enviarNotificacao } from '../../lib/push'
import { dataISO } from '../../lib/saude'
import {
  brl, lerValor, faturaDaCompra, somarMeses, mesDe, doEscopo, gastosDoMes, porCategoria,
} from '../../lib/financas'

export async function verificarOrcamento({ dados, escopo, eu, parceiro, categoriaId, mes, valorNovo }) {
  const orc = doEscopo(dados.orcamentos, escopo, eu.id).find((o) => o.categoria_id === categoriaId)
  if (!orc) return
  const antes = porCategoria(gastosDoMes(dados, escopo, eu.id, mes))[categoriaId] || 0
  const depois = antes + valorNovo
  const limite = Number(orc.valor)
  const nome = dados.categorias.find((c) => c.id === categoriaId)?.nome || 'categoria'
  let titulo = null
  if (antes <= limite && depois > limite) titulo = `Orçamento de ${nome} estourado`
  else if (antes < limite * 0.8 && depois >= limite * 0.8 && depois <= limite) titulo = `80% do orçamento de ${nome}`
  if (!titulo) return
  const corpo = `${brl(depois)} de ${brl(limite)} neste mês${escopo === 'casal' ? ' (casal)' : ''}`
  enviarNotificacao({ para: 'eu', titulo, corpo, url: '/financas', tag: `orc-${orc.id}` }).catch(() => {})
  if (escopo === 'casal' && parceiro?.nome) enviarNotificacao({ para: 'parceiro', titulo, corpo, url: '/financas', tag: `orc-${orc.id}` }).catch(() => {})
  return `${titulo}: ${corpo}`
}

export default function FormLancamento({ dados, eu, parceiro, escopoInicial, inicial, aoFechar, aoSalvar, aoApagar }) {
  const avisar = useAviso()
  const editando = !!inicial?.id
  const [f, setF] = useState(() => ({
    tipo: inicial?.tipo || 'despesa',
    escopo: inicial?.escopo || escopoInicial || 'pessoal',
    valor: inicial ? String(inicial.valor).replace('.', ',') : '',
    descricao: inicial?.descricao || '',
    data: inicial?.data || dataISO(),
    categoria_id: inicial?.categoria_id || '',
    meio: inicial?.cartao_id ? `cartao:${inicial.cartao_id}` : inicial?.conta_id ? `conta:${inicial.conta_id}` : '',
    parcelas: '1',
    parcela_atual: '1',
    valor_parcela: 'total',
    dividir: 'nao',
    parte_outro: '',
  }))
  const [salvando, setSalvando] = useState(false)
  const mudar = (c) => (e) => setF({ ...f, [c]: e.target.value })

  const contas = doEscopo(dados.contas, f.escopo, eu.id).filter((c) => c.ativa)
  const cartoes = doEscopo(dados.cartoes, f.escopo, eu.id).filter((c) => c.ativo)
  const categorias = dados.categorias.filter((c) => c.tipo === (f.tipo === 'receita' ? 'receita' : 'despesa'))
  const [tipoMeio, idMeio] = f.meio.split(':')
  const cartao = tipoMeio === 'cartao' ? cartoes.find((c) => c.id === idMeio) : null
  const valorNum = lerValor(f.valor)
  const nParcelas = Math.max(1, parseInt(f.parcelas, 10) || 1)
  const podeDividir = f.tipo === 'despesa' && f.escopo === 'pessoal' && parceiro?.nome && !editando

  function parteOutro() {
    if (f.dividir === 'metade') return Math.round((valorNum / 2) * 100) / 100
    if (f.dividir === 'tudo') return valorNum
    if (f.dividir === 'valor') return lerValor(f.parte_outro)
    return 0
  }

  async function salvar(e) {
    e.preventDefault()
    if (!valorNum || valorNum <= 0) return avisar('Informe o valor.')
    if (!f.descricao.trim()) return avisar('Coloque uma descrição.')
    const categoriaId = f.categoria_id ? Number(f.categoria_id) : null
    const outro = podeDividir ? parteOutro() : 0
    if (podeDividir && f.dividir !== 'nao' && (!outro || outro <= 0 || outro > valorNum)) return avisar('Confira a parte do seu par.')

    setSalvando(true)
    try {
      const base = {
        user_id: eu.id,
        escopo: f.escopo,
        tipo: f.tipo,
        descricao: f.descricao.trim(),
        categoria_id: categoriaId,
        conta_id: tipoMeio === 'conta' ? idMeio : null,
        cartao_id: cartao?.id || null,
      }

      if (editando) {
        const { error } = await supabase.from('fin_lancamentos').update({
          ...base,
          valor: valorNum,
          data: f.data,
          fatura_mes: cartao ? (inicial.cartao_id === cartao.id && inicial.fatura_mes ? inicial.fatura_mes : faturaDaCompra(f.data, cartao)) : null,
        }).eq('id', inicial.id)
        if (error) throw error
        avisar('Lançamento atualizado.')
        aoSalvar()
        return
      }

      // Parcelado no cartão: cria uma linha por parcela restante
      if (cartao && f.tipo === 'despesa' && nParcelas > 1) {
        const atual = Math.min(Math.max(parseInt(f.parcela_atual, 10) || 1, 1), nParcelas)
        const valorParcela = f.valor_parcela === 'parcela' ? valorNum : Math.round((valorNum / nParcelas) * 100) / 100
        const fatura0 = faturaDaCompra(f.data, cartao)
        const grupo = crypto.randomUUID()
        const fracOutro = outro ? outro / valorNum : 0
        const linhas = []
        for (let p = atual; p <= nParcelas; p++) {
          linhas.push({
            ...base,
            valor: valorParcela,
            valor_terceiros: Math.round(valorParcela * fracOutro * 100) / 100,
            data: f.data,
            fatura_mes: somarMeses(fatura0, p - atual),
            grupo_parcela: grupo,
            parcela_num: p,
            parcela_total: nParcelas,
            descricao: `${f.descricao.trim()} (${p}/${nParcelas})`,
          })
        }
        const { data: criados, error } = await supabase.from('fin_lancamentos').insert(linhas).select()
        if (error) throw error
        if (outro) {
          const divs = criados.map((l) => ({
            lancamento_id: l.id, criado_por: eu.id, pagou_por: eu.id, devedor: parceiro.id, descricao: l.descricao,
            data: l.fatura_mes, valor_total: l.valor, valor_devido: l.valor_terceiros, categoria_id: categoriaId,
          }))
          const { error: e2 } = await supabase.from('fin_divisoes').insert(divs)
          if (e2) throw e2
        }
        avisar(`${linhas.length} ${linhas.length === 1 ? 'parcela lançada' : 'parcelas lançadas'} de ${brl(valorParcela)}.`)
      } else {
        const { data: criado, error } = await supabase.from('fin_lancamentos').insert({
          ...base,
          valor: valorNum,
          valor_terceiros: outro,
          data: f.data,
          fatura_mes: cartao ? faturaDaCompra(f.data, cartao) : null,
        }).select().single()
        if (error) throw error
        if (outro) {
          const { error: e2 } = await supabase.from('fin_divisoes').insert({
            lancamento_id: criado.id, criado_por: eu.id, pagou_por: eu.id, devedor: parceiro.id, descricao: criado.descricao,
            data: criado.data, valor_total: valorNum, valor_devido: outro, categoria_id: categoriaId,
          })
          if (e2) throw e2
          enviarNotificacao({
            para: 'parceiro',
            titulo: `${eu.nome} dividiu um gasto com você`,
            corpo: `${criado.descricao}: sua parte é ${brl(outro)}`,
            url: '/financas?aba=acertos',
          }).catch(() => {})
        }
        avisar(f.tipo === 'receita' ? 'Entrada registrada.' : 'Gasto registrado.')
      }

      if (f.tipo === 'despesa' && categoriaId) {
        const minhaParte = valorNum - (outro || 0)
        const msg = await verificarOrcamento({ dados, escopo: f.escopo, eu, parceiro, categoriaId, mes: mesDe(f.data), valorNovo: f.escopo === 'pessoal' ? minhaParte : valorNum })
        if (msg) avisar(msg, { duracao: 6000 })
      }
      aoSalvar()
    } catch (err) {
      console.error(err)
      avisar('Não foi possível salvar.')
    }
    setSalvando(false)
  }

  return (
    <Modal titulo={editando ? 'Editar lançamento' : 'Novo lançamento'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-desafio">
        <div className="segmentos segmentos-2">
          <button type="button" className={f.tipo === 'despesa' ? 'ativo' : ''} onClick={() => setF({ ...f, tipo: 'despesa', categoria_id: '' })}>Gasto</button>
          <button type="button" className={f.tipo === 'receita' ? 'ativo' : ''} onClick={() => setF({ ...f, tipo: 'receita', categoria_id: '', dividir: 'nao', parcelas: '1' })}>Entrada</button>
        </div>

        <label className="campo campo-valor">
          <span>Valor {nParcelas > 1 && cartao ? (f.valor_parcela === 'parcela' ? 'de cada parcela' : 'total da compra') : ''}</span>
          <div className="entrada-valor">
            <span>R$</span>
            <input inputMode="decimal" value={f.valor} onChange={mudar('valor')} placeholder="0,00" autoFocus={!editando} />
          </div>
        </label>

        <label className="campo"><span>Descrição</span><input value={f.descricao} onChange={mudar('descricao')} placeholder={f.tipo === 'receita' ? 'Ex.: Salário' : 'Ex.: Jantar no shopping'} /></label>

        <div className="form-grade">
          <label className="campo"><span>Data</span><input type="date" value={f.data} onChange={mudar('data')} /></label>
          <label className="campo">
            <span>Categoria</span>
            <select value={f.categoria_id} onChange={mudar('categoria_id')}>
              <option value="">Sem categoria</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
        </div>

        {parceiro?.nome && !editando && (
          <div className="campo">
            <span>Esse lançamento é</span>
            <div className="segmentos segmentos-2">
              <button type="button" className={f.escopo === 'pessoal' ? 'ativo' : ''} onClick={() => setF({ ...f, escopo: 'pessoal', meio: '' })}>Meu (pessoal)</button>
              <button type="button" className={f.escopo === 'casal' ? 'ativo' : ''} onClick={() => setF({ ...f, escopo: 'casal', meio: '', dividir: 'nao' })}>Do casal</button>
            </div>
          </div>
        )}

        <label className="campo">
          <span>{f.tipo === 'receita' ? 'Entrou em' : 'Pago com'}</span>
          <select value={f.meio} onChange={mudar('meio')}>
            <option value="">Não informar</option>
            {contas.length > 0 && (
              <optgroup label="Contas">
                {contas.map((c) => <option key={c.id} value={`conta:${c.id}`}>{c.nome}</option>)}
              </optgroup>
            )}
            {f.tipo === 'despesa' && cartoes.length > 0 && (
              <optgroup label="Cartões de crédito">
                {cartoes.map((c) => <option key={c.id} value={`cartao:${c.id}`}>{c.nome}</option>)}
              </optgroup>
            )}
          </select>
          {!contas.length && !cartoes.length && <span className="suave mini-texto">Cadastre suas contas e cartões na aba Contas.</span>}
        </label>

        {cartao && f.tipo === 'despesa' && !editando && (
          <div className="caixa-opcoes">
            <div className="form-grade">
              <label className="campo"><span>Parcelas</span><input inputMode="numeric" value={f.parcelas} onChange={mudar('parcelas')} /></label>
              {nParcelas > 1 && (
                <label className="campo"><span>Parcela atual</span><input inputMode="numeric" value={f.parcela_atual} onChange={mudar('parcela_atual')} /></label>
              )}
            </div>
            {nParcelas > 1 && (
              <>
                <div className="segmentos segmentos-2">
                  <button type="button" className={f.valor_parcela === 'total' ? 'ativo' : ''} onClick={() => setF({ ...f, valor_parcela: 'total' })}>Valor é o total</button>
                  <button type="button" className={f.valor_parcela === 'parcela' ? 'ativo' : ''} onClick={() => setF({ ...f, valor_parcela: 'parcela' })}>Valor é a parcela</button>
                </div>
                <p className="suave pequeno">
                  {valorNum > 0 && `${nParcelas}x de ${brl(f.valor_parcela === 'parcela' ? valorNum : valorNum / nParcelas)}. `}
                  Compra antiga? Coloque a parcela em que está (ex.: 8 de 12) e o app lança só as que faltam a partir da próxima fatura.
                </p>
              </>
            )}
          </div>
        )}

        {podeDividir && (
          <div className="caixa-opcoes">
            <span className="pequeno">Dividir com {parceiro.nome}?</span>
            <div className="chips">
              {[['nao', 'Não'], ['metade', 'Metade'], ['valor', `Parte de ${parceiro.nome}`], ['tudo', `Tudo de ${parceiro.nome}`]].map(([v, n]) => (
                <button key={v} type="button" className={`chip ${f.dividir === v ? 'ativo' : ''}`} onClick={() => setF({ ...f, dividir: v })}>{n}</button>
              ))}
            </div>
            {f.dividir === 'valor' && (
              <label className="campo"><span>Parte de {parceiro.nome} (R$)</span><input inputMode="decimal" value={f.parte_outro} onChange={mudar('parte_outro')} /></label>
            )}
            {f.dividir !== 'nao' && valorNum > 0 && (
              <p className="suave pequeno">
                Sua parte: {brl(valorNum - (parteOutro() || 0))} · {parceiro.nome} fica te devendo {brl(parteOutro() || 0)}
              </p>
            )}
          </div>
        )}

        <button className="botao botao-cheio botao-largo" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        {editando && aoApagar && (
          <button type="button" className="botao botao-texto botao-largo" onClick={() => aoApagar(inicial)}>
            Apagar {inicial.grupo_parcela ? 'parcela' : 'lançamento'}
          </button>
        )}
      </form>
    </Modal>
  )
}
