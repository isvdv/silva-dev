// Busca seus apps na Discloud e grava projetos.json só com dados públicos.
// Roda dentro do GitHub Actions. O token vem do Secret DISCLOUD_TOKEN e nunca é impresso.
import { writeFile } from 'node:fs/promises';

const token = process.env.DISCLOUD_TOKEN;
if (!token) {
  console.error('DISCLOUD_TOKEN não configurado (Settings → Secrets and variables → Actions).');
  process.exit(1);
}

const API = 'https://api.discloud.app/v2';
async function get(path) {
  const res = await fetch(API + path, { headers: { 'api-token': token } });
  if (!res.ok) {
    // Só o código HTTP vai para o log, nunca a resposta.
    throw new Error('A Discloud respondeu ' + res.status + ' em ' + path);
  }
  const data = await res.json();
  return Array.isArray(data.apps) ? data.apps : (data.apps ? [data.apps] : []);
}

let info;
try {
  info = await get('/app/all');
} catch (e) {
  console.error(e.message + '. projetos.json não foi alterado.');
  process.exit(1);
}

// Status (desde quando está ligado). Memória/CPU ficam de fora: mudam toda hora e gerariam um commit por hora. Se falhar, segue só com as informações básicas.
let status = [];
try { status = await get('/app/all/status'); } catch (e) { console.error(e.message + ' (seguindo sem status)'); }
const statusPorId = new Map(status.map(s => [String(s.id), s]));

const str = v => (v === undefined || v === null || v === '') ? null : String(v);

// O que pode aparecer no site. ID, token, arquivo principal, logs etc. ficam de fora.
const apps = info
  .map(a => {
    const s = statusPorId.get(String(a.id)) || {};
    return {
      nome: str(a.name) || 'app',
      online: a.online === true,
      linguagem: str(a.lang),
      avatar: /^https:\/\//.test(a.avatarURL || '') ? a.avatarURL : null,
      ligadoDesde: str(s.startedAt)
    };
  })
  .sort((a, b) => (b.online - a.online) || a.nome.localeCompare(b.nome));

await writeFile('projetos.json', JSON.stringify({ atualizadoEm: new Date().toISOString(), apps }, null, 2) + '\n');
console.log(apps.length + ' app(s) gravado(s) em projetos.json.');
