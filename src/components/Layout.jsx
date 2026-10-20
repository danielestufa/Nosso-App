import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { secoes, barraInferior } from '../lib/navegacao'
import { useAviso } from './Aviso'
import { IconeMais, IconeFechar, IconeChat, IconeSair } from './Icones'

function Marca() {
  return (
    <div className="marca">
      <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeWidth="4">
          <circle cx="25" cy="32" r="13" />
          <circle cx="39" cy="32" r="13" />
        </g>
      </svg>
      <span>Nosso App</span>
    </div>
  )
}

export default function Layout() {
  const { usuario, perfil, parceiro, sair } = useAuth()
  const avisar = useAviso()
  const local = useLocation()
  const [maisAberto, setMaisAberto] = useState(false)

  useEffect(() => setMaisAberto(false), [local.pathname])

  // Notificações em tempo real enquanto o app está aberto
  useEffect(() => {
    if (!usuario) return
    const canal = supabase
      .channel(`notificacoes-${usuario.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `destinatario=eq.${usuario.id}` },
        (evento) => avisar(evento.new.corpo || '', { titulo: evento.new.titulo, duracao: 5000 })
      )
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [usuario, avisar])

  const atual = secoes.find((s) => s.rota === local.pathname) || secoes[0]
  const extras = secoes.filter((s) => !barraInferior.includes(s.rota))

  return (
    <div className="app">
      <aside className="lateral">
        <Marca />
        <nav className="lateral-nav">
          {secoes.map(({ rota, nome, Icone }) => (
            <NavLink key={rota} to={rota} end={rota === '/'} className="lateral-link">
              <Icone tamanho={19} />
              <span>{nome}</span>
            </NavLink>
          ))}
        </nav>
        <div className="lateral-rodape">
          <div className="casal">
            <span>{perfil?.nome}</span>
            <span className="casal-e">&</span>
            <span>{parceiro?.nome || '...'}</span>
          </div>
          <button className="botao-icone" onClick={sair} aria-label="Sair">
            <IconeSair tamanho={18} />
          </button>
        </div>
      </aside>

      <div className="conteudo">
        <header className="topo">
          <span className="topo-titulo">{atual.rota === '/' ? 'Nosso App' : atual.nome}</span>
          <NavLink to="/chat" className="botao-icone" aria-label="Chat">
            <IconeChat tamanho={20} />
          </NavLink>
        </header>

        <main className="pagina">
          <Outlet />
        </main>
      </div>

      <nav className="barra-inferior">
        {secoes
          .filter((s) => barraInferior.includes(s.rota))
          .map(({ rota, nome, Icone }) => (
            <NavLink key={rota} to={rota} end={rota === '/'} className="barra-link">
              <Icone tamanho={22} />
              <span>{nome}</span>
            </NavLink>
          ))}
        <button
          className={`barra-link ${extras.some((s) => s.rota === local.pathname) ? 'active' : ''}`}
          onClick={() => setMaisAberto(true)}
        >
          <IconeMais tamanho={22} />
          <span>Mais</span>
        </button>
      </nav>

      {maisAberto && (
        <div className="folha-fundo" onClick={() => setMaisAberto(false)}>
          <div className="folha" onClick={(e) => e.stopPropagation()}>
            <div className="folha-cabecalho">
              <span>Mais</span>
              <button className="botao-icone" onClick={() => setMaisAberto(false)} aria-label="Fechar">
                <IconeFechar tamanho={20} />
              </button>
            </div>
            {extras.map(({ rota, nome, Icone }) => (
              <NavLink key={rota} to={rota} className="folha-link">
                <Icone tamanho={20} />
                <span>{nome}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
