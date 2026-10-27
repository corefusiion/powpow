<div align="center">

<img src="windows/src-tauri/icons/icon.png" width="96" height="96" alt="Ícone do Powpow">

# Powpow

**O Companheiro Dinâmico de IA & Mascote Interativo de Área de Trabalho**  
*Produtividade com Foco, Agentes de Código ao Vivo e Automação de Sistema na Borda da Tela.*

[![Windows 10/11](https://img.shields.io/badge/Windows-10%2F11-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/corefusiion/powpow/actions/workflows/windows.yml)
[![macOS 15+](https://img.shields.io/badge/macOS-15%2B-black?style=for-the-badge&logo=apple)](https://github.com/corefusiion/powpow)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.0-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021-DEA584?style=for-the-badge&logo=rust&logoColor=black)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-22c55e?style=for-the-badge)](LICENSE)

</div>

---

## 📌 Visão Geral

O **Powpow** é um ecossistema completo de produtividade e acompanhamento de Inteligência Artificial para o seu computador. Ele opera em duas camadas visuais sincronizadas:

1. **A Ilha Dinâmica Superior (Dynamic Notch Island):** Fica discretamente posicionada no topo da tela (ou entalhadura do monitor), monitorando seus agentes de programação (Claude Code, Gemini CLI, Antigravity/agy, Codex), aprovando permissões com 1 clique e exibindo o consumo de tokens.
2. **O Mascote Flutuante de Área de Trabalho (Roaming Pal):** Um avatar animado e inteligente que passeia suavemente pela sua tela de trabalho, acompanha o que você faz, analisa gráficos e fórmulas de planilhas e oferece atalhos rápidos com **zero esforço**.

---

## 🎭 Elenco de Mascotes & Avatares

Você pode alternar entre os avatares a qualquer momento diretamente no menu do mascote ou na ilha:

| Mascote | Estilo Visual | Características |
|---|---|---|
| 💧 **Embasa 2D** | Vetorial estilizado | Personagem animado e fluido com movimentos sutis, pose de celebração, piscadas e temática de hidratação. |
| 🐱 **Doraemon** | Anime clássico | O lendário gato robótico com sprites expressivos, caminhada suave e reações divertidas. |
| ⚡ **Vault Boy** | Retrofuturista 2D | Inspirado na icônica estética dos abrigos nucleares, com esqueleto de animação, polegar levantado e poses clássicas. |
| 🍄 **Shimeji** | Pixel Art / Desktop Toy | O clássico bichinho de área de trabalho que escala janelas, senta no rodapé e faz companhia discreta. |
| 🥟 **Mochi Original** | Minimalista vetorial | O habitante original da ilha, desenhado em SVG vetorial de 60 FPS com olhos que seguem a posição do seu cursor. |

---

## ⚡ Menu Compacto de Opções (Zero Scroll)

Ao clicar no mascote na sua Área de Trabalho, uma janela de opções rápida e translúcida se abre com **3 abas temáticas no topo**, garantindo que todas as opções caibam perfeitamente na tela sem barras de rolagem:

### 1. ⚡ Ações Rápidas & IA
* 📸 **Analisar Janela Ativa:** Captura a janela do aplicativo em que você estava trabalhando (Excel, VS Code, navegador) e abre o chat de IA instantâneo ao lado do mascote para tirar dúvidas de fórmulas, código ou relatórios.
* 🔍 **Busca na Web Instantânea:** Campo de pesquisa direto com envio rápido para tirar dúvidas sem abrir uma nova aba do navegador.
* ✍️ **Ghostwriter (Escrever no App Ativo):** A IA redige o texto solicitado e o injeta diretamente no cursor do programa que estava aberto (Slack, Teams, Word, Gmail).
* 💬 **Nova Conversa com IA:** Inicia um novo diálogo limpo com o assistente inteligente.

### 2. 💼 Tarefas & Produtividade (Grade de 2 Colunas)
* 🍅 **Modo Foco (Pomodoro):** Cronômetro ágil com ciclos de 25 minutos de foco e 5 minutos de pausa com alertas visuais amigáveis.
* 📋 **Área de Transferência Inteligente:** Histórico dos últimos textos e códigos copiados pronto para reutilização.
* 🎧 **Lo-Fi Soundscape Integrado:** Player de áudio ambiente para foco com múltiplos estilos (Lo-Fi Beats, Piano Calmo, Violão, Chuva e Oceano).
* 📔 **Diário de Bordo (Daily Recap):** Resumo executivo gerado por IA com tudo o que foi realizado durante o seu dia de trabalho.
* 🗂️ **Desktop Butler (Organizador de Pastas):** Varre a Área de Trabalho e organiza arquivos soltos em categorias com opção de Desfazer.
* 📄 **Criador de Documentos:** Modelos rápidos de atas, planilhas e relatórios gerados e abertos no app padrão.
* 🔎 **Localizador de Arquivos:** Busca em tempo real de documentos e PDFs em Downloads, Documentos e Desktop.

### 3. ⚙️ Ajustes & Mascotes
* **Seletor de Mascote Direto:** Alterne entre Embasa 2D, Doraemon, Vault Boy, Shimeji e Mochi com 1 clique.
* **Controles Rápidos:** Botão para pausar/retomar o passeio do mascote e atalho para enviá-lo de volta à Ilha.
* **Painel Completo:** Acesso imediato à janela geral de preferências.

---

## 🏝️ Funcionalidades da Ilha Dinâmica

* **Aprovações de Ferramentas sem Trocar de Janela:** Quando o Claude Code ou Gemini CLI solicita executar um comando no terminal, a Ilha expande com **Negar / Sempre permitir / Permitir**, destacando o nível de risco de comandos destrutivos.
* **Diff em Tempo Real:** Acompanhe cada linha adicionada ou removida pelo agente de código enquanto ele edita seu projeto.
* **Histórico Executivo:** Ao concluir uma tarefa, a Ilha resume em português claro tudo o que o agente fez, quais arquivos tocou e se os testes passaram.
* **Monitor de Consumo e Limites:** Selos informativos do status da sua cota dos planos Claude, Codex e Gemini.
* **Arrastar e Soltar (File Drop):** Arraste qualquer arquivo para o topo da tela; a Ilha engole o documento e o prepara para análise imediata.

---

## 🛡️ Desempenho, Segurança & Antivírus

Construído especificamente para rodar com eficiência máxima e sem atritos em ambientes Windows corporativos:

* **Win32 Nativo Puro:** Todas as automações de janelas e foco utilizam chamadas diretas das APIs do Windows (`user32.dll`, `shell32.dll`), sem uso de scripts ocultos de PowerShell em segundo plano.
* **Amigável a Antivírus Corporativos:** Binários compilados com diretórios de depuração PDB (`opt-level = 3`, `debug = 1`), prevenindo falsos positivos por heurística em soluções como Trend Micro Apex One, Windows Defender e Norton.
* **Bandeja do Sistema (System Tray):**
  * Clique com o botão esquerdo para abrir a Ilha Dinâmica.
  * Menu completo perto do relógio com opção para pausar, abrir configurações ou encerrar o aplicativo instantaneamente (`Sair do Powpow`).
* **Privacidade Absoluta:** Suas chaves de API e tokens OAuth (Gmail, Outlook, GitHub) são armazenados no **Windows Credential Manager** criptografado pelo sistema operacional.

---

## ⌨️ Atalhos Globais

| Atalho | Ação |
|---|---|
| `Ctrl + 8` | Invocar ou pausar o Mascote Andarilho na tela |
| `Esc` | Fechar o menu de opções, o chat flutuante ou recolher a Ilha |
| `Enter` | Enviar mensagem no Chat da Tela ou na busca rápida |

---

## 📦 Como Instalar e Rodar

### Windows (Releases Automáticas no GitHub Actions)
1. Acesse a aba **[Actions](https://github.com/corefusiion/powpow/actions)** ou **[Releases](https://github.com/corefusiion/powpow/releases)** do repositório.
2. Baixe o executável `Powpow-Windows-setup.exe` ou extraia a versão portátil `Powpow-Windows-portable.zip`.
3. Execute o `powpow.exe`. O ícone aparecerá na bandeja ao lado do relógio e a ilha no topo da tela.

### Compilando a partir do Código-Fonte

Requisitos:
* **Node.js** 20+
* **Rust** 1.80+ (com `rustup` e MSVC Build Tools)

```bash
# Clone o repositório
git clone https://github.com/corefusiion/powpow.git
cd powpow/windows

# Instale as dependências da interface
npm install

# Inicie em modo de desenvolvimento com recarga ao vivo (Hot Reload)
npm run tauri dev

# Para gerar o executável final de produção
npm run tauri build
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo [LICENSE](LICENSE) para obter mais informações.

Desenvolvido e mantido por **Gleisson Santos** ([@corefusiion](https://github.com/corefusiion)).
