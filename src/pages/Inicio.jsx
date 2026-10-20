import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useAviso } from '../components/Aviso'
import { statusPush, enviarNotificacao } from '../lib/push'
import { hojeLocal, lerDataISO, diasEntre, mesesEDias, dataPorExtenso, saudacao } from '../lib/datas'
import { IconeSino, IconeSeta } from '../components/Icones'
import Barra from '../components/Barra'
import { carregarDia, carregarMetas, resumir, dataISO, num, ouvirSaude } from '../lib/saude'
import { carregarFicha, carregarTreinoDoDia, diaSemanaDe, ouvirTreinos } from '../lib/treinos'
import { carregarDesafios, estadoGeral, regrasDoDia, ouvirDesafios } from '../lib/desafios'
import { Vidas } from './desafios/DetalheDesafio'

const DATA_PADRAO = '2027-09-09'

const lembretes = [
  { id: 'agua', rotulo: 'Beber água', corpo: 'Bora beber um copo de água agora!', url: '/saude' },
  { id: 'treino', rotulo: 'Hora do treino', corpo: 'Hora do treino! Vamos juntos?', url: '/treinos' },
  { id: 'leitura', rotulo: 'Hora da leitura', corpo: 'Que tal ler umas páginas agora?', url: '/leitura' },
  { id: 'carinho', rotulo: 'Mandar um carinho', corpo: 'Tô pensando em você.', url: '/' },
]

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

function ResumoPessoa({ pessoa, ehEu, pendente, versao }) {
  const [info, setInfo] = useState(null)

  useEffect(() => {
    if (pendente) return
    const hoje = dataISO()
    Promise.all([carregarDia(pessoa.id, hoje), carregarMetas(pessoa.id), carregarFicha(pessoa.id), carregarTreinoDoDia(pessoa.id, hoje)])
      .then(([dia, metas, ficha, treino]) => {
        const doDia = ficha[diaSemanaDe(hoje)]
        let textoTreino = 'Descanso'
        if (treino.treino?.concluido_em) textoTreino = 'Feito'
        else if (treino.treino) textoTreino = 'Treinando'
        else if (doDia?.itens?.length) textoTreino = doDia.titulo
        setInfo({ r: resumir(dia), metas, treino: textoTreino })
      })
      .catch(() => {})
  }, [pessoa?.id, pendente, versao])

  if (pendente) {
    return (
      <div className="resumo-pessoa">
        <p className="resumo-nome">Seu par</p>
        <p className="suave pequeno">Ainda não entrou no app.</p>
      </div>
    )
  }

  const destino = ehEu ? '/saude' : '/saude?quem=par'

  return (
    <Link to={destino} className="resumo-pessoa resumo-pessoa-link">
      <p className="resumo-nome">{pessoa.nome}</p>
      <ul className="indicadores">
        <li>
          <span>Água</span>
          <span className="indicador-valor forte">
            {info ? `${num(info.r.aguaMl / 1000, 1)} / ${num(info.metas.agua_ml / 1000, 1)} L` : '...'}
          </span>
        </li>
        {info && <li className="indicador-barra"><Barra valor={info.r.aguaMl} meta={info.metas.agua_ml} fina /></li>}
        <li>
          <span>Calorias</span>
          <span className="indicador-valor forte">{info ? `${num(info.r.kcal)} / ${num(info.metas.calorias)}` : '...'}</span>
        </li>
        <li>
          <span>Açúcar</span>
          <span className="indicador-valor forte">{info ? (info.r.comeuAcucar ? 'Comeu' : 'Sem açúcar') : '...'}</span>
        </li>
        <li>
          <span>Treino</span>
          <span className="indicador-valor forte texto-cortado">{info ? info.treino : '...'}</span>
        </li>
        <li>
          <span>Leitura</span>
          <span className="indicador-valor">em breve</span>
        </li>
      </ul>
    </Link>
  )
}

export default function Inicio() {
  const { perfil, parceiro } = useAuth()
  const avisar = useAviso()
  const [dataCasamento, setDataCasamento] = useState(DATA_PADRAO)
  const [push, setPush] = useState(null)
  const [enviando, setEnviando] = useState(null)
  const [versao, setVersao] = useState(0)

  // Atualiza o resumo quando qualquer um registra algo
  useEffect(() => ouvirSaude('inicio', () => setVersao((v) => v + 1)), [])
  useEffect(() => ouvirTreinos('inicio', () => setVersao((v) => v + 1), ['treinos_realizados']), [])
  useEffect(() => ouvirDesafios('inicio', () => setVersao((v) => v + 1)), [])

  const [desafios, setDesafios] = useState([])
  useEffect(() => {
    if (!parceiro?.nome) return
    carregarDesafios().then(setDesafios).catch(() => {})
  }, [parceiro?.nome, versao])

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
          <ResumoPessoa pessoa={perfil} ehEu versao={versao} />
          <ResumoPessoa pessoa={parceiro} pendente={!parceiro?.nome} versao={versao} />
        </div>
      </section>

      {(() => {
        const perfis = [perfil, parceiro].filter((p) => p?.nome)
        const hoje = dataISO()
        const convites = desafios.filter((d) => d.status === 'pendente' && d.criado_por !== perfil.id)
        const ativos = desafios
          .filter((d) => d.status === 'ativo')
          .map((d) => ({ d, g: estadoGeral(d, perfis) }))
          .filter((x) => x.g.fase === 'andamento')
        if (!convites.length && !ativos.length) return null
        return (
          <section className="bloco">
            <h2 className="titulo-bloco">Desafios</h2>
            {convites.length > 0 && (
              <Link to="/desafios" className="faixa">
                <span>{parceiro.nome} te mandou {convites.length === 1 ? 'um desafio' : `${convites.length} desafios`}. Toque para responder.</span>
                <IconeSeta tamanho={16} />
              </Link>
            )}
            <div className="lista-desafios-inicio">
              {ativos.map(({ d, g }) => {
                const minha = g.sit[perfil.id]
                const falta = minha && d.modo === 'diario' && !minha.eliminado &&
                  regrasDoDia(d.regras, hoje).length > 0 && !d.checkins.some((c) => c.user_id === perfil.id && c.data === hoje)
                return (
                  <Link key={d.id} to={`/desafios?id=${d.id}`} className="desafio-inicio">
                    <div className="exercicio-texto">
                      <strong className="pequeno">{d.titulo}</strong>
                      <span className="suave mini-texto">
                        {g.pessoas.map((p) => `${p.nome} ${d.modo === 'diario' ? `${g.sit[p.id].pontos} pts` : ''}`).join(' · ')}
                      </span>
                    </div>
                    {falta ? <span className="selo">Confirmar hoje</span> : minha && d.modo === 'diario' ? <Vidas total={d.vidas} restantes={minha.vidasRestantes} /> : null}
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })()}

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
