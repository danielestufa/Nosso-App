import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../../components/Modal'
import { useAviso } from '../../components/Aviso'
import { IconeBusca, IconeVoltar, IconeMaisSimples, IconeMenos, IconeSeta } from '../../components/Icones'
import {
  REFEICOES, carregarAlimentos, limparCacheAlimentos, normalizar, calcularItem, num,
} from '../../lib/saude'

const CATEGORIAS = [
  'Arroz, grãos e massas', 'Raízes e tubérculos', 'Pães e café da manhã', 'Ovos e laticínios',
  'Carnes', 'Peixes', 'Verduras e legumes', 'Frutas', 'Lanches', 'Doces e besteiras',
  'Bebidas', 'Óleos e molhos', 'Suplementos', 'Outros',
]

function FormAlimento({ inicial, aoSalvar, aoVoltar }) {
  const avisar = useAviso()
  const [f, setF] = useState(() => ({
    nome: inicial?.nome || '',
    categoria: inicial?.categoria || 'Outros',
    kcal: inicial?.kcal ?? '',
    proteina: inicial?.proteina ?? '',
    carboidrato: inicial?.carboidrato ?? '',
    gordura: inicial?.gordura ?? '',
    porcao_nome: inicial?.porcao_nome || '',
    porcao_g: inicial?.porcao_g ?? '',
    contem_acucar: inicial?.contem_acucar || false,
  }))
  const [salvando, setSalvando] = useState(false)
  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const numero = (v) => (v === '' || v === null ? 0 : Number(String(v).replace(',', '.')))

  async function salvar(e) {
    e.preventDefault()
    if (!f.nome.trim()) return avisar('Dê um nome ao alimento.')
    setSalvando(true)
    const registro = {
      nome: f.nome.trim(),
      categoria: f.categoria,
      kcal: numero(f.kcal),
      proteina: numero(f.proteina),
      carboidrato: numero(f.carboidrato),
      gordura: numero(f.gordura),
      porcao_nome: f.porcao_nome.trim() || null,
      porcao_g: f.porcao_g === '' ? null : numero(f.porcao_g),
      contem_acucar: f.contem_acucar,
    }
    let resposta
    if (inicial?.id) {
      resposta = await supabase.from('alimentos').update(registro).eq('id', inicial.id).select().single()
    } else {
      const { data: usuario } = await supabase.auth.getUser()
      resposta = await supabase
        .from('alimentos')
        .insert({ ...registro, personalizado: true, criado_por: usuario.user?.id })
        .select()
        .single()
    }
    setSalvando(false)
    if (resposta.error) {
      return avisar(/duplicate|unique/i.test(resposta.error.message) ? 'Já existe um alimento com esse nome.' : 'Não foi possível salvar.')
    }
    limparCacheAlimentos()
    avisar(inicial?.id ? 'Alimento atualizado.' : 'Alimento cadastrado.')
    aoSalvar(resposta.data)
  }

  return (
    <form onSubmit={salvar} className="form-grade">
      <button type="button" className="link-voltar" onClick={aoVoltar}>
        <IconeVoltar tamanho={16} /> Voltar
      </button>
      <label className="campo campo-cheio">
        <span>Nome</span>
        <input value={f.nome} onChange={mudar('nome')} placeholder="Ex.: Pão de queijo da padaria" autoFocus={!inicial} />
      </label>
      <label className="campo campo-cheio">
        <span>Categoria</span>
        <select value={f.categoria} onChange={mudar('categoria')}>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <p className="rotulo campo-cheio">Valores em 100 g</p>
      <label className="campo"><span>Calorias (kcal)</span><input inputMode="decimal" value={f.kcal} onChange={mudar('kcal')} /></label>
      <label className="campo"><span>Proteína (g)</span><input inputMode="decimal" value={f.proteina} onChange={mudar('proteina')} /></label>
      <label className="campo"><span>Carboidrato (g)</span><input inputMode="decimal" value={f.carboidrato} onChange={mudar('carboidrato')} /></label>
      <label className="campo"><span>Gordura (g)</span><input inputMode="decimal" value={f.gordura} onChange={mudar('gordura')} /></label>
      <p className="rotulo campo-cheio">Porção (opcional)</p>
      <label className="campo"><span>Nome da porção</span><input value={f.porcao_nome} onChange={mudar('porcao_nome')} placeholder="1 unidade" /></label>
      <label className="campo"><span>Peso da porção (g)</span><input inputMode="decimal" value={f.porcao_g} onChange={mudar('porcao_g')} placeholder="50" /></label>
      <label className="caixa-marcar campo-cheio">
        <input type="checkbox" checked={f.contem_acucar} onChange={mudar('contem_acucar')} />
        <span>Contém açúcar (conta para os desafios sem açúcar)</span>
      </label>
      <button className="botao botao-cheio campo-cheio" disabled={salvando}>
        {salvando ? 'Salvando...' : inicial?.id ? 'Salvar correção' : 'Cadastrar alimento'}
      </button>
    </form>
  )
}

export default function AdicionarAlimento({ userId, data, refeicaoInicial, aoFechar, aoAdicionar }) {
  const avisar = useAviso()
  const [alimentos, setAlimentos] = useState([])
  const [recentes, setRecentes] = useState([])
  const [busca, setBusca] = useState('')
  const [etapa, setEtapa] = useState('busca')
  const [escolhido, setEscolhido] = useState(null)
  const [modo, setModo] = useState('porcao')
  const [porcoes, setPorcoes] = useState(1)
  const [gramas, setGramas] = useState('100')
  const [refeicao, setRefeicao] = useState(refeicaoInicial)
  const [salvando, setSalvando] = useState(false)

  async function recarregar(forcar = false) {
    const lista = await carregarAlimentos(forcar).catch(() => [])
    setAlimentos(lista)
    return lista
  }

  useEffect(() => {
    recarregar()
    supabase
      .from('refeicao_itens')
      .select('alimento_id')
      .eq('user_id', userId)
      .not('alimento_id', 'is', null)
      .order('criado_em', { ascending: false })
      .limit(80)
      .then(({ data: linhas }) => setRecentes([...new Set((linhas || []).map((l) => l.alimento_id))].slice(0, 12)))
  }, [userId])

  const resultados = useMemo(() => {
    const termo = normalizar(busca.trim())
    if (!termo) return []
    const partes = termo.split(/\s+/)
    return alimentos
      .filter((a) => {
        const n = normalizar(a.nome)
        return partes.every((p) => n.includes(p))
      })
      .sort((a, b) => normalizar(a.nome).indexOf(partes[0]) - normalizar(b.nome).indexOf(partes[0]))
      .slice(0, 40)
  }, [busca, alimentos])

  const listaRecentes = useMemo(
    () => recentes.map((id) => alimentos.find((a) => a.id === id)).filter(Boolean),
    [recentes, alimentos]
  )

  const porCategoria = useMemo(() => {
    const grupos = {}
    for (const a of alimentos) (grupos[a.categoria] ||= []).push(a)
    return grupos
  }, [alimentos])

  function escolher(a) {
    setEscolhido(a)
    if (a.porcao_g) {
      setModo('porcao')
      setPorcoes(1)
      setGramas(String(a.porcao_g))
    } else {
      setModo('gramas')
      setGramas('100')
    }
    setEtapa('quantidade')
  }

  const gramasFinal = modo === 'porcao' && escolhido?.porcao_g
    ? Number(escolhido.porcao_g) * porcoes
    : Number(String(gramas).replace(',', '.')) || 0
  const valores = escolhido ? calcularItem(escolhido, gramasFinal) : null

  async function adicionar() {
    if (!gramasFinal || gramasFinal <= 0) return avisar('Informe a quantidade.')
    setSalvando(true)
    const { error } = await supabase.from('refeicao_itens').insert({
      user_id: userId,
      data,
      refeicao,
      alimento_id: escolhido.id,
      nome: escolhido.nome,
      gramas: Math.round(gramasFinal * 10) / 10,
      ...valores,
      contem_acucar: escolhido.contem_acucar,
    })
    setSalvando(false)
    if (error) return avisar('Não foi possível adicionar.')
    avisar(`${escolhido.nome} adicionado.`)
    aoAdicionar?.()
    setEscolhido(null)
    setBusca('')
    setEtapa('busca')
  }

  async function apagarAlimento(a) {
    if (!confirm(`Apagar "${a.nome}" da lista de alimentos de vez? O que já foi registrado nos dias anteriores continua salvo.`)) return
    const { error } = await supabase.from('alimentos').delete().eq('id', a.id)
    if (error) return avisar('Não foi possível apagar. Rode o código novo no Supabase.')
    limparCacheAlimentos()
    await recarregar(true)
    setRecentes((r) => r.filter((id) => id !== a.id))
    avisar(`${a.nome} apagado da lista.`)
    setEscolhido(null)
    setEtapa('busca')
  }

  function Linha({ a }) {
    return (
      <button className="alimento-linha" onClick={() => escolher(a)}>
        <span className="alimento-nome">
          {a.nome}
          {a.contem_acucar && <span className="selo-mini">açúcar</span>}
        </span>
        <span className="alimento-info">{num(a.kcal)} kcal / 100 g</span>
        <IconeSeta tamanho={15} />
      </button>
    )
  }

  let titulo = 'Adicionar alimento'
  if (etapa === 'novo') titulo = 'Novo alimento'
  if (etapa === 'editar') titulo = 'Corrigir alimento'

  return (
    <Modal titulo={titulo} aoFechar={aoFechar}>
      {etapa === 'busca' && (
        <div className="busca-alimento">
          <label className="campo-busca">
            <IconeBusca tamanho={18} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar: arroz, frango, whey..."
              autoFocus
            />
          </label>

          {busca.trim() ? (
            <div className="lista-alimentos">
              {resultados.map((a) => <Linha key={a.id} a={a} />)}
              {!resultados.length && <p className="suave pequeno vazio">Nada encontrado com esse nome.</p>}
              <button className="botao botao-largo" onClick={() => setEtapa('novo')}>
                <IconeMaisSimples tamanho={16} /> Cadastrar "{busca.trim()}"
              </button>
            </div>
          ) : (
            <div className="lista-alimentos">
              {listaRecentes.length > 0 && (
                <>
                  <p className="rotulo grupo-titulo">Usados recentemente</p>
                  {listaRecentes.map((a) => <Linha key={a.id} a={a} />)}
                </>
              )}
              {Object.entries(porCategoria).map(([cat, itens]) => (
                <details key={cat} className="grupo-alimentos">
                  <summary>
                    <span>{cat}</span>
                    <span className="suave pequeno">{itens.length}</span>
                  </summary>
                  {itens.map((a) => <Linha key={a.id} a={a} />)}
                </details>
              ))}
              <button className="botao botao-largo" onClick={() => setEtapa('novo')}>
                <IconeMaisSimples tamanho={16} /> Cadastrar alimento novo
              </button>
            </div>
          )}
        </div>
      )}

      {etapa === 'quantidade' && escolhido && (
        <div className="quantidade">
          <button className="link-voltar" onClick={() => setEtapa('busca')}>
            <IconeVoltar tamanho={16} /> Voltar
          </button>
          <div>
            <h3 className="quantidade-nome">{escolhido.nome}</h3>
            <p className="suave pequeno">
              Em 100 g: {num(escolhido.kcal)} kcal · P {num(escolhido.proteina, 1)} g · C {num(escolhido.carboidrato, 1)} g · G {num(escolhido.gordura, 1)} g
              {escolhido.contem_acucar && ' · contém açúcar'}
            </p>
          </div>

          {escolhido.porcao_g && (
            <div className="segmentos segmentos-2">
              <button className={modo === 'porcao' ? 'ativo' : ''} onClick={() => setModo('porcao')}>
                {escolhido.porcao_nome || 'Porção'} ({num(escolhido.porcao_g)} g)
              </button>
              <button className={modo === 'gramas' ? 'ativo' : ''} onClick={() => setModo('gramas')}>
                Gramas
              </button>
            </div>
          )}

          {modo === 'porcao' && escolhido.porcao_g ? (
            <div className="contador">
              <button className="botao-redondo" onClick={() => setPorcoes((p) => Math.max(0.5, p - 0.5))} aria-label="Menos">
                <IconeMenos tamanho={18} />
              </button>
              <div className="contador-valor">
                <strong>{num(porcoes, 1)}</strong>
                <span className="suave pequeno">{num(gramasFinal)} g</span>
              </div>
              <button className="botao-redondo" onClick={() => setPorcoes((p) => p + 0.5)} aria-label="Mais">
                <IconeMaisSimples tamanho={18} />
              </button>
            </div>
          ) : (
            <label className="campo">
              <span>Quantidade em gramas (ou ml)</span>
              <input inputMode="decimal" value={gramas} onChange={(e) => setGramas(e.target.value)} />
            </label>
          )}

          <div className="macros-previa">
            <div><strong>{num(valores.kcal)}</strong><span>kcal</span></div>
            <div><strong>{num(valores.proteina, 1)}</strong><span>proteína</span></div>
            <div><strong>{num(valores.carboidrato, 1)}</strong><span>carbo</span></div>
            <div><strong>{num(valores.gordura, 1)}</strong><span>gordura</span></div>
          </div>

          <div className="chips">
            {REFEICOES.map((r) => (
              <button key={r.id} className={`chip ${refeicao === r.id ? 'ativo' : ''}`} onClick={() => setRefeicao(r.id)}>
                {r.nome}
              </button>
            ))}
          </div>

          <button className="botao botao-cheio botao-largo" onClick={adicionar} disabled={salvando}>
            {salvando ? 'Adicionando...' : 'Adicionar'}
          </button>
          <button className="botao botao-texto botao-largo" onClick={() => setEtapa('editar')}>
            Corrigir valores deste alimento
          </button>
          <button className="botao botao-texto botao-largo" onClick={() => apagarAlimento(escolhido)}>
            Apagar este alimento da lista
          </button>
        </div>
      )}

      {etapa === 'novo' && (
        <FormAlimento
          inicial={{ nome: busca.trim() }}
          aoVoltar={() => setEtapa('busca')}
          aoSalvar={async (novo) => {
            await recarregar(true)
            escolher(novo)
          }}
        />
      )}

      {etapa === 'editar' && escolhido && (
        <FormAlimento
          inicial={escolhido}
          aoVoltar={() => setEtapa('quantidade')}
          aoSalvar={async (atualizado) => {
            await recarregar(true)
            escolher(atualizado)
          }}
        />
      )}
    </Modal>
  )
}
