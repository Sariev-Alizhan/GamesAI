// Capture a series of screenshots of the running web playground
// for use in the Igor presentation. Run with: npx tsx scripts/screenshots.ts
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const URL = process.env.URL ?? 'http://localhost:3000';
const OUT_DIR = resolve(process.cwd(), '../screenshots');

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 980, deviceScaleFactor: 2 });

  const shoot = async (name: string): Promise<void> => {
    const path = `${OUT_DIR}/${name}.png` as `${string}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`  → ${name}.png`);
  };

  // 1. Initial load
  console.log('1. initial state');
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 400));
  await shoot('01-initial');

  // 2. Generate weapon (default)
  console.log('2. weapon generated');
  await page.click('#generate-btn');
  await new Promise((r) => setTimeout(r, 600));
  await shoot('02-weapon-generated');

  // 3. Select 2nd file (different language highlight)
  console.log('3. flutter form selected');
  const items = await page.$$('.file-item');
  if (items[1]) {
    await items[1].click();
    await new Promise((r) => setTimeout(r, 400));
    await shoot('03-flutter-form');
  }

  // 4. Switch to .hbs source view
  console.log('4. .hbs source view');
  await page.click('#tab-source');
  await new Promise((r) => setTimeout(r, 400));
  await shoot('04-hbs-source');

  // 5. Switch back to output, click Copy
  console.log('5. copy flash');
  await page.click('#tab-output');
  await new Promise((r) => setTimeout(r, 200));
  await page.click('#copy-btn');
  await new Promise((r) => setTimeout(r, 250));
  await shoot('05-copied');

  // 6. Switch to vehicle example, generate
  console.log('6. vehicle generated');
  await page.click('button[data-example="vehicle"]');
  await new Promise((r) => setTimeout(r, 200));
  await page.click('#generate-btn');
  await new Promise((r) => setTimeout(r, 600));
  await shoot('06-vehicle-generated');

  // 7. Profession example
  console.log('7. profession generated');
  await page.click('button[data-example="profession"]');
  await new Promise((r) => setTimeout(r, 200));
  await page.click('#generate-btn');
  await new Promise((r) => setTimeout(r, 600));
  await shoot('07-profession-generated');

  // 8. Error state — bad YAML
  console.log('8. error state');
  await page.evaluate(() => {
    const ta = document.getElementById('yaml-input') as HTMLTextAreaElement;
    ta.value = 'id: x\ntype: weapon\nname: ""\ndata: {}\n';
  });
  await page.click('#generate-btn');
  await new Promise((r) => setTimeout(r, 500));
  await shoot('08-error-state');

  // 9. Empty state — non-matching type
  console.log('9. no-match state');
  await page.evaluate(() => {
    const ta = document.getElementById('yaml-input') as HTMLTextAreaElement;
    ta.value = 'id: thing\ntype: nonexistent\nname: Thing\ndata: {}\n';
  });
  await page.click('#generate-btn');
  await new Promise((r) => setTimeout(r, 500));
  await shoot('09-no-match');

  // 10. Final state — accumulated session stats
  console.log('10. session stats');
  await page.click('button[data-example="weapon"]');
  await page.click('#generate-btn');
  await new Promise((r) => setTimeout(r, 500));
  await shoot('10-session-stats');

  await browser.close();
  console.log(`\nDone. Screenshots in: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
