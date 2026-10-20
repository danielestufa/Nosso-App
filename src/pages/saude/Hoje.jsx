import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import Anel from '../../components/Anel'
import Barra from '../../components/Barra'
import AdicionarAlimento from './AdicionarAlimento'
import { enviarNotificacao } from '../../lib/push'
import { IconeMaisSimples, IconeLixo, IconeGota, IconeLua, IconePassos, IconeCheck } from '../../components/Icones'
import {
  REFEICOES, carregarDia, carregarMetas, carregarSemana, resumir, salvarDia, ouvirSaude,
  refeicaoDoHorario, dataISO, num,
} from '../../lib/saude'

function hora(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function Semana({ dias, metas }) {
  const maxAgua = Math.max(metas.agua_ml, ...dias.map((d) => d.aguaMl), 1)
  const maxKcal = Math.max(metas.calorias, ...dias.map((d) => d.kcal), 1)
  const letra = (iso) => {
    const [a, m, d] = iso.split('-').map(Number)
    return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'narrow' }).toUpperCase()
  }
  const hoje = dataISO()
  const media = (campo) => Math.round(dias.reduce((s, d) => s + d[campo], 0) / dias.length)

  const Grafico = ({ campo, max, meta, unidade }) => (
    <div className="semana-grafico">
      <div className="semana-barras">
        <div className="semana-meta" style={{ bottom: `${(meta / max) * 100}%` }} />
        {dias.map((d) => (
          <div key={d.data} className="semana-coluna" title={`${num(d[campo])} ${unidade}`}>
            <div className={`semana-barra ${d[campo] >= meta ? 'cheia' : ''}`} style={{ height: `${(d[campo] / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="semana-dias">
        {dias.map((d) => (
          <span key={d.data} className={d.data === hoje ? 'hoje' : ''}>{letra(d.data)}</span>
        ))}
      </div>
    </div>
  )

  return (
    <section className="cartao">
      <div className="cartao-topo">
        <h3 className="cartao-titulo">Últimos 7 dias</h3>
      </div>
      <div className="semana">
        <div>
          <p className="pequeno">Água <span className="suave">· média {num(media('aguaMl'))} ml</span></p>
          <Grafico campo="aguaMl" max={maxAgua} meta={metas.agua_ml} unidade="ml" />
        </div>
        <div>
          <p className="pequeno">Calorias <span className="suave">· média {num(media('kcal'))} kcal</span></p>
          <Grafico campo="kcal" max={maxKcal} meta={metas.calorias} unidade="kcal" />
        </div>
      </div>
      <p className="suave pequeno">A linha tracejada é a meta. Barra cheia = meta batida.</p>
    </section>
  )
}

export default function Hoje({ pessoa, eu, data, editavel }) {
  const avisar = useAviso()
  const [dados, setDados] = useState(null)
  const [metas, setMetas] = useState(null)
  const [semana, setSemana] = useState(null)
  const [modalRefeicao, setModalRefeicao] = useState(null)
  const [aguaOutro, setAguaOutro] = useState('')
  const [mostrarOutro, setMostrarOutro] = useState(false)
  const [sono, setSono] = useState('')
  const [passos, setPassos] = useState('')
  const [descAcucar, setDescAcucar] = useState('')

  const carregar = useCallback(async () => {
    const [d, m, s] = await Promise.all([carregarDia(pessoa.id, data), carregarMetas(pessoa.id), carregarSemana(pessoa.id, data)])
    setDados(d)
    setMetas(m)
    setSemana(s)
    setSono(d.dia?.sono_horas ?? '')
    setPassos(d.dia?.passos ?? '')
    setDescAcucar(d.dia?.acucar_descricao ?? '')
  }, [pessoa.id, data])

  useEffect(() => {
    setDados(null)
    carregar()
  }, [carregar])

  useEffect(() => ouvirSaude(`hoje-${pessoa.id}`, () => carregar()), [carregar, pessoa.id])

  if (!dados || !metas) {
    return <div className="carregando-bloco"><div className="carregando" /></div>
  }

  const r = resumir(dados)
  const copos = Math.floor(r.aguaMl / metas.copo_ml)

  async function addAgua(ml) {
    const valor = Math.round(Number(ml))
    if (!valor || valor <= 0) return
    const { error } = await supabase.from('registros_agua').insert({ user_id: pessoa.id, data, ml: valor })
    if (error) return avisar('Não foi possível registrar.')
    setMostrarOutro(false)
    setAguaOutro('')
    carregar()
  }

  async function apagar(tabela, id) {
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) return avisar('Não foi possível apagar.')
    carregar()
  }

  async function salvarCampoDia(campos) {
    try {
      await salvarDia(pessoa.id, data, campos)
      carregar()
    } catch {
      avisar('Não foi possível salvar.')
    }
  }

  async function marcarSuplemento(sup, tomado) {
    if (tomado) {
      await supabase.from('suplementos_tomados').delete().eq('suplemento_id', sup.id).eq('data', data)
    } else {
      await supabase.from('suplementos_tomados').insert({ suplemento_id: sup.id, data, user_id: pessoa.id })
    }
    carregar()
  }

  async function lembrarAgua() {
    try {
      const res = await enviarNotificacao({
        para: 'parceiro',
        titulo: `${eu.nome} te lembrou`,
        corpo: 'Bora beber um copo de água agora!',
        url: '/saude',
      })
      avisar(res.dispositivos ? `Lembrete enviado para ${pessoa.nome}.` : `${pessoa.nome} ainda não ativou as notificações.`)
    } catch (e) {
      avisar(e.message)
    }
  }

  const refeicoesVisiveis = REFEICOES.filter(
    (ref) => ref.id !== 'extra' || dados.itens.some((i) => i.refeicao === 'extra')
  )

  return (
    <div className="saude-hoje">
      {/* Resumo */}
      <section className="resumo-saude">
        <div className="cartao resumo-agua">
          <Anel valor={r.aguaMl} meta={metas.agua_ml} tamanho={132} espessura={9}>
            <strong className="anel-valor">{num(r.aguaMl / 1000, 2)} L</strong>
            <span className="suave pequeno">de {num(metas.agua_ml / 1000, 1)} L</span>
          </Anel>
          <p className="suave pequeno">{copos} {copos === 1 ? 'copo' : 'copos'} de {metas.copo_ml} ml</p>
        </div>

        <div className="cartao resumo-calorias">
          <div>
            <p className="rotulo">Calorias</p>
            <p className="numero-grande">
              {num(r.kcal)} <span className="suave">/ {num(metas.calorias)}</span>
            </p>
            <Barra valor={r.kcal} meta={metas.calorias} />
            <p className="suave pequeno">
              {r.kcal <= metas.calorias
                ? `Faltam ${num(metas.calorias - r.kcal)} kcal`
                : `${num(r.kcal - metas.calorias)} kcal acima da meta`}
            </p>
          </div>
          <div className="macros">
            {[
              ['Proteína', r.proteina, metas.proteina_g],
              ['Carboidrato', r.carboidrato, metas.carboidrato_g],
              ['Gordura', r.gordura, metas.gordura_g],
            ].map(([nome, v, m]) => (
              <div key={nome} className="macro">
                <div className="macro-topo">
                  <span>{nome}</span>
                  <span className="suave">{num(v)} / {m} g</span>
                </div>
                <Barra valor={v} meta={m} fina />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Água */}
      <section className="cartao">
        <div className="cartao-topo">
          <h3 className="cartao-titulo"><IconeGota tamanho={18} /> Água</h3>
          <span className="suave pequeno">{num(r.aguaMl)} ml</span>
        </div>
        {editavel ? (
          <div className="botoes">
            <button className="botao botao-cheio" onClick={() => addAgua(metas.copo_ml)}>
              <IconeMaisSimples tamanho={16} /> 1 copo ({metas.copo_ml} ml)
            </button>
            <button className="botao" onClick={() => addAgua(500)}>+ 500 ml</button>
            <button className="botao" onClick={() => setMostrarOutro((v) => !v)}>Outro</button>
          </div>
        ) : (
          <div className="botoes">
            <button className="botao" onClick={lembrarAgua}>Lembrar {pessoa.nome} de beber água</button>
          </div>
        )}
        {mostrarOutro && editavel && (
          <form className="linha-form" onSubmit={(e) => { e.preventDefault(); addAgua(aguaOutro) }}>
            <label className="campo">
              <span>Quantidade (ml)</span>
              <input inputMode="numeric" value={aguaOutro} onChange={(e) => setAguaOutro(e.target.value)} autoFocus />
            </label>
            <button className="botao botao-cheio">Registrar</button>
          </form>
        )}
        {dados.agua.length > 0 && (
          <div className="registros-agua">
            {dados.agua.map((a) => (
              <span key={a.id} className="registro-agua">
                {hora(a.criado_em)} · {a.ml} ml
                {editavel && (
                  <button onClick={() => apagar('registros_agua', a.id)} aria-label="Apagar">
                    <IconeLixo tamanho={13} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Refeições */}
      <section className="refeicoes">
        {refeicoesVisiveis.map((ref) => {
          const itens = dados.itens.filter((i) => i.refeicao === ref.id)
          const total = itens.reduce((s, i) => s + Number(i.kcal), 0)
          return (
            <div key={ref.id} className="cartao refeicao">
              <div className="cartao-topo">
                <h3 className="cartao-titulo">{ref.nome}</h3>
                <span className="suave pequeno">{num(total)} kcal</span>
              </div>
              {itens.length > 0 && (
                <ul className="itens-refeicao">
                  {itens.map((i) => (
                    <li key={i.id}>
                      <div className="item-texto">
                        <span>
                          {i.nome}
                          {i.contem_acucar && <span className="selo-mini">açúcar</span>}
                        </span>
                        <span className="suave pequeno">
                          {num(i.gramas)} g · P {num(i.proteina)} · C {num(i.carboidrato)} · G {num(i.gordura)}
                        </span>
                      </div>
                      <span className="item-kcal">{num(i.kcal)}</span>
                      {editavel && (
                        <button className="botao-icone pequeno-icone" onClick={() => apagar('refeicao_itens', i.id)} aria-label="Remover">
                          <IconeLixo tamanho={15} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!itens.length && !editavel && <p className="suave pequeno">Nada registrado.</p>}
              {editavel && (
                <button className="adicionar-item" onClick={() => setModalRefeicao(ref.id)}>
                  <IconeMaisSimples tamanho={16} /> Adicionar
                </button>
              )}
            </div>
          )
        })}
        {editavel && !dados.itens.some((i) => i.refeicao === 'extra') && (
          <button className="botao botao-texto" onClick={() => setModalRefeicao('extra')}>
            + Comi fora de hora
          </button>
        )}
      </section>

      {/* Açúcar */}
      <section className={`cartao acucar ${r.comeuAcucar ? 'acucar-sim' : ''}`}>
        <div className="cartao-topo">
          <h3 className="cartao-titulo">Açúcar</h3>
          <span className="selo">{r.comeuAcucar ? 'Comeu açúcar' : 'Sem açúcar'}</span>
        </div>
        {r.nomesAcucar.length > 0 && (
          <p className="pequeno">Pela alimentação: {r.nomesAcucar.join(', ')}.</p>
        )}
        {!editavel && dados.dia?.acucar_manual && (
          <p className="pequeno">Marcou: {r.acucarDescricao || 'comeu doce'}.</p>
        )}
        {editavel && (
          <>
            <label className="caixa-marcar">
              <input
                type="checkbox"
                checked={dados.dia?.acucar_manual === true}
                onChange={(e) => salvarCampoDia({ acucar_manual: e.target.checked })}
              />
              <span>Comi doce ou açúcar que não registrei nas refeições</span>
            </label>
            {dados.dia?.acucar_manual && (
              <label className="campo">
                <span>O que foi?</span>
                <input
                  value={descAcucar}
                  onChange={(e) => setDescAcucar(e.target.value)}
                  onBlur={() => descAcucar !== (dados.dia?.acucar_descricao ?? '') && salvarCampoDia({ acucar_descricao: descAcucar })}
                  placeholder="Ex.: um pedaço de bolo no aniversário"
                />
              </label>
            )}
          </>
        )}
      </section>

      {/* Sono e passos */}
      <section className="dupla-cartoes">
        <div className="cartao">
          <h3 className="cartao-titulo"><IconeLua tamanho={18} /> Sono</h3>
          {editavel ? (
            <label className="campo campo-unidade">
              <input
                inputMode="decimal"
                value={sono}
                placeholder="0"
                onChange={(e) => setSono(e.target.value)}
                onBlur={() => salvarCampoDia({ sono_horas: sono === '' ? null : Number(String(sono).replace(',', '.')) })}
              />
              <span>horas</span>
            </label>
          ) : (
            <p className="numero-medio">{r.sono != null ? `${num(r.sono, 1)} h` : 'Sem registro'}</p>
          )}
          <Barra valor={Number(r.sono || 0)} meta={Number(metas.sono_horas)} fina />
          <p className="suave pequeno">Meta: {num(metas.sono_horas, 1)} h</p>
        </div>
        <div className="cartao">
          <h3 className="cartao-titulo"><IconePassos tamanho={18} /> Passos</h3>
          {editavel ? (
            <label className="campo campo-unidade">
              <input
                inputMode="numeric"
                value={passos}
                placeholder="0"
                onChange={(e) => setPassos(e.target.value)}
                onBlur={() => salvarCampoDia({ passos: passos === '' ? null : Math.round(Number(passos)) })}
              />
              <span>passos</span>
            </label>
          ) : (
            <p className="numero-medio">{r.passos != null ? num(r.passos) : 'Sem registro'}</p>
          )}
          <Barra valor={Number(r.passos || 0)} meta={metas.passos} fina />
          <p className="suave pequeno">Meta: {num(metas.passos)}</p>
        </div>
      </section>

      {/* Suplementos */}
      {dados.suplementos.length > 0 && (
        <section className="cartao">
          <h3 className="cartao-titulo">Suplementos e vitaminas</h3>
          <ul className="lista-check">
            {dados.suplementos.map((s) => {
              const tomado = dados.tomados.some((t) => t.suplemento_id === s.id)
              return (
                <li key={s.id}>
                  <button
                    className={`check ${tomado ? 'feito' : ''}`}
                    onClick={() => editavel && marcarSuplemento(s, tomado)}
                    disabled={!editavel}
                    aria-pressed={tomado}
                  >
                    <span className="check-caixa">{tomado && <IconeCheck tamanho={14} />}</span>
                    <span>{s.nome}</span>
                    {s.dose && <span className="suave pequeno">{s.dose}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {semana && <Semana dias={semana} metas={metas} />}

      {modalRefeicao && (
        <AdicionarAlimento
          userId={pessoa.id}
          data={data}
          refeicaoInicial={modalRefeicao === 'auto' ? refeicaoDoHorario() : modalRefeicao}
          aoFechar={() => setModalRefeicao(null)}
          aoAdicionar={carregar}
        />
      )}
    </div>
  )
}
