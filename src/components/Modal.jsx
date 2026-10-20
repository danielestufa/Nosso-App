import { useEffect } from 'react'
import { IconeFechar } from './Icones'

export default function Modal({ titulo, aoFechar, children, rodape, largo = false }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', tecla)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = anterior
    }
  }, [aoFechar])

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div
        className={`modal ${largo ? 'modal-largo' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-cabecalho">
          <span>{titulo}</span>
          <button className="botao-icone" onClick={aoFechar} aria-label="Fechar">
            <IconeFechar tamanho={20} />
          </button>
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  )
}
