import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/Modal'
import ImagemExercicio from '../../components/ImagemExercicio'
import { useAviso } from '../../components/Aviso'
import { IconeBusca, IconeMaisSimples, IconeVoltar } from '../../components/Icones'
import { normalizar } from '../../lib/saude'
import { carregarExercicios, limparCacheExercicios } from '../../lib/treinos'

const GRUPOS = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Quadríceps', 'Posterior', 'Glúteos', 'Adutores', 'Panturrilha', 'Abdômen', 'Cardio', 'Outros']
const AREAS = ['Peso livre', 'Racks e bancos', 'Máquinas', 'Cabos e polias', 'Área de pernas', 'Barras', 'Colchonetes', 'Cardio', 'Ao ar livre', 'Outros']

function NovoExercicio({ nomeInicial, aoVoltar, aoCriar }) {
  const avisar = useAviso()
  const [f, setF] = useState({ nome: nomeInicial || '', grupo: 'Peito', area: 'Peso livre', equipamento: '', tipo: 'forca', como_fazer: '' })
  const [salvando, setSalvando] = useState(false)
  const mudar = (c) => (e) => setF({ ...f, [c]: e.target.value })

  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return avisar('Dê um nome ao exercício.')
    setSalvando(true)
    const { data: u } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('exercicios')
      .insert({
        nome: f.nome.trim(),
        grupo: f.grupo,
        area: f.area,
        equipamento: f.equipamento.trim() || null,
        tipo: f.tipo,
        como_fazer: f.como_fazer.trim() || null,
        personalizado: true,
        criado_por: u.user?.id,
      })
      .select()
      .single()
    setSalvando(false)
    if (error) return avisar(/unique|duplicate/i.test(error.message) ? 'Já existe um exercício com esse nome.' : 'Não foi possível criar.')
    limparCacheExercicios()
    aoCriar(data)
  }

  return (
    <form onSubmit={salvar} className="form-grade">
      <button type="button" className="link-voltar" onClick={aoVoltar}><IconeVoltar tamanho={16} /> Voltar</button>
      <label className="campo campo-cheio"><span>Nome</span><input value={f.nome} onChange={mudar('nome')} autoFocus /></label>
      <label className="campo"><span>Grupo muscular</span>
        <select value={f.grupo} onChange={mudar('grupo')}>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select>
      </label>
      <label className="campo"><span>Área da academia</span>
        <select value={f.area} onChange={mudar('area')}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>
      </label>
      <label className="campo"><span>Equipamento</span><input value={f.equipamento} onChange={mudar('equipamento')} placeholder="Ex.: Polia" /></label>
      <label className="campo"><span>Tipo</span>
        <select value={f.tipo} onChange={mudar('tipo')}>
          <option value="forca">Musculação (séries e carga)</option>
          <option value="cardio">Cardio (minutos e km)</option>
        </select>
      </label>
      <label className="campo campo-cheio"><span>Como fazer</span>
        <textarea rows={3} value={f.como_fazer} onChange={mudar('como_fazer')} placeholder="Dicas de execução" />
      </label>
      <p className="suave pequeno campo-cheio">Exercícios criados aqui ficam sem foto de execução.</p>
      <button className="botao botao-cheio campo-cheio" disabled={salvando}>{salvando ? 'Criando...' : 'Criar exercício'}</button>
    </form>
  )
}

export default function EscolherExercicio({ aoEscolher, aoFechar }) {
  const [lista, setLista] = useState([])
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState(null)
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    carregarExercicios().then(setLista).catch(() => {})
  }, [])

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    return lista.filter((e) => {
      if (grupo && e.grupo !== grupo) return false
      if (!termo) return true
      const alvo = normalizar(`${e.nome} ${e.grupo} ${e.equipamento || ''}`)
      return termo.split(/\s+/).every((p) => alvo.includes(p))
    })
  }, [lista, busca, grupo])

  const grupos = useMemo(() => GRUPOS.filter((g) => lista.some((e) => e.grupo === g)), [lista])

  return (
    <Modal titulo={criando ? 'Novo exercício' : 'Adicionar exercício'} aoFechar={aoFechar}>
      {criando ? (
        <NovoExercicio nomeInicial={busca} aoVoltar={() => setCriando(false)} aoCriar={aoEscolher} />
      ) : (
        <div className="busca-alimento">
          <label className="campo-busca">
            <IconeBusca tamanho={18} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar: supino, agachamento..." autoFocus />
          </label>
          <div className="chips chips-rolagem">
            <button className={`chip ${!grupo ? 'ativo' : ''}`} onClick={() => setGrupo(null)}>Todos</button>
            {grupos.map((g) => (
              <button key={g} className={`chip ${grupo === g ? 'ativo' : ''}`} onClick={() => setGrupo(grupo === g ? null : g)}>{g}</button>
            ))}
          </div>
          <div className="lista-exercicios-escolher">
            {filtrados.map((e) => (
              <button key={e.id} className="exercicio-opcao" onClick={() => aoEscolher(e)}>
                <ImagemExercicio imagem={e.imagem} nome={e.nome} tamanho="mini" animar={false} />
                <span className="exercicio-texto">
                  <strong>{e.nome}</strong>
                  <span className="suave pequeno">{e.grupo} · {e.area}</span>
                </span>
                <IconeMaisSimples tamanho={18} />
              </button>
            ))}
            {!filtrados.length && <p className="suave pequeno vazio">Nenhum exercício encontrado.</p>}
          </div>
          <button className="botao botao-largo" onClick={() => setCriando(true)}>
            <IconeMaisSimples tamanho={16} /> Criar exercício novo
          </button>
        </div>
      )}
    </Modal>
  )
}
