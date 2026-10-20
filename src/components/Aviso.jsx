import { createContext, useCallback, useContext, useState } from 'react'

const AvisoContexto = createContext(() => {})

export function AvisoProvider({ children }) {
  const [avisos, setAvisos] = useState([])

  const avisar = useCallback((texto, { titulo, duracao = 3200 } = {}) => {
    const id = Math.random().toString(36).slice(2)
    setAvisos((lista) => [...lista, { id, texto, titulo }])
    setTimeout(() => setAvisos((lista) => lista.filter((a) => a.id !== id)), duracao)
  }, [])

  return (
    <AvisoContexto.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className="aviso">
            {a.titulo && <strong>{a.titulo}</strong>}
            <span>{a.texto}</span>
          </div>
        ))}
      </div>
    </AvisoContexto.Provider>
  )
}

export const useAviso = () => useContext(AvisoContexto)
