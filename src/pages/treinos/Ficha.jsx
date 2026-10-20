import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import ImagemExercicio from '../../components/ImagemExercicio'
import EscolherExercicio from './EscolherExercicio'
import { IconeLixo, IconeMaisSimples, IconeLapis } from '../../components/Icones'
import { num } from '../../lib/saude'
import { DIAS, DIAS_CURTOS, ORDEM_SEMANA, carregarFicha, formatarDescanso, ouvirTreinos } from '../../lib/treinos'

function EditarItem({ item, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const cardio = item.exercicios.tipo === 'cardio'
  const [f, setF] = useState({
    series: item.series ?? 3,
    repeticoes: item.repeticoes ?? '',
    carga_kg: item.carga_kg ?? '',
    descanso_s: item.descanso_s ?? '',
    minutos: item.minutos ?? '',
    km: item.km ?? '',
    observacao: item.observacao ?? '',
  })
  const mudar = (c) => (e) => setF({ ...f, [c]: e.target.value })
  const n = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')))

  async function salvar(e) {
    e.preventDefault()
    const campos = cardio
      ? { minutos: n(f.minutos) != null ? Math.round(n(f.minutos)) : null, km: n(f.km), series: 1 }
      : {
          series: Math.max(1, Math.round(n(f.series) || 1)),
          repeticoes: f.repeticoes.trim() || null,
          carga_kg: n(f.carga_kg),
          descanso_s: n(f.descanso_s) != null ? Math.round(n(f.descanso_s)) : null,
        }
    const { error } = await supabase
      .from('ficha_itens')
      .update({ ...campos, observacao: f.observacao.trim() || null })
      .eq('id', item.id)
    if (error) return avisar('Não foi possível salvar.')
    aoSalvar()
  }

  return (
    <Modal titulo={item.exercicios.nome} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-grade">
        {cardio ? (
          <>
            <label className="campo"><span>Minutos</span><input inputMode="numeric" value={f.minutos} onChange={mudar('minutos')} /></label>
            <label className="campo"><span>Distância (km)</span><input inputMode="decimal" value={f.km} onChange={mudar('km')} /></label>
          </>
        ) : (
          <>
            <label className="campo"><span>Séries</span><input inputMode="numeric" value={f.series} onChange={mudar('series')} /></label>
            <label className="campo"><span>Repetições</span><input value={f.repeticoes} onChange={mudar('repeticoes')} placeholder="8-10" /></label>
            <label className="campo"><span>Carga inicial (kg)</span><input inputMode="decimal" value={f.carga_kg} onChange={mudar('carga_kg')} placeholder="Opcional" /></label>
            <label className="campo"><span>Descanso (segundos)</span><input inputMode="numeric" value={f.descanso_s} onChange={mudar('descanso_s')} placeholder="60" /></label>
          </>
        )}
        <label className="campo campo-cheio"><span>Observação</span>
          <input value={f.observacao} onChange={mudar('observacao')} placeholder="Ex.: drop set na última série" />
        </label>
        <button className="botao botao-cheio campo-cheio">Salvar</button>
      </form>
    </Modal>
  )
}

export default function Ficha({ pessoa, editavel, diaInicial }) {
  const avisar = useAviso()
  const [ficha, setFicha] = useState(null)
  const [dia, setDia] = useState(diaInicial ?? new Date().getDay())
  const [titulo, setTitulo] = useState('')
  const [escolhendo, setEscolhendo] = useState(false)
  const [editando, setEditando] = useState(null)
  const [lembrete, setLembrete] = useState('')

  const carregar = useCallback(async () => {
    const f = await carregarFicha(pessoa.id)
    setFicha(f)
  }, [pessoa.id])

  useEffect(() => {
    carregar()
    if (editavel) {
      supabase.from('config_treino').select('lembrete_hora').eq('user_id', pessoa.id).maybeSingle()
        .then(({ data }) => setLembrete(data?.lembrete_hora ?? ''))
    }
  }, [carregar, editavel, pessoa.id])

  useEffect(() => ouvirTreinos(`ficha-${pessoa.id}`, () => carregar(), ['ficha_itens', 'ficha_dias']), [carregar, pessoa.id])

  useEffect(() => {
    if (diaInicial != null) setDia(diaInicial)
  }, [diaInicial])

  const diaFicha = ficha?.[dia]
  useEffect(() => setTitulo(diaFicha?.titulo || ''), [diaFicha?.id, diaFicha?.titulo])

  if (!ficha) return <div className="carregando-bloco"><div className="carregando" /></div>

  async function criarDia() {
    const { error } = await supabase.from('ficha_dias').insert({ user_id: pessoa.id, dia_semana: dia, titulo: 'Novo treino' })
    if (error) return avisar('Não foi possível criar.')
    carregar()
  }

  async function salvarTitulo() {
    if (!diaFicha || !titulo.trim() || titulo === diaFicha.titulo) return
    await supabase.from('ficha_dias').update({ titulo: titulo.trim() }).eq('id', diaFicha.id)
    carregar()
  }

  async function apagarDia() {
    if (!confirm(`Transformar ${DIAS[dia].toLowerCase()} em dia de descanso? Os exercícios deste dia saem da ficha.`)) return
    await supabase.from('ficha_dias').delete().eq('id', diaFicha.id)
    carregar()
  }

  async function adicionar(ex) {
    setEscolhendo(false)
    let alvo = diaFicha
    if (!alvo) {
      const { data, error } = await supabase.from('ficha_dias').insert({ user_id: pessoa.id, dia_semana: dia, titulo: 'Novo treino' }).select().single()
      if (error) return avisar('Não foi possível adicionar.')
      alvo = { ...data, itens: [] }
    }
    const ordem = alvo.itens.length ? Math.max(...alvo.itens.map((i) => i.ordem)) + 1 : 0
    const cardio = ex.tipo === 'cardio'
    const { error } = await supabase.from('ficha_itens').insert({
      ficha_dia_id: alvo.id,
      user_id: pessoa.id,
      exercicio_id: ex.id,
      ordem,
      series: cardio ? 1 : 3,
      repeticoes: cardio ? null : '10-12',
      descanso_s: cardio ? null : 60,
      minutos: cardio ? 30 : null,
    })
    if (error) return avisar('Não foi possível adicionar.')
    avisar(`${ex.nome} adicionado.`)
    carregar()
  }

  async function remover(item) {
    if (!confirm(`Tirar ${item.exercicios.nome} da ficha?`)) return
    await supabase.from('ficha_itens').delete().eq('id', item.id)
    carregar()
  }

  async function mover(i, direcao) {
    const itens = [...diaFicha.itens]
    const j = i + direcao
    if (j < 0 || j >= itens.length) return
    ;[itens[i], itens[j]] = [itens[j], itens[i]]
    await Promise.all(itens.map((it, ordem) => supabase.from('ficha_itens').update({ ordem }).eq('id', it.id)))
    carregar()
  }

  async function salvarLembrete(valor) {
    setLembrete(valor)
    const { error } = await supabase.from('config_treino').upsert(
      { user_id: pessoa.id, lembrete_hora: valor === '' ? null : Number(valor), atualizado_em: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    if (error) return avisar('Não foi possível salvar o lembrete.')
    avisar(valor === '' ? 'Lembrete de treino desligado.' : `Lembrete de treino às ${valor}h.`)
  }

  return (
    <div className="ficha">
      <div className="dias-semana" role="tablist">
        {ORDEM_SEMANA.map((d) => (
          <button
            key={d}
            role="tab"
            aria-selected={dia === d}
            className={`dia-botao ${dia === d ? 'ativo' : ''} ${ficha[d]?.itens?.length ? 'tem-treino' : ''}`}
            onClick={() => setDia(d)}
          >
            {DIAS_CURTOS[d]}
          </button>
        ))}
      </div>

      {diaFicha ? (
        <section className="cartao">
          {editavel ? (
            <label className="campo">
              <span>Nome do treino de {DIAS[dia].toLowerCase()}</span>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} onBlur={salvarTitulo} />
            </label>
          ) : (
            <h2 className="titulo-secao">{diaFicha.titulo}</h2>
          )}

          <ol className="itens-ficha">
            {diaFicha.itens.map((item, i) => {
              const ex = item.exercicios
              const cardio = ex.tipo === 'cardio'
              return (
                <li key={item.id}>
                  <ImagemExercicio imagem={ex.imagem} nome={ex.nome} tamanho="mini" animar={false} />
                  <div className="exercicio-texto">
                    <strong>{ex.nome}</strong>
                    <span className="suave pequeno">
                      {cardio
                        ? [item.minutos && `${item.minutos} min`, item.km && `${num(item.km, 1)} km`].filter(Boolean).join(' · ') || 'Cardio'
                        : [`${item.series} × ${item.repeticoes || '?'}`, item.carga_kg && `${num(item.carga_kg, 1)} kg`, formatarDescanso(item.descanso_s)]
                            .filter(Boolean)
                            .join(' · ')}
                    </span>
                    {item.observacao && <span className="pequeno">{item.observacao}</span>}
                  </div>
                  {editavel && (
                    <div className="acoes-item">
                      <button className="botao-icone pequeno-icone" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                      <button className="botao-icone pequeno-icone" onClick={() => mover(i, 1)} disabled={i === diaFicha.itens.length - 1} aria-label="Descer">↓</button>
                      <button className="botao-icone pequeno-icone" onClick={() => setEditando(item)} aria-label="Editar"><IconeLapis tamanho={15} /></button>
                      <button className="botao-icone pequeno-icone" onClick={() => remover(item)} aria-label="Remover"><IconeLixo tamanho={15} /></button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {!diaFicha.itens.length && <p className="suave pequeno">Nenhum exercício ainda.</p>}

          {editavel && (
            <div className="botoes">
              <button className="botao botao-cheio" onClick={() => setEscolhendo(true)}>
                <IconeMaisSimples tamanho={16} /> Adicionar exercício
              </button>
              <button className="botao botao-texto" onClick={apagarDia}>Virar dia de descanso</button>
            </div>
          )}
        </section>
      ) : (
        <section className="cartao descanso">
          <h2 className="titulo-secao">{DIAS[dia]}: descanso</h2>
          {editavel ? (
            <button className="botao" onClick={criarDia}><IconeMaisSimples tamanho={16} /> Criar treino neste dia</button>
          ) : (
            <p className="suave pequeno">Sem treino na ficha.</p>
          )}
        </section>
      )}

      {editavel && (
        <section className="cartao">
          <h3 className="cartao-titulo">Lembrete de treino</h3>
          <label className="campo">
            <span>Avisar no celular nos dias com treino, às</span>
            <select value={lembrete} onChange={(e) => salvarLembrete(e.target.value)}>
              <option value="">Desligado</option>
              {Array.from({ length: 18 }, (_, i) => i + 5).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
              ))}
            </select>
          </label>
        </section>
      )}

      {escolhendo && <EscolherExercicio aoEscolher={adicionar} aoFechar={() => setEscolhendo(false)} />}
      {editando && <EditarItem item={editando} aoFechar={() => setEditando(null)} aoSalvar={() => { setEditando(null); carregar() }} />}
    </div>
  )
}
