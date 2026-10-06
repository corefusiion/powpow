# Avatar Interativo Embasa

Avatar interativo vetorial baseado no mascote oficial em formato de gota d'água 3D da **Embasa**, estruturado em **SVG nativo com 18 elementos independentes e IDs semânticos**, animações fluidas a 60fps no navegador e máquina de estados para controle em tempo real.

---

## 🎨 Identidade Visual e Fidelidade

- **Formato:** Gota d'água 3D fluida com sombreamento e iluminação suave.
- **Paleta de Cores Embasa:**
  - **Corpo e Cabeça:** Gradientes azuis (#0495F4, #31BBF8, #0C7EE4, #0454B0, #1392ED, #1F9AE8, #30B3F2, #55CCF3).
  - **Ribbon Fluido Característico:** Verde sustentabilidade (#6DC152, #21B077), amarelo (#F7F14E, #CFE02C), ciano (#1D9BB4, #1FBCF0) e toques quentes.
  - **Olhos:** Grandes, expressivos, estilo cartoon/3D com brilhos brancos duplos.
- **Completamente Vetorial:** Sem rasterização, sem dependências pesadas, escalável para qualquer resolução.

---

## 🏗️ Estrutura Semântica do SVG

O componente renderiza uma árvore SVG estruturada com exatamente os **18 IDs semânticos independentes**:

```xml
<svg viewBox="0 0 1024 1024">
  <defs>/* 37 gradientes lineares de volume 3D */</defs>
  <g id="body">...</g>
  <g id="head">...</g>
  <g id="ribbon">...</g>
  <g id="left-leg">...</g>
  <g id="left-foot">...</g>
  <g id="right-leg">...</g>
  <g id="right-foot">...</g>
  <g id="left-arm">...</g>
  <g id="left-hand">...</g>
  <g id="right-arm">...</g>
  <g id="right-hand">...</g>
  <g id="left-eye">...</g>
  <g id="left-pupil">...</g>
  <g id="right-eye">...</g>
  <g id="right-pupil">...</g>
  <g id="left-eyebrow">...</g>
  <g id="right-eyebrow">...</g>
  <g id="mouth">...</g>
</svg>
```

---

## 🚀 Instalação e Importação

```tsx
import { EmbasaAvatar, useEmbasaAvatar } from './avatar';
import './avatar/styles.css';
```

---

## 💻 Exemplo de Uso em React

### 1. Uso Declarativo com Props
```tsx
import React, { useState } from 'react';
import { EmbasaAvatar, Emotion, Gesture } from './avatar';

export function MeuComponente() {
  const [emotion, setEmotion] = useState<Emotion>('happy');
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <div>
      <EmbasaAvatar
        emotion={emotion}
        isSpeaking={isSpeaking}
        size={320}
        enableCursorTracking={true}
        enableBlinking={true}
        enableBreathing={true}
        enableIdleMovement={true}
      />

      <button onClick={() => setEmotion('excited')}>Comemorar</button>
      <button onClick={() => setIsSpeaking(!isSpeaking)}>
        {isSpeaking ? 'Parar Fala' : 'Falar'}
      </button>
    </div>
  );
}
```

### 2. Uso com API Imperativa (`ref`)
```tsx
import React, { useRef } from 'react';
import { EmbasaAvatar, AvatarAPI } from './avatar';

export function ControllerExemplo() {
  const avatarRef = useRef<AvatarAPI>(null);

  const darBoasVindas = () => {
    avatarRef.current?.setEmotion('happy');
    avatarRef.current?.playGesture('wave', 3000);
    avatarRef.current?.startSpeaking();
    setTimeout(() => {
      avatarRef.current?.stopSpeaking();
    }, 4000);
  };

  return (
    <div>
      <EmbasaAvatar ref={avatarRef} size={300} />
      <button onClick={darBoasVindas}>Boas-vindas</button>
    </div>
  );
}
```

### 3. Uso com Hook (`useEmbasaAvatar`)
```tsx
import React from 'react';
import { EmbasaAvatar, useEmbasaAvatar } from './avatar';

export function HookExemplo() {
  const {
    avatarRef,
    emotion,
    setEmotion,
    playGesture,
    startSpeaking,
    stopSpeaking,
    setGaze
  } = useEmbasaAvatar('neutral');

  return (
    <div>
      <EmbasaAvatar ref={avatarRef} emotion={emotion} />
      <button onClick={() => playGesture('thumbs-up')}>Dar Joinha 👍</button>
      <button onClick={() => setGaze(0, -1)}>Olhar para Cima</button>
    </div>
  );
}
```

---

## 🎮 Métodos da API (`AvatarAPI`)

| Método | Argumentos | Descrição |
|---|---|---|
| `setEmotion(emotion)` | `'neutral' \| 'happy' \| 'excited' \| 'thinking' \| 'surprised' \| 'worried' \| 'sad' \| 'celebrating' \| 'error'` | Altera a expressão emocional atual. |
| `playGesture(gesture, durationMs?)` | `'idle' \| 'wave' \| 'thumbs-up' \| 'pointing' \| 'celebrating' \| 'thinking'`, duração em ms | Executa um gesto e retorna a idle automaticamente. |
| `startSpeaking()` | nenhum | Inicia a animação de sincronia labial. |
| `stopSpeaking()` | nenhum | Para a fala e volta à boca da emoção atual. |
| `setGaze(x, y)` | `x: -1 a 1`, `y: -1 a 1` | Direciona o olhar das pupilas. |
| `blink()` | nenhum | Dispara uma piscada forçada dos olhos. |
| `getState()` | nenhum | Retorna o objeto de estado completo da máquina FSM. |

---

## 🎭 Estados Suportados

### Expressões (`Emotion`)
- `neutral`: Postura padrão atenta e amigável.
- `happy`: Sorriso aberto, olhos felizes e inclinação leve da cabeça.
- `excited`: Olhos arregalados brilhantes, boca aberta vibrando.
- `thinking`: Olhar elevado, sobrancelhas assimétricas e pose reflexiva.
- `surprised`: Olhos e boca em formato "O" de surpresa.
- `worried`: Sobrancelhas franzidas para o centro e boca apreensiva.
- `sad`: Olhar caído e cabeça inclinada.
- `celebrating`: Olhos em arco, boca aberta e braços comemorando.
- `error`: Sobrancelhas tensas, boca ondulada e tremor suave de erro.

### Gestos (`Gesture`)
- `idle`: Posição neutra de repouso.
- `wave`: Braço direito acenando alegremente.
- `thumbs-up`: Sinal de positivo / legal com a mão direita 👍.
- `pointing`: Apontando para o código ou tela 👉.
- `celebrating`: Braços erguidos com pulinhos 🎉.
- `thinking`: Mão no queixo em atitude pensativa 🤔.

### Comportamentos Autônomos
- **Auto-blinking:** Piscada periódica e natural a cada 2.5s a 5.5s com variação orgânica.
- **Breathing:** Respiração sutil com leve escala do corpo da gota.
- **Idle Motion:** Flutuação suave no eixo Y.
- **Cursor Tracking:** Pupilas e inclinação sutil da cabeça acompanham o ponteiro do mouse.

---

## 🧩 Adicionando Novas Expressões sem Modificar o Componente

A arquitetura foi projetada para expansão contínua:
1. Abra `stateMachine.ts`.
2. Adicione a nova chave ao tipo `Emotion`.
3. Adicione um novo perfil em `EMOTION_PROFILES`:

```ts
// Exemplo: nova emoção "sleepy"
sleepy: {
  mouth: 'neutral',
  eyeState: 'worried',
  headTilt: 12,
  eyebrowOffset: {
    left: { y: 6, rotate: -4 },
    right: { y: 6, rotate: 4 },
  },
}
```
4. Em `styles.css`, estilize classes adicionais para a nova emoção (`.emotion-sleepy`). O componente principal continuará funcionando sem qualquer alteração.

---

## 🌟 Página de Demonstração e Testes

Para testar todos os estados em tempo real com controles manuais interativos:
```powershell
cd windows
npm run dev
```
Acesse no navegador:
> **`http://127.0.0.1:1420/avatar-demo.html`**
