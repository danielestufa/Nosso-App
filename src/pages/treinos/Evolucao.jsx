import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ImagemExercicio from '../../components/ImagemExercicio'
import { dataISO, somarDias, num } from '../../lib/saude'
import { DIAS_CURTOS } from '../../lib/treinos'

const dataCurta = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function Grafico({ pontos, unidade }) {
  if (pontos.length < 2) return <p className="suave pequeno">Treine este exercício mais vezes para ver o gráfico.</p>
  const L = 600
  const A = 180
  const m = { e: 40, d: 12, t: 14, b: 24 }
  const vals = pontos.map((p) => p.valor)
  let min = Math.min(...vals)
  let max = Math.max(...vals)
  if (min === max) { min -= 1; max += 1 }
  const x = (i) => m.e + (i / (pontos.length - 1)) * (L - m.e - m.d)
  const y = (v) => m.t + (1 - (v - min) / (max - min)) * (A - m.t - m.b)
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="grafico-peso" role="img" aria-label="Evolução">
      {[min, (min + max) / 2, max].map((v) => (
        <g key={v}>
          <line x1={m.e} x2={L - m.d} y1={y(v)} y2={y(v)} stroke="var(--linha)" />
          <text x={m.e - 6} y={y(v) + 4} textAnchor="end" className="grafico-texto">{num(v, 1)}</text>
        </g>
      ))}
      <polyline points={pontos.map((p, i) => `${x(i)},${y(p.valor)}`).join(' ')} fill="none" stroke="var(--linha-forte)" strokeWidth="2" strokeLinejoin="round" />
      {pontos.map((p, i) => (
        <circle key={p.data} cx={x(i)} cy={y(p.valor)} r="3.5" fill="var(--fundo)" stroke="var(--linha-forte)" strokeWidth="2">
          <title>{`${dataCurta(p.data)}: ${num(p.valor, 1)} ${unidade}`}</title>
        </circle>
      ))}
      <text x={m.e} y={A - 4} className="grafico-texto">{dataCurta(pontos[0].data)}</text>
      <text x={L - m.d} y={A - 4} textAnchor="end" className="grafico-texto">{dataCurta(pontos[pontos.length - 1].data)}</text>
    </svg>
  )
}

export default function Evolucao({ pessoa }) {
  const [series, setSeries] = useState(null)
  const [treinos, setTreinos] = useState([])
  const [escolhido, setEscolhido] = useState(null)

  useEffect(() => {
    const inicio = somarDias(dataISO(), -27)
    Promise.all([
      supabase.from('series_registradas').select('*, exercicios(id, nome, imagem, tipo)').eq('user_id', pessoa.id).order('data').limit(3000),
      supabase.from('treinos_realizados').select('data, concluido_em, titulo').eq('user_id', pessoa.id).gte('data', inicio),
    ]).then(([s, t]) => {
      setSeries(s.data || [])
      setTreinos(t.data || [])
    })
  }, [pessoa.id])

  const porExercicio = useMemo(() => {
    const mapa = {}
    for (const s of series || []) {
      const ex = s.exercicios
      if (!ex) continue
      const g = (mapa[ex.id] ||= { ex, datas: {} })
      const d = (g.datas[s.data] ||= { data: s.data, carga: 0, volume: 0, minutos: 0, series: [] })
      d.series.push(s)
      d.carga = Math.max(d.carga, Number(s.carga_kg || 0))
      d.volume += Number(s.carga_kg || 0) * Number(s.repeticoes || 0)
      d.minutos += Number(s.minutos || 0)
    }
    return Object.values(mapa)
      .map((g) => ({ ...g, lista: Object.values(g.datas).sort((a, b) => a.data.localeCompare(b.data)) }))
      .sort((a, b) => b.lista[b.lista.length - 1].data.localeCompare(a.lista[a.lista.length - 1].data))
  }, [series])

  if (!series) return <div className="carregando-bloco"><div className="carregando" /></div>

  // Calendário das últimas 4 semanas
  const hoje = dataISO()
  const dias = Array.from({ length: 28 }, (_, i) => somarDias(hoje, i - 27))
  const feitos = new Set(treinos.filter((t) => t.concluido_em).map((t) => t.data))
  const iniciados = new Set(treinos.map((t) => t.data))
  const semanaAtual = dias.slice(-7).filter((d) => feitos.has(d)).length
  const atual = escolhido ? porExercicio.find((g) => g.ex.id === escolhido) : null
  const cardio = atual?.ex.tipo === 'cardio'

  return (
    <div className="evolucao">
      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Últimas 4 semanas</h3>
          <span className="pequeno"><strong>{semanaAtual}</strong> <span className="suave">treinos nos últimos 7 dias</span></span>
        </div>
        <div className="calendario">
          {dias.slice(0, 7).map((d) => {
            const [a, m, dd] = d.split('-').map(Number)
            return <span key={`c-${d}`} className="calendario-cab">{DIAS_CURTOS[new Date(a, m - 1, dd).getDay()][0]}</span>
          })}
          {dias.map((d) => (
            <span
              key={d}
              className={`calendario-dia ${feitos.has(d) ? 'feito' : iniciados.has(d) ? 'iniciado' : ''} ${d === hoje ? 'hoje' : ''}`}
              title={dataCurta(d)}
            >
              {Number(d.slice(8))}
            </span>
          ))}
        </div>
        <p className="suave pequeno">Preenchido = treino concluído. Contorno = começou e não concluiu.</p>
      </section>

      {atual ? (
        <section className="cartao">
          <button className="link-voltar" onClick={() => setEscolhido(null)}>← Todos os exercícios</button>
          <div className="cartao-topo">
            <h3 className="cartao-titulo">{atual.ex.nome}</h3>
          </div>
          <ImagemExercicio imagem={atual.ex.imagem} nome={atual.ex.nome} />
          <p className="rotulo">{cardio ? 'Minutos por dia' : 'Maior carga por dia (kg)'}</p>
          <Grafico pontos={atual.lista.map((d) => ({ data: d.data, valor: cardio ? d.minutos : d.carga }))} unidade={cardio ? 'min' : 'kg'} />
          <ul className="historico-series">
            {[...atual.lista].reverse().map((d) => (
              <li key={d.data}>
                <strong className="pequeno">{dataCurta(d.data)}</strong>
                <span className="pequeno suave">
                  {d.series
                    .sort((a, b) => a.serie - b.serie)
                    .map((s) => (cardio ? `${s.minutos ?? '?'} min${s.km ? ` · ${num(s.km, 1)} km` : ''}` : `${num(s.carga_kg ?? 0, 1)} kg × ${s.repeticoes ?? '?'}`))
                    .join('  ·  ')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="cartao">
          <h3 className="cartao-titulo">Evolução por exercício</h3>
          {porExercicio.length ? (
            <div className="lista-exercicios-escolher">
              {porExercicio.map((g) => {
                const ultimo = g.lista[g.lista.length - 1]
                const primeiro = g.lista[0]
                const dif = ultimo.carga - primeiro.carga
                return (
                  <button key={g.ex.id} className="exercicio-opcao" onClick={() => setEscolhido(g.ex.id)}>
                    <ImagemExercicio imagem={g.ex.imagem} nome={g.ex.nome} tamanho="mini" animar={false} />
                    <span className="exercicio-texto">
                      <strong>{g.ex.nome}</strong>
                      <span className="suave pequeno">
                        {g.ex.tipo === 'cardio'
                          ? `${g.lista.length} ${g.lista.length === 1 ? 'vez' : 'vezes'}`
                          : `${num(ultimo.carga, 1)} kg${dif ? ` · ${dif > 0 ? '+' : ''}${num(dif, 1)} kg` : ''} · ${g.lista.length} ${g.lista.length === 1 ? 'treino' : 'treinos'}`}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="suave pequeno">Os gráficos aparecem depois dos primeiros treinos registrados.</p>
          )}
        </section>
      )}
    </div>
  )
}
