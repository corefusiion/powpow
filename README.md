# Powpow

**Assistente Executivo de IA, Ilha Dinâmica e Mascote Operacional de Área de Trabalho**  
Plataforma unificada para monitoramento de agentes de código, automação de sistema operacional Windows/macOS e produtividade contínua.

---

## 1. Visão Geral do Projeto

O **Powpow** é uma aplicação nativa de alta performance construída sobre **Tauri 2 (Rust) e TypeScript**, projetada para atuar em duas camadas visuais complementares que operam de forma assíncrona e sincronizada:

1. **Ilha Dinâmica (Top Notch Island):** Barra superior translúcida fixada no topo do monitor (ou na entalhadura do macOS). Monitora sessões de agentes de código (Claude Code, Gemini CLI, Antigravity/agy, OpenAI Codex), viabiliza aprovações de comandos destrutivos com um clique, renderiza diffs de código em tempo real e consolida logs de execução.
2. **Mascote Flutuante (Roaming Desktop Pal):** Agente de companhia de área de trabalho que se movimenta suavemente pela tela sem roubar foco, inspeciona janelas ativas, realiza OCR e análise de fórmulas de planilhas/código, exibe notificações inteligentes e executa ações de sistema.

---

## 2. Matriz Completa de Funcionalidades

A tabela a seguir consolida todas as capacidades implementadas no ecossistema Powpow, seus mecanismos de execução e métodos de acesso:

| Módulo | Funcionalidade | Detalhamento Técnico & Operacional | Forma de Acesso | Benefício Prático |
|---|---|---|---|---|
| **Ilha Dinâmica** | **Aprovação de Ferramentas** | Intercepta requisições de execução de comandos do Claude Code e Gemini CLI via named pipe local (`powpow-hook`). Apresenta opções de Negar, Permitir ou Lembrar com destaque para comandos de risco elevado (`rm -rf`, `git push --force`). | Popup automático na borda superior | Evita troca de janelas para o terminal e bloqueia execuções perigosas por engano. |
| **Ilha Dinâmica** | **Diff de Código em Tempo Real** | Renderiza adições e remoções de linhas de código instantaneamente enquanto o agente de programação edita os arquivos do repositório. | Aba "Story" ou clique na pílula do agente | Permite auditoria visual imediata do código antes do commit. |
| **Ilha Dinâmica** | **Histórico Consolidado** | Ao término do ciclo de trabalho do agente, resume em português formal o que foi solicitado, quais arquivos foram modificados, status dos testes automatizados e o veredito final. | Card expansível na Ilha Dinâmica | Fornece relatório pronto para revisão ou merge em pull requests. |
| **Ilha Dinâmica** | **Telemetria de Quota e Tokens** | Pílulas informativas de monitoramento contínuo de créditos e limites dos planos Claude Code, OpenAI Codex e Google Gemini. | Cabeçalho da Ilha Dinâmica | Evita interrupções de trabalho por esgotamento inesperado de tokens. |
| **Ilha Dinâmica** | **Ingestão de Arquivos por Drag & Drop** | Ao arrastar qualquer documento ou arquivo para o topo da tela, a Ilha transforma seu avatar em um receptáculo animado, ingere o arquivo e o vincula ao contexto do chat. | Arrastar e soltar no topo da tela | Análise de documentos e planilhas com IA sem menus de navegação complexos. |
| **Ilha Dinâmica** | **Acoplamento de Janelas Ativas** | O mascote captura o identificador de janela (HWND) e imagem do software em uso para injeção de contexto no chat da IA. | Arrastar mascote sobre a janela desejada | Contextualização imediata sem tirar screenshots manuais. |
| **Mascote Desktop** | **Passeio Inteligente (Roaming)** | Movimentação fluida na tela a 28 px/s com física de aceleração/desaceleração suave, evitando a área de trabalho ativa e repousando discretamente ao lado do cursor. | Automático durante o uso da máquina | Sensação de companhia sem obstruir botões, janelas ou menus do usuário. |
| **Mascote Desktop** | **Análise de Tela Direta (Screen Chat)** | Captura a janela do software ativo e abre um chat flutuante ao lado do avatar para análise visual, explicações de código, correção de fórmulas e OCR. | Opção "Analisar Janela Ativa" no menu do avatar | Tira dúvidas instantâneas em planilhas Excel, erros de compilação ou dashboards. |
| **Mascote Desktop** | **Notificações Visuais com Resposta Rápida** | Detecta novos e-mails (Gmail/Outlook), mensagens de WhatsApp e reuniões. Exibe card rico com remetente, assunto, trecho real e campo de resposta inline. | Popup lateral do avatar | Leitura e envio de respostas sem abrir clientes de e-mail pesados. |
| **Mascote Desktop** | **Operação Silenciosa Anti-Interrupção** | Todos os alertas utilizam animações, partículas, poses de comemoração e barras de tempo com zero emissão de bips ou sons intrusivos. | Configuração padrão de notificações | Preserva o foco e a reprodução de músicas de fundo. |
| **Mascote Desktop** | **Deduplicação de Eventos** | Algoritmo de hash de IDs de mensagens e e-mails que impede alertas repetidos para notificações já vistas ou tratadas. | Motor de background | Elimina spam e poluição visual na área de trabalho. |
| **Menu em Abas** | **Aba Ações Rápidas (IA)** | Contém atalhos imediatos para Análise de Tela, Busca Web direta com campo de pesquisa, Ghostwriter e Inicialização de Novo Chat. | Clique sobre o mascote -> Aba "Ações" | Execução imediata de ferramentas de inteligência sem scroll. |
| **Menu em Abas** | **Aba Tarefas (Grade 2 Colunas)** | Organização compacta em duas colunas para acionar Pomodoro, Área de Transferência, Lo-Fi Soundscape, Diário de Bordo, Organizador de Pastas e Localizador. | Clique sobre o mascote -> Aba "Tarefas" | Acesso a todas as ferramentas utilitárias sem rolagem de página. |
| **Menu em Abas** | **Aba Ajustes & Seletor de Mascote** | Seletor instantâneo de avatares com 1 clique (Embasa 2D, Doraemon, Vault Boy, Shimeji, Mochi), pausa de movimentação e retorno para a Ilha. | Clique sobre o mascote -> Aba "Ajustes" | Troca imediata da experiência visual em tempo real. |
| **Catálogo Avatares** | **Mascote Embasa 2D** | Avatar vetorial com animações fluidas, poses de comemoração, piscadas naturais e suporte a lembretes temáticos de hidratação e postura. | Seletor de mascotes | Identidade visual moderna e personalizada. |
| **Catálogo Avatares** | **Doraemon** | Personagem clássico com conjunto completo de sprites de caminhada, pulos e reações expressivas. | Seletor de mascotes | Estética nostálgica com animações de alta taxa de quadros. |
| **Catálogo Avatares** | **Vault Boy** | Mascote 2D com esqueleto cinemático, polegar positivo clássico e posturas inspiradas em abrigos nucleares. | Seletor de mascotes | Visual técnico e icônico para desenvolvedores. |
| **Catálogo Avatares** | **Shimeji** | Comportamento tradicional de desktop toy japonês com física suave de repouso no rodapé. | Seletor de mascotes | Estilo clássico de personalização de desktop. |
| **Catálogo Avatares** | **Mochi Original** | O avatar vetorial nativo em SVG de 60 quadros por segundo com rastreamento ocular dinâmico guiado pela posição do cursor. | Seletor de mascotes | Leveza extrema e precisão geométrica. |
| **Agente de Sistema** | **Desktop Butler (Organizador)** | Escaneia a Área de Trabalho e pasta Downloads, agrupando arquivos soltos em categorias (Documentos, Imagens, Vídeos, Instaladores, Código) com botão de Desfazer seguro. | Menu do Mascote ou comando na Ilha | Mantém a tela limpa sem risco de perda acidental de dados. |
| **Agente de Sistema** | **Criador de Documentos** | Assistente interativo que gera atas de reunião, planilhas financeiras, controles de estoque ou documentos livres e os abre no software padrão do sistema. | Menu do Mascote -> "Novo Documento" | Elimina a criação manual de estruturas e templates em branco. |
| **Agente de Sistema** | **Localizador de Arquivos** | Mecanismo de busca ultra-rápido por extensão ou termo em Downloads, Documentos e Desktop, com ações imediatas de "Abrir" e "Ver na Pasta". | Menu do Mascote -> "Localizar Arquivos" | Encontra relatórios, recibos e PDFs sem abrir o Windows Explorer. |
| **Agente de Sistema** | **Ghostwriter de Janela Ativa** | Redige o texto necessário com IA e, através da API Win32 (`SetForegroundWindow`), devolve o foco ao software original e injeta o conteúdo no cursor. | Menu do Mascote -> "Ghostwriter" | Automação de respostas rápidas em softwares como Outlook, Teams e Word. |
| **Ergonomia e Foco** | **Pomodoro Ágil** | Temporizador de foco com ciclos configuráveis de 25 minutos de trabalho e 5 minutos de descanso com contagem na Ilha. | Menu do Mascote -> "Pomodoro" | Gestão de tempo sem necessidade de apps de terceiros. |
| **Ergonomia e Foco** | **Lembrete de Hidratação Embasa** | Alertas periódicos inteligentes para incentivar a ingestão de água e alinhamento da postura na cadeira. | Ativo com o mascote Embasa | Saúde ocupacional e redução de fadiga durante longas jornadas. |
| **Ergonomia e Foco** | **Regra Ocular 20-20-20** | Pausa anti-fadiga sugerindo focar o olhar em um ponto distante por 20 segundos a cada intervalo prolongado de tela. | Módulo de bem-estar | Prevenção de estresse ocular e cansaço visual. |
| **Ergonomia e Foco** | **Pausa para Alongamento** | Orientações de micro-alongamentos guiados de 30 segundos para ombros, pescoço e punhos. | Módulo de bem-estar | Prevenção de LER/DORT em programadores e analistas. |
| **Ergonomia e Foco** | **Encerramento de Expediente** | Notificação suave ao atingir o horário limite de trabalho, incentivando desconexão e descanso mental. | Módulo de bem-estar | Prevenção de burnout profissional. |
| **Áudio & Foco** | **Lo-Fi Soundscape Player** | Reprodutor de áudio integrado com faixas de foco contínuas: Lo-Fi Chillhop, Piano Acústico, Violão, Chuva e Som de Oceano, com controle de volume. | Menu do Mascote -> "Soundscape" | Ambiente sonoro propício à concentração sem dependência de streaming. |
| **Bandeja (Tray)** | **Integração com Barra de Tarefas** | Ícone dedicado na bandeja do Windows com suporte a clique esquerdo para abrir a Ilha, menu em português e encerramento limpo do processo. | Área de notificação (perto do relógio) | Controle discreto e encerramento garantido (`std::process::exit`). |
| **Segurança & SO** | **Execução Win32 Pura** | Manipulação de janelas, foco e área de transferência via chamadas C nativas do Windows (`user32.dll`, `shell32.dll`), sem uso de instâncias ocultas de PowerShell. | Arquitetura central | Zero bloqueios ou alarmes falsos em antivírus corporativos (Trend Micro / Defender). |
| **Segurança & SO** | **Armazenamento Seguro de Chaves** | Chaves de API (Anthropic, Gemini, OpenAI) e tokens de integração residem no Windows Credential Manager ou macOS Keychain. | Módulo de configurações | Nenhuma credencial é gravada em texto puro em arquivos de configuração no disco. |

---

## 3. Arquitetura do Sistema

O software divide suas responsabilidades em módulos desacoplados para garantir estabilidade, segurança e baixa ocupação de recursos de hardware:

```
+--------------------------------------------------------------------------+
|                              POWPOW CORE                                 |
+--------------------------------------------------------------------------+
|  FRONTEND (TypeScript + Vite)           |  BACKEND (Rust + Tauri v2)     |
|  - Camada da Ilha Dinâmica (island.ts)   |  - PollGate & Hit-Testing      |
|  - Camada do Mascote (pal.ts)           |  - Win32 DirectComposition     |
|  - Motor de Renderização de Mascotes     |  - Hook Relay Named Pipe       |
|  - Gerenciador de Áudio & Soundscape    |  - Credential Manager Wrapper  |
|  - Componente de Visão & OCR            |  - Tray & Lifecycle Handler    |
+--------------------------------------------------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
      [Agentes de Código]                         [Sistema Operacional]
   Claude Code / Gemini / agy                   APIs Win32 / macOS AppKit
```

* **Camada de Apresentação:** Utiliza aceleração gráfica por hardware através do WebView2 com DirectComposition transparente.
* **Mapeamento de Cursor (Hit-Testing Inteligente):** O Rust calcula em 60 Hz as coordenadas exatas do mouse sobre a área ocupada pelo mascote e seu menu, aplicando `set_ignore_cursor_events(true)` no restante da área transparente, de modo que janelas e ícones do usuário sob o espaço transparente continuem 100% clicáveis.
* **Comunicação por Named Pipes:** Relé leve em Rust (`powpow-hook`) que recebe sinais das extensões de CLI sem atrasar o terminal do desenvolvedor.

---

## 4. Teclas de Atalho Globais

| Combinação | Ação Executada |
|---|---|
| `Ctrl + 8` | Invocar ou pausar o Mascote de Área de Trabalho |
| `Esc` | Fechar o menu de opções em abas, fechar chat flutuante ou recolher a Ilha Dinâmica |
| `Enter` | Submeter busca rápida ou mensagem no Chat de Análise de Tela |
| `Shift + Enter` | Inserir quebra de linha no campo de mensagens |

---

## 5. Instalação e Execução

### Binários Compilados (Windows)
1. Acesse os artefatos de compilação na aba **[Actions](https://github.com/corefusiion/powpow/actions)** ou na página de **[Releases](https://github.com/corefusiion/powpow/releases)**.
2. Faça o download de:
   * **Instalador Oficial:** `Powpow-Windows-setup.exe` (instalação assistida no perfil do usuário).
   * **Pacote Portátil:** `Powpow-Windows-portable.zip` (execução direta sem necessidade de instalação).
3. Execute o binário `powpow.exe`. A Ilha Dinâmica se acoplará ao topo da tela e o ícone de controle surgirá na bandeja do sistema ao lado do relógio.

### Compilação a partir do Código-Fonte

#### Requisitos de Ambiente:
* **Node.js** 20.0 ou superior
* **Rust** 1.80 ou superior (instalado via `rustup`)
* **Visual Studio Build Tools** (com a carga de trabalho de "Desenvolvimento para Desktop com C++")

```powershell
# 1. Clonar o repositório
git clone https://github.com/corefusiion/powpow.git
cd powpow/windows

# 2. Instalar as dependências do frontend
npm install

# 3. Executar em ambiente de desenvolvimento (com recarga automática)
npm run tauri dev

# 4. Gerar os executáveis de produção otimizados
npm run tauri build
```

---

## 6. Governança e Licenciamento

O código-fonte do projeto Powpow é distribuído sob os termos da licença permissiva **MIT**. É livre para uso pessoal, comercial, modificação e distribuição, mantendo-se os respectivos créditos e notificações de direitos autorais.

Consulte o arquivo [LICENSE](LICENSE) para mais informações.  
Projeto mantido e desenvolvido por **Gleisson Santos** ([@corefusiion](https://github.com/corefusiion)).
