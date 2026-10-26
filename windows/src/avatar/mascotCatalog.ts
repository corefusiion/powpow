/**
 * Catálogo Completo de Mascotes Disponíveis no Powpow
 * Inclui o mascote oficial Embasa + os 52 mascotes de nilbuild/page-mascot.
 */

export interface MascotInfo {
  id: string;
  name: string;
  category: 'embasa' | 'animals' | 'people' | 'robots';
  description: string;
  color: string;
  isVectorAvatar?: boolean;
}

export const MASCOTS_CATALOG: MascotInfo[] = [
  // ── Oficial Embasa / Projeto ──
  {
    id: 'vault',
    name: 'Mascote 2D Articulado',
    category: 'embasa',
    description: 'Mascote cartoon oficial 2D articulado com juntas anatômicas, polegar pra cima e rig vetorial completo.',
    color: '#1E6BB8',
    isVectorAvatar: true,
  },
  {
    id: 'embasa',
    name: 'Gota Embasa',
    category: 'embasa',
    description: 'Mascote oficial 3D em formato de gota d\'água com fita multicolorida e olhos expressivos.',
    color: '#0495f4',
    isVectorAvatar: true,
  },

  // ── Animais (Animals) ──
  { id: 'fox', name: 'Raposa (Fox)', category: 'animals', description: 'Raposinha curiosa e esperta', color: '#e06822' },
  { id: 'cat', name: 'Gato (Cat)', category: 'animals', description: 'Gatinho fofo e atento ao cursor', color: '#9c6f50' },
  { id: 'pug', name: 'Pug (Cachorro)', category: 'animals', description: 'Cachorrinho simpático e brincalhão', color: '#c49a6c' },
  { id: 'panda', name: 'Panda', category: 'animals', description: 'Panda dócil e tranquilo', color: '#2b2d42' },
  { id: 'bunny', name: 'Coelho (Bunny)', category: 'animals', description: 'Coelhinho saltitante e amigável', color: '#f8a5c2' },
  { id: 'bear', name: 'Urso (Bear)', category: 'animals', description: 'Ursinho carismático', color: '#8d5b4c' },
  { id: 'otter', name: 'Lontra (Otter)', category: 'animals', description: 'Lontra alegre que adora água', color: '#855d44' },
  { id: 'penguin', name: 'Pinguim (Penguin)', category: 'animals', description: 'Pinguim elegante com passos curtos', color: '#1e3799' },
  { id: 'owl', name: 'Coruja (Owl)', category: 'animals', description: 'Coruja sábia com olhar atento', color: '#6a4a3c' },
  { id: 'dino', name: 'Dinossauro (Dino)', category: 'animals', description: 'T-rex bebê adorável', color: '#44bd32' },
  { id: 'frog', name: 'Sapo (Frog)', category: 'animals', description: 'Sapinho saltitante verde', color: '#4cd137' },
  { id: 'koala', name: 'Coala (Koala)', category: 'animals', description: 'Coala pacífico e dorminhoco', color: '#718093' },
  { id: 'hamster', name: 'Hamster', category: 'animals', description: 'Hamster bochechudo e ágil', color: '#e1b12c' },
  { id: 'hedgehog', name: 'Ouriço (Hedgehog)', category: 'animals', description: 'Pequeno ouriço curioso', color: '#795548' },
  { id: 'raccoon', name: 'Guaxinim (Raccoon)', category: 'animals', description: 'Guaxinim travesso e esperto', color: '#57606f' },
  { id: 'redpanda', name: 'Panda Vermelho', category: 'animals', description: 'Panda vermelho superfofo', color: '#e55039' },
  { id: 'sloth', name: 'Preguiça (Sloth)', category: 'animals', description: 'Bicho-preguiça sereno', color: '#8c7ae6' },
  { id: 'tiger', name: 'Tigre (Tiger)', category: 'animals', description: 'Tigrinho listrado e corajoso', color: '#f39c12' },
  { id: 'sheep', name: 'Ovelha (Sheep)', category: 'animals', description: 'Ovelhinha macia de lã branca', color: '#f5f6fa' },
  { id: 'deer', name: 'Cervo (Deer)', category: 'animals', description: 'Cervo esbelto da floresta', color: '#a0522d' },
  { id: 'mouse', name: 'Ratinho (Mouse)', category: 'animals', description: 'Ratinho veloz e observador', color: '#95a5a6' },

  // ── Personagens (People) ──
  { id: 'astronaut', name: 'Astronauta', category: 'people', description: 'Explorador espacial com capacete', color: '#38ada9' },
  { id: 'wizard', name: 'Mago (Wizard)', category: 'people', description: 'Feiticeiro místico com chapéu pontudo', color: '#6c5ce7' },
  { id: 'knight', name: 'Cavaleiro (Knight)', category: 'people', description: 'Guerreiro de armadura prateada', color: '#636e72' },
  { id: 'pirate', name: 'Pirata (Pirate)', category: 'people', description: 'Bucaneiro dos mares com tapa-olho', color: '#d63031' },
  { id: 'scientist', name: 'Cientista', category: 'people', description: 'Pesquisador curioso com jaleco', color: '#0984e3' },
  { id: 'chef', name: 'Chef de Cozinha', category: 'people', description: 'Mestre da culinária com toque', color: '#fab1a0' },
  { id: 'nurse', name: 'Enfermeiro(a)', category: 'people', description: 'Profissional de saúde atencioso', color: '#e84393' },
  { id: 'builder', name: 'Construtor', category: 'people', description: 'Trabalhador com capacete de segurança', color: '#f1c40f' },
  { id: 'skater', name: 'Skatista', category: 'people', description: 'Aventureiro urbano', color: '#00cec9' },
  { id: 'scout', name: 'Escoteiro', category: 'people', description: 'Explorador da natureza', color: '#27ae60' },
  { id: 'kamran', name: 'Kamran (Criador)', category: 'people', description: 'Mascote criador do page-mascot', color: '#2d3436' },
  { id: 'afro', name: 'Afro Hero', category: 'people', description: 'Personagem estiloso', color: '#e17055' },
  { id: 'ballerina', name: 'Bailarina', category: 'people', description: 'Dança clássica e elegância', color: '#fd79a8' },
  { id: 'hijabi', name: 'Hijabi', category: 'people', description: 'Personagem graciosa', color: '#00b894' },
  { id: 'sikh', name: 'Sikh', category: 'people', description: 'Personagem com turbante tradicional', color: '#fdcb6e' },
  { id: 'glasses', name: 'Óculos (Geek)', category: 'people', description: 'Estudioso de óculos e gravata', color: '#74b9ff' },
  { id: 'cap', name: 'Boné (Cap)', category: 'people', description: 'Jovem com boné virado', color: '#e84118' },
  { id: 'beard', name: 'Barbudo (Beard)', category: 'people', description: 'Mascote barbudo clássico', color: '#795548' },
  { id: 'bald', name: 'Carequinha', category: 'people', description: 'Mascote expressivo', color: '#dcdde1' },
  { id: 'grandpa', name: 'Vovô (Grandpa)', category: 'people', description: 'Senhor simpático e acolhedor', color: '#b2bec3' },
  { id: 'granny', name: 'Vovó (Granny)', category: 'people', description: 'Senhora carinhosa', color: '#ff7675' },

  // ── Robôs & Criaturas (Robots) ──
  { id: 'doraemon', name: 'Doraemon (Gato Cósmico)', category: 'robots', description: 'Mascote gato cósmico do futuro com animações dinâmicas a 60 FPS.', color: '#009fe8' },
  { id: 'robot', name: 'Robô (Robot)', category: 'robots', description: 'Androide clássico metálico', color: '#0984e3' },
  { id: 'postbot', name: 'Postbot', category: 'robots', description: 'Robô mensageiro veloz', color: '#e17055' },
  { id: 'gearbot', name: 'Engrenagem (Gearbot)', category: 'robots', description: 'Robô steampunk mecânico', color: '#b71540' },
  { id: 'clockwork', name: 'Corda (Clockwork)', category: 'robots', description: 'Mecanismo a corda de precisão', color: '#e58e26' },
  { id: 'drone', name: 'Drone Aéreo', category: 'robots', description: 'Drone com hélices e sensores', color: '#3dc1d3' },
  { id: 'cube', name: 'Cubo Tecnológico', category: 'robots', description: 'Entidade geométrica inteligente', color: '#574b90' },
  { id: 'crt', name: 'Monitor CRT', category: 'robots', description: 'Monitor retro com tela de tubo', color: '#303952' },
  { id: 'tv', name: 'Televisor Retro', category: 'robots', description: 'TV antiga com antena telescópica', color: '#596275' },
  { id: 'radio', name: 'Rádio Boombox', category: 'robots', description: 'Rádio vintage sintonizado', color: '#f78fb3' },
  { id: 'toaster', name: 'Torradeira Bot', category: 'robots', description: 'Eletrodoméstico senciente animado', color: '#f3a683' },
  { id: 'lantern', name: 'Lanterna Mágica', category: 'robots', description: 'Lanterna iluminada de latão', color: '#f8a5c2' },
  { id: 'rocket', name: 'Foguete (Rocket)', category: 'robots', description: 'Nave espacial decolando', color: '#ea2027' },
];

export function getMascotsByCategory(cat: 'all' | 'embasa' | 'animals' | 'people' | 'robots'): MascotInfo[] {
  if (cat === 'all') return MASCOTS_CATALOG;
  return MASCOTS_CATALOG.filter((m) => m.category === cat);
}
