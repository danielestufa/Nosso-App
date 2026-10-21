import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAviso } from '../../components/Aviso'
import { IconeLixo, IconeMaisSimples } from '../../components/Icones'
import { carregarMetas, salvarMetas, METAS_PADRAO } from '../../lib/saude'

const CAMPOS = [
  ['agua_ml', 'Água por dia', 'ml'],
  ['copo_ml', 'Tamanho do seu copo', 'ml'],
  ['calorias', 'Calorias por dia', 'kcal'],
  ['gasto_basal', 'Gasto natural do corpo (basal)', 'kcal por dia'],
  ['meta_gasto_exercicio', 'Meta de gasto em atividade', 'kcal por dia'],
  ['proteina_g', 'Proteína', 'g'],
  ['carboidrato_g', 'Carboidrato', 'g'],
  ['gordura_g', 'Gordura', 'g'],
  ['sono_horas', 'Sono', 'horas'],
  ['passos', 'Passos por dia', 'passos'],
  ['lembrete_agua_horas', 'Lembrete de água após', 'horas sem beber'],
]

export default function Metas({ usuarioId }) {
  const avisar = useAviso()
  const [metas, setMetas] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [suplementos, setSuplementos] = useState([])
  const [novoSup, setNovoSup] = useState({ nome: '', dose: '' })

  async function carregarSuplementos() {
    const { data } = await supabase.from('suplementos').select('*').eq('user_id', usuarioId).eq('ativo', true).order('criado_em')
    setSuplementos(data || [])
  }

  useEffect(() => {
    carregarMetas(usuarioId).then((m) => {
      const valores = {}
      for (const [c] of CAMPOS) valores[c] = m[c] == null ? '' : String(m[c])
      setMetas(valores)
    })
    carregarSuplementos()
  }, [usuarioId])

  async function salvar(e) {
    e.preventDefault()
    const final = {}
    for (const [c] of CAMPOS) {
      if (metas[c] === '' && (c === 'gasto_basal' || c === 'meta_gasto_exercicio')) {
        final[c] = null
        continue
      }
      const v = Number(String(metas[c]).replace(',', '.'))
      if (Number.isNaN(v) || v < 0) return avisar('Confira os valores digitados.')
      final[c] = c === 'sono_horas' ? v : Math.round(v)
    }
    setSalvando(true)
    try {
      await salvarMetas(usuarioId, final)
      avisar('Metas salvas.')
    } catch {
      avisar('Não foi possível salvar.')
    }
    setSalvando(false)
  }

  async function addSuplemento(e) {
    e.preventDefault()
    if (!novoSup.nome.trim()) return
    const { error } = await supabase.from('suplementos').insert({
      user_id: usuarioId,
      nome: novoSup.nome.trim(),
      dose: novoSup.dose.trim() || null,
    })
    if (error) return avisar('Não foi possível adicionar.')
    setNovoSup({ nome: '', dose: '' })
    carregarSuplementos()
  }

  async function removerSuplemento(id) {
    await supabase.from('suplementos').update({ ativo: false }).eq('id', id)
    carregarSuplementos()
  }

  if (!metas) return <div className="carregando-bloco"><div className="carregando" /></div>

  return (
    <div className="metas">
      <section className="cartao">
        <h3 className="cartao-titulo">Minhas metas</h3>
        <p className="suave pequeno">Cada um define as suas. O seu par consegue ver, mas só você altera.</p>
        <form onSubmit={salvar} className="form-grade">
          {CAMPOS.map(([campo, nome, un]) => (
            <label key={campo} className="campo">
              <span>{nome} ({un})</span>
              <input
                inputMode="decimal"
                value={metas[campo]}
                onChange={(e) => setMetas({ ...metas, [campo]: e.target.value })}
              />
            </label>
          ))}
          <p className="suave pequeno campo-cheio">
            Gasto natural: quanto o seu corpo gasta por dia sem treino (taxa metabólica basal ou o gasto total que você calculou). É usado no balanço de calorias.
          </p>
          <p className="suave pequeno campo-cheio">
            Lembrete de água: das 9h às 21h, se passar esse tempo sem registrar, você e seu par recebem um aviso. Coloque 0 para desligar.
          </p>
          <button className="botao botao-cheio campo-cheio" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar metas'}
          </button>
        </form>
      </section>

      <section className="cartao">
        <h3 className="cartao-titulo">Suplementos e vitaminas</h3>
        <p className="suave pequeno">Aparecem como checklist diário na aba Hoje.</p>
        {suplementos.length > 0 && (
          <ul className="lista-simples">
            {suplementos.map((s) => (
              <li key={s.id}>
                <span>{s.nome}{s.dose && <span className="suave"> · {s.dose}</span>}</span>
                <button className="botao-icone pequeno-icone" onClick={() => removerSuplemento(s.id)} aria-label="Remover">
                  <IconeLixo tamanho={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addSuplemento} className="linha-form linha-form-quebra">
          <label className="campo">
            <span>Nome</span>
            <input value={novoSup.nome} onChange={(e) => setNovoSup({ ...novoSup, nome: e.target.value })} placeholder="Creatina" />
          </label>
          <label className="campo">
            <span>Dose</span>
            <input value={novoSup.dose} onChange={(e) => setNovoSup({ ...novoSup, dose: e.target.value })} placeholder="3 g" />
          </label>
          <button className="botao" disabled={!novoSup.nome.trim()}>
            <IconeMaisSimples tamanho={15} /> Adicionar
          </button>
        </form>
      </section>
    </div>
  )
}
