import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import { rotuloData } from '../../lib/saude'
import { brl, doEscopo, noMes, gastosDoMes } from '../../lib/financas'
import FormLancamento from './FormLancamento'

export default function Lancamentos({ dados, escopo, eu, parceiro, mes, aoMudar }) {
  const avisar = useAviso()
  const [filtro, setFiltro] = useState('todos')
  const [editando, setEditando] = useState(null)

  const nomeCat = (id) => dados.categorias.find((c) => c.id === id)?.nome
  const meio = (l) => {
    if (l.cartao_id) return dados.cartoes.find((c) => c.id === l.cartao_id)?.nome
    if (l.conta_id) return dados.contas.find((c) => c.id === l.conta_id)?.nome
    return null
  }
  const nome = (id) => (id === eu.id ? 'você' : parceiro?.nome)

  const proprios = doEscopo(dados.lancamentos, escopo, eu.id)
    .filter((l) => noMes(l.data, mes) && l.tipo !== 'ajuste')
    .map((l) => ({ id: l.id, data: l.data, tipo: l.tipo, l }))
  const divididos = gastosDoMes(dados, escopo, eu.id, mes)
    .filter((g) => g.origem === 'divisao' && (escopo === 'casal' || g.ref.pagou_por !== eu.id))
    .map((g) => ({ id: g.id, data: g.data, tipo: 'divisao', g }))

  let itens = [...proprios, ...divididos]
  if (filtro === 'gastos') itens = itens.filter((i) => i.tipo === 'despesa' || i.tipo === 'divisao' || i.tipo === 'fatura')
  if (filtro === 'entradas') itens = itens.filter((i) => i.tipo === 'receita')
  if (filtro === 'divididos') itens = itens.filter((i) => i.tipo === 'divisao' || Number(i.l?.valor_terceiros) > 0)
  itens.sort((a, b) => b.data.localeCompare(a.data))

  const porDia = {}
  for (const i of itens) (porDia[i.data] ||= []).push(i)

  async function apagar(l) {
    if (l.grupo_parcela) {
      const todas = confirm('Apagar todas as parcelas desta compra? (Cancelar apaga só esta)')
      const q = supabase.from('fin_lancamentos').delete()
      const { error } = todas ? await q.eq('grupo_parcela', l.grupo_parcela) : await q.eq('id', l.id)
      if (error) return avisar('Não foi possível apagar.')
    } else {
      if (!confirm(`Apagar "${l.descricao}"?`)) return
      const { error } = await supabase.from('fin_lancamentos').delete().eq('id', l.id)
      if (error) return avisar('Não foi possível apagar.')
    }
    setEditando(null)
    aoMudar()
  }

  return (
    <div className="fin-lancamentos">
      <div className="chips">
        {[['todos', 'Todos'], ['gastos', 'Gastos'], ['entradas', 'Entradas'], ['divididos', 'Divididos']].map(([v, n]) => (
          <button key={v} className={`chip ${filtro === v ? 'ativo' : ''}`} onClick={() => setFiltro(v)}>{n}</button>
        ))}
      </div>

      {!itens.length && <p className="suave pequeno">Nenhum lançamento neste mês.</p>}

      {Object.entries(porDia).map(([dia, lista]) => (
        <section key={dia} className="dia-lancamentos">
          <p className="rotulo dia-rotulo">{rotuloData(dia)}</p>
          <ul className="lista-lancamentos">
            {lista.map((i) => {
              if (i.tipo === 'divisao') {
                const d = i.g.ref
                return (
                  <li key={i.id} className="lancamento">
                    <div className="exercicio-texto">
                      <span>{d.descricao}</span>
                      <span className="suave mini-texto">
                        {nomeCat(d.categoria_id) || 'Dividido'} · pago por {nome(d.pagou_por)}
                        {escopo === 'casal' ? ` · ${nome(d.devedor)} deve ${brl(d.valor_devido)}` : ` · total ${brl(d.valor_total)}`}
                        {d.acertado && ' · acertado'}
                      </span>
                    </div>
                    <strong className="valor-negativo">-{brl(i.g.valor)}</strong>
                  </li>
                )
              }
              const l = i.l
              const sinal = l.tipo === 'receita' ? '+' : '-'
              return (
                <li key={i.id} className="lancamento" role="button" tabIndex={0} onClick={() => l.tipo !== 'fatura' && setEditando(l)}
                  onKeyDown={(e) => e.key === 'Enter' && l.tipo !== 'fatura' && setEditando(l)}>
                  <div className="exercicio-texto">
                    <span>{l.descricao}</span>
                    <span className="suave mini-texto">
                      {[l.tipo === 'fatura' ? 'Pagamento de fatura' : nomeCat(l.categoria_id), meio(l), escopo === 'casal' && `por ${nome(l.user_id)}`,
                        Number(l.valor_terceiros) > 0 && `${parceiro?.nome} deve ${brl(l.valor_terceiros)}`]
                        .filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <strong className={l.tipo === 'receita' ? 'valor-positivo' : 'valor-negativo'}>{sinal}{brl(l.valor)}</strong>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {editando && (
        <FormLancamento
          dados={dados}
          eu={eu}
          parceiro={parceiro}
          inicial={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => { setEditando(null); aoMudar() }}
          aoApagar={apagar}
        />
      )}
    </div>
  )
}
