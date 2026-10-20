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
