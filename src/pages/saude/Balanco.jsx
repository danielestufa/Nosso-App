import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import { carregarBalanco, carregarMetas, dataISO, num, KCAL_POR_KG, ouvirSaude } from '../../lib/saude'

const dataCurta = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function Balanco({ pessoa, editavel, irParaMetas }) {
  const avisar = useAviso()
  const [periodo, setPeriodo] = useState(7)
  const [dados, setDados] = useState(null)
  const [metas, setMetas] = useState(null)
  const [peso, setPeso] = useState('')

  const carregar = useCallback(async () => {
    const [b, m] = await Promise.all([carregarBalanco(pessoa.id, dataISO(), periodo), carregarMetas(pessoa.id)])
    setDados(b)
    setMetas(m)
  }, [pessoa.id, periodo])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => ouvirSaude(`balanco-${pessoa.id}`, () => carregar(), ['refeicao_itens', 'dia_saude', 'medidas']), [carregar, pessoa.id])

  async function registrarPeso(e) {
    e.preventDefault()
    const v = Number(String(peso).replace(',', '.'))
    if (!v || v < 20 || v > 400) return avisar('Confira o peso.')
    const { error } = await supabase.from('medidas').insert({ user_id: pessoa.id, data: dataISO(), peso_kg: v })
    if (error) return avisar('Não foi possível salvar.')
    setPeso('')
    avisar('Peso registrado.')
    carregar()
  }

  if (!dados || !metas) return <div className="carregando-bloco"><div className="carregando" /></div>

  const basal = Number(metas.gasto_basal || 0)
  const hoje = dataISO()
  // Hoje entra só se já tiver refeição registrada; dias sem comida registrada ficam de fora
  const validos = dados.dias.filter((d) => d.temComida)
  const linhas = dados.dias.map((d) => ({ ...d, gasto: basal + d.exercicio, saldo: d.ingerido - (basal + d.exercicio) }))
  const totalIngerido = validos.reduce((t, d) => t + d.ingerido, 0)
  const totalGasto = validos.reduce((t, d) => t + basal + d.exercicio, 0)
  const saldoTotal = totalIngerido - totalGasto
  const kgEstimado = -saldoTotal / KCAL_POR_KG
  const mediaDia = validos.length ? saldoTotal / validos.length : 0

  // Peso real no período
  const inicioPeriodo = dados.dias[0].data
  const pesosPeriodo = dados.pesos.filter((p) => p.data >= inicioPeriodo)
  const antes = [...dados.pesos].reverse().find((p) => p.data < inicioPeriodo)
  const pesoInicial = antes || pesosPeriodo[0]
  const pesoFinal = dados.pesos[dados.pesos.length - 1]
  const variacaoReal = pesoInicial && pesoFinal && pesoFinal !== pesoInicial ? Number(pesoFinal.peso_kg) - Number(pesoInicial.peso_kg) : null

  const maxAbs = Math.max(...linhas.filter((l) => l.temComida).map((l) => Math.abs(l.saldo)), 500)

  return (
    <div className="balanco">
      {!basal && (
        <p className="faixa">
          <span>
            Para o balanço funcionar, defina o gasto natural do corpo em <strong>Metas</strong>.
            {editavel && <> <button className="link" onClick={irParaMetas}>Ir para Metas</button></>}
          </span>
        </p>
      )}

      <div className="segmentos segmentos-3">
        {[7, 30, 90].map((p) => (
          <button key={p} className={periodo === p ? 'ativo' : ''} onClick={() => setPeriodo(p)}>{p} dias</button>
        ))}
      </div>

      <section className={`resultado ${saldoTotal > 0 ? 'resultado-zerado' : ''}`}>
        <p className="rotulo">Últimos {periodo} dias</p>
        <h2 className="titulo-secao">
          {saldoTotal <= 0 ? `Déficit de ${num(-saldoTotal)} kcal` : `Superávit de ${num(saldoTotal)} kcal`}
        </h2>
        <p>
          {saldoTotal <= 0
            ? `Equivale a cerca de ${num(kgEstimado, 2)} kg de gordura perdidos`
            : `Equivale a cerca de ${num(-kgEstimado, 2)} kg a mais`}
        </p>
        <p className="pequeno">
          Média de {num(Math.abs(mediaDia))} kcal {mediaDia <= 0 ? 'de déficit' : 'de superávit'} por dia · {validos.length} {validos.length === 1 ? 'dia registrado' : 'dias registrados'}
        </p>
      </section>

      <section className="fin-numeros">
        <div className="fin-numero"><span className="rotulo">Ingerido</span><strong>{num(totalIngerido)}</strong><span className="suave mini-texto">kcal</span></div>
        <div className="fin-numero"><span className="rotulo">Gasto total</span><strong>{num(totalGasto)}</strong><span className="suave mini-texto">kcal (natural + atividade)</span></div>
      </section>

      <section className="cartao">
        <h3 className="cartao-titulo">Peso</h3>
        <div className="balanco-linhas">
          <div><span>Perda estimada pelas calorias</span><strong>{saldoTotal <= 0 ? `-${num(kgEstimado, 2)} kg` : `+${num(-kgEstimado, 2)} kg`}</strong></div>
          <div>
            <span>Mudança real na balança</span>
            <strong>{variacaoReal == null ? 'registre o peso' : `${variacaoReal > 0 ? '+' : ''}${num(variacaoReal, 1)} kg`}</strong>
          </div>
          {pesoFinal && <div><span>Último peso</span><strong>{num(pesoFinal.peso_kg, 1)} kg · {dataCurta(pesoFinal.data)}</strong></div>}
        </div>
        {editavel && (
          <form className="linha-form" onSubmit={registrarPeso}>
            <label className="campo"><span>Registrar peso de hoje (kg)</span><input inputMode="decimal" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Ex.: 82,4" /></label>
            <button className="botao botao-cheio">Salvar</button>
          </form>
        )}
      </section>

      <section className="cartao">
        <h3 className="cartao-titulo">Dia a dia</h3>
        <div className="balanco-dias">
          {[...linhas].reverse().map((l) => (
            <div key={l.data} className={`balanco-dia-linha ${!l.temComida ? 'sem-registro' : ''}`}>
              <span className="mini-texto">{l.data === hoje ? 'Hoje' : dataCurta(l.data)}</span>
              <div className="balanco-barra-area">
                {l.temComida ? (
                  <div className={`balanco-barra ${l.saldo <= 0 ? 'deficit' : 'superavit'}`} style={{ width: `${(Math.abs(l.saldo) / maxAbs) * 100}%` }} />
                ) : <span className="suave mini-texto">sem refeições registradas</span>}
              </div>
              <span className="mini-texto balanco-valor">{l.temComida ? `${l.saldo <= 0 ? '-' : '+'}${num(Math.abs(l.saldo))}` : ''}</span>
            </div>
          ))}
        </div>
        <p className="legenda-calendario suave mini-texto">
          <span className="dia-desafio cumpriu" /> déficit <span className="dia-desafio falhou" /> superávit
        </p>
      </section>

      <section className="cartao info-calorias">
        <h3 className="cartao-titulo">Como o cálculo funciona</h3>
        <p className="pequeno">
          A referência mais usada é que <strong>1 kg de gordura corporal guarda cerca de 7.700 kcal</strong>. Então, um déficit de
          500 kcal por dia dá mais ou menos 3.500 kcal por semana, cerca de 0,45 kg.
        </p>
        <p className="pequeno suave">
          É uma estimativa: a balança também varia com água, intestino e glicogênio, e com o tempo o corpo passa a gastar um pouco
          menos, então a perda real costuma ficar abaixo do cálculo. Por isso vale comparar com o peso registrado toda semana, no mesmo
          horário. Dias sem refeições registradas ficam de fora da conta para não inflar o déficit.
        </p>
        <p className="mini-texto suave">
          Fonte: <a className="link" href="https://www.mdsaude.com/obesidade/calorias-para-emagrecer/" target="_blank" rel="noreferrer">MD.Saúde</a>
        </p>
      </section>
    </div>
  )
}
