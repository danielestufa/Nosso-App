import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function BoasVindas() {
  const { usuario, recarregarPerfis, sair } = useAuth()
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    setErro('')
    const { error } = await supabase.from('profiles').update({ nome: nome.trim() }).eq('id', usuario.id)
    if (error) {
      setErro('Não foi possível salvar. Confira se o banco de dados foi configurado.')
      setSalvando(false)
      return
    }
    await recarregarPerfis()
  }

  return (
    <div className="tela-cheia login">
      <div className="login-caixa">
        <h1 className="login-titulo">Bem-vindo(a)</h1>
        <p className="suave">Como você quer ser chamado(a) no app?</p>
        <form onSubmit={salvar} className="formulario">
          <label className="campo">
            <span>Seu nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Dan" autoFocus />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button className="botao botao-cheio" disabled={salvando || !nome.trim()}>
            {salvando ? 'Salvando...' : 'Continuar'}
          </button>
          <button type="button" className="botao botao-texto" onClick={sair}>
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
