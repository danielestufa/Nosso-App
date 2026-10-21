import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import Anel from '../../components/Anel'
import Barra from '../../components/Barra'
import { IconeCamera, IconeLeitura, IconeMaisSimples, IconeLixo } from '../../components/Icones'
import { enviarNotificacao } from '../../lib/push'
import { dataISO, somarDias, num, rotuloData } from '../../lib/saude'
import { STATUS, carregarLeituras, carregarMetaLeitura, urlCapa, comprimirCapa, progresso, ouvirLeitura } from '../../lib/leitura'

function Capa({ livro, tamanho = 'media' }) {
  const url = urlCapa(livro?.capa)
  return (
    <div className={`capa capa-${tamanho}`}>
      {url ? <img src={url} alt={`Capa de ${livro.titulo}`} loading="lazy" /> : (
        <div className="capa-vazia">
          <IconeLeitura tamanho={tamanho === 'mini' ? 16 : 22} />
          {tamanho !== 'mini' && <span>{livro?.titulo}</span>}
        </div>
      )}
    </div>
  )
}

function Estrelas({ nota, aoMudar }) {
  return (
    <span className="estrelas" role={aoMudar ? 'radiogroup' : undefined} aria-label={`Nota ${nota || 0} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!aoMudar} className={n <= (nota || 0) ? 'cheia' : ''} onClick={() => aoMudar?.(n)}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}>
          ★
        </button>
      ))}
    </span>
  )
}

function FormLivro({ eu, parceiro, inicial, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const entrada = useRef(null)
  const [f, setF] = useState({
    titulo: inicial?.titulo || '',
    autor: inicial?.autor || '',
    total_paginas: inicial?.total_paginas || '',
    status: 'lendo',
    pagina_atual: '',
    juntos: false,
  })
  const [arquivo, setArquivo] = useState(null)
  const [previa, setPrevia] = useState(inicial?.capa ? urlCapa(inicial.capa) : null)
  const [salvando, setSalvando] = useState(false)
  const mudar = (c) => (e) => setF({ ...f, [c]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  function escolherFoto(e) {
    const a = e.target.files?.[0]
    e.target.value = ''
    if (!a) return
    setArquivo(a)
    setPrevia(URL.createObjectURL(a))
  }

  async function salvar(e) {
    e.preventDefault()
    const total = parseInt(f.total_paginas, 10)
    if (!f.titulo.trim()) return avisar('Coloque o título do livro.')
    if (!total || total < 1) return avisar('Coloque o total de páginas.')
    setSalvando(true)
    try {
      let capa = inicial?.capa || null
      if (arquivo) {
        const blob = await comprimirCapa(arquivo).catch(() => arquivo)
        const caminho = `${eu.id}/${Date.now()}.jpg`
        const up = await supabase.storage.from('capas').upload(caminho, blob, { contentType: 'image/jpeg' })
        if (up.error) throw up.error
        capa = caminho
      }
      const dadosLivro = { titulo: f.titulo.trim(), autor: f.autor.trim() || null, total_paginas: total, capa }

      if (inicial?.id) {
        const { error } = await supabase.from('livros').update(dadosLivro).eq('id', inicial.id)
        if (error) throw error
        avisar('Livro atualizado.')
      } else {
        const { data: livro, error } = await supabase.from('livros').insert({ ...dadosLivro, criado_por: eu.id }).select().single()
        if (error) throw error
        const hoje = dataISO()
        const pagina = Math.min(parseInt(f.pagina_atual, 10) || 0, total)
        const base = { livro_id: livro.id, status: f.status, iniciado_em: f.status === 'lendo' ? hoje : null }
        const linhas = [{ ...base, user_id: eu.id, pagina_inicial: pagina }]
        if (f.juntos && parceiro?.nome) linhas.push({ ...base, user_id: parceiro.id, pagina_inicial: 0 })
        const { error: e2 } = await supabase.from('leituras').insert(linhas)
        if (e2) throw e2
        if (f.juntos && parceiro?.nome) {
          enviarNotificacao({
            para: 'parceiro',
            titulo: `${eu.nome} quer ler um livro com você`,
            corpo: `${livro.titulo}${livro.autor ? `, de ${livro.autor}` : ''}`,
            url: '/leitura',
          }).catch(() => {})
        }
        avisar('Livro adicionado.')
      }
      aoSalvar()
    } catch {
      avisar('Não foi possível salvar o livro.')
    }
    setSalvando(false)
  }

  return (
    <Modal titulo={inicial?.id ? 'Editar livro' : 'Novo livro'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-livro">
        <button type="button" className="capa-escolher" onClick={() => entrada.current?.click()}>
          {previa ? <img src={previa} alt="Prévia da capa" /> : (
            <span className="capa-vazia"><IconeCamera tamanho={22} /><span>Foto da capa</span></span>
          )}
        </button>
        <input ref={entrada} type="file" accept="image/*" hidden onChange={escolherFoto} />

        <div className="form-livro-campos">
          <label className="campo"><span>Título</span><input value={f.titulo} onChange={mudar('titulo')} autoFocus={!inicial} /></label>
          <label className="campo"><span>Autor</span><input value={f.autor} onChange={mudar('autor')} /></label>
          <label className="campo"><span>Total de páginas</span><input inputMode="numeric" value={f.total_paginas} onChange={mudar('total_paginas')} /></label>
          {!inicial?.id && (
            <>
              <label className="campo">
                <span>Situação</span>
                <select value={f.status} onChange={mudar('status')}>
                  <option value="lendo">Lendo</option>
                  <option value="quero_ler">Quero ler</option>
                </select>
              </label>
              {f.status === 'lendo' && (
                <label className="campo"><span>Já estou na página (opcional)</span><input inputMode="numeric" value={f.pagina_atual} onChange={mudar('pagina_atual')} placeholder="0" /></label>
              )}
              {parceiro?.nome && (
                <label className="caixa-marcar">
                  <input type="checkbox" checked={f.juntos} onChange={mudar('juntos')} />
                  <span>Ler junto com {parceiro.nome} (o livro aparece para os dois e cada um vê o progresso do outro)</span>
                </label>
              )}
            </>
          )}
        </div>
        <button className="botao botao-cheio botao-largo" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </form>
    </Modal>
  )
}

function RegistrarPaginas({ leitura, aoRegistrar, compacto }) {
  const [valor, setValor] = useState('')
  const [salvando, setSalvando] = useState(false)
  async function enviar(e) {
    e.preventDefault()
    const n = parseInt(valor, 10)
    if (!n || n < 1) return
    setSalvando(true)
    await aoRegistrar(leitura, n)
    setSalvando(false)
    setValor('')
  }
  return (
    <form className={`registrar-paginas ${compacto ? 'compacto' : ''}`} onSubmit={enviar} onClick={(e) => e.stopPropagation()}>
      <span className="pequeno">Hoje li</span>
      <input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0" aria-label="Páginas lidas hoje" />
      <span className="pequeno">páginas</span>
      <button className="botao botao-cheio botao-pequeno" disabled={salvando || !valor}>Salvar</button>
    </form>
  )
}

function DetalheLivro({ leitura, todas, eu, parceiro, editavel, aoFechar, aoMudar, aoRegistrar, aoEditar }) {
  const avisar = useAviso()
  const livro = leitura.livros
  const leitores = todas.filter((l) => l.livro_id === livro.id)
  const minha = leitores.find((l) => l.user_id === eu.id)
  const nome = (id) => (id === eu.id ? 'Você' : parceiro?.nome)
  const historico = [...(leitura.registros_leitura || [])].sort((a, b) => b.data.localeCompare(a.data) || b.criado_em.localeCompare(a.criado_em))

  async function mudarStatus(status) {
    const campos = { status }
    if (status === 'lendo' && !leitura.iniciado_em) campos.iniciado_em = dataISO()
    if (status === 'lido') campos.concluido_em = dataISO()
    await supabase.from('leituras').update(campos).eq('id', leitura.id)
    aoMudar()
  }

  async function avaliar(nota) {
    await supabase.from('leituras').update({ nota }).eq('id', leitura.id)
    aoMudar()
  }

  async function lerTambem() {
    const { error } = await supabase.from('leituras').insert({ livro_id: livro.id, user_id: eu.id, status: 'lendo', iniciado_em: dataISO() })
    if (error) return avisar('Não foi possível adicionar.')
    avisar('Agora vocês estão lendo juntos!')
    enviarNotificacao({ para: 'parceiro', titulo: `${eu.nome} começou a ler com você`, corpo: livro.titulo, url: '/leitura' }).catch(() => {})
    aoMudar()
    aoFechar()
  }

  async function apagarRegistro(id) {
    await supabase.from('registros_leitura').delete().eq('id', id)
    aoMudar()
  }

  async function remover() {
    if (!confirm('Tirar este livro da sua lista? O histórico de páginas dele também sai.')) return
    await supabase.from('leituras').delete().eq('id', leitura.id)
    if (leitores.length <= 1) await supabase.from('livros').delete().eq('id', livro.id)
    aoMudar()
    aoFechar()
  }

  return (
    <Modal titulo={livro.titulo} aoFechar={aoFechar}>
      <div className="detalhe-livro">
        <div className="detalhe-livro-topo">
          <Capa livro={livro} tamanho="grande" />
          <div className="detalhe-livro-info">
            <h3 className="titulo-secao">{livro.titulo}</h3>
            {livro.autor && <p className="suave">{livro.autor}</p>}
            <p className="pequeno">{num(livro.total_paginas)} páginas</p>
            <span className="selo">{STATUS[leitura.status]}</span>
            {leitura.status === 'lido' && <Estrelas nota={leitura.nota} aoMudar={editavel ? avaliar : null} />}
          </div>
        </div>

        <div className="leitores">
          {leitores.map((l) => (
            <div key={l.id} className="leitor">
              <div className="cartao-topo">
                <span className="pequeno"><strong>{nome(l.user_id)}</strong> · {STATUS[l.status]}</span>
                <span className="pequeno">{l.pct}%</span>
              </div>
              <Barra valor={l.paginasLidas} meta={livro.total_paginas} fina />
              <span className="suave mini-texto">pág. {num(l.paginasLidas)} de {num(livro.total_paginas)}{l.paginasFaltam > 0 && ` · faltam ${num(l.paginasFaltam)}`}</span>
            </div>
          ))}
        </div>

        {editavel && leitura.status === 'lendo' && <RegistrarPaginas leitura={leitura} aoRegistrar={aoRegistrar} />}

        {editavel && (
          <div className="chips">
            {Object.entries(STATUS).filter(([s]) => s !== leitura.status).map(([s, n]) => (
              <button key={s} className="chip" onClick={() => mudarStatus(s)}>Marcar como {n.toLowerCase()}</button>
            ))}
          </div>
        )}

        {!editavel && !minha && (
          <button className="botao botao-cheio botao-largo" onClick={lerTambem}>Ler este livro também</button>
        )}

        {historico.length > 0 && (
          <details className="historico" open>
            <summary className="pequeno">Histórico ({historico.length})</summary>
            <ul>
              {historico.slice(0, 30).map((r) => (
                <li key={r.id} className="historico-leitura">
                  <span className="pequeno">{rotuloData(r.data)}</span>
                  <span className="pequeno"><strong>{r.paginas}</strong> páginas</span>
                  {editavel && (
                    <button className="botao-icone pequeno-icone" onClick={() => apagarRegistro(r.id)} aria-label="Apagar registro"><IconeLixo tamanho={14} /></button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}

        {editavel && (
          <div className="botoes">
            <button className="botao" onClick={() => aoEditar(livro)}>Editar livro</button>
            <button className="botao botao-texto" onClick={remover}>Tirar da minha lista</button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function Livros({ pessoa, eu, parceiro, editavel }) {
  const avisar = useAviso()
  const [todas, setTodas] = useState(null)
  const [meta, setMeta] = useState(null)
  const [form, setForm] = useState(null)
  const [aberta, setAberta] = useState(null)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [valorMeta, setValorMeta] = useState('')

  const carregar = useCallback(async () => {
    const [l, m] = await Promise.all([carregarLeituras().catch(() => []), carregarMetaLeitura(pessoa.id)])
    setTodas(l)
    setMeta(m)
    setValorMeta(String(m.paginas_dia))
  }, [pessoa.id])

  useEffect(() => { carregar() }, [carregar])
  useEffect(() => ouvirLeitura(`livros-${pessoa.id}`, () => carregar()), [carregar, pessoa.id])

  if (!todas || !meta) return <div className="carregando-bloco"><div className="carregando" /></div>

  const minhas = todas.filter((l) => l.user_id === pessoa.id)
  const hoje = dataISO()
  const registros = minhas.flatMap((l) => l.registros_leitura || [])
  const paginasHoje = registros.filter((r) => r.data === hoje).reduce((s, r) => s + r.paginas, 0)
  const semana = Array.from({ length: 7 }, (_, i) => somarDias(hoje, i - 6))
  const paginasSemana = registros.filter((r) => r.data >= semana[0]).reduce((s, r) => s + r.paginas, 0)
  const anoAtual = hoje.slice(0, 4)
  const lidosAno = minhas.filter((l) => l.status === 'lido' && (l.concluido_em || '').startsWith(anoAtual)).length

  const grupos = {
    lendo: minhas.filter((l) => l.status === 'lendo'),
    quero_ler: minhas.filter((l) => l.status === 'quero_ler'),
    pausado: minhas.filter((l) => l.status === 'pausado'),
    lido: minhas.filter((l) => l.status === 'lido').sort((a, b) => (b.concluido_em || '').localeCompare(a.concluido_em || '')),
  }

  const parceiroLendo = (livroId) =>
    parceiro?.nome && todas.find((l) => l.livro_id === livroId && l.user_id !== pessoa.id)

  async function registrar(leitura, paginas) {
    const atual = todas.find((l) => l.id === leitura.id) || leitura
    const { error } = await supabase.from('registros_leitura').insert({ leitura_id: leitura.id, user_id: eu.id, data: hoje, paginas })
    if (error) return avisar('Não foi possível registrar.')
    const depois = progresso({ ...atual, registros_leitura: [...(atual.registros_leitura || []), { paginas }] })
    if (depois.paginasFaltam === 0 && atual.status !== 'lido') {
      await supabase.from('leituras').update({ status: 'lido', concluido_em: hoje }).eq('id', leitura.id)
      avisar(`Livro terminado! 🎉 Dê uma nota para ${atual.livros.titulo}.`)
      if (parceiro?.nome) {
        enviarNotificacao({ para: 'parceiro', titulo: `${eu.nome} terminou um livro`, corpo: atual.livros.titulo, url: '/leitura' }).catch(() => {})
      }
      setAberta(leitura.id)
    } else {
      avisar(`+${paginas} páginas registradas.`)
    }
    carregar()
  }

  async function salvarMeta(e) {
    e.preventDefault()
    const n = parseInt(valorMeta, 10)
    if (!n || n < 1) return
    const { error } = await supabase.from('metas_leitura').upsert({ user_id: eu.id, paginas_dia: n, atualizado_em: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) return avisar('Não foi possível salvar a meta.')
    setEditandoMeta(false)
    carregar()
  }

  const leituraAberta = aberta && todas.find((l) => l.id === aberta)

  return (
    <div className="livros">
      <section className="resumo-leitura">
        <div className="cartao resumo-agua">
          <Anel valor={paginasHoje} meta={meta.paginas_dia} tamanho={120} espessura={8}>
            <strong className="anel-valor">{paginasHoje}</strong>
            <span className="suave pequeno">de {meta.paginas_dia} pág</span>
          </Anel>
          {editavel && !editandoMeta && (
            <button className="link pequeno" onClick={() => setEditandoMeta(true)}>Meta: {meta.paginas_dia} páginas por dia</button>
          )}
          {editavel && editandoMeta && (
            <form className="linha-form meta-leitura" onSubmit={salvarMeta}>
              <input inputMode="numeric" value={valorMeta} onChange={(e) => setValorMeta(e.target.value)} aria-label="Páginas por dia" autoFocus />
              <button className="botao botao-pequeno botao-cheio">OK</button>
            </form>
          )}
          {!editavel && <span className="suave pequeno">Meta: {meta.paginas_dia} por dia</span>}
        </div>
        <div className="cartao estatisticas-leitura">
          <div><strong className="numero-grande">{num(paginasSemana)}</strong><span className="suave pequeno">páginas nos últimos 7 dias</span></div>
          <div><strong className="numero-grande">{lidosAno}</strong><span className="suave pequeno">{lidosAno === 1 ? 'livro lido' : 'livros lidos'} em {anoAtual}</span></div>
          <div><strong className="numero-grande">{grupos.lendo.length}</strong><span className="suave pequeno">lendo agora</span></div>
        </div>
      </section>

      <section className="bloco-desafios">
        <div className="cartao-topo">
          <h2 className="titulo-bloco">Lendo agora</h2>
          {editavel && (
            <button className="botao botao-pequeno" onClick={() => setForm({})}><IconeMaisSimples tamanho={15} /> Livro</button>
          )}
        </div>
        {grupos.lendo.length ? grupos.lendo.map((l) => {
          const par = parceiroLendo(l.livro_id)
          return (
            <article key={l.id} className="cartao livro-lendo" onClick={() => setAberta(l.id)} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setAberta(l.id)}>
              <Capa livro={l.livros} />
              <div className="livro-lendo-info">
                <strong>{l.livros.titulo}</strong>
                {l.livros.autor && <span className="suave pequeno">{l.livros.autor}</span>}
                <div className="cartao-topo">
                  <span className="pequeno">pág. {num(l.paginasLidas)} de {num(l.livros.total_paginas)}</span>
                  <span className="pequeno"><strong>{l.pct}%</strong></span>
                </div>
                <Barra valor={l.paginasLidas} meta={l.livros.total_paginas} fina />
                <span className="suave mini-texto">
                  Faltam {num(l.paginasFaltam)} páginas
                  {meta.paginas_dia > 0 && ` · ${Math.ceil(l.paginasFaltam / meta.paginas_dia)} dias na sua meta`}
                </span>
                {par && (
                  <span className="pequeno lendo-junto">
                    Lendo com {pessoa.id === eu.id ? parceiro.nome : 'você'}: {par.pct}%
                  </span>
                )}
                {editavel && <RegistrarPaginas leitura={l} aoRegistrar={registrar} compacto />}
              </div>
            </article>
          )
        }) : (
          <p className="suave pequeno">{editavel ? 'Nenhum livro em leitura. Adicione o livro que você está lendo.' : `${pessoa.nome} não está lendo nenhum livro agora.`}</p>
        )}
      </section>

      {['quero_ler', 'pausado', 'lido'].map((s) => grupos[s].length > 0 && (
        <section key={s} className="bloco-desafios">
          <h2 className="titulo-bloco">{STATUS[s]} ({grupos[s].length})</h2>
          <div className="estante">
            {grupos[s].map((l) => (
              <button key={l.id} className="livro-estante" onClick={() => setAberta(l.id)}>
                <Capa livro={l.livros} />
                <span className="pequeno livro-estante-titulo">{l.livros.titulo}</span>
                {s === 'lido' && l.nota && <Estrelas nota={l.nota} />}
                {s !== 'lido' && l.paginasLidas > 0 && <span className="suave mini-texto">{l.pct}%</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      {(() => {
        if (!parceiro?.nome) return null
        const outro = pessoa.id === eu.id ? parceiro : eu
        const deles = todas.filter((l) => l.user_id === outro.id && l.status === 'lendo' && !minhas.some((m) => m.livro_id === l.livro_id))
        if (!deles.length || pessoa.id !== eu.id) return null
        return (
          <section className="bloco-desafios">
            <h2 className="titulo-bloco">{parceiro.nome} está lendo</h2>
            <div className="estante">
              {deles.map((l) => (
                <button key={l.id} className="livro-estante" onClick={() => setAberta(l.id)}>
                  <Capa livro={l.livros} />
                  <span className="pequeno livro-estante-titulo">{l.livros.titulo}</span>
                  <span className="suave mini-texto">{l.pct}%</span>
                </button>
              ))}
            </div>
          </section>
        )
      })()}

      {form && (
        <FormLivro eu={eu} parceiro={parceiro} inicial={form.id ? form : null} aoFechar={() => setForm(null)}
          aoSalvar={() => { setForm(null); carregar() }} />
      )}
      {leituraAberta && (
        <DetalheLivro
          leitura={leituraAberta}
          todas={todas}
          eu={eu}
          parceiro={parceiro}
          editavel={leituraAberta.user_id === eu.id}
          aoFechar={() => setAberta(null)}
          aoMudar={carregar}
          aoRegistrar={registrar}
          aoEditar={(livro) => { setAberta(null); setForm(livro) }}
        />
      )}
    </div>
  )
}
