export type DemoAgent = "sara" | "anderley";
export type DemoStage = "Em atendimento" | "Qualificado" | "Encaminhado" | "Reunião marcada";

export interface DemoMessage {
  id: string;
  from: "contact" | "agent";
  text: string;
  time: string;
}

export interface DemoConversation {
  id: string;
  agent: DemoAgent;
  name: string;
  organization: string;
  subject: string;
  date: string;
  stage: DemoStage;
  origin: string;
  unread: number;
  context: Array<[string, string]>;
  nextStep: string;
  suggestion: string;
  response: string;
  messages: DemoMessage[];
}

export const DEMO_AGENTS = {
  sara: { name: "Sara", initials: "SA", role: "Atendimento e qualificação" },
  anderley: { name: "Anderley", initials: "AN", role: "Qualificação e continuidade" },
} as const;

const history = (id: string, items: Array<[DemoMessage["from"], string, string]>) =>
  items.map(([from, time, text], index) => ({ id: `${id}-${index}`, from, time, text }));

export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: "marina", agent: "sara", name: "Marina Costa", organization: "Horizonte Engenharia", subject: "Mobilidade corporativa",
    date: "27 nov. 2026", stage: "Qualificado", origin: "Formulário do site", unread: 2,
    context: [["Contato", "RH corporativo"], ["Demanda", "3 engenheiros para o Brasil"], ["Prazo informado", "Fevereiro de 2027"]],
    nextStep: "Confirmar o interesse em uma reunião com o time de mobilidade.",
    suggestion: "Podemos marcar uma conversa na semana que vem?",
    response: "Sim. Para adiantar a conversa, podemos organizar o escopo da transferência e os prazos de cada profissional. Qual período da semana que vem costuma funcionar melhor para você?",
    messages: history("marina", [
      ["contact", "09:12", "Bom dia! Sou do RH da Horizonte Engenharia. Precisamos trazer três engenheiros de Portugal para um projeto no Brasil."],
      ["agent", "09:12", "Bom dia, Marina! Sou a Sara, assistente virtual da Target Relocation. Qual é a data prevista para o início do projeto?"],
      ["contact", "09:14", "A ideia é que eles comecem em fevereiro. Ainda estamos definindo os contratos."],
      ["agent", "09:14", "Entendi: três engenheiros de Portugal, com início previsto em fevereiro. Como os contratos ainda estão em definição, vale revisar o enquadramento e o cronograma antes de fechar as datas. Você quer conversar com um especialista?"],
    ]),
  },
  {
    id: "rafael", agent: "sara", name: "Rafael Moura", organization: "Atlas Alimentos", subject: "Transferência de executivo",
    date: "27 nov. 2026", stage: "Em atendimento", origin: "Google Ads", unread: 0,
    context: [["Contato", "Equipe de operações"], ["Demanda", "Transferência de executivo"], ["Destinos", "México → Brasil"]],
    nextStep: "Entender a duração da transferência para encaminhar a avaliação.",
    suggestion: "A transferência deve durar cerca de dois anos.",
    response: "Obrigada, Rafael. Vou considerar uma transferência de cerca de dois anos. A equipe técnica pode analisar o enquadramento com base no vínculo e na função do executivo. Vocês já têm uma data prevista de chegada?",
    messages: history("rafael", [
      ["contact", "08:46", "Olá! Temos um executivo no México e estamos planejando transferi-lo para o Brasil."],
      ["agent", "08:46", "Olá, Rafael. Sou a Sara, da Target Relocation. A transferência tem uma duração prevista ou o plano é que ele permaneça no Brasil por tempo indeterminado?"],
    ]),
  },
  {
    id: "bianca", agent: "sara", name: "Bianca Nunes", organization: "Pórtico Tecnologia", subject: "Atendimento encaminhado",
    date: "26 nov. 2026", stage: "Encaminhado", origin: "WhatsApp do site", unread: 0,
    context: [["Contato", "Global Mobility"], ["Demanda", "Reunião familiar"], ["Responsável", "Anderley"]],
    nextStep: "Anderley retoma o contato com o contexto já coletado.",
    suggestion: "Por favor, peça para me procurarem à tarde.",
    response: "Entendido, Bianca. A preferência é falar à tarde. O responsável já tem o contexto da sua conversa sobre reunião familiar.",
    messages: history("bianca", [
      ["contact", "15:30", "Precisamos avaliar a vinda do cônjuge de uma colaboradora transferida. Posso explicar com mais calma amanhã."],
      ["agent", "15:31", "Claro, Bianca. Vou encaminhar o contexto da reunião familiar ao Anderley para que vocês possam retomar do ponto em que pararam."],
      ["contact", "15:32", "Ótimo, obrigada."],
    ]),
  },
  {
    id: "helena", agent: "anderley", name: "Helena Duarte", organization: "Vértice Energia", subject: "Reunião de qualificação",
    date: "27 nov. 2026", stage: "Reunião marcada", origin: "Encaminhamento da Sara", unread: 1,
    context: [["Contato", "People & Culture"], ["Demanda", "Mobilidade de equipe técnica"], ["Reunião", "30 nov. • 14h30"]],
    nextStep: "Levar o escopo e as datas previstas à reunião de qualificação.",
    suggestion: "Quais informações devo levar para a reunião?",
    response: "Para a reunião, basta levar o número de profissionais, as funções e as datas estimadas de chegada. Se o vínculo contratual já estiver definido, essa informação também ajuda. Vocês podem deixar os documentos pessoais para uma etapa posterior.",
    messages: history("helena", [
      ["agent", "10:21", "Olá, Helena! Sou o Anderley, assistente virtual da Target. A Sara compartilhou o contexto da mobilidade da equipe técnica. Podemos conversar sobre o cronograma na segunda às 14h30?"],
      ["contact", "10:24", "Segunda às 14h30 funciona, sim. Nosso jurídico também vai participar."],
      ["agent", "10:25", "Combinado. A reunião ficou marcada para segunda, 30 de novembro, às 14h30. Vamos usar a conversa para delimitar o escopo e identificar as primeiras decisões do projeto."],
    ]),
  },
  {
    id: "thiago", agent: "anderley", name: "Thiago Alves", organization: "Arco Instrumentação", subject: "Acompanhamento de proposta",
    date: "26 nov. 2026", stage: "Qualificado", origin: "Google Ads", unread: 0,
    context: [["Contato", "Coordenação de RH"], ["Demanda", "6 técnicos estrangeiros"], ["Situação", "Validação interna"]],
    nextStep: "Aguardar a posição da equipe antes de definir a reunião técnica.",
    suggestion: "Devemos ter uma resposta do financeiro na terça.",
    response: "Obrigado pelo retorno, Thiago. Podemos retomar depois da avaliação de terça. Se surgir alguma dúvida sobre o escopo antes disso, é só me escrever por aqui.",
    messages: history("thiago", [
      ["agent", "14:08", "Thiago, tudo bem? Estou retomando nossa conversa sobre a mobilidade dos seis técnicos. A sua equipe já conseguiu avaliar o escopo?"],
      ["contact", "14:20", "O RH está de acordo. Falta o financeiro validar."],
      ["agent", "14:21", "Obrigado. Quando vocês esperam ter uma posição do financeiro? Assim conseguimos combinar o momento certo de retomar."],
    ]),
  },
  {
    id: "ines", agent: "anderley", name: "Inês Martins", organization: "Atendimento individual", subject: "Orientação para trabalho no Brasil",
    date: "25 nov. 2026", stage: "Em atendimento", origin: "WhatsApp do site", unread: 0,
    context: [["Contato", "Pessoa física"], ["Demanda", "Trabalho no Brasil"], ["Vínculo", "Em definição"]],
    nextStep: "Verificar se existe uma proposta de trabalho e orientar o próximo contato.",
    suggestion: "Sim, recebi uma proposta de uma empresa brasileira.",
    response: "Entendi, Inês. Como você já tem uma proposta no Brasil, o próximo passo é entender a função, o tipo de vínculo e a data estimada de início. Qual é o prazo que a empresa informou?",
    messages: history("ines", [
      ["contact", "11:03", "Oi! É sobre uma demanda pessoal. Quero entender como trabalhar no Brasil."],
      ["agent", "11:03", "Olá, Inês. Sou o Anderley, da Target Relocation. Você já recebeu uma proposta de trabalho de uma empresa no Brasil ou ainda está pesquisando?"],
    ]),
  },
];
