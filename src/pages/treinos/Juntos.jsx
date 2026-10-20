import { useEffect, useState } from 'react'
import { useAviso } from '../../components/Aviso'
import ImagemExercicio from '../../components/ImagemExercicio'
import { dataISO } from '../../lib/saude'
import { DIAS, DIAS_CURTOS, ORDEM_SEMANA, carregarFicha, sugerirPares, salvarOrdemDoDia } from '../../lib/treinos'

function Celula({ item }) {
  if (!item) return <div className="par-celula par-vazia"><span className="suave pequeno">livre</span></div>
  const ex = item.exercicios
  return (
    <div className="par-celula">
      <ImagemExercicio imagem={ex.imagem} nome={ex.nome} tamanho="mini" animar={false} />
      <div className="exercicio-texto">
        <strong className="pequeno">{ex.nome}</strong>
        <span className="suave mini-texto">{ex.area}</span>
      </div>
    </div>
  )
}

export default function Juntos({ eu, parceiro, aoUsarOrdem }) {
  const avisar = useAviso()
  const [dia, setDia] = useState(new Date().getDay())
  const [fichas, setFichas] = useState(null)

  useEffect(() => {
    Promise.all([carregarFicha(eu.id), carregarFicha(parceiro.id)]).then(([a, b]) => setFichas({ eu: a, par: b }))
  }, [eu.id, parceiro.id])

  if (!fichas) return <div className="carregando-bloco"><div className="carregando" /></div>

  const meus = fichas.eu[dia]?.itens || []
  const deles = fichas.par[dia]?.itens || []
  const { juntos, separados } = sugerirPares(meus, deles)
  const hoje = dia === new Date().getDay()

  function usarOrdem() {
    const ordem = [...juntos, ...separados].map((p) => p.meu?.id).filter(Boolean)
    salvarOrdemDoDia(eu.id, dataISO(), ordem)
    avisar(`Ordem aplicada no seu treino de hoje. Peça para ${parceiro.nome} aplicar também.`)
    aoUsarOrdem()
  }

  return (
    <div className="juntos">
      <div className="dias-semana">
        {ORDEM_SEMANA.map((d) => (
          <button key={d} className={`dia-botao ${dia === d ? 'ativo' : ''}`} onClick={() => setDia(d)}>
            {DIAS_CURTOS[d]}
          </button>
        ))}
      </div>

      <section className="cartao">
        <div className="juntos-titulos">
          <div>
            <p className="rotulo">{eu.nome}</p>
            <strong>{fichas.eu[dia]?.titulo || 'Descanso'}</strong>
          </div>
          <div>
            <p className="rotulo">{parceiro.nome}</p>
            <strong>{fichas.par[dia]?.titulo || 'Descanso'}</strong>
          </div>
        </div>

        {!meus.length && !deles.length ? (
          <p className="suave pequeno">Os dois descansam na {DIAS[dia].toLowerCase()}.</p>
        ) : (
          <>
            {juntos.length > 0 && (
              <>
                <p className="rotulo grupo-titulo">Na mesma área ({juntos.length})</p>
                <p className="suave pequeno">Façam estes na mesma ordem para ficarem pertinho na academia.</p>
                <div className="pares">
                  {juntos.map((p, i) => (
                    <div key={i} className="par">
                      <span className="par-numero">{i + 1}</span>
                      <Celula item={p.meu} />
                      <Celula item={p.deles} />
                      <span className="par-area mini-texto">{p.meu.exercicios.area === p.deles.exercicios.area ? p.meu.exercicios.area : p.meu.exercicios.grupo}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {separados.length > 0 && (
              <>
                <p className="rotulo grupo-titulo">Cada um no seu canto ({separados.length})</p>
                <div className="pares">
                  {separados.map((p, i) => (
                    <div key={i} className="par par-separado">
                      <span className="par-numero">{juntos.length + i + 1}</span>
                      <Celula item={p.meu} />
                      <Celula item={p.deles} />
                    </div>
                  ))}
                </div>
              </>
            )}
            {hoje && meus.length > 0 && (
              <button className="botao botao-cheio botao-largo" onClick={usarOrdem}>
                Usar essa ordem no meu treino de hoje
              </button>
            )}
            {!hoje && <p className="suave pequeno">A ordem sugerida pode ser aplicada no próprio dia.</p>}
          </>
        )}
      </section>
    </div>
  )
}
