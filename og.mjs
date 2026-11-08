import './mute-auto.mjs'
// SNS 用画像 og.png（ゲーム）と og-love.png（記事）を作る。node og.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const ROOT = import.meta.dirname
const PORT = 5735
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH)
const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, locale: 'ja-JP' })
await muteContext(ctx)
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/`)
await p.waitForFunction(() => window.__knReady)
await p.evaluate(() => { kn.dbg.skipTut(); kn.dbg.seed(4) })
await p.click('#bStart')
await p.evaluate(() => { kn.dbg.pause(); kn.dbg.step(130); const S = kn.S; S.act.L = S.act.R = null; kn.dbg.spawn('like', 0.88); S.act.L.year = 2016; S.act.L.think = '一枚だけ見る'; kn.dbg.spawn('long', 0.55); kn.dbg.step(4) })
await p.evaluate(() => { const t = document.querySelector('#think'); t.className = 'show'; t.textContent = '一枚だけ見る' })
await p.waitForTimeout(400)
const a = (await p.screenshot()).toString('base64')
await p.evaluate(() => { const S = kn.S; S.act.R = null; S.act.L.p = 0.999; kn.dbg.step(2); kn.dbg.step(25) })
await p.waitForTimeout(500)
const c = (await p.screenshot()).toString('base64')
const page = await (await b.newContext({ viewport: { width: 1200, height: 630 } })).newPage()
const fonts = '<link href="https://fonts.googleapis.com/css2?family=Yusei+Magic&family=M+PLUS+Rounded+1c:wght@800&display=swap" rel="stylesheet">'
await page.setContent(`<html><head>${fonts}<style>
body{margin:0;width:1200px;height:630px;overflow:hidden;background:radial-gradient(60% 80% at 30% 60%,#2a3156,#121628 70%);font-family:"M PLUS Rounded 1c",sans-serif;position:relative}
img{position:absolute;height:600px;border-radius:24px;box-shadow:0 20px 40px rgba(0,0,0,.6)}
.a{left:30px;top:20px;transform:rotate(-3deg)} .c{left:350px;top:40px;height:560px;transform:rotate(4deg)}
.t{position:absolute;left:690px;top:90px;width:480px;color:#f6e7c1}
.t small{display:block;color:#f2795b;font-size:30px;letter-spacing:.3em;margin-bottom:6px}
.t b{display:block;font-family:"Yusei Magic";font-weight:400;font-size:92px;line-height:1.05}
.t p{font-size:30px;color:#e8e3d8;line-height:1.5;margin:26px 0 0}
.t i{font-style:normal;color:#ff8d73}
</style></head><body><img class="a" src="data:image/png;base64,${a}"><img class="c" src="data:image/png;base64,${c}">
<div class="t"><small>午前2時</small><b>既読無視<br>の夜</b><p>返事を待つ間、親指が勝手に<br><i>10年前の写真にいいね</i>しかける。<br>朝まで止めろ。</p></div></body></html>`)
await page.waitForTimeout(1500)
await page.screenshot({ path: `${ROOT}/og.png` })
// 記事用
await page.setContent(`<html><head>${fonts}<style>
body{margin:0;width:1200px;height:630px;overflow:hidden;background:#fbf6ea;font-family:"M PLUS Rounded 1c",sans-serif;position:relative}
.n{position:absolute;inset:0 auto 0 0;width:430px;background:#1b2032}
img{position:absolute;left:70px;top:40px;height:550px;border-radius:24px;transform:rotate(-4deg);box-shadow:0 20px 40px rgba(0,0,0,.5)}
.t{position:absolute;left:500px;top:120px;width:640px;color:#2a2622}
.t small{display:block;font-size:24px;color:#6d6458;margin-bottom:18px}
.t b{display:block;font-size:64px;line-height:1.3}
.t p{font-size:28px;color:#6d6458;margin:24px 0 0;line-height:1.5}
</style></head><body><div class="n"></div><img src="data:image/png;base64,${a}">
<div class="t"><small>夜の相談メモ</small><b>既読無視で<br>眠れない夜に</b><p>長文を送る前にできることと、<br>ひとりで抱えない相談先</p></div></body></html>`)
await page.waitForTimeout(1200)
await page.screenshot({ path: `${ROOT}/og-love.png` })
await b.close(); server.kill()
console.log('og.png og-love.png')
