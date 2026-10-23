// Captures de toutes les pages (revue visuelle) : node screenshots.mjs <dossier> [largeur] [full]
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';

const ENV = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const BASE = process.env.BASE_URL || 'http://localhost:5174';
const [out = 'screenshots', width = '1440', mode] = process.argv.slice(2);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: Number(width), height: 900 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const shot = async (path) => {
  await page.goto(BASE + path);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/${path.replace(/\W+/g, '_') || 'root'}.png`, fullPage: mode === 'full' });
};

if (!process.env.PAGES) for (const path of ['/login', '/register']) await shot(path);
await page.goto(`${BASE}/login`);
await page.fill('input[type=email]', ENV.ADMIN_EMAIL);
await page.fill('input[type=password]', ENV.ADMIN_PASSWORD);
await page.click('button[type=submit]');
await page.waitForURL(u => !u.pathname.includes('login'));
const pages = (process.env.PAGES || '/sports,/dashboard,/f1/calendar,/f1/2026/race/1,/f1/2025/race/1/results,/f1/standings,/season-bets,/f1/history,/place-bet/3,/motogp,/motogp/calendar,/motogp/standings,/place-bet/41,/nascar,/place-bet/80,/leaderboard,/PatchNotes,/admin,/admin/accounts,/shop').split(',');
for (const path of pages) await shot(path);
console.log(errors.length ? `Erreurs JS : ${errors.join(' | ')}` : 'Aucune erreur JS');
await browser.close();
