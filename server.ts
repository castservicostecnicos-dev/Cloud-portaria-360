import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import https from 'https';

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper for Digest Auth used by modern Intelbras MHDX / Multi-HD DVRs
function parseDigestHeader(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const matches = header.replace(/^Digest\s+/, '').match(/(\w+)=(?:"([^"]+)"|([^\s,]+))/g);
  if (matches) {
    matches.forEach((m) => {
      const eqIdx = m.indexOf('=');
      const k = m.slice(0, eqIdx).trim();
      const v = m.slice(eqIdx + 1).replace(/^"|"$/g, '').trim();
      params[k] = v;
    });
  }
  return params;
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

function generateDigestAuthHeader(opts: {
  username: string;
  password: string;
  method: string;
  uri: string;
  realm: string;
  nonce: string;
  qop?: string;
  opaque?: string;
  nc?: string;
  cnonce?: string;
}): string {
  const { username, password, method, uri, realm, nonce, qop, opaque } = opts;
  const nc = opts.nc || '00000001';
  const cnonce = opts.cnonce || crypto.randomBytes(8).toString('hex');
  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);

  let response = '';
  if (qop === 'auth' || qop === 'auth-int') {
    response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  } else {
    response = md5(`${ha1}:${nonce}:${ha2}`);
  }

  let authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop) {
    authHeader += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
  }
  if (opaque) {
    authHeader += `, opaque="${opaque}"`;
  }
  return authHeader;
}

/**
 * Fetch snapshot from DVR with support for both Basic and Digest Auth
 */
/**
 * Fetch snapshot from DVR with support for both Basic and Digest Auth
 * Supports Intelbras, Dahua, Hikvision and generic IP cameras
 */
async function fetchDVRSnapshot(
  targetUrl: string,
  user?: string,
  pass?: string,
  alternatePaths?: string[]
): Promise<{ buffer: Buffer; contentType: string }> {
  const parsedUrl = new URL(targetUrl);
  const username = user || parsedUrl.username || 'admin';
  const password = pass || parsedUrl.password || '';

  const urlsToTry = [targetUrl, ...(alternatePaths || [])];
  let lastError: Error | null = null;

  for (const currentUrl of urlsToTry) {
    try {
      const pUrl = new URL(currentUrl);
      const requestUri = pUrl.pathname + pUrl.search;
      const cleanTargetUrl = `${pUrl.protocol}//${pUrl.host}${requestUri}`;

      const basicAuthHeader = password ? `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` : undefined;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      try {
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Portaria360-CCTV-Client/1.0',
          Accept: 'image/jpeg, image/png, image/webp, */*',
        };
        if (basicAuthHeader) {
          headers['Authorization'] = basicAuthHeader;
        }

        const firstRes = await fetch(cleanTargetUrl, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        // If DVR demands Digest Auth (HTTP 401 with WWW-Authenticate: Digest)
        if (firstRes.status === 401 && password) {
          const authHeader = firstRes.headers.get('www-authenticate');
          if (authHeader && authHeader.toLowerCase().includes('digest')) {
            const digestParams = parseDigestHeader(authHeader);
            if (digestParams.realm && digestParams.nonce) {
              const digestHeader = generateDigestAuthHeader({
                username,
                password,
                method: 'GET',
                uri: requestUri,
                realm: digestParams.realm,
                nonce: digestParams.nonce,
                qop: digestParams.qop,
                opaque: digestParams.opaque,
              });

              const secondController = new AbortController();
              const secondTimeout = setTimeout(() => secondController.abort(), 6500);

              try {
                const digestRes = await fetch(cleanTargetUrl, {
                  method: 'GET',
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Portaria360-CCTV-Client/1.0',
                    Accept: 'image/jpeg, image/png, image/webp, */*',
                    Authorization: digestHeader,
                  },
                  signal: secondController.signal,
                });

                if (digestRes.ok) {
                  const arrayBuffer = await digestRes.arrayBuffer();
                  return {
                    buffer: Buffer.from(arrayBuffer),
                    contentType: digestRes.headers.get('content-type') || 'image/jpeg',
                  };
                }
              } finally {
                clearTimeout(secondTimeout);
              }
            }
          }
        }

        if (firstRes.ok) {
          const arrayBuffer = await firstRes.arrayBuffer();
          return {
            buffer: Buffer.from(arrayBuffer),
            contentType: firstRes.headers.get('content-type') || 'image/jpeg',
          };
        }

        lastError = new Error(`DVR retornou status HTTP ${firstRes.status} (${firstRes.statusText})`);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Não foi possível obter imagem do DVR.');
}

// Generate fallback placeholder SVG when DVR is unreachable
function createFallbackImage(title: string, message: string): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="100%" height="100%" fill="#090d16"/>
    <rect x="10" y="10" width="620" height="340" fill="none" stroke="#1e293b" stroke-width="2" rx="12"/>
    <circle cx="320" cy="140" r="40" fill="#1e293b"/>
    <path d="M305 125 L335 125 L335 155 L305 155 Z" fill="none" stroke="#38bdf8" stroke-width="3"/>
    <circle cx="320" cy="140" r="6" fill="#38bdf8"/>
    <text x="320" y="210" text-anchor="middle" fill="#f8fafc" font-family="sans-serif" font-size="16" font-weight="bold">${title}</text>
    <text x="320" y="235" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="12">${message}</text>
    <text x="320" y="260" text-anchor="middle" fill="#38bdf8" font-family="monospace" font-size="11">PORTARIA 360 · PROXY CCTV INTELBRAS</text>
  </svg>`;
  return Buffer.from(svg);
}

// ROUTE 1: Proxy Snapshot from DVR to bypass Mixed Content / CORS / Auth restrictions
app.get('/api/cctv/snapshot', async (req, res) => {
  const { host, port, channel, user, pass, url, brand } = req.query;

  let targetUrl = '';
  let finalUser = (user as string) || 'admin';
  let finalPass = (pass as string) || '';
  const alternates: string[] = [];

  if (url && typeof url === 'string') {
    targetUrl = url;
  } else if (host && typeof host === 'string') {
    let cleanHost = host.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const cleanPort = (port as string) || '8080';
    const cleanChannel = (channel as string) || '1';

    // Check if host contains embedded credentials (e.g. admin:senha@ddns...)
    if (cleanHost.includes('@')) {
      const [authPart, hostPart] = cleanHost.split('@');
      cleanHost = hostPart;
      if (authPart.includes(':')) {
        const [u, p] = authPart.split(':');
        finalUser = u;
        finalPass = p;
      }
    }

    const brandStr = String(brand || '').toLowerCase();
    if (brandStr.includes('hikvision')) {
      targetUrl = `http://${cleanHost}:${cleanPort}/ISAPI/Streaming/channels/${cleanChannel}01/picture`;
      alternates.push(`http://${cleanHost}:${cleanPort}/Streaming/channels/${cleanChannel}/picture`);
      alternates.push(`http://${cleanHost}:${cleanPort}/cgi-bin/snapshot.cgi?channel=${cleanChannel}`);
    } else {
      // Standard Intelbras / Dahua
      targetUrl = `http://${cleanHost}:${cleanPort}/cgi-bin/snapshot.cgi?channel=${cleanChannel}`;
      alternates.push(`http://${cleanHost}:${cleanPort}/cgi-bin/snapshot.cgi?chn=${cleanChannel}`);
      alternates.push(`http://${cleanHost}:${cleanPort}/ISAPI/Streaming/channels/${cleanChannel}01/picture`);
    }
  } else {
    res.status(400).json({ error: 'Parâmetro host ou url obrigatório' });
    return;
  }

  try {
    const { buffer, contentType } = await fetchDVRSnapshot(targetUrl, finalUser, finalPass, alternates);
    res.setHeader('Content-Type', contentType.includes('image') ? contentType : 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (error: any) {
    // If DVR fails or is offline, deliver informative fallback frame so image element doesn't break
    const fallback = createFallbackImage('DVR Intelbras Sem Resposta', error.message || 'Verifique DDNS e Porta 8080');
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(fallback);
  }
});

// ROUTE 2: Test DDNS Connection & Credentials
app.post('/api/cctv/test-connection', async (req, res) => {
  const { host, port, channel, user, pass, url, brand } = req.body;

  let targetUrl = '';
  let finalUser = user || 'admin';
  let finalPass = pass || '';
  const alternates: string[] = [];

  if (url) {
    targetUrl = url;
  } else if (host) {
    let cleanHost = String(host).trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const cleanPort = port || '8080';
    const cleanChannel = channel || 1;

    if (cleanHost.includes('@')) {
      const [authPart, hostPart] = cleanHost.split('@');
      cleanHost = hostPart;
      if (authPart.includes(':')) {
        const [u, p] = authPart.split(':');
        finalUser = u;
        finalPass = p;
      }
    }

    const isPrivateIp = /^((192\.168\.)|(10\.)|(172\.(1[6-9]|2[0-9]|3[0-1])\.)|127\.|localhost)/i.test(cleanHost);
    if (isPrivateIp) {
      res.json({
        ok: false,
        isPrivateIp: true,
        testedHost: cleanHost,
        error: `O endereço "${cleanHost}" é um IP de rede local privada (LAN).`,
        troubleshooting: [
          `Este aplicativo roda na nuvem com certificado seguro HTTPS. Por segurança da internet, servidores na nuvem não conseguem acessar diretamente um IP privado interno como "${cleanHost}" sem uma rota pública.`,
          `Para conectar este DVR ao aplicativo na nuvem:`,
          `1. Ative o Intelbras DDNS no menu do DVR (Menu > Rede > Intelbras DDNS, ex: "meucondo.ddns-intelbras.com.br") ou use o IP Fixo da portaria.`,
          `2. No modem/roteador da guarita, crie uma regra de NAT/Redirecionamento de Portas (Port Forwarding): Direcione a Porta HTTP (${cleanPort}) e RTSP (554) para o IP local ${cleanHost}.`,
          `3. Se você estiver usando o PC da portaria na mesma rede do DVR, você também pode clicar no botão "Abrir Web DVR" para abrir a tela nativa do DVR em janela local!`,
          `4. Se o DVR não tiver portas liberadas, você pode conectar uma Webcam USB no PC da portaria como câmera do portão com 1 clique!`
        ],
      });
      return;
    }

    const brandStr = String(brand || '').toLowerCase();
    if (brandStr.includes('hikvision')) {
      targetUrl = `http://${cleanHost}:${cleanPort}/ISAPI/Streaming/channels/${cleanChannel}01/picture`;
      alternates.push(`http://${cleanHost}:${cleanPort}/Streaming/channels/${cleanChannel}/picture`);
      alternates.push(`http://${cleanHost}:${cleanPort}/cgi-bin/snapshot.cgi?channel=${cleanChannel}`);
    } else {
      targetUrl = `http://${cleanHost}:${cleanPort}/cgi-bin/snapshot.cgi?channel=${cleanChannel}`;
      alternates.push(`http://${cleanHost}:${cleanPort}/cgi-bin/snapshot.cgi?chn=${cleanChannel}`);
      alternates.push(`http://${cleanHost}:${cleanPort}/ISAPI/Streaming/channels/${cleanChannel}01/picture`);
    }
  } else {
    res.status(400).json({ ok: false, error: 'Informe o endereço do DVR.' });
    return;
  }

  try {
    const startTime = Date.now();
    const { buffer, contentType } = await fetchDVRSnapshot(targetUrl, finalUser, finalPass, alternates);
    const latency = Date.now() - startTime;

    res.json({
      ok: true,
      message: `Conexão estabelecida com sucesso com o DVR! A imagem foi recebida e autenticada.`,
      latencyMs: latency,
      bytesReceived: buffer.length,
      contentType,
      testedUrl: targetUrl.replace(/:\/\/[^@]+@/, '://***:***@'),
    });
  } catch (error: any) {
    res.json({
      ok: false,
      error: error.message || 'Falha ao conectar com o DVR.',
      testedUrl: targetUrl.replace(/:\/\/[^@]+@/, '://***:***@'),
      troubleshooting: [
        'Verifique se o DDNS está ativo e atualizado com o IP público da guarita.',
        'Confirme se a porta HTTP (geralmente 8080 ou 80) foi redirecionada no modem/roteador da portaria.',
        'Verifique se o usuário e senha do DVR foram digitados corretamente.',
        'Verifique se a câmera conectada a este canal está ligada com sinal de vídeo.',
      ],
    });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
      root: process.cwd(),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Portaria 360 Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
