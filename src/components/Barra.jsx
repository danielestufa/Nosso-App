export default function Barra({ valor = 0, meta = 1, fina = false }) {
  const pct = meta > 0 ? Math.min(valor / meta, 1) * 100 : 0
  const passou = meta > 0 && valor > meta
  return (
    <div className={`barra ${fina ? 'barra-fina' : ''} ${passou ? 'barra-passou' : ''}`} role="progressbar"
      aria-valuenow={Math.round(valor)} aria-valuemax={meta}>
      <div className="barra-cheia" style={{ width: `${pct}%` }} />
    </div>
  )
}
