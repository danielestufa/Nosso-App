import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import { IconeLixo, IconeMaisSimples, IconeVoltar } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { dataISO, somarDias } from '../../lib/saude'
import { TIPOS_REGRA, DIAS_LETRA, TODOS_DIAS, DIAS_UTEIS, FIM_DE_SEMANA, MODELOS, textoRegra } from '../../lib/desafios'

const amanha = () => somarDias(dataISO(), 1)

function novaRegra(tipo = 'sem_acucar') {
  return { chave: Math.random().toString(36).slice(2), tipo, meta: '', dias_semana: [...TODOS_DIAS], descricao: '' }
}

function EditorRegra({ regra, aoMudar, aoRemover, podeRemover }) {
  const t = TIPOS_REGRA[regra.tipo]
  const alternarDia = (d) => {
    const dias = regra.dias_semana.includes(d) ? regra.dias_semana.filter((x) => x !== d) : [...regra.dias_semana, d]
    if (dias.length) aoMudar({ ...regra, dias_semana: dias })
  }
  return (
    <div className="regra-editor">
      <div className="linha-form">
        <label className="campo">
          <span>Regra</span>
          <select value={regra.tipo} onChange={(e) => aoMudar({ ...regra, tipo: e.target.value, meta: '' })}>
            {Object.entries(TIPOS_REGRA).map(([id, info]) => <option key={id} value={id}>{info.nome}</option>)}
          </select>
        </label>
        {podeRemover && (
          <button type="button" className="botao-icone pequeno-icone" onClick={aoRemover} aria-label="Remover regra">
            <IconeLixo tamanho={16} />
          </button>
        )}
      </div>
      {t.temMeta && (
        <label className="campo">
          <span>Meta ({t.unidade})</span>
          <input inputMode="numeric" value={regra.meta} onChange={(e) => aoMudar({ ...regra, meta: e.target.value })} placeholder={t.dica || ''} />
        </label>
      )}
      {(regra.tipo === 'personalizada' || !t.temMeta) && (
        <label className="campo">
          <span>{regra.tipo === 'personalizada' ? 'O que precisa fazer' : 'Detalhe (opcional)'}</span>
          <input value={regra.descricao} onChange={(e) => aoMudar({ ...regra, descricao: e.target.value })}
            placeholder={regra.tipo === 'personalizada' ? 'Ex.: dormir antes da meia-noite' : ''} />
        </label>
      )}
      <div className="dias-regra">
        <span className="suave pequeno">Vale em:</span>
        <div className="dias-letras">
          {DIAS_LETRA.map((l, d) => (
            <button type="button" key={d} className={`dia-letra ${regra.dias_semana.includes(d) ? 'ativo' : ''}`} onClick={() => alternarDia(d)}
              aria-pressed={regra.dias_semana.includes(d)}>{l}</button>
          ))}
        </div>
        <div className="chips">
          <button type="button" className="chip" onClick={() => aoMudar({ ...regra, dias_semana: [...TODOS_DIAS] })}>Todos</button>
          <button type="button" className="chip" onClick={() => aoMudar({ ...regra, dias_semana: [...DIAS_UTEIS] })}>Seg a sex</button>
          <button type="button" className="chip" onClick={() => aoMudar({ ...regra, dias_semana: [...FIM_DE_SEMANA] })}>Fim de semana</button>
        </div>
      </div>
      {!t.auto && <p className="suave pequeno">Essa regra é marcada por vocês no fim do dia.</p>}
    </div>
  )
}

export default function NovoDesafio({ eu, parceiro, aoFechar, aoCriar }) {
  const avisar = useAviso()
  const [etapa, setEtapa] = useState('modelo')
  const [f, setF] = useState(null)
  const [salvando, setSalvando] = useState(false)

  function usarModelo(m) {
    const inicio = amanha()
    setF({
      titulo: m?.titulo || '',
      descricao: m?.descricao || '',
      formato: m?.formato || 'juntos',
      modo: m?.modo || 'diario',
      data_inicio: inicio,
      data_fim: somarDias(inicio, (m?.dias || 30) - 1),
      vidas: m?.vidas ?? 3,
      aposta: 'R$ 100',
      prenda_recusa: 'R$ 5 na caixinha dos noivos',
      pontos_dia: 10,
      penalidade_vida: 5,
      regras: (m?.regras || [{ tipo: 'sem_acucar', dias_semana: [...TODOS_DIAS] }]).map((r) => ({
        ...novaRegra(r.tipo),
        meta: r.meta ? String(r.meta) : '',
        dias_semana: [...r.dias_semana],
        descricao: r.descricao || '',
      })),
    })
    setEtapa('form')
  }

  const mudar = (campo) => (e) => setF({ ...f, [campo]: e.target.value })
  const duracao = f ? Math.round((new Date(f.data_fim) - new Date(f.data_inicio)) / 86400000) + 1 : 0

  async function criar(e) {
    e.preventDefault()
    if (!f.titulo.trim()) return avisar('Dê um nome ao desafio.')
    if (f.data_fim < f.data_inicio) return avisar('A data final precisa ser depois do início.')
    if (!f.regras.length) return avisar('Adicione pelo menos uma regra.')
    if (f.regras.some((r) => r.tipo === 'personalizada' && !r.descricao.trim())) return avisar('Descreva a regra personalizada.')
    setSalvando(true)
    const { data: desafio, error } = await supabase
      .from('desafios')
      .insert({
        titulo: f.titulo.trim(),
        descricao: f.descricao.trim() || null,
        formato: f.formato,
        modo: f.modo,
        criado_por: eu.id,
        desafiado: f.formato === 'para_par' ? parceiro.id : null,
        data_inicio: f.data_inicio,
        data_fim: f.data_fim,
        vidas: f.modo === 'meta' ? 1 : Math.max(1, Number(f.vidas) || 1),
        pontos_dia: Number(f.pontos_dia) || 10,
        penalidade_vida: Number(f.penalidade_vida) || 0,
        aposta: f.aposta.trim() || null,
        prenda_recusa: f.prenda_recusa.trim() || null,
      })
      .select()
      .single()
    if (error) {
      setSalvando(false)
      return avisar('Não foi possível criar o desafio.')
    }
    const { error: erroRegras } = await supabase.from('desafio_regras').insert(
      f.regras.map((r, i) => ({
        desafio_id: desafio.id,
        tipo: r.tipo,
        meta: r.meta === '' ? null : Number(String(r.meta).replace(',', '.')),
        dias_semana: r.dias_semana,
        descricao: r.descricao.trim() || null,
        ordem: i,
      }))
    )
    setSalvando(false)
    if (erroRegras) {
      await supabase.from('desafios').delete().eq('id', desafio.id)
      return avisar('Não foi possível salvar as regras.')
    }
    enviarNotificacao({
      para: 'parceiro',
      titulo: f.formato === 'juntos' ? `${eu.nome} propôs um desafio juntos` : `${eu.nome} te desafiou!`,
      corpo: `${f.titulo.trim()}${f.aposta.trim() ? ` · Aposta: ${f.aposta.trim()}` : ''}. Aceita?`,
      url: '/desafios',
      tag: `desafio-${desafio.id}`,
    }).catch(() => {})
    avisar(`Desafio enviado para ${parceiro.nome}.`)
    aoCriar()
  }

  return (
    <Modal titulo={etapa === 'modelo' ? 'Novo desafio' : f.titulo || 'Novo desafio'} aoFechar={aoFechar}>
      {etapa === 'modelo' && (
        <div className="modelos">
          <p className="suave pequeno">Comece de um modelo ou monte do zero. Tudo pode ser ajustado.</p>
          {MODELOS.map((m) => (
            <button key={m.id} className="modelo" onClick={() => usarModelo(m)}>
              <strong>{m.titulo}</strong>
              <span className="suave pequeno">{m.regras.map(textoRegra).join(' · ')}</span>
              <span className="pequeno">{m.modo === 'meta' ? `Meta até o prazo · ${m.dias} dias` : `${m.dias} dias · ${m.vidas} vidas`} · {m.formato === 'juntos' ? 'juntos' : `para ${parceiro.nome}`}</span>
            </button>
          ))}
          <button className="botao botao-largo" onClick={() => usarModelo(null)}>
            <IconeMaisSimples tamanho={16} /> Montar do zero
          </button>
        </div>
      )}

      {etapa === 'form' && f && (
        <form onSubmit={criar} className="form-desafio">
          <button type="button" className="link-voltar" onClick={() => setEtapa('modelo')}><IconeVoltar tamanho={16} /> Modelos</button>

          <label className="campo"><span>Nome do desafio</span><input value={f.titulo} onChange={mudar('titulo')} /></label>
          <label className="campo"><span>Descrição</span><input value={f.descricao} onChange={mudar('descricao')} placeholder="Opcional" /></label>

          <div className="campo">
            <span>Quem participa</span>
            <div className="segmentos segmentos-2">
              <button type="button" className={f.formato === 'juntos' ? 'ativo' : ''} onClick={() => setF({ ...f, formato: 'juntos' })}>Nós dois</button>
              <button type="button" className={f.formato === 'para_par' ? 'ativo' : ''} onClick={() => setF({ ...f, formato: 'para_par' })}>Só {parceiro.nome}</button>
            </div>
          </div>

          <div className="campo">
            <span>Tipo</span>
            <div className="segmentos segmentos-2">
              <button type="button" className={f.modo === 'diario' ? 'ativo' : ''} onClick={() => setF({ ...f, modo: 'diario' })}>Todo dia</button>
              <button type="button" className={f.modo === 'meta' ? 'ativo' : ''} onClick={() => setF({ ...f, modo: 'meta' })}>Meta até o prazo</button>
            </div>
            <span className="suave pequeno">
              {f.modo === 'diario' ? 'As regras valem em cada dia. Falhou um dia, perde uma vida.' : 'Precisa cumprir uma vez até a data final.'}
            </span>
          </div>

          <div className="form-grade">
            <label className="campo"><span>Começa</span><input type="date" value={f.data_inicio} onChange={mudar('data_inicio')} /></label>
            <label className="campo"><span>Termina</span><input type="date" value={f.data_fim} onChange={mudar('data_fim')} /></label>
            {f.modo === 'diario' && (
              <>
                <label className="campo"><span>Vidas</span><input inputMode="numeric" value={f.vidas} onChange={mudar('vidas')} /></label>
                <div className="campo"><span>Duração</span><p className="numero-medio">{duracao > 0 ? `${duracao} dias` : '-'}</p></div>
              </>
            )}
          </div>

          <p className="rotulo">Regras</p>
          {f.regras.map((r, i) => (
            <EditorRegra
              key={r.chave}
              regra={r}
              podeRemover={f.regras.length > 1}
              aoMudar={(nova) => setF({ ...f, regras: f.regras.map((x, j) => (j === i ? nova : x)) })}
              aoRemover={() => setF({ ...f, regras: f.regras.filter((_, j) => j !== i) })}
            />
          ))}
          <button type="button" className="botao" onClick={() => setF({ ...f, regras: [...f.regras, novaRegra('personalizada')] })}>
            <IconeMaisSimples tamanho={16} /> Adicionar regra
          </button>

          <p className="rotulo">Aposta e prenda</p>
          <label className="campo">
            <span>{f.formato === 'juntos' ? 'Quem perder paga' : `Se ${parceiro.nome} não cumprir, paga`}</span>
            <input value={f.aposta} onChange={mudar('aposta')} placeholder="Ex.: R$ 100, um jantar, uma massagem" />
          </label>
          <label className="campo">
            <span>Prenda se recusar o desafio</span>
            <input value={f.prenda_recusa} onChange={mudar('prenda_recusa')} placeholder="Ex.: R$ 5 na caixinha dos noivos" />
          </label>

          {f.modo === 'diario' && (
            <details className="historico">
              <summary className="pequeno">Pontuação</summary>
              <div className="form-grade" style={{ marginTop: 10 }}>
                <label className="campo"><span>Pontos por dia cumprido</span><input inputMode="numeric" value={f.pontos_dia} onChange={mudar('pontos_dia')} /></label>
                <label className="campo"><span>Pontos perdidos por vida</span><input inputMode="numeric" value={f.penalidade_vida} onChange={mudar('penalidade_vida')} /></label>
              </div>
            </details>
          )}

          <button className="botao botao-cheio botao-largo" disabled={salvando}>
            {salvando ? 'Enviando...' : `Enviar para ${parceiro.nome}`}
          </button>
        </form>
      )}
    </Modal>
  )
}
