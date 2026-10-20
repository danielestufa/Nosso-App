import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useAviso } from '../components/Aviso'
import { statusPush, enviarNotificacao } from '../lib/push'
import { hojeLocal, lerDataISO, diasEntre, mesesEDias, dataPorExtenso, saudacao } from '../lib/datas'
import { IconeSino, IconeSeta } from '../components/Icones'

const DATA_PADRAO = '2027-09-09'

const lembretes = [
  { id: 'agua', rotulo: 'Beber água', corpo: 'Bora beber um copo de água agora!', url: '/saude' },
  { id: 'treino', rotulo: 'Hora do treino', corpo: 'Hora do treino! Vamos juntos?', url: '/treinos' },
  { id: 'leitura', rotulo: 'Hora da leitura', corpo: 'Que tal ler umas páginas agora?', url: '/leitura' },
  { id: 'carinho', rotulo: 'Mandar um carinho', corpo: 'Tô pensando em você.', url: '/' },
]

const indicadores = ['Água', 'Calorias', 'Treino', 'Leitura']

function Contagem({ dataISO }) {
  const hoje = hojeLocal()
  const casamento = lerDataISO(dataISO)
  const dias = diasEntre(hoje, casamento)
  const { meses, dias: diasResto } = mesesEDias(hoje, casamento)
  const semanas = Math.floor(dias / 7)

  if (dias < 0) {
    return (
      <section className="contagem">
        <p className="rotulo">Casados desde</p>
        <p className="contagem-data">{dataPorExtenso(casamento)}</p>
        <p className="contagem-numero">{Math.abs(dias)}</p>
        <p className="contagem-legenda">dias de casados</p>
      </section>
    )
  }

  return (
    <section className="contagem">
      <p className="rotulo">Nosso casamento</p>
      <p className="contagem-numero">{dias === 0 ? 'Hoje' : dias}</p>
      <p className="contagem-legenda">{dias === 0 ? 'é o grande dia' : dias === 1 ? 'dia para o grande dia' : 'dias para o grande dia'}</p>
      <div className="contagem-rodape">
        <span>{dataPorExtenso(casamento)}</span>
        <span>
          {meses > 0 && `${meses} ${meses === 1 ? 'mês' : 'meses'}`}
          {meses > 0 && diasResto > 0 && ' e '}
          {diasResto > 0 && `${diasResto} ${diasResto === 1 ? 'dia' : 'dias'}`}
          {' · '}
          {semanas} semanas
        </span>
      </div>
    </section>
  )
}

function ResumoPessoa({ nome, pendente }) {
  return (
    <div className="resumo-pessoa">
      <p className="resumo-nome">{nome}</p>
      {pendente ? (
        <p className="suave pequeno">Ainda não entrou no app.</p>
      ) : (
        <ul className="indicadores">
          {indicadores.map((i) => (
            <li key={i}>
              <span>{i}</span>
              <span className="indicador-valor">em breve</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Inicio() {
  const { perfil, parceiro } = useAuth()
  const avisar = useAviso()
  const [dataCasamento, setDataCasamento] = useState(DATA_PADRAO)
  const [push, setPush] = useState(null)
  const [enviando, setEnviando] = useState(null)

  useEffect(() => {
    supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'data_casamento')
      .maybeSingle()
      .then(({ data }) => {
        if (typeof data?.valor === 'string') setDataCasamento(data.valor)
      })
    statusPush().then(setPush)
  }, [])

  async function lembrar(l) {
    if (!parceiro) return
    setEnviando(l.id)
    try {
      const r = await enviarNotificacao({
        para: 'parceiro',
        titulo: `${perfil.nome} te lembrou`,
        corpo: l.corpo,
        url: l.url,
      })
      if (r.dispositivos === 0) {
        avisar(`${parceiro.nome} ainda não ativou as notificações. Ficou salvo no app.`)
      } else {
        avisar(`Enviado para ${parceiro.nome}.`)
      }
    } catch (e) {
      avisar(e.message)
    }
    setEnviando(null)
  }

  const hoje = new Date()

  return (
    <div className="inicio">
      <header className="cabecalho">
        <p className="rotulo">{dataPorExtenso(hoje, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="titulo-pagina">
          {saudacao()}, {perfil.nome}.
        </h1>
      </header>

      {push && push !== 'ativo' && (
        <Link to="/ajustes" className="faixa">
          <IconeSino tamanho={18} />
          <span>Ative as notificações neste aparelho para receber lembretes e desafios.</span>
          <IconeSeta tamanho={16} />
        </Link>
      )}

      <Contagem dataISO={dataCasamento} />

      <section className="bloco">
        <h2 className="titulo-bloco">Hoje</h2>
        <div className="resumo-dupla">
          <ResumoPessoa nome={perfil.nome} />
          <ResumoPessoa nome={parceiro?.nome || 'Seu par'} pendente={!parceiro?.nome} />
        </div>
      </section>

      {parceiro?.nome && (
        <section className="bloco">
          <h2 className="titulo-bloco">Lembrar {parceiro.nome}</h2>
          <div className="lembretes">
            {lembretes.map((l) => (
              <button key={l.id} className="lembrete" onClick={() => lembrar(l)} disabled={enviando !== null}>
                <span>{enviando === l.id ? 'Enviando...' : l.rotulo}</span>
                <IconeSeta tamanho={16} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
