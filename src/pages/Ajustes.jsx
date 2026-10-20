import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useAviso } from '../components/Aviso'
import { lerTema, salvarTema } from '../lib/tema'
import { statusPush, ativarPush, desativarPush, enviarNotificacao, ehIOS, estaInstalado } from '../lib/push'
import { IconeCompartilhar } from '../components/Icones'

const textosStatus = {
  ativo: 'Ativadas neste aparelho.',
  inativo: 'Desativadas neste aparelho.',
  bloqueado: 'Bloqueadas. Libere nas configurações do aparelho para este app.',
  'sem-suporte': 'Este navegador não aceita notificações.',
  'instalar-primeiro': 'No iPhone, as notificações só funcionam com o app instalado na tela de início.',
}

function Secao({ titulo, children }) {
  return (
    <section className="ajustes-secao">
      <h2 className="titulo-bloco">{titulo}</h2>
      <div className="cartao">{children}</div>
    </section>
  )
}

export default function Ajustes() {
  const { usuario, perfil, parceiro, recarregarPerfis, sair } = useAuth()
  const avisar = useAviso()

  const [nome, setNome] = useState(perfil.nome || '')
  const [tema, setTema] = useState(lerTema())
  const [push, setPush] = useState(null)
  const [ocupado, setOcupado] = useState(null)
  const [novaSenha, setNovaSenha] = useState('')

  useEffect(() => {
    statusPush().then(setPush)
  }, [])

  async function salvarNome(e) {
    e.preventDefault()
    if (!nome.trim() || nome.trim() === perfil.nome) return
    const { error } = await supabase.from('profiles').update({ nome: nome.trim() }).eq('id', usuario.id)
    if (error) return avisar('Não foi possível salvar o nome.')
    await recarregarPerfis()
    avisar('Nome atualizado.')
  }

  function trocarTema(t) {
    setTema(t)
    salvarTema(t)
  }

  async function executar(chave, acao) {
    setOcupado(chave)
    try {
      await acao()
    } catch (e) {
      avisar(e.message || 'Algo deu errado.')
    }
    setOcupado(null)
    setPush(await statusPush())
  }

  const ativar = () =>
    executar('ativar', async () => {
      await ativarPush(usuario.id)
      avisar('Notificações ativadas neste aparelho.')
    })

  const desativar = () =>
    executar('desativar', async () => {
      await desativarPush()
      avisar('Notificações desativadas neste aparelho.')
    })

  const testar = () =>
    executar('testar', async () => {
      const r = await enviarNotificacao({
        para: 'eu',
        titulo: 'Teste do Nosso App',
        corpo: 'Se você está vendo isto, as notificações estão funcionando.',
        url: '/ajustes',
      })
      avisar(r.enviadas > 0 ? `Teste enviado para ${r.enviadas} aparelho(s).` : 'Nenhum aparelho seu com notificação ativada.')
    })

  const testarParceiro = () =>
    executar('testar-parceiro', async () => {
      const r = await enviarNotificacao({
        para: 'parceiro',
        titulo: 'Teste do Nosso App',
        corpo: `${perfil.nome} está testando as notificações.`,
        url: '/',
      })
      avisar(r.enviadas > 0 ? `Teste enviado para ${parceiro.nome}.` : `${parceiro.nome} ainda não ativou as notificações.`)
    })

  async function trocarSenha(e) {
    e.preventDefault()
    if (novaSenha.length < 6) return avisar('A senha precisa ter pelo menos 6 caracteres.')
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) return avisar('Não foi possível trocar a senha.')
    setNovaSenha('')
    avisar('Senha alterada.')
  }

  const mostrarInstalacao = !estaInstalado()

  return (
    <div className="ajustes">
      <header className="cabecalho">
        <h1 className="titulo-pagina">Ajustes</h1>
      </header>

      <Secao titulo="Perfil">
        <form onSubmit={salvarNome} className="linha-form">
          <label className="campo">
            <span>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} />
          </label>
          <button className="botao" disabled={!nome.trim() || nome.trim() === perfil.nome}>
            Salvar
          </button>
        </form>
        <p className="suave pequeno">{usuario.email}</p>
      </Secao>

      <Secao titulo="Aparência">
        <div className="segmentos" role="radiogroup" aria-label="Tema">
          {[
            ['claro', 'Claro'],
            ['escuro', 'Escuro'],
            ['sistema', 'Automático'],
          ].map(([valor, rotulo]) => (
            <button
              key={valor}
              role="radio"
              aria-checked={tema === valor}
              className={tema === valor ? 'ativo' : ''}
              onClick={() => trocarTema(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </Secao>

      <Secao titulo="Notificações">
        <div className="status-linha">
          <span className={`ponto ${push === 'ativo' ? 'ponto-on' : ''}`} />
          <span>{push ? textosStatus[push] : 'Verificando...'}</span>
        </div>

        <div className="botoes">
          {push === 'inativo' && (
            <button className="botao botao-cheio" onClick={ativar} disabled={!!ocupado}>
              {ocupado === 'ativar' ? 'Ativando...' : 'Ativar notificações'}
            </button>
          )}
          {push === 'ativo' && (
            <>
              <button className="botao botao-cheio" onClick={testar} disabled={!!ocupado}>
                {ocupado === 'testar' ? 'Enviando...' : 'Testar neste aparelho'}
              </button>
              <button className="botao" onClick={desativar} disabled={!!ocupado}>
                Desativar
              </button>
            </>
          )}
          {parceiro?.nome && (
            <button className="botao" onClick={testarParceiro} disabled={!!ocupado}>
              {ocupado === 'testar-parceiro' ? 'Enviando...' : `Testar no aparelho de ${parceiro.nome}`}
            </button>
          )}
        </div>
        <p className="suave pequeno">Ative em cada aparelho que vocês usam: celular e computador.</p>
      </Secao>

      {mostrarInstalacao && (
        <Secao titulo="Instalar na tela de início">
          {ehIOS() ? (
            <ol className="passos">
              <li>Abra este site no Safari.</li>
              <li>
                Toque em Compartilhar <IconeCompartilhar tamanho={15} className="inline" />.
              </li>
              <li>Escolha "Adicionar à Tela de Início".</li>
              <li>Abra o Nosso App pelo ícone e ative as notificações aqui.</li>
            </ol>
          ) : (
            <p className="suave">
              No Chrome ou Edge, clique no ícone de instalar na barra de endereço. No Android, use o menu
              do navegador e toque em "Instalar app".
            </p>
          )}
        </Secao>
      )}

      <Secao titulo="Segurança">
        <form onSubmit={trocarSenha} className="linha-form">
          <label className="campo">
            <span>Nova senha</span>
            <input
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          <button className="botao" disabled={!novaSenha}>
            Trocar
          </button>
        </form>
      </Secao>

      <button className="botao botao-largo" onClick={sair}>
        Sair da conta
      </button>
    </div>
  )
}
