import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import TreinoHoje from './TreinoHoje'
import Ficha from './Ficha'
import Juntos from './Juntos'
import Evolucao from './Evolucao'

const ABAS = [
  ['hoje', 'Hoje'],
  ['ficha', 'Ficha'],
  ['juntos', 'Juntos'],
  ['evolucao', 'Evolução'],
]

export default function Treinos() {
  const { perfil, parceiro } = useAuth()
  const [params, setParams] = useSearchParams()
  const [diaFicha, setDiaFicha] = useState(null)
  const [versao, setVersao] = useState(0)

  const temPar = !!parceiro?.nome
  const aba = params.get('aba') || 'hoje'
  const quem = params.get('quem') === 'par' && temPar ? 'par' : 'eu'
  const pessoa = quem === 'par' ? parceiro : perfil
  const editavel = quem === 'eu'

  const mudar = (campos) => {
    const novo = new URLSearchParams(params)
    for (const [k, v] of Object.entries(campos)) novo.set(k, v)
    setParams(novo, { replace: true })
  }

  const abas = ABAS.filter(([id]) => id !== 'juntos' || temPar)

  return (
    <div className="treinos saude">
      <header className="cabecalho cabecalho-linha">
        <h1 className="titulo-pagina">Treinos</h1>
        {temPar && aba !== 'juntos' && (
          <div className="segmentos segmentos-pessoas" role="radiogroup" aria-label="Ver treino de">
            <button className={quem === 'eu' ? 'ativo' : ''} onClick={() => mudar({ quem: 'eu' })}>{perfil.nome}</button>
            <button className={quem === 'par' ? 'ativo' : ''} onClick={() => mudar({ quem: 'par' })}>{parceiro.nome}</button>
          </div>
        )}
      </header>

      <nav className="abas">
        {abas.map(([id, nome]) => (
          <button key={id} className={aba === id ? 'ativo' : ''} onClick={() => mudar({ aba: id })}>{nome}</button>
        ))}
      </nav>

      {!editavel && aba !== 'juntos' && <p className="faixa-leve">Você está vendo o treino de {pessoa.nome}.</p>}

      {aba === 'hoje' && (
        <TreinoHoje
          key={`${pessoa.id}-${versao}`}
          pessoa={pessoa}
          eu={perfil}
          parceiro={parceiro}
          editavel={editavel}
          aoIrParaFicha={(dia) => { setDiaFicha(dia); mudar({ aba: 'ficha' }) }}
        />
      )}
      {aba === 'ficha' && <Ficha key={pessoa.id} pessoa={pessoa} editavel={editavel} diaInicial={diaFicha} />}
      {aba === 'juntos' && temPar && (
        <Juntos eu={perfil} parceiro={parceiro} aoUsarOrdem={() => { setVersao((v) => v + 1); mudar({ aba: 'hoje', quem: 'eu' }) }} />
      )}
      {aba === 'evolucao' && <Evolucao key={pessoa.id} pessoa={pessoa} />}
    </div>
  )
}
