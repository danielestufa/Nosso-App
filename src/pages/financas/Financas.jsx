import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { IconeMaisSimples, IconeVoltar, IconeSeta } from '../../components/Icones'
import { carregarFinancas, ouvirFinancas, mesAtual, somarMeses, nomeMes, saldoEntreNos } from '../../lib/financas'
import Resumo from './Resumo'
import Lancamentos from './Lancamentos'
import ContasCartoes from './ContasCartoes'
import ContasPagar from './ContasPagar'
import Caixinhas from './Caixinhas'
import Acertos from './Acertos'
import FormLancamento from './FormLancamento'

const ABAS = [
  ['resumo', 'Resumo'],
  ['lancamentos', 'Lançamentos'],
  ['contas', 'Contas e cartões'],
  ['pagar', 'A pagar'],
  ['caixinhas', 'Caixinhas'],
  ['acertos', 'Acertos'],
]

export default function Financas() {
  const { perfil, parceiro } = useAuth()
  const [params, setParams] = useSearchParams()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(false)
  const [mes, setMes] = useState(mesAtual())
  const [novo, setNovo] = useState(false)

  const aba = ABAS.some(([id]) => id === params.get('aba')) ? params.get('aba') : 'resumo'
  const escopo = params.get('de') === 'casal' && parceiro?.nome ? 'casal' : 'pessoal'

  const mudar = (k, v) => {
    const novoP = new URLSearchParams(params)
    novoP.set(k, v)
    setParams(novoP, { replace: true })
  }

  const carregar = useCallback(async () => {
    try {
      setDados(await carregarFinancas())
      setErro(false)
    } catch (e) {
      console.error(e)
      setErro(true)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => ouvirFinancas('pagina', () => carregar()), [carregar])

  if (erro) return <p className="suave">Não foi possível carregar as finanças. Confira se o código da fase 6 foi rodado no Supabase.</p>
  if (!dados) return <div className="carregando-bloco"><div className="carregando" /></div>

  const comMes = ['resumo', 'lancamentos'].includes(aba)
  const semEscopo = aba === 'acertos'
  const entreNos = parceiro?.nome ? saldoEntreNos(dados, perfil.id) : 0
  const props = { dados, escopo, eu: perfil, parceiro, mes, aoMudar: carregar, irPara: (a) => mudar('aba', a) }

  return (
    <div className="financas saude">
      <header className="cabecalho cabecalho-linha">
        <h1 className="titulo-pagina">Finanças</h1>
        {parceiro?.nome && !semEscopo && (
          <div className="segmentos segmentos-pessoas" role="radiogroup" aria-label="Finanças">
            <button className={escopo === 'pessoal' ? 'ativo' : ''} onClick={() => mudar('de', 'pessoal')}>Minhas</button>
            <button className={escopo === 'casal' ? 'ativo' : ''} onClick={() => mudar('de', 'casal')}>Do casal</button>
          </div>
        )}
      </header>

      <nav className="abas abas-rolagem">
        {ABAS.filter(([id]) => id !== 'acertos' || parceiro?.nome).map(([id, nome]) => (
          <button key={id} className={aba === id ? 'ativo' : ''} onClick={() => mudar('aba', id)}>
            {nome}
            {id === 'acertos' && entreNos !== 0 && <span className="ponto-aviso" aria-label="Tem valores em aberto" />}
          </button>
        ))}
      </nav>

      {escopo === 'pessoal' && !semEscopo && <p className="faixa-leve">Só você vê as suas finanças pessoais.</p>}

      {comMes && (
        <div className="navegar-data">
          <button className="botao-icone" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior"><IconeVoltar tamanho={20} /></button>
          <button className="navegar-data-rotulo" onClick={() => setMes(mesAtual())}>{nomeMes(mes)}</button>
          <button className="botao-icone" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês"><IconeSeta tamanho={20} /></button>
        </div>
      )}

      {aba === 'resumo' && <Resumo {...props} />}
      {aba === 'lancamentos' && <Lancamentos {...props} />}
      {aba === 'contas' && <ContasCartoes {...props} />}
      {aba === 'pagar' && <ContasPagar {...props} />}
      {aba === 'caixinhas' && <Caixinhas {...props} />}
      {aba === 'acertos' && <Acertos {...props} />}

      {['resumo', 'lancamentos', 'contas'].includes(aba) && (
        <button className="botao-flutuante" onClick={() => setNovo(true)} aria-label="Novo lançamento">
          <IconeMaisSimples tamanho={24} />
        </button>
      )}

      {novo && (
        <FormLancamento dados={dados} eu={perfil} parceiro={parceiro} escopoInicial={escopo}
          aoFechar={() => setNovo(false)} aoSalvar={() => { setNovo(false); carregar() }} />
      )}

    </div>
  )
}
