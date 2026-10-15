// Busca seus apps na Discloud e grava projetos.json só com dados públicos.
// Roda dentro do GitHub Actions. O token vem do Secret DISCLOUD_TOKEN e nunca é impresso.
import { writeFile } from 'node:fs/promises';

const token = process.env.DISCLOUD_TOKEN;
if (!token) {
  console.error('DISCLOUD_TOKEN não configurado (Settings → Secrets and variables → Actions).');
  process.exit(1);
}

const res = await fetch('https://api.discloud.app/v2/app/all', {
  headers: { 'api-token': token }
});
if (!res.ok) {
  // Só o código HTTP vai para o log, nunca a resposta inteira.
  console.error('A Discloud respondeu com erro HTTP ' + res.status + '. projetos.json não foi alterado.');
  process.exit(1);
}

const data = await res.json();
const apps = Array.isArray(data.apps) ? data.apps : (data.apps ? [data.apps] : []);

// Lista do que pode aparecer no site. ID, RAM, arquivo principal etc. ficam de fora.
const publicos = apps
  .map(a => ({
    nome: String(a.name || 'app'),
    online: a.online === true,
    linguagem: a.lang ? String(a.lang) : null
  }))
  .sort((a, b) => (b.online - a.online) || a.nome.localeCompare(b.nome));

const out = { atualizadoEm: new Date().toISOString(), apps: publicos };
await writeFile('projetos.json', JSON.stringify(out, null, 2) + '\n');
console.log(publicos.length + ' app(s) gravado(s) em projetos.json.');
