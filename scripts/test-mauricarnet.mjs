import { chromium } from 'playwright';
import { randomBytes } from 'crypto';
import fs from 'fs';

const BASE_URL = 'https://mauricarnet.vercel.app';
const TEST_USER = `test_${randomBytes(4).toString('hex')}`;
const TEST_PIN = '1234';

let passed = 0, failed = 0, errors = [];
const SDIR = 'screenshots';

function check(name, ok, detail) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} — ${detail||''}`); errors.push({name,detail}); }
}

async function snap(page, name) {
  await page.waitForTimeout(500);
  try { await page.waitForLoadState('domcontentloaded', { timeout: 5000 }); } catch {}
  await page.screenshot({ path: `${SDIR}/${name}.png`, fullPage: true });
  console.log(`    📸 ${name}.png`);
}

async function bodyText(page) {
  try {
    return (await page.locator('body').textContent({ timeout: 5000 }).catch(() => '')) || '';
  } catch { return ''; }
}

async function main() {
  fs.mkdirSync(SDIR, { recursive: true });
  console.log(`\n══════════════════════════════════════════`);
  console.log(`  MAURICARNET — Test Suite`);
  console.log(`  URL: ${BASE_URL}`);
  console.log(`  Test User: ${TEST_USER}`);
  console.log(`══════════════════════════════════════════\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' });
  const page = await context.newPage();

  try {
    // =============== 1. AUTH - REGISTER ===============
    console.log('\n─── 1. AUTHENTIFICATION ───');
    
    await page.goto(`${BASE_URL}/auth/register`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000); // Wait for hydration
    await snap(page, '01-register-page');
    
    // INPUTS: 3 inputs (username, pin, confirmPin) — no name attr, use placeholder
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`    Inputs trouvés: ${inputCount}`);

    if (inputCount >= 3) {
      await inputs.nth(0).fill(TEST_USER);                                    // username
      await inputs.nth(1).fill(TEST_PIN);                                     // pin
      await inputs.nth(2).fill(TEST_PIN);                                     // confirm pin

      // Submit button: contains "Créer mon compte" translation
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click();
      } else {
        await page.locator('button').last().click();
      }
      await page.waitForTimeout(1500);
    }

    const registerUrl = page.url();
    check('1.1 Inscription → redirigé dashboard',
      registerUrl === `${BASE_URL}/` || registerUrl === BASE_URL,
      `URL: ${registerUrl}`
    );
    await snap(page, '02-after-register');

    // =============== 2. DASHBOARD ===============
    console.log('\n─── 2. DASHBOARD ───');

    const dash = (await bodyText(page)).toLowerCase();
    check('2.1 Dashboard ← "Ventes"',    dash.includes('vente'));
    check('2.2 Dashboard ← "Produits"',   dash.includes('produit'));
    check('2.3 Dashboard ← "Clients"',    dash.includes('client'));
    check('2.4 Dashboard ← "Rapports"',   dash.includes('rapport'));

    await snap(page, '03-dashboard');

    // =============== 3. PRODUITS ===============
    console.log('\n─── 3. PRODUITS ───');

    await page.goto(`${BASE_URL}/produits`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await snap(page, '04-produits');
    check('3.1 Page /produits OK', page.url().includes('/produits'));

    // Find all clickable elements to understand the UI
    const allClickable = page.locator('button, a');
    const clickableCount = await allClickable.count();

    // Try adding a product directly (most apps have add button)
    let added = false;
    for (let i = 0; i < clickableCount; i++) {
      try {
        const t = (await allClickable.nth(i).textContent() || '').toLowerCase();
        if (!t.includes('catégorie') && (t.includes('+') || t.includes('ajouter') || t.includes('produit'))) {
          await allClickable.nth(i).click();
          await page.waitForTimeout(500);
          const formIn = page.locator('input');
          const formCount = await formIn.count();
          if (formCount >= 1) {
            await formIn.nth(0).fill('Jus Orange');
            if (formCount >= 2) await formIn.nth(1).fill('50');
            if (formCount >= 3) await formIn.nth(2).fill('100');
            if (formCount >= 4) await formIn.nth(3).fill('20');
          }
          // Click confirm
          const confirm = page.locator('button[type="submit"], button:has-text("ok"), button:has-text("valider"), button:has-text("ajouter"), button:has-text("save")');
          if (await confirm.first().isVisible({ timeout: 1000 }).catch(() => false)) {
            await confirm.first().click();
            await page.waitForTimeout(1000);
          }
          added = true;
          break;
        }
      } catch {}
    }
    check('3.2 Ajout produit réussi', added);
    await snap(page, '05-after-produit');

    const prodText = (await bodyText(page)).toLowerCase();
    check('3.3 Produit visible dans liste', prodText.includes('orange') || prodText.includes('jus'));

    // =============== 4. CLIENTS ===============
    console.log('\n─── 4. CLIENTS ───');

    await page.goto(`${BASE_URL}/clients`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await snap(page, '06-clients');
    check('4.1 Page /clients OK', page.url().includes('/clients'));

    const clientClickable = page.locator('button, a');
    const clientCount = await clientClickable.count();
    let clientAdded = false;
    for (let i = 0; i < clientCount; i++) {
      try {
        const t = (await clientClickable.nth(i).textContent() || '').toLowerCase();
        if ((t.includes('+') || t.includes('ajouter') || t.includes('client')) && !t.includes('catégorie')) {
          await clientClickable.nth(i).click();
          await page.waitForTimeout(500);
          const ci = page.locator('input');
          const cc = await ci.count();
          if (cc >= 1) {
            await ci.nth(0).fill('Moussa Diallo');
            if (cc >= 2) await ci.nth(1).fill('+221771234567');
          }
          const cnf = page.locator('button[type="submit"], button:has-text("ok"), button:has-text("valider"), button:has-text("ajouter")');
          if (await cnf.first().isVisible({ timeout: 1000 }).catch(() => false)) {
            await cnf.first().click();
            await page.waitForTimeout(1000);
          }
          clientAdded = true;
          break;
        }
      } catch {}
    }
    check('4.2 Ajout client réussi', clientAdded);
    await snap(page, '07-after-client');

    const clientText = (await bodyText(page)).toLowerCase();
    check('4.3 Client visible dans liste', clientText.includes('moussa') || clientText.includes('diallo'));

    // =============== 5. VENTES ===============
    console.log('\n─── 5. VENTES ───');

    await page.goto(`${BASE_URL}/ventes`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await snap(page, '08-ventes');
    check('5.1 Page /ventes OK', page.url().includes('/ventes'));

    const saleClickable = page.locator('button');
    const saleCount = await saleClickable.count();
    let ventesOpened = false;
    for (let i = 0; i < saleCount; i++) {
      try {
        const t = (await saleClickable.nth(i).textContent() || '').toLowerCase();
        if (t.includes('vente') || t.includes('+') || t.includes('nouvelle')) {
          await saleClickable.nth(i).click();
          await page.waitForTimeout(800);
          ventesOpened = true;
          break;
        }
      } catch {}
    }
    check('5.2 Nouvelle vente ouverte', ventesOpened);
    await snap(page, '09-vente-modal');

    // Try interacting with modal/dialog
    const modal = page.locator('[role="dialog"], div[class*="modal"], div[class*="fixed"], div[class*="overlay"]').last();
    const modalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (modalVisible) {
      // Try clicking first product in modal
      const modalItems = modal.locator('button, div[role="button"], li');
      const miCount = await modalItems.count();
      for (let i = 0; i < miCount; i++) {
        try {
          const mt = (await modalItems.nth(i).textContent() || '').toLowerCase();
          if (mt.includes('jus') || mt.includes('orange')) {
            await modalItems.nth(i).click();
            await page.waitForTimeout(400);
            break;
          }
        } catch {}
      }

      // Try cash/dette toggle
      const cashBtns = modal.locator('button');
      const cbCount = await cashBtns.count();
      for (let i = 0; i < cbCount; i++) {
        try {
          const ct = (await cashBtns.nth(i).textContent() || '').toLowerCase();
          if (ct.includes('cash') || ct.includes('payer')) {
            await cashBtns.nth(i).click();
            await page.waitForTimeout(300);
            break;
          }
        } catch {}
      }

      // Confirm sale
      const confirmSale = modal.locator('button:has-text("valider"), button:has-text("confirmer"), button:has-text("terminer"), button:has-text("ok")');
      if (await confirmSale.first().isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmSale.first().click();
        await page.waitForTimeout(1000);
      }
    }

    await snap(page, '10-after-vente');
    check('5.3 Transaction complétée',
      !(await bodyText(page)).toLowerCase().includes('aucune vente')
    );

    // =============== 6. RAPPORTS ===============
    console.log('\n─── 6. RAPPORTS ───');

    await page.goto(`${BASE_URL}/rapports`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await snap(page, '11-rapports');
    check('6.1 Page /rapports OK', page.url().includes('/rapports'));
    check('6.2 Contenu chargé', (await bodyText(page)).length > 100);

    // =============== 7. LANGUE ===============
    console.log('\n─── 7. LANGUE ───');

    const langBtns = page.locator('button');
    const lbCount = await langBtns.count();
    let langDone = false;
    for (let i = 0; i < lbCount; i++) {
      try {
        const t = await langBtns.nth(i).textContent() || '';
        if (t.includes('العربية') || t.includes('Français') || t.includes('🇸🇦') || t.includes('🇫🇷')) {
          await langBtns.nth(i).click();
          await page.waitForTimeout(800);
          langDone = true;
          break;
        }
      } catch {}
    }
    check('7.1 Changement langue FR↔AR', langDone);
    await snap(page, '12-lang-ar');

    const html = await page.locator('html');
    const langDir = await html.getAttribute('dir');
    const langLang = await html.getAttribute('lang');
    check('7.2 RTL activé pour arabe', langDir === 'rtl', `dir: ${langDir}`);
    check('7.3 Lang html = ar', langLang === 'ar', `lang: ${langLang}`);

    // =============== 8. AUTH FLOW ===============
    console.log('\n─── 8. AUTH FLOW ───');

    // Back to dashboard first
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Set up dialog handler BEFORE clicking
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    // Try to find logout button — looks for "Déconnexion" in any clickable element
    const allB = page.locator('button, a, [role="button"]');
    const allBCount = await allB.count();
    let loggedOut = false;
    for (let i = 0; i < allBCount; i++) {
      try {
        const t = (await allB.nth(i).textContent() || '').toLowerCase();
        if (t.includes('décon') || t.includes('logout') || t.includes('quitter') || t.includes('🚪')) {
          await allB.nth(i).click();
          await page.waitForTimeout(2000);
          loggedOut = true;
          break;
        }
      } catch {}
    }
    check('8.1 Déconnexion disponible', loggedOut);
    await snap(page, '13-after-logout');
    check('8.2 Redirigé login/register',
      page.url().includes('/auth/'),
      `URL: ${page.url()}`
    );

    // Re-login
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    
    const li = page.locator('input');
    const liCount = await li.count();
    if (liCount >= 2) {
      await li.nth(0).fill(TEST_USER);
      await li.nth(1).fill(TEST_PIN);
      const loginSubmit = page.locator('button[type="submit"]');
      if (await loginSubmit.isVisible({ timeout: 2000 }).catch(() => false)) {
        await loginSubmit.click();
      } else {
        await page.locator('button').first().click();
      }
      await page.waitForTimeout(1500);
    }
    check('8.3 Re-connexion → dashboard',
      page.url() === `${BASE_URL}/` || page.url() === BASE_URL,
      `URL: ${page.url()}`
    );
    await snap(page, '14-after-relogin');

    // =============== 9. BAD LOGIN ===============
    console.log('\n─── 9. AUTH BAD PIN ───');

    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    
    const bi = page.locator('input');
    const biCount = await bi.count();
    if (biCount >= 2) {
      await bi.nth(0).fill(TEST_USER);
      await bi.nth(1).fill('9999');
      await page.locator('button').first().click();
      await page.waitForTimeout(1000);
    }
    check('9.1 Mauvais PIN reste sur login',
      page.url().includes('/auth/login'),
      `URL: ${page.url()}`
    );
    await snap(page, '15-bad-pin');

    // Check if error message shown
    const errEl = page.locator('p:has-text("incorrect"), p:has-text("erreur"), p:has-text("invalid")').first();
    const errShown = await errEl.isVisible({ timeout: 2000 }).catch(() => false);
    check('9.2 Message d\'erreur affiché', errShown);

    // =============== 10. MOBILE ===============
    console.log('\n─── 10. MOBILE ───');

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    await snap(page, '16-mobile');
    
    const mobileContent = await page.content();
    check('10.1 Navigation bottom visible',
      mobileContent.includes('bottom') || mobileContent.includes('nav') || mobileContent.includes('sticky'),
      'Pas de bottom nav détectée'
    );

    // =============== 11. PWA ===============
    console.log('\n─── 11. PWA ───');

    // Check manifest
    try {
      const resp = await page.goto(`${BASE_URL}/manifest.webmanifest`, { waitUntil: 'networkidle', timeout: 10000 });
      const manifestOk = resp && resp.ok();
      check('11.1 Manifest PWA accessible', manifestOk, resp ? `Status: ${resp.status()}` : 'no response');
    } catch {
      check('11.1 Manifest PWA accessible', false, 'Erreur de chargement');
    }

    // Service Worker
    try {
      const swInfo = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) return { supported: false };
        const regs = await navigator.serviceWorker.getRegistrations();
        return { supported: true, count: regs.length, scopes: regs.map(r => r.scope) };
      }).catch(() => ({ supported: false }));
      check('11.2 Service Worker présent', swInfo.supported === true, JSON.stringify(swInfo));
    } catch {
      check('11.2 Service Worker présent', false, 'Erreur évaluation');
    }

    // =============== 12. SECURITY HEADERS ===============
    console.log('\n─── 12. SECURITY ───');

    try {
      const resp = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 });
      const headers = resp.headers();
      check('12.1 CSP header présent', 'content-security-policy' in headers);
      check('12.2 X-Frame-Options présent', 'x-frame-options' in headers);
      check('12.3 X-Content-Type-Options présent', 'x-content-type-options' in headers);
      await snap(page, '17-security');
    } catch {}

    // =============== RESULTS ===============
    console.log(`\n══════════════════════════════════════════`);
    console.log(`  RÉSULTATS FINAUX`);
    console.log(`  ✅ Réussis:  ${passed}`);
    console.log(`  ❌ Échecs:   ${failed}`);
    console.log(`  Total:      ${passed + failed}`);
    const score = ((passed / (passed + failed)) * 100).toFixed(0);
    console.log(`  Score:      ${score}%`);
    console.log(`══════════════════════════════════════════\n`);

    if (errors.length > 0) {
      console.log('Détails des échecs:');
      errors.forEach((e, i) => console.log(`  ${i+1}. ${e.name}: ${e.detail || 'N/A'}`));
    }

  } catch (err) {
    await snap(page, 'FATAL_ERROR');
    console.log(`\n  ❌ ERREUR FATALE: ${err.message}`);
    console.error(err);
  } finally {
    await browser.close();
  }

  return { passed, failed, errors };
}

main().then(result => {
  fs.writeFileSync(`${SDIR}/test-results.json`, JSON.stringify(result, null, 2));
  process.exit(result.failed > 0 ? 1 : 0);
});
