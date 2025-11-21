# Imaginizi

Imaginizi é uma aplicação web que transforma suas fotos em imagens de personagens incríveis usando IA generativa. Apenas faça uma pose, e nosso guia de câmera em tempo real ajudará você a capturar a foto perfeita. Em seguida, com um simples prompt de texto, veja a IA reimaginar sua foto no estilo do seu personagem favorito.

## ✨ Features

- **Guia de Câmera em Tempo Real**: Usa OpenCV.js em um Web Worker para analisar o feed da câmera detectando posição do rosto, iluminação e nitidez, fornecendo feedback visual em tempo real para garantir fotos de alta qualidade.
- **Geração de Imagens com IA**: Integra com o Google Gemini para transformar fotos de usuários baseado em prompts de texto.
- **Sistema de Prompt Inteligente**: Utiliza contexto capturado da foto (enquadramento, inclinação da cabeça, qualidade) para melhorar a precisão da geração.
- **Autenticação**: Sistema de autenticação com Google OAuth via NextAuth.js.
- **Sistema de Quota**: Controle de uso por usuário com limite de gerações (padrão: 2 por usuário).
- **Performance Otimizada**: O componente da câmera é carregado dinamicamente para reduzir o tamanho inicial do bundle, e tarefas pesadas de visão computacional são executadas em thread separada.

## 🚀 Tech Stack

### Core

- **Framework**: [Next.js](https://nextjs.org/) 16.0.1 (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5+
- **Runtime**: React 19.2.0

### Frontend

- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 4
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Carousel**: [Embla Carousel](https://www.embla-carousel.com/)

### Backend & AI

- **AI Service**: [Google Gemini](https://ai.google.dev/) (gemini-2.5-flash-image)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/) 6.19.0
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) 4.24.13 (Google Provider)

### Computer Vision

- **Client-Side Vision**: [OpenCV.js](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- **Concurrency**: [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
- **Haar Cascades**: Detecção de rosto, olhos e boca

### Observability

- **Error Tracking**: [Sentry](https://sentry.io/) para Next.js

### DevOps

- **Git Hooks**: Husky + lint-staged
- **Linting**: ESLint + Prettier

## 📦 Getting Started

### Pré-requisitos

- Node.js (v18 ou superior)
- PostgreSQL (banco de dados)
- Conta no Google Cloud Platform (para OAuth e Gemini API)

### Instalação

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/your-username/imaginizi.git
    cd imaginizi
    ```

2.  **Instale as dependências:**

    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**

    Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

    ```env
    # Database
    DATABASE_URL="postgresql://user:password@localhost:5432/imaginizi?schema=public"

    # NextAuth
    NEXTAUTH_SECRET="your_secret_key_here"
    NEXTAUTH_URL="http://localhost:3000"

    # Google OAuth
    GOOGLE_CLIENT_ID="your_google_client_id"
    GOOGLE_CLIENT_SECRET="your_google_client_secret"

    # Google Gemini API
    GEMINI_API_KEY="your_gemini_api_key"

    # Sentry (opcional, para produção)
    SENTRY_DSN="your_sentry_dsn"
    SENTRY_AUTH_TOKEN="your_sentry_auth_token"
    ```

    **Nota**: Para obter as credenciais do Google OAuth, você precisa:
    - Criar um projeto no [Google Cloud Console](https://console.cloud.google.com/)
    - Habilitar a Google+ API
    - Criar credenciais OAuth 2.0
    - Adicionar `http://localhost:3000/api/auth/callback/google` como URI de redirecionamento

    Para obter a chave do Gemini:
    - No mesmo projeto do Google Cloud, habilite a API do Gemini
    - Crie uma API key no console

4.  **Configure o banco de dados:**

    ```bash
    # Execute as migrações do Prisma
    npm run prisma:migrate

    # (Opcional) Abra o Prisma Studio para visualizar os dados
    npx prisma studio
    ```

5.  **Execute o servidor de desenvolvimento:**

    ```bash
    npm run dev
    ```

    Abra [http://localhost:3000](http://localhost:3000) no navegador para ver a aplicação.

## 🛠️ Como Funciona

### Fluxo Completo

1.  **Autenticação**: Quando o usuário clica em "Take photo", verifica se está autenticado via NextAuth.js. Se não estiver, redireciona para login com Google OAuth.

2.  **Inicialização da Câmera**: Após autenticação, o componente `CameraView` é carregado dinamicamente (code splitting), e o hook `useCamera` solicita permissão para acessar a câmera do dispositivo.

3.  **Worker de Orientação**: O hook `useCameraView` chama `useVisionGuidance` que cria um Web Worker para processar o vídeo em tempo real. Isso evita bloquear a thread principal da UI.

4.  **Análise em Tempo Real**:
    - O Web Worker (`cameraWorker.ts`) carrega OpenCV.js e os modelos Haar Cascade (rosto, olhos, boca)
    - Recebe frames do vídeo via `OffscreenCanvas` e `requestAnimationFrame`
    - Detecta o rosto, olhos e boca usando `detectMultiScale`
    - Calcula métricas de qualidade:
      - **Enquadramento**: Porcentagem do rosto na tela, posição centralizada
      - **Inclinação**: Ângulo de rotação da cabeça (roll) calculado entre os olhos
      - **Qualidade**: Nitidez (Variance of Laplacian) e brilho (média de pixels)
      - **Estabilidade**: Verifica movimento entre frames

5.  **Feedback Visual**: O worker envia mensagens `guidance` de volta para a thread principal. O componente `CameraView` renderiza caixas coloridas sobre o feed de vídeo em um `<canvas>` overlay:
    - 🟢 **Verde**: GOOD - condições ideais
    - 🟡 **Amarelo**: OK - condições aceitáveis
    - 🔴 **Vermelho**: BAD - precisa ajustar

6.  **Captura de Foto**: Quando a orientação indica `canCapture: true` (após 15 frames consecutivos "GOOD"), o usuário pode tirar a foto. O frame atual é capturado em um canvas e convertido para base64.

7.  **Formulário de Prompt**: Após capturar a foto, aparece o `CameraForm` onde o usuário descreve o personagem desejado (ex: "Buzz Lightyear from Toy Story 4").

8.  **Geração de Imagem**:
    - O hook `useMain` envia a foto e o prompt para `/api/image` via FormData
    - A rota de API valida a requisição com `withValidatedImageRequest`:
      - Verifica tipo de arquivo (PNG/JPEG/WEBP)
      - Limita tamanho (max 8MB)
      - Valida presença do prompt
    - O contexto capturado (enquadramento, inclinação, qualidade, caixas de detecção) é serializado e enviado junto
    - Verifica autenticação com `requireAuth`
    - Verifica quota do usuário no banco de dados (produção: bloqueia se quota <= 0)
    - Monta o prompt inteligente com `buildImagePrompt` que inclui:
      - Instruções de transformação de personagem
      - Regras de segurança
      - Contexto estruturado da foto (framing, head tilt, quality, boxes)
    - Chama o Google Gemini (`gemini-2.5-flash-image`) com foto + prompt
    - Atualiza quota do usuário no banco (decrementa quota, incrementa used)
    - Retorna a imagem gerada em base64

9.  **Exibição do Resultado**: A imagem gerada é exibida em uma overlay em tela cheia com opção de fechar e começar novamente.

### Arquitetura de Segurança

- **Validação de Requisições**: Middleware `withValidatedImageRequest` valida todos os dados de entrada
- **Autenticação Obrigatória**: Todas as rotas de geração requerem autenticação via `requireAuth`
- **Sistema de Quota**: Limita uso por usuário (padrão: 1)
- **Regras de Segurança no Prompt**: Filtragem de conteúdo inadequado nas instruções para o modelo de IA
- **Monitoramento**: Integração com Sentry para rastreamento de erros em produção

## 📂 Estrutura do Projeto

### App Router (Next.js)

- **`app/(main)/page.tsx`**: Página principal que orquestra o estado da aplicação, gerencia autenticação e coordena os componentes.
- **`app/(main)/components/`**:
  - **`CameraView.tsx`**: Interface completa da câmera, overlay de orientação e resultados.
  - **`CameraForm.tsx`**: Formulário para entrada do prompt de transformação.
  - **`HeroBanner.tsx`**: Componente inicial da landing page com carrossel de personagens.
  - **`Footer.tsx`**: Rodapé da aplicação.
  - **`AvatarList.tsx`**: Lista de avatares/personagens.
- **`app/api/image/route.ts`**: Endpoint de API que processa geração de imagens (validação, autenticação, chamada ao Gemini).
- **`app/api/auth/[...nextauth]/route.ts`**: Configuração do NextAuth.js para autenticação OAuth.

### Hooks Customizados

- **`hooks/useCamera.ts`**: Gerencia permissões da câmera, stream de mídia, captura de foto e estados relacionados.
- **`hooks/useCameraGuidance.ts`**: Gerencia o ciclo de vida do Web Worker de visão computacional. Cria o worker, inicia/para processamento de frames.
- **`app/(main)/hooks/useCameraView.ts`**: Hook que coordena `useVisionGuidance`, renderiza overlay visual no canvas e captura contexto da foto.
- **`app/(main)/hooks/useMain.ts`**: Gerencia estado de geração de imagem, chamadas à API e tratamento de erros.

### Workers

- **`lib/workers/cameraWorker.ts`**: Lógica core de visão computacional usando OpenCV.js. Executa em thread separada:
  - Carrega OpenCV.js e modelos Haar Cascade
  - Processa frames em tempo real (12 FPS)
  - Detecta rosto, olhos e boca
  - Calcula métricas de qualidade e orientação
  - Retorna mensagens `guidance` para a thread principal

### API & Backend

- **`lib/api/withValidatedImageRequest.ts`**: Middleware de validação de requisições (tipo de arquivo, tamanho, prompt).
- **`lib/auth.ts`**: Configuração do NextAuth.js com Google Provider e callbacks de sincronização com Prisma.
- **`lib/db.ts`**: Instância do Prisma Client com singleton pattern para reutilização.

### Utilitários

- **`lib/utils/imagePrompt.ts`**: Constrói prompts inteligentes para o Gemini incluindo contexto estruturado da foto:
  - Parsing de contexto (enquadramento, inclinação, qualidade, caixas)
  - Geração de descrições estruturadas
  - Instruções de transformação e regras de segurança
- **`lib/utils/index.ts`**: Utilitários diversos (cn, dataURLtoFile, getOverlayColor).

### Types

- **`lib/types/visionTypes.ts`**: Tipos TypeScript para:
  - `Guidance`: Mensagens de orientação do worker
  - `Context`: Contexto capturado da foto para envio à API
  - `GuidelineLevel`: Níveis de qualidade (BAD, OK, GOOD)

### Database

- **`prisma/schema.prisma`**: Schema do Prisma com modelo `User`:
  - Campos: id, email, name, image
  - Sistema de quota: `quota` (padrão: 2), `used` (contador de uso)
  - Timestamps: createdAt, updatedAt

### Observability

- **`lib/services/sentry.ts`**: Serviço de integração com Sentry para captura de exceções e mensagens.
- **`sentry.server.config.ts`**: Configuração do Sentry para servidor.
- **`sentry.edge.config.ts`**: Configuração do Sentry para edge runtime.
- **`instrumentation.ts`**: Instrumentação do Sentry.

### Assets Estáticos

- **`public/libs/opencv/`**: Biblioteca OpenCV.js compilada para WebAssembly.
- **`public/libs/cascades/`**: Arquivos XML dos modelos Haar Cascade (rosto, olhos, sorriso).
- **`app/(main)/assets/`**: Imagens de personagens e SVGs usados na UI.

## 📋 Próximos Passos & Melhorias Futuras

### 🎯 Melhorias de Curto Prazo

1. **Sistema de Quota Dinâmico**: Implementar sistema de recarga de quota ou pagamento
2. **Histórico de Gerações**: Permitir que usuários vejam e baixem imagens anteriores
3. **Galeria de Exemplos**: Adicionar galeria de transformações bem-sucedidas
4. **Feedback Visual Aprimorado**: Melhorar mensagens de orientação com animações e sugestões mais específicas
5. **Compressão de Imagens**: Otimizar tamanho das imagens antes de enviar para a API

### 🚀 Melhorias de Médio Prazo

#### 🔹 A) Integração com TensorFlow.js / MediaPipe

Atualmente, o sistema já envia contexto estruturado (enquadramento, inclinação, qualidade, caixas). Com **TensorFlow.js** ou **MediaPipe**, podemos extrair ainda mais informações:

- **Yaw e Pitch**: Rotação horizontal e vertical da cabeça (além do roll já detectado)
- **Landmarks Faciais**: 468 pontos de referência para análise detalhada
- **Expressão Facial**: Detecção de emoções e expressões
- **Proporções Faciais**: Medidas precisas de distâncias e ângulos

**Benefícios:**

- Preservação de pose mais precisa
- Melhor alinhamento do personagem com a foto original
- Manutenção de expressões faciais

#### 🔹 B) Preservação de Identidade Aprimorada

Com detecção de landmarks, podemos gerar descrições estruturadas:

- **Formato do rosto** (oval, redondo, quadrado, coração)
- **Tamanho e proporção de nariz/boca**
- **Distância entre olhos**
- **Formato de sobrancelhas** (arqueadas, retas, grossas)
- **Estilo de cabelo** (comprimento, textura, volume)

**Exemplo de prompt estruturado:**

```text
"Preserve as proporções faciais do usuário: olhos afastados, queixo curto, maxilar arredondado, sobrancelhas grossas."
```

Isso reduz significativamente erros de identidade, mantendo a pessoa reconhecível no resultado final.

#### 🔹 C) Alinhamento Face → Personagem

Com informações de localização e máscaras:

- **Máscara de segmentação facial** (via MediaPipe Selfie Segmentation)
- **Bounding box com margens ajustadas**
- **Proporções da cabeça em relação ao corpo**
- **Ponto de ancoragem** para alinhamento do personagem

Permite que o modelo entenda melhor onde está o rosto e como integrá-lo no estilo do personagem, mantendo posição e proporções corretas.

#### 🔹 D) Consistência de Estilo

Com condicionamento estruturado:

- **Máscaras aplicadas via OpenCV** (refinamento de bordas)
- **Ângulos de iluminação detectados**
- **Histograma de background**
- **Métricas de iluminação** (temperatura de cor, contraste)

Torna o trabalho da IA mais determinístico e previsível, resultando em imagens mais consistentes e de maior qualidade.

### 🔬 Melhorias Técnicas

1. **Cache de Modelos**: Implementar cache para modelos Haar Cascade e OpenCV.js
2. **Otimização de Workers**: Melhorar performance do worker com técnicas de pooling
3. **Retry Logic**: Implementar retry automático para falhas na API do Gemini
4. **Rate Limiting**: Adicionar rate limiting no backend para prevenir abuso
5. **Analytics**: Implementar analytics para entender padrões de uso

### 🎨 Melhorias de UX

1. **Tutorial Interativo**: Guia inicial para novos usuários
2. **Preview em Tempo Real**: Preview da transformação antes de confirmar
3. **Variações Múltiplas**: Gerar múltiplas variações da mesma foto
4. **Comparação Side-by-Side**: Comparar original vs. transformado
5. **Compartilhamento Social**: Permitir compartilhamento direto nas redes sociais

**Nota**: Em produção, usuários com `quota <= 0` não podem gerar novas imagens até que a quota seja renovada.

## 🔒 Segurança

### Validação de Requisições

Todas as requisições para `/api/image` passam por validação:

- **Tipo de arquivo**: Apenas PNG, JPEG e WEBP são aceitos
- **Tamanho máximo**: 8MB por arquivo
- **Prompt obrigatório**: Deve conter texto não vazio
- **Autenticação**: Usuário deve estar autenticado via NextAuth

### Regras de Segurança no Prompt

O sistema inclui regras de segurança no prompt enviado ao Gemini:

- Bloqueio de conteúdo sexual, violento, racista, homofóbico ou inadequado
- Filtragem de conteúdo adulto ou ilegal
- Proteção para menores de idade

Se o prompt do usuário for inadequado, o modelo é instruído a gerar uma imagem segura e neutra do conceito do personagem.

## 🐛 Troubleshooting

### Erro de permissão da câmera

- Verifique se o navegador tem permissão para acessar a câmera
- Tente reiniciar o navegador
- Verifique configurações de privacidade do navegador

### Erro de conexão com banco de dados

- Verifique se o PostgreSQL está rodando
- Confirme que `DATABASE_URL` está correta no `.env.local`
- Execute `npx prisma migrate deploy` para aplicar migrações

### Erro de autenticação Google

- Verifique se `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão corretos
- Confirme que o URI de redirecionamento está configurado no Google Cloud Console
- Verifique se `NEXTAUTH_SECRET` está definido

### Erro na geração de imagem

- Verifique se `GEMINI_API_KEY` está correta e válida
- Confirme que a API do Gemini está habilitada no Google Cloud Console
- Verifique logs no Sentry para mais detalhes (produção)

## 📝 Licença

Este projeto é privado e proprietário.
