import './mute-auto.mjs'
// 台本どおりに進めて画面を撮る。node shot.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5733
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH)
const sizes = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[390, 844]]
for (const [w, h] of sizes) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'ja-JP', hasTouch: true })
  await muteContext(ctx)
  const p = await ctx.newPage(); const errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await p.goto(`http://localhost:${PORT}/`)
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-0load.png` })
  await p.waitForFunction(() => window.__knReady)
  await p.waitForTimeout(400)
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-1title.png` })
  await p.click('#bHow'); await p.screenshot({ path: `${ROOT}/shots/s-${w}-2how.png` })
  await p.evaluate(() => { kn.dbg.seed(7); kn.dbg.pause() })
  await p.click('#bHowGo')
  await p.evaluate(() => kn.dbg.step(80))
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-3tut.png` })
  await p.evaluate(() => { kn.dbg.skipTut(); kn.tap('avatar'); kn.dbg.step(60) })
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-4tut2.png` })
  await p.evaluate(() => { kn.tapBanner(); kn.dbg.step(140) })
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-5tut3.png` })
  await p.click('#tut button')
  await p.evaluate(() => kn.dbg.step(40))
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-6cue.png` })
  await p.evaluate(() => { kn.dbg.step(120); kn.dbg.spawn('like', 0.7); kn.dbg.spawn('long', 0.5); kn.dbg.step(10) })
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-7play.png` })
  await p.evaluate(() => { kn.tap('avatar'); kn.dbg.step(3); kn.dbg.banner('trap'); kn.dbg.step(20) })
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-8stamp.png` })
  for (const t of ['like', 'call', 'long', 'story', 'ex']) {
    await p.evaluate(t => { const S = kn.S; S.act.L = null; S.act.R = null; S.log.length = 0; kn.dbg.disaster(t); kn.dbg.step(2); kn.dbg.step(30) }, t)
    await p.waitForTimeout(300)
    await p.screenshot({ path: `${ROOT}/shots/s-${w}-9oops-${t}.png` })
    await p.evaluate(() => kn.dbg.step(200))
  }
  await p.evaluate(() => { kn.S.resisted = 12; kn.S.close = 2; kn.S.closest = { type: 'like', rem: 0.23, label: '2016年の写真にいいね' }; kn.S.log = [{ at: '3:12', label: '長文メッセージ1,200字' }]; kn.endNight('morning'); kn.dbg.step(200) })
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${ROOT}/shots/s-${w}-z-result.png` })
  console.log(w, h, 'errs', errs)
  await ctx.close()
}
await b.close(); server.kill()
