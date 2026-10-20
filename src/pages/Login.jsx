import { useState } from 'react'
import { supabase } from '../lib/supabase'

function traduzirErro(msg = '') {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/email not confirmed/i.test(msg)) return 'Este e-mail ainda não foi confirmado.'
  if (/network|fetch/i.test(msg)) return 'Sem conexão. Tente de novo.'
  return 'Não foi possível entrar. Tente de novo.'
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) setErro(traduzirErro(error.message))
    setEnviando(false)
  }

  return (
    <div className="tela-cheia login">
      <div className="login-caixa">
        <svg className="login-aneis" width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="3">
            <circle cx="25" cy="32" r="13" />
            <circle cx="39" cy="32" r="13" />
          </g>
        </svg>
        <h1 className="login-titulo">Nosso App</h1>
        <p className="suave">Entre com o seu e-mail e senha.</p>

        <form onSubmit={entrar} className="formulario">
          <label className="campo">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button className="botao botao-cheio" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
