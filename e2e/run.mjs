// Suite de bout en bout GridBook : parcours joueur (inscription, 3 championnats, paris,
// boutique) puis parcours admin (synchro, résultat, comptes, catalogue).
// Usage : BASE_URL=http://localhost:5174 node run.mjs   (la base est nettoyée à la fin)
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const ENV = Object.fromEntries(readFileSync(`${ROOT}.env`, 'utf8')
  .split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const BASE = process.env.BASE_URL || 'http://localhost:5174';
const API = `${BASE}/api`;
const SHOTS = process.env.SHOTS_DIR || `${ROOT}e2e/screenshots`;
const ADMIN = { email: ENV.ADMIN_EMAIL, password: ENV.ADMIN_PASSWORD };
const ts = Date.now();
const U = { username: `e2e_${ts % 100000}`, email: `e2e_${ts}@test.fr`, password: 'motdepasse123' };
const U2 = { username: `e2eadm_${ts % 100000}`, email: `e2eadm_${ts}@test.fr`, password: 'adminpass123' };

const SPORTS = [
  { slug: 'f1', name: 'Formule 1', short: 'F1', base: '/dashboard', cal: '/f1/calendar', standings: '/f1/standings', season: '/season-bets', history: '/f1/history', knownDriver: 'Antonelli' },
  { slug: 'motogp', name: 'MotoGP', short: 'MotoGP', base: '/motogp', cal: '/motogp/calendar', standings: '/motogp/standings', season: '/motogp/season-bets', history: '/motogp/history', knownDriver: 'Martin' },
  { slug: 'nascar', name: 'NASCAR Cup', short: 'NASCAR', base: '/nascar', cal: '/nascar/calendar', standings: '/nascar/standings', season: '/nascar/season-bets', history: '/nascar/history', knownDriver: 'Larson' },
];
const STAKES = { f1: 100, motogp: 200, nascar: 300 };

const results = []; const pageErrors = []; let page;
async function step(name, fn) {
  const before = pageErrors.length;
  try {
    await fn();
    if (pageErrors.length > before) throw new Error('Erreur JS : ' + pageErrors.slice(before).join(' | '));
    results.push(['OK', name]); console.log('OK   ', name);
  } catch (e) {
    results.push(['FAIL', name, String(e).split('\n')[0]]); console.log('FAIL ', name, '->', String(e).split('\n')[0].slice(0, 300));
    await page.screenshot({ path: `${SHOTS}/fail_${results.length}.png` }).catch(() => {});
  }
}
const eq = (a, b, label) => { if (a !== b) throw new Error(`${label} : attendu ${b}, obtenu ${a}`); };
const toast = (type, text) => page.locator(`.toast-item.toast-${type}`, text ? { hasText: text } : {}).last().waitFor({ timeout: 15000 });
const me = async () => (await (await page.request.get(`${API}/auth/me`)).json());
const wallet = async () => Math.round((await me()).wallet);
const noOverflow = async () => {
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth }));
  if (m.sw > m.vw + 1) throw new Error(`débordement horizontal ${m.sw} > ${m.vw}`);
};
const openRace = {}; const chosen = {};

execSync(`mkdir -p "${SHOTS}"`);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
page = await ctx.newPage();
page.on('pageerror', e => pageErrors.push(e.message));

// ================= PARCOURS JOUEUR =================
await step('Inscription → accueil des championnats (3 cartes)', async () => {
  await page.goto(`${BASE}/register`);
  await page.fill('#register-name', U.username);
  await page.fill('#register-email', U.email);
  await page.fill('input[type=password]', U.password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/sports');
  await page.locator('.home-sport').first().waitFor();
  eq(await page.locator('.home-sport').count(), 3, 'cartes championnat');
  eq(await wallet(), 10000, 'solde de départ');
  await noOverflow();
});

await step('Sécurité : montants invalides refusés (NaN, Infinity, négatif, énorme)', async () => {
  const race = (await (await page.request.get(`${API}/races/?discipline=f1`)).json()).find(r => r.is_open);
  const driver = (await (await page.request.get(`${API}/drivers/?discipline=f1`)).json())[0];
  for (const amount of ['NaN', 'Infinity', '-5', '0', '5000000']) {
    const r = await page.request.post(`${API}/bets/place`, { headers: { 'Content-Type': 'application/json' }, data: `{"race_id":${race.id},"selection_id":${driver.id},"amount":${amount}}` });
    if (![400, 422].includes(r.status())) throw new Error(`montant ${amount} : refus attendu, obtenu ${r.status()}`);
  }
  eq(await wallet(), 10000, 'solde inchangé');
});

await step('Sécurité : en-têtes, documentation API fermée, erreurs sans valeur saisie', async () => {
  const res = await page.request.get(`${BASE}/`);
  for (const h of ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy']) {
    if (!res.headers()[h]) throw new Error(`en-tête ${h} absent`);
  }
  eq((await page.request.get(`${API}/docs`)).status(), 404, '/docs');
  const bad = await page.request.post(`${API}/auth/login`, { data: { email: 'a@b.fr', password: 'x'.repeat(500) } });
  eq(bad.status(), 422, 'mot de passe trop long');
  if ((await bad.text()).includes('xxxx')) throw new Error('la valeur saisie est renvoyée dans l\'erreur');
});

for (const s of SPORTS) {
  await step(`${s.name} : accueil, championnat actif dans la barre`, async () => {
    await page.goto(BASE + s.base);
    await page.locator('.page-title', { hasText: s.slug === 'nascar' ? 'NASCAR' : s.name }).first().waitFor();
    eq((await page.locator('.sport-switch-item.active').innerText()).trim(), s.short, 'championnat actif');
  });

  await step(`${s.name} : calendrier avec des épreuves`, async () => {
    await page.goto(BASE + s.cal);
    await page.locator('.cal-row').first().waitFor({ timeout: 15000 });
  });

  await step(`${s.name} : classement officiel (« ${s.knownDriver} »)`, async () => {
    await page.goto(BASE + s.standings);
    await page.locator('table.table tbody tr').first().waitFor({ timeout: 20000 });
    if (!(await page.locator('table.table').innerText()).includes(s.knownDriver)) throw new Error('pilote absent du classement');
  });

  await step(`${s.name} : pari sur une course ouverte (pilotes du championnat uniquement)`, async () => {
    const races = await (await page.request.get(`${API}/races/?discipline=${s.slug}`)).json();
    openRace[s.slug] = races.find(r => r.status === 'upcoming' && r.is_open);
    if (!openRace[s.slug]) throw new Error('aucune course ouverte');
    const drivers = await (await page.request.get(`${API}/drivers/?discipline=${s.slug}`)).json();
    const before = await wallet();
    await page.goto(`${BASE}/place-bet/${openRace[s.slug].id}`);
    const rows = page.locator('.picker-row');
    await rows.first().waitFor();
    eq(await rows.count(), drivers.length, 'pilotes proposés');
    const row = rows.nth(1);
    chosen[s.slug] = (await row.locator('.picker-name').innerText()).trim();
    await row.click();
    await page.fill('.amount-input', String(STAKES[s.slug]));
    await page.locator('.pb-slip-col button[type=submit]').click();
    await toast('success', 'Pari enregistré');
    await page.waitForURL(`**${s.base}`);
    eq(await wallet(), before - STAKES[s.slug], 'solde après pari');
  });
}

await step('Panneau « Mes paris en cours » : 3 paris, mises et gains', async () => {
  await page.goto(`${BASE}/sports`);
  await page.locator('.rail-bet').nth(2).waitFor();
  eq(await page.locator('.rail-bet').count(), 3, 'paris dans le panneau');
});

await step('Historique MotoGP : uniquement le pari MotoGP', async () => {
  await page.goto(`${BASE}/motogp/history`);
  const rows = page.locator('.bh-table tbody tr');
  await rows.first().waitFor();
  eq(await rows.count(), 1, 'lignes');
  if (!(await rows.first().innerText()).includes(chosen.motogp)) throw new Error('pilote MotoGP absent');
});

await step('Pari de saison NASCAR (champion pilotes, 50 APEX) → pari affiché', async () => {
  const before = await wallet();
  await page.goto(`${BASE}/nascar/season-bets`);
  const market = page.locator('.sb-market').first();
  await market.locator('.picker-row').first().click();
  await market.locator('.amount-input').fill('50');
  await market.locator('button.btn-primary').click();
  await toast('success', 'Pari enregistré');
  await market.locator('.sb-active').waitFor();
  eq(await wallet(), before - 50, 'solde');
});

await step('Annulation du pari F1 depuis l\'historique → mise recréditée', async () => {
  const before = await wallet();
  await page.goto(`${BASE}/f1/history`);
  await page.locator('.bh-table button', { hasText: 'Annuler' }).first().click();
  await page.locator('.confirm-box .confirm-btn-danger').click();
  await toast('success', 'Pari annulé');
  eq(await wallet(), before + STAKES.f1, 'solde');
});

await step('Boutique : achat + équipement d\'un avatar et d\'un titre', async () => {
  await page.goto(`${BASE}/shop`);
  await page.locator('.shop-hero').first().waitFor();
  await page.locator('.shop-views .tab', { hasText: 'Catalogue' }).click();
  for (const [name, price] of [['Monoplace', 500], ['Chef de stand', 700]]) {
    const before = await wallet();
    const card = page.locator('.shop-card', { hasText: name });
    await card.locator('button', { hasText: 'Acheter' }).click();
    await page.locator('.confirm-box .btn-primary').click();
    await toast('success', name);
    await card.locator('button', { hasText: 'Équiper' }).click();
    await toast('success', 'équipé');
    eq(await wallet(), before - price, `solde après ${name}`);
  }
  const cos = (await me()).cosmetics;
  eq(cos.avatar, '🏎️', 'avatar équipé');
  eq(cos.title, 'Chef de stand', 'titre équipé');
  await page.waitForTimeout(500);
  eq((await page.locator('.user-menu-trigger .ua-face').innerText()).trim(), '🏎️', 'avatar dans la barre');
  await page.screenshot({ path: `${SHOTS}/boutique.png` });
});

await step('Boutique : article trop cher bloqué, inventaire, rachat refusé', async () => {
  eq(await page.locator('.shop-card', { hasText: 'Couronne' }).locator('.shop-buy').isDisabled(), true, 'Couronne désactivée');
  await page.locator('.shop-views .tab', { hasText: 'Mon inventaire' }).click();
  eq(await page.locator('.shop-card').count(), 2, 'articles en inventaire');
  const products = await (await page.request.get(`${API}/shop/products`)).json();
  eq((await page.request.post(`${API}/shop/buy/${products.find(p => p.slug === 'av_f1').id}`)).status(), 400, 'rachat');
});

let collectionCost = 0;
await step('Boutique : collection achetée en lot avec la remise', async () => {
  const cols = await (await page.request.get(`${API}/shop/collections`)).json();
  const col = cols.find(c => c.slug === 'genou_a_terre');
  collectionCost = col.bundle_price;
  if (!(collectionCost < col.remaining_price)) throw new Error('pas de remise appliquée');
  const before = await wallet();
  await page.locator('.shop-views .tab', { hasText: 'Collections' }).click();
  const block = page.locator('.shop-collection', { hasText: 'Genou à terre' });
  await block.locator('button', { hasText: 'Tout acheter' }).click();
  await page.locator('.confirm-box .btn-primary').click();
  await toast('success', 'Genou à terre');
  eq(await wallet(), before - collectionCost, 'solde après la collection');
  await block.locator('.badge', { hasText: 'Complète' }).waitFor();
});

await step('Récompense gagnée en jouant : « Premier départ » récupérée', async () => {
  await page.locator('.shop-views .tab', { hasText: 'Récompenses' }).click();
  const card = page.locator('.shop-reward', { hasText: 'Premier départ' });
  await card.locator('button', { hasText: 'Récupérer' }).click();
  await toast('success', 'Récompense obtenue');
  await card.locator('button', { hasText: 'Équiper' }).waitFor();
  const locked = page.locator('.shop-reward', { hasText: 'Nostradamus' });
  eq(await locked.locator('button', { hasText: 'Récupérer' }).count(), 0, 'récompense non acquise réclamable');
});

await step('Classement des parieurs : avatar équipé visible', async () => {
  await page.goto(`${BASE}/motogp/standings`);
  await page.locator('.tab', { hasText: 'Parieurs' }).click();
  const row = page.locator('tr', { hasText: U.username });
  await row.waitFor();
  if (!(await row.innerText()).includes('🏎️')) throw new Error('avatar absent');
});

await step('Déconnexion par le menu du compte', async () => {
  await page.locator('.user-menu-trigger').click();
  await page.locator('.user-menu-item', { hasText: 'Se déconnecter' }).click();
  await page.waitForURL('**/login');
});

// ================= PARCOURS ADMIN =================
const expected = () => 10000 - STAKES.motogp - STAKES.nascar - 50 - 500 - 700 - collectionCost;

await step('Connexion admin', async () => {
  await page.fill('input[type=email]', ADMIN.email);
  await page.fill('input[type=password]', ADMIN.password);
  await page.click('button[type=submit]');
  await page.waitForURL('**/sports');
});

await step('Admin : synchronisation MotoGP depuis la direction de course', async () => {
  await page.goto(`${BASE}/admin`);
  await page.locator('[aria-label="Championnat"] button', { hasText: 'MotoGP' }).click();
  await page.locator('button', { hasText: /^Synchroniser MotoGP$/ }).click({ timeout: 15000 });
  await toast('success', 'synchronisé');
});

await step('Admin : validation du résultat MotoGP → gain versé au parieur', async () => {
  const task = page.locator('.adm-task', { has: page.locator('h3', { hasText: 'Valider un résultat de course' }) });
  const selects = task.locator('select');
  await selects.nth(0).selectOption(String(openRace.motogp.id));
  const drivers = await (await page.request.get(`${API}/drivers/?discipline=motogp`)).json();
  await selects.nth(1).selectOption(String(drivers.find(d => d.name === chosen.motogp).id));
  await task.locator('button', { hasText: 'Valider et verser les gains' }).click();
  await page.locator('.confirm-box button', { hasText: 'Valider et verser les gains' }).click();
  await toast('success', 'Résultats validés');
  const users = await (await page.request.get(`${API}/admin/users`)).json();
  // Seul parieur sur cette course : cote 1, la mise lui revient en gain
  eq(Math.round(users.find(x => x.email === U.email).wallet), expected() + STAKES.motogp, 'solde du parieur');
});

await step('Admin : un pilote NASCAR refusé comme vainqueur d\'un GP F1 (API)', async () => {
  const nascarDriver = (await (await page.request.get(`${API}/drivers/?discipline=nascar`)).json())[0];
  eq((await page.request.post(`${API}/admin/close_race/${openRace.f1.id}?winner_id=${nascarDriver.id}`)).status(), 400, 'statut');
});

await step('Comptes : création d\'un admin, crédit de 500 APEX au parieur', async () => {
  await page.goto(`${BASE}/admin/accounts`);
  await page.locator('button', { hasText: 'Créer un compte' }).first().click();
  const modal = page.locator('.adm-modal');
  await modal.locator('input[type=text]').fill(U2.username);
  await modal.locator('input[type=email]').fill(U2.email);
  await modal.locator('input[type=password]').fill(U2.password);
  await modal.locator('select').selectOption('admin');
  await modal.locator('button[type=submit]').click();
  await toast('success', 'créé');
  await page.locator('tr', { hasText: U.email }).locator('button', { hasText: 'Gérer' }).click();
  const drawer = page.locator('.adm-drawer');
  await drawer.locator('input[type=number]').fill('500');
  await drawer.locator('input[type=text]').fill('Test e2e');
  await drawer.locator('button[type=submit]').click();
  await toast('success', 'Solde ajusté');
  const users = await (await page.request.get(`${API}/admin/users`)).json();
  eq(Math.round(users.find(x => x.email === U.email).wallet), expected() + STAKES.motogp + 500, 'solde');
  eq(users.find(x => x.email === U2.email)?.role, 'admin', 'rôle du compte créé');
});

await step('Catalogue boutique : retirer puis remettre en vente un article', async () => {
  await page.goto(`${BASE}/shop`);
  await page.locator('.shop-views .tab', { hasText: 'Gestion' }).click();
  const row = page.locator('.shop-admin-table tr', { hasText: 'Monoplace' });
  await row.waitFor();
  eq((await row.locator('td[data-sold]').innerText()).trim(), '1', 'ventes');
  await row.locator('button', { hasText: 'retirer' }).click();
  await toast('success', 'retiré');
  if ((await (await page.request.get(`${API}/shop/products`)).json()).some(p => p.slug === 'av_f1')) throw new Error('encore en vente');
  await row.locator('button', { hasText: 'remettre' }).click();
  await toast('success', 'remis en vente');
});

for (const path of ['/motogp', `/place-bet/${openRace.nascar?.id ?? 1}`, '/shop', '/admin/accounts', '/f1/history']) {
  await step(`Mobile (390 px) : ${path} sans débordement`, async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + path);
    await page.locator('.page').first().waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${SHOTS}/mobile_${path.replace(/\W+/g, '_')}.png`, fullPage: true });
    await noOverflow();
  });
}

await browser.close();

// ================= NETTOYAGE =================
const sql = `
SET @ids = (SELECT GROUP_CONCAT(id) FROM users WHERE email LIKE 'e2e%@test.fr');
DELETE FROM bets WHERE FIND_IN_SET(user_id, @ids);
DELETE FROM purchases WHERE FIND_IN_SET(user_id, @ids);
DELETE FROM wishlist WHERE FIND_IN_SET(user_id, @ids);
DELETE FROM token_transactions WHERE FIND_IN_SET(user_id, @ids);
DELETE FROM password_resets WHERE FIND_IN_SET(user_id, @ids);
DELETE FROM users WHERE FIND_IN_SET(id, @ids);
UPDATE products SET is_active = 1;
UPDATE races SET status = 'upcoming', is_open = 1, winner_driver_id = NULL WHERE id = ${openRace.motogp?.id ?? 0};`;
execSync(`cd "${ROOT}" && sg docker -c "docker compose exec -T db mysql -u${ENV.DB_USER} -p${ENV.DB_PASSWORD} ${ENV.DB_NAME}"`, { input: sql, stdio: ['pipe', 'ignore', 'ignore'] });
console.log('(base nettoyée)');

const fails = results.filter(r => r[0] === 'FAIL');
console.log(`\n===== ${results.length - fails.length}/${results.length} OK =====`);
for (const f of fails) console.log(' FAIL :', f[1], '->', f[2]);
process.exit(fails.length ? 1 : 0);
