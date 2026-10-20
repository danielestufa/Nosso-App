import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContexto = createContext(null)

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(undefined) // undefined = carregando
  const [perfil, setPerfil] = useState(null)
  const [parceiro, setParceiro] = useState(null)
  const [perfisProntos, setPerfisProntos] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setSessao(null)
      return
    }
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = sessao?.user?.id

  const recarregarPerfis = useCallback(async () => {
    if (!userId) {
      setPerfil(null)
      setParceiro(null)
      setPerfisProntos(true)
      return
    }
    const { data } = await supabase.from('profiles').select('*').order('criado_em')
    const lista = data || []
    setPerfil(lista.find((p) => p.id === userId) || { id: userId, nome: null })
    setParceiro(lista.find((p) => p.id !== userId) || null)
    setPerfisProntos(true)
  }, [userId])

  useEffect(() => {
    setPerfisProntos(false)
    recarregarPerfis()
  }, [recarregarPerfis])

  const valor = {
    sessao,
    usuario: sessao?.user || null,
    perfil,
    parceiro,
    perfisProntos,
    recarregarPerfis,
    sair: () => supabase.auth.signOut(),
  }

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>
}

export const useAuth = () => useContext(AuthContexto)
