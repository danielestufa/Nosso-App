// Anel de progresso
export default function Anel({ valor = 0, meta = 1, tamanho = 120, espessura = 8, children }) {
  const r = (tamanho - espessura) / 2
  const c = 2 * Math.PI * r
  const pct = meta > 0 ? Math.min(valor / meta, 1) : 0
  return (
    <div className="anel" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} aria-hidden="true">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="var(--linha)" strokeWidth={espessura} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          stroke="var(--linha-forte)"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="anel-centro">{children}</div>
    </div>
  )
}
