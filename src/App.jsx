import { Navigate, Route, Routes } from 'react-router-dom'
import { configurado } from './lib/supabase'
import { useAuth } from './lib/auth'
import { secoes } from './lib/navegacao'
import Layout from './components/Layout'
import Login from './pages/Login'
import BoasVindas from './pages/BoasVindas'
import Inicio from './pages/Inicio'
import Ajustes from './pages/Ajustes'
import EmBreve from './pages/EmBreve'
import Saude from './pages/saude/Saude'
import Treinos from './pages/treinos/Treinos'
import Desafios from './pages/desafios/Desafios'
import Leitura from './pages/leitura/Leitura'
import ConfiguracaoPendente from './pages/ConfiguracaoPendente'

function Carregando() {
  return (
    <div className="tela-cheia">
      <div className="carregando" aria-label="Carregando" />
    </div>
  )
}

export default function App() {
  const { sessao, perfil, perfisProntos } = useAuth()

  if (!configurado) return <ConfiguracaoPendente />
  if (sessao === undefined) return <Carregando />
  if (!sessao) return <Login />
  if (!perfisProntos) return <Carregando />
  if (!perfil?.nome) return <BoasVindas />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="saude" element={<Saude />} />
        <Route path="treinos" element={<Treinos />} />
        <Route path="desafios" element={<Desafios />} />
        <Route path="leitura" element={<Leitura />} />
        {secoes
          .filter((s) => s.fase && !s.pronta)
          .map((s) => (
            <Route key={s.rota} path={s.rota.slice(1)} element={<EmBreve secao={s} />} />
          ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
