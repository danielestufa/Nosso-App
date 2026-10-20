export default function EmBreve({ secao }) {
  const { nome, resumo, fase, Icone } = secao
  return (
    <div className="em-breve">
      <div className="em-breve-icone">
        <Icone tamanho={30} />
      </div>
      <p className="rotulo">Fase {fase}</p>
      <h1 className="titulo-pagina">{nome}</h1>
      <p className="suave em-breve-texto">{resumo}</p>
      <p className="em-breve-selo">Em construção</p>
    </div>
  )
}
