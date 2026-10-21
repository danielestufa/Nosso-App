import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { IconeVoltar, IconeSeta } from '../../components/Icones'
import { dataISO, somarDias, rotuloData } from '../../lib/saude'
import Hoje from './Hoje'
import Corpo from './Corpo'
import Metas from './Metas'
import Balanco from './Balanco'

const ABAS = [
  ['dia', 'Dia'],
  ['balanco', 'Balanço'],
  ['corpo', 'Corpo'],
  ['metas', 'Metas'],
]

export default function Saude() {
  const { perfil, parceiro } = useAuth()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(dataISO())

  const aba = params.get('aba') || 'dia'
  const quem = params.get('quem') === 'par' && parceiro?.nome ? 'par' : 'eu'
  const pessoa = quem === 'par' ? parceiro : perfil
  const editavel = quem === 'eu'

  const mudar = (chave, valor) => {
    const novo = new URLSearchParams(params)
    novo.set(chave, valor)
    setParams(novo, { replace: true })
  }

  const hoje = dataISO()

  return (
    <div className="saude">
      <header className="cabecalho cabecalho-linha">
        <h1 className="titulo-pagina">Saúde</h1>
        {parceiro?.nome && (
          <div className="segmentos segmentos-pessoas" role="radiogroup" aria-label="Ver dados de">
            <button className={quem === 'eu' ? 'ativo' : ''} onClick={() => mudar('quem', 'eu')}>{perfil.nome}</button>
            <button className={quem === 'par' ? 'ativo' : ''} onClick={() => mudar('quem', 'par')}>{parceiro.nome}</button>
          </div>
        )}
      </header>

      <nav className="abas">
        {ABAS.filter(([id]) => id !== 'metas' || editavel).map(([id, nome]) => (
          <button key={id} className={aba === id ? 'ativo' : ''} onClick={() => mudar('aba', id)}>
            {nome}
          </button>
        ))}
      </nav>

      {aba === 'dia' && (
        <>
          <div className="navegar-data">
            <button className="botao-icone" onClick={() => setData(somarDias(data, -1))} aria-label="Dia anterior">
              <IconeVoltar tamanho={20} />
            </button>
            <button className="navegar-data-rotulo" onClick={() => setData(hoje)}>
              {rotuloData(data)}
            </button>
            <button
              className="botao-icone"
              onClick={() => setData(somarDias(data, 1))}
              disabled={data >= hoje}
              aria-label="Próximo dia"
            >
              <IconeSeta tamanho={20} />
            </button>
          </div>
          {!editavel && <p className="faixa-leve">Você está vendo o dia de {pessoa.nome}.</p>}
          <Hoje key={`${pessoa.id}-${data}`} pessoa={pessoa} eu={perfil} data={data} editavel={editavel} />
        </>
      )}

      {aba === 'balanco' && <Balanco key={pessoa.id} pessoa={pessoa} editavel={editavel} irParaMetas={() => mudar('aba', 'metas')} />}
      {aba === 'corpo' && <Corpo key={pessoa.id} pessoa={pessoa} editavel={editavel} />}
      {aba === 'metas' && editavel && <Metas usuarioId={perfil.id} />}
    </div>
  )
}
