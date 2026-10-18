// Prueba si este servidor puede leer animeav1 y dramatip sin verificación,
// y si el reproductor de dramatip pide el video (solo se observan sus peticiones).
import { chromium } from "playwright";

const PAGES = [
  ["animeav1 inicio", "https://animeav1.com/"],
  ["animeav1 catálogo", "https://animeav1.com/catalogo"],
  ["animeav1 ficha", "https://animeav1.com/media/one-piece"],
  ["dramatip inicio", "https://dramatip.net/es"],
  ["dramatip categoría", "https://dramatip.net/es/category/revenge"],
  ["dramatip serie", "https://dramatip.net/es/series/doblado-cambie-el-abandono-por-amor"],
];
const EPISODE = "https://dramatip.net/es/series/doblado-cambie-el-abandono-por-amor/episode-1";
const BLOCK = /shameful-farm|aarems|5gvci|bancadeltempoidea|doubleclick|googlesyndication|popads|propeller/i;
const CHALLENGE = /Just a moment|Checking your browser|cf_chl_opt|challenge-platform|Verify you are human|enable JavaScript/i;

const ip = await fetch("https://ipinfo.io/json").then((r) => r.json()).catch(() => ({}));
console.log(`\nIP ${ip.ip ?? "?"} · ${ip.org ?? "?"} · ${ip.city ?? ""} ${ip.country ?? ""}\n`);

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({
  locale: "es-CO",
  viewport: { width: 1280, height: 800 },
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
});
await ctx.route("**/*", (r) => (BLOCK.test(r.request().url()) ? r.abort() : r.continue()));

let ok = 0;
for (const [name, url] of PAGES) {
  const page = await ctx.newPage();
  const t0 = Date.now();
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(4000); // deja correr una posible verificación
    const html = await page.content();
    const blocked = CHALLENGE.test(html.slice(0, 40000)) || (res?.status() ?? 0) >= 400;
    if (!blocked) ok++;
    console.log(`${blocked ? "✗ BLOQUEADA" : "✓ ok      "} ${String(res?.status()).padEnd(4)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${name}  · "${(await page.title()).slice(0, 50)}"`);
  } catch (e) {
    console.log(`✗ ERROR          ${name}  · ${e.message.split("\n")[0]}`);
  }
  await page.close();
}

// Video: abrir episodio, pulsar play una vez y mirar qué pide el reproductor.
console.log("\nVideo de dramatip (episodio 1)…");
const page = await ctx.newPage();
let video = null;
page.on("request", (r) => {
  const u = r.url();
  if (!video && /\.m3u8(\?|%3F|$)|\.m3u8/i.test(u)) video = u;
});
const t0 = Date.now();
try {
  await page.goto(EPISODE, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector("video", { timeout: 20000 });
  const btn = page.locator('button[aria-label*="lay" i], button[aria-label*="eproducir" i]').first();
  if (await btn.count()) await btn.click({ timeout: 5000 }).catch(() => {});
  else await page.locator("video").first().click({ force: true }).catch(() => {});
  await page.evaluate(() => { const v = document.querySelector("video"); if (v) { v.muted = true; v.play().catch(() => {}); } });
  for (let i = 0; i < 20 && !video; i++) await page.waitForTimeout(1000);
} catch (e) {
  console.log(`  error: ${e.message.split("\n")[0]}`);
}
if (video) {
  let direct = null;
  try { direct = new URL(video).searchParams.get("url"); } catch {}
  console.log(`  ✓ en ${((Date.now() - t0) / 1000).toFixed(1)}s\n  pedido:  ${video.slice(0, 140)}\n  directo: ${(direct ?? "(no es proxy)").slice(0, 140)}`);
  const target = direct ?? video;
  const r = await fetch(target).catch((e) => ({ status: "error " + e.message }));
  const body = r.text ? (await r.text()).slice(0, 7) : "";
  console.log(`  playlist desde el servidor: HTTP ${r.status} ${body === "#EXTM3U" ? "(válida)" : ""}`);
} else {
  const st = await page.evaluate(() => { const v = document.querySelector("video"); return v ? `video readyState ${v.readyState}, paused ${v.paused}` : "sin <video>"; }).catch(() => "?");
  console.log(`  ✗ el reproductor no pidió video (${st})`);
}
await browser.close();
console.log(`\nResultado: ${ok}/${PAGES.length} páginas sin verificación, video ${video ? "sí" : "no"}.\n`);
