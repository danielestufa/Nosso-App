import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import Livros from './Livros'
import Biblia from './Biblia'

export default function Leitura() {
  const { perfil, parceiro } = useAuth()
  const [params, setParams] = useSearchParams()
  const temPar = !!parceiro?.nome
  const aba = params.get('aba') === 'biblia' ? 'biblia' : 'livros'
  const quem = params.get('quem') === 'par' && temPar ? 'par' : 'eu'
  const pessoa = quem === 'par' ? parceiro : perfil
  const editavel = quem === 'eu'

  const mudar = (k, v) => {
    const novo = new URLSearchParams(params)
    novo.set(k, v)
    setParams(novo, { replace: true })
  }

  return (
    <div className="leitura saude">
      <header className="cabecalho cabecalho-linha">
        <h1 className="titulo-pagina">Leitura</h1>
        {temPar && (
          <div className="segmentos segmentos-pessoas" role="radiogroup" aria-label="Ver leitura de">
            <button className={quem === 'eu' ? 'ativo' : ''} onClick={() => mudar('quem', 'eu')}>{perfil.nome}</button>
            <button className={quem === 'par' ? 'ativo' : ''} onClick={() => mudar('quem', 'par')}>{parceiro.nome}</button>
          </div>
        )}
      </header>

      <nav className="abas">
        <button className={aba === 'livros' ? 'ativo' : ''} onClick={() => mudar('aba', 'livros')}>Livros</button>
        <button className={aba === 'biblia' ? 'ativo' : ''} onClick={() => mudar('aba', 'biblia')}>Bíblia</button>
      </nav>

      {!editavel && <p className="faixa-leve">Você está vendo a leitura de {pessoa.nome}.</p>}

      {aba === 'livros' && <Livros key={pessoa.id} pessoa={pessoa} eu={perfil} parceiro={parceiro} editavel={editavel} />}
      {aba === 'biblia' && <Biblia key={pessoa.id} pessoa={pessoa} eu={perfil} parceiro={parceiro} editavel={editavel} />}
    </div>
  )
}
