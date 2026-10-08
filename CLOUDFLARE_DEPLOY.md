# 🚀 Guia Oficial de Implantação no Cloudflare: Portaria360

Este projeto foi **100% preparado e otimizado** para rodar na infraestrutura global da **Cloudflare**.

---

## 📌 1. Qual caminho seguir: Cloudflare Pages ou Cloudflare Workers?

### 🏆 **Vencedor Recomendado: CLOUDFLARE PAGES (com Pages Functions)**

| Característica | **Cloudflare Pages (Recomendado ⭐)** | **Cloudflare Workers (Workers with Assets)** |
| :--- | :--- | :--- |
| **Objetivo Principal** | Aplicações Web Full-Stack, SPAs (React + Vite), PWAs | APIs puras, microsserviços, proxies edge |
| **Deploy com Git** | **Nativo com 1 clique**: conecta ao GitHub/GitLab, build automático | Requer configuração de GitHub Actions com Wrangler |
| **Back-end Serverless** | **Automático**: pasta `/functions/api/cctv/*` sobe direto no Edge | Requer arquivo `worker.ts` e bindings manuais |
| **Roteamento SPA** | **Automático** via `public/_redirects` | Requer regras manuais no router do Worker |
| **Preview Branches** | Sim, gera URLs temporárias para cada Pull Request | Requer configuração manual de ambientes |
| **SSL e CDN Global** | Sim, 300+ datacenters com 0ms de cold-start | Sim |
| **Plano Gratuito** | Ilimitado para tráfego estático + 100.000 req/dia nas Functions | 100.000 req/dia |

---

## 📂 2. Como os arquivos estão organizados para o Cloudflare

```text
portaria360/
├── dist/                          # Pasta gerada pelo build ('npm run build')
├── functions/                     # ⚡ Cloudflare Pages Functions (APIs no Edge)
│   ├── types.d.ts                 # Tipagens do Pages Functions
│   ├── utils/
│   │   ├── md5.ts                 # Algoritmo MD5 puro (RFC 1321) zero dependências
│   │   └── digestAuth.ts          # Autenticação Digest para DVRs Intelbras/Hikvision
│   └── api/
│       ├── _middleware.ts         # Middleware global de CORS e cabeçalhos
│       └── cctv/
│           ├── snapshot.ts        # GET /api/cctv/snapshot (Proxy de imagem do DVR)
│           └── test-connection.ts # POST /api/cctv/test-connection (Teste de DDNS/Porta)
├── public/
│   ├── _redirects                 # Regra de SPA: /* -> /index.html 200
│   └── _headers                   # Cabeçalhos HTTP de segurança, cache PWA e câmera
├── src/
│   ├── worker.ts                  # Ponto de entrada caso queira rodar como Worker puro
│   └── ...                        # Código React, PWA e componentes
├── wrangler.toml                  # Configuração oficial do Cloudflare Pages
├── package.json                   # Scripts: build, pages:build, deploy:pages
├── package-lock.json              # Instalação limpa com npm ci no Node.js 22
└── vite.config.ts                 # Build otimizado para Vite + PWA
```

---

## 🛠️ 3. Passo a Passo: Deploy no Cloudflare Pages (Interface Web)

### Passo 1: Subir as alterações para o GitHub
```bash
git add .
git commit -m "fix: remover bun.lock e atualizar configuracoes para Cloudflare Pages"
git push origin main
```

### Passo 2: Criar o Projeto no Cloudflare Dashboard
1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/) e faça login.
2. No menu lateral esquerdo, clique em **Compute (Workers & Pages)** > **Create application**.
3. Selecione a aba **Pages** e clique em **Connect to Git**.
4. Autorize sua conta do GitHub e selecione o repositório `Cloudflare-portaria-360`.

### Passo 3: Configurar as Definições de Build
Preencha exatamente estes campos:
* **Framework preset**: `Vite` (ou `None`)
* **Build command**: `npm run build`
* **Build output directory**: `dist`
* **Root directory**: `/` (deixe em branco ou raiz)

### Passo 4: Salvar e Implantar
Clique em **Save and Deploy**. O Cloudflare vai rodar `npm install` e `npm run build` com sucesso em menos de 1 minuto!

---

## 📹 4. Como conectar o DVR Intelbras/Hikvision

O sistema inclui a função de borda `/api/cctv/snapshot` que faz proxy seguro em HTTPS para as câmeras:

1. **Opção 1: Cloudflare Tunnel (Recomendado - Gratuito e Seguro)**:
   - Baixe o utilitário `cloudflared` no computador da guarita.
   - Execute: `cloudflared tunnel --url http://IP_DO_DVR:8080`
   - O Cloudflare cria um túnel seguro para o DVR sem abrir portas no roteador.

2. **Opção 2: DDNS + Port Forwarding**:
   - Ative o Intelbras DDNS no DVR e direcione a porta HTTP (8080) no modem da guarita.

3. **Opção 3: Webcam USB Local**:
   - Conecte uma Webcam USB ao computador da portaria e clique em "Ativar Vídeo" na aba CFTV.
