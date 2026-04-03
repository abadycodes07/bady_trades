const { chromium } = require('playwright');

(async () => {
  console.log("Starting browser...");
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`[Browser Error] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      console.warn(`[Browser Warn] ${msg.text()}`);
    } else {
      console.log(`[Browser Log] ${msg.text()}`);
    }
  });

  page.on('pageerror', exception => {
    console.error(`[Uncaught Exception] ${exception}`);
  });

  console.log("Navigating to login...");
  await page.goto('https://badytrades-production.up.railway.app/login', { waitUntil: 'networkidle' });

  console.log("Filling credentials...");
  await page.fill('input[type="email"]', 'abady.aaaa07@gmail.com');
  await page.fill('input[type="password"]', 'A1a2a3a4a5@@@AB');
  
  console.log("Submitting...");
  await page.click('button[type="submit"]');

  console.log("Waiting for network idle / redirect...");
  await page.waitForTimeout(5000); // give it time to redirect and crash

  console.log("Checking current URL...");
  console.log("URL is:", page.url());

  console.log("Done.");
  await browser.close();
})();
