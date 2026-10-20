import {
  IconeInicio, IconeSaude, IconeTreino, IconeDesafio, IconeLeitura,
  IconeFinancas, IconeNoivos, IconeChat, IconeAjustes,
} from '../components/Icones'

export const secoes = [
  { rota: '/', nome: 'Início', Icone: IconeInicio },
  {
    rota: '/saude', nome: 'Saúde', Icone: IconeSaude, fase: 2, pronta: true,
    resumo: 'Água, alimentação por refeição, calorias e macros, açúcar, sono, passos, medidas e fotos de evolução.',
  },
  {
    rota: '/treinos', nome: 'Treinos', Icone: IconeTreino, fase: 3, pronta: true,
    resumo: 'As fichas de cada um, carga com histórico, gráficos de evolução e os treinos lado a lado.',
  },
  {
    rota: '/desafios', nome: 'Desafios', Icone: IconeDesafio, fase: 4,
    resumo: 'Desafios entre vocês e juntos, com vidas, ranking, aposta e prenda para quem recusar.',
  },
  {
    rota: '/leitura', nome: 'Leitura', Icone: IconeLeitura, fase: 5,
    resumo: 'Livros, progresso diário, livro lido a dois e planos de leitura da Bíblia.',
  },
  {
    rota: '/financas', nome: 'Finanças', Icone: IconeFinancas, fase: 6,
    resumo: 'Finanças pessoais e compartilhadas, contas, cartões, parcelas, caixinhas e quem deve para quem.',
  },
  {
    rota: '/noivos', nome: 'Noivos', Icone: IconeNoivos, fase: 7,
    resumo: 'Checklist do casamento, fornecedores, pagamentos personalizados e lista de convidados.',
  },
  {
    rota: '/chat', nome: 'Chat', Icone: IconeChat, fase: 8,
    resumo: 'Conversa só de vocês dois, com fotos, links e áudios.',
  },
  { rota: '/ajustes', nome: 'Ajustes', Icone: IconeAjustes },
]

// Barra inferior no celular
export const barraInferior = ['/', '/saude', '/treinos', '/desafios']
