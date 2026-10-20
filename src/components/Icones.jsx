// Ícones de traço fino, monocromáticos
const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const I = (caminhos) =>
  function Icone({ tamanho = 22, ...props }) {
    return (
      <svg {...base} width={tamanho} height={tamanho} aria-hidden="true" {...props}>
        {caminhos}
      </svg>
    )
  }

export const IconeInicio = I(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></>)
export const IconeSaude = I(<><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /><path d="M7.5 12h2.5l1.5-2.5 2 4 1.5-1.5h1.5" /></>)
export const IconeTreino = I(<><path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" /></>)
export const IconeDesafio = I(<><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" /></>)
export const IconeLeitura = I(<><path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z" /><path d="M12 6.5v13" /></>)
export const IconeFinancas = I(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /><path d="M6 6V4.5h11V6" /></>)
export const IconeNoivos = I(<><circle cx="9" cy="13" r="5.5" /><circle cx="15" cy="13" r="5.5" /><path d="M10.5 4.5 12 3l1.5 1.5L12 6z" /></>)
export const IconeChat = I(<><path d="M4 5h16v11H9l-5 4V5z" /></>)
export const IconeAjustes = I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>)
export const IconeMais = I(<><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>)
export const IconeSino = I(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>)
export const IconeSair = I(<><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>)
export const IconeFechar = I(<><path d="M6 6l12 12M18 6 6 18" /></>)
export const IconeSeta = I(<><path d="M9 6l6 6-6 6" /></>)
export const IconeGota = I(<><path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z" /></>)
export const IconeCoracao = I(<><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></>)
export const IconeCompartilhar = I(<><path d="M12 15V3M8 7l4-4 4 4" /><path d="M5 11v9h14v-9" /></>)
export const IconeMaisSimples = I(<><path d="M12 5v14M5 12h14" /></>)
export const IconeMenos = I(<><path d="M5 12h14" /></>)
export const IconeLixo = I(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>)
export const IconeVoltar = I(<><path d="M15 6l-6 6 6 6" /></>)
export const IconeBusca = I(<><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>)
export const IconeCamera = I(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>)
export const IconeLua = I(<><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></>)
export const IconePassos = I(<><path d="M8 3c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM6 15h4v2a2 2 0 0 1-4 0zM16 7c2 0 3 2 3 5s-1 5-3 5-3-2-3-5 1-5 3-5zM14 19h4v1a2 2 0 0 1-4 0z" /></>)
export const IconeCheck = I(<><path d="M5 12.5l4.5 4.5L19 7.5" /></>)
export const IconeLapis = I(<><path d="M4 20h4L19 9l-4-4L4 16z" /></>)
