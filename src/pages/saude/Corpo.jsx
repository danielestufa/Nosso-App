import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Modal from '../../components/Modal'
import { IconeCamera, IconeLixo, IconeMaisSimples } from '../../components/Icones'
import { dataISO, num, ouvirSaude } from '../../lib/saude'

const CAMPOS = [
  ['peso_kg', 'Peso', 'kg'],
  ['cintura_cm', 'Cintura', 'cm'],
  ['abdomen_cm', 'Abdômen', 'cm'],
  ['quadril_cm', 'Quadril', 'cm'],
  ['peito_cm', 'Peito', 'cm'],
  ['braco_cm', 'Braço', 'cm'],
  ['coxa_cm', 'Coxa', 'cm'],
]

const dataCurta = (iso) => {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// Reduz a foto antes de enviar (mais rápido e economiza espaço)
async function comprimir(arquivo, max = 1600) {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.82))
}

function GraficoPeso({ medidas }) {
  const pontos = medidas.filter((m) => m.peso_kg != null)
  if (pontos.length < 2) {
    return <p className="suave pequeno">Registre o peso pelo menos duas vezes para ver o gráfico.</p>
  }
  const L = 600
  const A = 180
  const m = { e: 36, d: 12, t: 14, b: 24 }
  const pesos = pontos.map((p) => Number(p.peso_kg))
  const min = Math.floor(Math.min(...pesos) - 1)
  const max = Math.ceil(Math.max(...pesos) + 1)
  const x = (i) => m.e + (i / (pontos.length - 1)) * (L - m.e - m.d)
  const y = (v) => m.t + (1 - (v - min) / (max - min)) * (A - m.t - m.b)
  const linha = pontos.map((p, i) => `${x(i)},${y(Number(p.peso_kg))}`).join(' ')
  const marcas = [min, (min + max) / 2, max]

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="grafico-peso" role="img" aria-label="Evolução do peso">
      {marcas.map((v) => (
        <g key={v}>
          <line x1={m.e} x2={L - m.d} y1={y(v)} y2={y(v)} stroke="var(--linha)" />
          <text x={m.e - 6} y={y(v) + 4} textAnchor="end" className="grafico-texto">{num(v, 1)}</text>
        </g>
      ))}
      <polyline points={linha} fill="none" stroke="var(--linha-forte)" strokeWidth="2" strokeLinejoin="round" />
      {pontos.map((p, i) => (
        <circle key={p.id} cx={x(i)} cy={y(Number(p.peso_kg))} r="3.5" fill="var(--fundo)" stroke="var(--linha-forte)" strokeWidth="2">
          <title>{`${dataCurta(p.data)}: ${num(p.peso_kg, 1)} kg`}</title>
        </circle>
      ))}
      <text x={m.e} y={A - 4} className="grafico-texto">{dataCurta(pontos[0].data)}</text>
      <text x={L - m.d} y={A - 4} textAnchor="end" className="grafico-texto">{dataCurta(pontos[pontos.length - 1].data)}</text>
    </svg>
  )
}

function FormMedidas({ pessoa, aoFechar, aoSalvar }) {
  const avisar = useAviso()
  const [f, setF] = useState({ data: dataISO() })
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const registro = { user_id: pessoa.id, data: f.data, observacao: f.observacao || null }
    let algum = false
    for (const [campo] of CAMPOS) {
      const v = f[campo]
      if (v !== undefined && v !== '') {
        registro[campo] = Number(String(v).replace(',', '.'))
        algum = true
      }
    }
    if (!algum) return avisar('Preencha pelo menos uma medida.')
    setSalvando(true)
    const { error } = await supabase.from('medidas').insert(registro)
    setSalvando(false)
    if (error) return avisar('Não foi possível salvar.')
    avisar('Medidas registradas.')
    aoSalvar()
  }

  return (
    <Modal titulo="Registrar medidas" aoFechar={aoFechar}>
      <form onSubmit={salvar} className="form-grade">
        <label className="campo campo-cheio">
          <span>Data</span>
          <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
        </label>
        {CAMPOS.map(([campo, nome, un]) => (
          <label key={campo} className="campo">
            <span>{nome} ({un})</span>
            <input inputMode="decimal" value={f[campo] || ''} onChange={(e) => setF({ ...f, [campo]: e.target.value })} />
          </label>
        ))}
        <label className="campo campo-cheio">
          <span>Observação</span>
          <input value={f.observacao || ''} onChange={(e) => setF({ ...f, observacao: e.target.value })} placeholder="Opcional" />
        </label>
        <button className="botao botao-cheio campo-cheio" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar medidas'}
        </button>
      </form>
    </Modal>
  )
}

export default function Corpo({ pessoa, editavel }) {
  const avisar = useAviso()
  const [medidas, setMedidas] = useState(null)
  const [fotos, setFotos] = useState([])
  const [urls, setUrls] = useState({})
  const [formAberto, setFormAberto] = useState(false)
  const [fotoAberta, setFotoAberta] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const entrada = useRef(null)

  const carregar = useCallback(async () => {
    const [m, f] = await Promise.all([
      supabase.from('medidas').select('*').eq('user_id', pessoa.id).order('data').order('criado_em'),
      supabase.from('fotos_evolucao').select('*').eq('user_id', pessoa.id).order('data', { ascending: false }),
    ])
    setMedidas(m.data || [])
    const listaFotos = f.data || []
    setFotos(listaFotos)
    if (listaFotos.length) {
      const { data } = await supabase.storage.from('evolucao').createSignedUrls(listaFotos.map((x) => x.caminho), 3600)
      const mapa = {}
      for (const item of data || []) if (item.signedUrl) mapa[item.path] = item.signedUrl
      setUrls(mapa)
    }
  }, [pessoa.id])

  useEffect(() => {
    setMedidas(null)
    carregar()
  }, [carregar])

  useEffect(() => ouvirSaude(`corpo-${pessoa.id}`, () => carregar(), ['medidas', 'fotos_evolucao']), [carregar, pessoa.id])

  async function enviarFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setEnviando(true)
    try {
      const blob = await comprimir(arquivo).catch(() => arquivo)
      const caminho = `${pessoa.id}/${Date.now()}.jpg`
      const up = await supabase.storage.from('evolucao').upload(caminho, blob, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { error } = await supabase.from('fotos_evolucao').insert({ user_id: pessoa.id, data: dataISO(), caminho })
      if (error) throw error
      avisar('Foto adicionada.')
      carregar()
    } catch {
      avisar('Não foi possível enviar a foto.')
    }
    setEnviando(false)
  }

  async function apagarFoto(foto) {
    if (!confirm('Apagar esta foto?')) return
    await supabase.storage.from('evolucao').remove([foto.caminho])
    await supabase.from('fotos_evolucao').delete().eq('id', foto.id)
    setFotoAberta(null)
    carregar()
  }

  async function apagarMedida(id) {
    if (!confirm('Apagar este registro de medidas?')) return
    await supabase.from('medidas').delete().eq('id', id)
    carregar()
  }

  if (!medidas) return <div className="carregando-bloco"><div className="carregando" /></div>

  // Último valor e primeiro valor de cada medida
  const atual = {}
  const inicial = {}
  for (const [campo] of CAMPOS) {
    const comValor = medidas.filter((m) => m[campo] != null)
    if (comValor.length) {
      inicial[campo] = Number(comValor[0][campo])
      atual[campo] = Number(comValor[comValor.length - 1][campo])
    }
  }
  const temMedidas = Object.keys(atual).length > 0
  const antes = fotos[fotos.length - 1]
  const depois = fotos[0]

  return (
    <div className="corpo">
      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Peso</h3>
          {editavel && (
            <button className="botao botao-pequeno botao-cheio" onClick={() => setFormAberto(true)}>
              <IconeMaisSimples tamanho={15} /> Registrar peso
            </button>
          )}
          {atual.peso_kg != null && (
            <span className="pequeno">
              <strong>{num(atual.peso_kg, 1)} kg</strong>
              {inicial.peso_kg !== atual.peso_kg && (
                <span className="suave"> · {atual.peso_kg < inicial.peso_kg ? '' : '+'}{num(atual.peso_kg - inicial.peso_kg, 1)} kg desde o início</span>
              )}
            </span>
          )}
        </div>
        <GraficoPeso medidas={medidas} />
      </section>

      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Medidas</h3>
          {editavel && (
            <button className="botao botao-pequeno" onClick={() => setFormAberto(true)}>
              <IconeMaisSimples tamanho={15} /> Registrar
            </button>
          )}
        </div>
        {temMedidas ? (
          <div className="tabela-medidas">
            {CAMPOS.filter(([c]) => atual[c] != null).map(([campo, nome, un]) => {
              const dif = atual[campo] - inicial[campo]
              return (
                <div key={campo} className="medida">
                  <span className="suave pequeno">{nome}</span>
                  <strong>{num(atual[campo], 1)} {un}</strong>
                  {dif !== 0 && <span className="pequeno">{dif > 0 ? '+' : ''}{num(dif, 1)}</span>}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="suave pequeno">Nenhuma medida registrada ainda.</p>
        )}
        {medidas.length > 0 && (
          <details className="historico">
            <summary className="pequeno">Histórico ({medidas.length})</summary>
            <ul>
              {[...medidas].reverse().map((m) => (
                <li key={m.id}>
                  <span className="pequeno"><strong>{dataCurta(m.data)}</strong></span>
                  <span className="pequeno suave">
                    {CAMPOS.filter(([c]) => m[c] != null).map(([c, n, u]) => `${n} ${num(m[c], 1)}${u}`).join(' · ')}
                  </span>
                  {editavel && (
                    <button className="botao-icone pequeno-icone" onClick={() => apagarMedida(m.id)} aria-label="Apagar">
                      <IconeLixo tamanho={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Fotos de evolução</h3>
          {editavel && (
            <>
              <button className="botao botao-pequeno" onClick={() => entrada.current?.click()} disabled={enviando}>
                <IconeCamera tamanho={15} /> {enviando ? 'Enviando...' : 'Adicionar'}
              </button>
              <input ref={entrada} type="file" accept="image/*" hidden onChange={enviarFoto} />
            </>
          )}
        </div>

        {fotos.length >= 2 && urls[antes.caminho] && urls[depois.caminho] && (
          <div className="antes-depois">
            <figure>
              <img src={urls[antes.caminho]} alt="Primeira foto" />
              <figcaption className="pequeno">Início · {dataCurta(antes.data)}</figcaption>
            </figure>
            <figure>
              <img src={urls[depois.caminho]} alt="Foto mais recente" />
              <figcaption className="pequeno">Agora · {dataCurta(depois.data)}</figcaption>
            </figure>
          </div>
        )}

        {fotos.length > 0 ? (
          <div className="galeria">
            {fotos.map((f) => (
              <button key={f.id} className="galeria-item" onClick={() => setFotoAberta(f)}>
                {urls[f.caminho] ? <img src={urls[f.caminho]} alt={`Foto de ${dataCurta(f.data)}`} loading="lazy" /> : <span />}
                <span className="galeria-data">{dataCurta(f.data)}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="suave pequeno">Nenhuma foto ainda. As fotos ficam privadas, só vocês dois veem.</p>
        )}
      </section>

      {formAberto && (
        <FormMedidas pessoa={pessoa} aoFechar={() => setFormAberto(false)} aoSalvar={() => { setFormAberto(false); carregar() }} />
      )}

      {fotoAberta && (
        <Modal
          titulo={dataCurta(fotoAberta.data)}
          aoFechar={() => setFotoAberta(null)}
          largo
          rodape={editavel && (
            <button className="botao" onClick={() => apagarFoto(fotoAberta)}>
              <IconeLixo tamanho={15} /> Apagar foto
            </button>
          )}
        >
          <img className="foto-grande" src={urls[fotoAberta.caminho]} alt="Foto de evolução" />
        </Modal>
      )}
    </div>
  )
}
