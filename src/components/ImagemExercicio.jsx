import { useEffect, useState } from 'react'
import { urlImagem } from '../lib/treinos'
import { IconeTreino } from './Icones'

// Alterna a foto inicial e a final do movimento, como um GIF
export default function ImagemExercicio({ imagem, nome, tamanho = 'grande', animar = true }) {
  const [quadro, setQuadro] = useState(0)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    setErro(false)
    setQuadro(0)
    if (!imagem || !animar) return
    const t = setInterval(() => setQuadro((q) => (q ? 0 : 1)), 900)
    return () => clearInterval(t)
  }, [imagem, animar])

  if (!imagem || erro) {
    return (
      <div className={`img-exercicio img-exercicio-${tamanho} img-vazia`} aria-hidden="true">
        <IconeTreino tamanho={tamanho === 'mini' ? 18 : 28} />
      </div>
    )
  }

  return (
    <div className={`img-exercicio img-exercicio-${tamanho}`}>
      {[0, 1].map((n) => (
        <img
          key={n}
          src={urlImagem(imagem, n)}
          alt={n === 0 ? `Execução: ${nome}` : ''}
          loading="lazy"
          onError={() => setErro(true)}
          style={{ opacity: quadro === n ? 1 : 0 }}
        />
      ))}
    </div>
  )
}
