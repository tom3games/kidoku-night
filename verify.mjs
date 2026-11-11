import './mute-auto.mjs'
// 既読無視の夜の検証。node verify.mjs
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5734
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, path = '') {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, hasTouch: true, ...opts })
  await muteContext(ctx)
  await ctx.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  // アフィリ先（ASP）には一切つながない
  await ctx.route(/cross-system\.com/, r => r.abort())
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)|cross-system/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0 + path)
  if (!path) await p.waitForFunction(() => window.__knReady, null, { timeout: 15000 })
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *')) {
    if (el.closest('[hidden]') || el.closest('#thumbs,#handsBack,.room,#tInput') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className.baseVal || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,main:not([hidden]) canvas,main:not([hidden]) a')) { if (!el.offsetParent && el.tagName !== 'CANVAS') continue; const r = el.getBoundingClientRect(); if (!r.width) continue; if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  return { H, over: over.slice(0, 6) }
})
// 同時に出ている「読ませる文字」の数（心の声・通知・チュートリアル・合図）
const texts = p => p.evaluate(() => ['#think.show', '#banner.show', '#tut:not([hidden])', '#cue.show'].filter(s => document.querySelector(s)).length)
const tapAt = async (p, xy, touch) => { if (touch) await p.touchscreen.tap(xy.x, xy.y); else await p.mouse.click(xy.x, xy.y) }

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser)
await t('起動時にエラーが出ない・ロード画面が消えてタイトル', async () => {
  const r = await p.evaluate(() => ({ load: document.querySelector('#vLoad').hidden, title: !document.querySelector('#vTitle').hidden }))
  expect(p.errs.length === 0 && r.load && r.title, p.errs.join('|') + JSON.stringify(r)); return r
})
await t('ブラウザの拡大が起きない', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, g: g.defaultPrevented, w: w.defaultPrevented, k: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.g && r.w && r.k && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r))
})
await t('OGP 一式（og.png が 200）', async () => {
  const r = await p.evaluate(() => ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => !!document.querySelector(`meta[property="${k}"]`)).concat(!!document.querySelector('meta[name="twitter:card"]')))
  const og = await p.request.get(URL0 + 'og.png')
  expect(r.every(Boolean) && og.status() === 200, JSON.stringify(r) + og.status())
})
await t('画面に「AI」「画像生成」も、アプリの名前も出ない（ゲーム側）', async () => {
  const src = readFileSync(ROOT + '/index.html', 'utf8') + readFileSync(ROOT + '/game.js', 'utf8') + readFileSync(ROOT + '/data.js', 'utf8')
  const txt = await p.evaluate(() => document.body.innerText)
  expect(!/\bAI\b|画像生成|ウラーノ|urano/i.test(src + txt), 'found')
})

// ---- チュートリアルを本物の指で
await p.evaluate(() => kn.dbg.seed(11))
await p.click('#bStart')
await p.waitForTimeout(500)
await t('チュートリアル: 指ガイドがアイコンを指す', async () => {
  const r = await p.evaluate(() => { const f = document.querySelector('#finger').getBoundingClientRect(), a = kn.targetXY('avatar'); return { vis: !document.querySelector('#finger').hasAttribute('hidden'), d: Math.hypot(f.left - a.x, f.top - a.y), mode: kn.mode } })
  expect(r.vis && r.d < 40 && r.mode === 'tut', JSON.stringify(r)); return r
})
await t('チュートリアル: アイコンを本物のクリックで押すと止まる', async () => {
  await tapAt(p, await p.evaluate(() => kn.targetXY('avatar')))
  await p.waitForTimeout(100)
  const r = await p.evaluate(() => ({ act: kn.active().length, res: kn.S.resisted, tut: kn.S.tut }))
  expect(r.act === 0 && r.res === 1 && r.tut === 2, JSON.stringify(r)); return r
})
await t('チュートリアル: 友達の通知を本物の指で開く', async () => {
  await p.waitForFunction(() => kn.banner() && kn.bannerXY().shown, null, { timeout: 4000 })
  await p.waitForTimeout(350)
  await tapAt(p, await p.evaluate(() => kn.bannerXY()))
  const r = await p.evaluate(() => ({ b: kn.banner(), tut: kn.S.tut }))
  expect(r.b && r.b.opened && r.tut === 3, JSON.stringify(r)); return r
})
await t('チュートリアル: ワナの通知の説明 → わかった で夜が始まる', async () => {
  await p.waitForFunction(() => kn.S.tut === 4, null, { timeout: 5000 })
  await p.click('#tut button')
  await p.waitForFunction(() => kn.mode === 'play', null, { timeout: 5000 })
  const r = await p.evaluate(() => ({ mode: kn.mode, t: kn.S.t, tm: window.__tmLog.map(e => e.name) }))
  expect(r.tm.includes('game_start'), JSON.stringify(r)); return r
})

// ---- 遊びの仕組み（時間を止めて1つずつ）
await p.evaluate(() => { kn.dbg.pause(); kn.S.reply = null; kn.dbg.set('t', 10); kn.dbg.set('nextBanner', 999) })
await t('うずいた所を本物のクリックで押すと止まる（5か所すべて）', async () => {
  const out = {}
  for (const type of ['like', 'long', 'call', 'story', 'ex']) {
    await p.evaluate(type => { const S = kn.S; S.act.L = S.act.R = null; kn.dbg.spawn(type, 0.4); kn.dbg.step(2) }, type)
    const before = await p.evaluate(() => kn.S.resisted)
    const xy = await p.evaluate(type => kn.targetXY(kn.active()[0].target), type)
    await tapAt(p, xy)
    out[type] = await p.evaluate(b => ({ act: kn.active().length, gain: kn.S.resisted - b }), before)
  }
  expect(Object.values(out).every(o => o.act === 0 && o.gain === 1), JSON.stringify(out)); return out
})
await t('親指の上から押しても届く（親指は押す邪魔をしない）', async () => {
  await p.evaluate(() => { kn.S.act.L = kn.S.act.R = null; kn.dbg.spawn('call', 0.85); kn.dbg.step(8) })
  await p.waitForTimeout(300)
  const top = await p.evaluate(() => { const xy = kn.targetXY('call'); const el = document.elementFromPoint(xy.x, xy.y); return el.closest('#tCall') ? 'ok' : (el.id || el.tagName) })
  await tapAt(p, await p.evaluate(() => kn.targetXY('call')))
  const r = await p.evaluate(() => ({ n: kn.active().length, mode: kn.mode, log: kn.S.log.length }))
  expect(top === 'ok' && r.n === 0 && r.mode === 'play' && r.log === 0, top + ' ' + JSON.stringify(r)); return top
})
await t('うずいていない所を押すと「自分で開いた」になり、止めても数えない', async () => {
  await p.evaluate(() => { kn.S.act.L = kn.S.act.R = null })
  const b = await p.evaluate(() => ({ res: kn.S.resisted, self: kn.S.self }))
  await tapAt(p, await p.evaluate(() => kn.targetXY('cam')))
  const a = await p.evaluate(() => ({ act: kn.active(), self: kn.S.self }))
  await tapAt(p, await p.evaluate(() => kn.targetXY('cam')))
  const c = await p.evaluate(() => kn.S.resisted)
  expect(a.act[0] && a.act[0].self && a.act[0].p >= 0.59 && a.self === b.self + 1 && c === b.res, JSON.stringify({ a, b, c })); return a.act[0].p
})
await t('友達の通知を開くと、進んでいた衝動が戻る', async () => {
  await p.evaluate(() => { kn.S.act.L = kn.S.act.R = null; kn.dbg.spawn('like', 0.7); kn.dbg.banner('friend'); kn.dbg.step(20) })
  await p.waitForTimeout(400)
  await tapAt(p, await p.evaluate(() => kn.bannerXY()))
  const r = await p.evaluate(() => ({ p: kn.active()[0].p, calm: kn.S.calm }))
  expect(r.p < 0.6 && r.calm >= 1, JSON.stringify(r)); return r
})
await t('彼まわりの通知（ワナ）を開くと親指が走る', async () => {
  await p.evaluate(() => { kn.S.act.L = kn.S.act.R = null; kn.S.banner && (kn.S.banner.life = 0); kn.dbg.step(2); kn.S.act.L = kn.S.act.R = null; kn.dbg.set('nextSpawn', 99); kn.dbg.banner('trap'); kn.dbg.step(2) })
  await p.waitForTimeout(400)
  await tapAt(p, await p.evaluate(() => kn.bannerXY()))
  const r = await p.evaluate(() => ({ act: kn.active(), traps: kn.S.traps }))
  expect(r.act.length === 1 && r.act[0].p >= 0.54 && r.traps === 1, JSON.stringify(r)); return r.act[0]
})
await t('同時に出る文字は2つまで（通し中に毎秒数える）', async () => {
  await p.evaluate(() => { kn.S.act.L = kn.S.act.R = null; kn.dbg.set('nextSpawn', 0); kn.dbg.set('nextBanner', 1) })
  let mx = 0
  for (let i = 0; i < 40; i++) { await p.evaluate(() => { kn.S.log.length = 0; kn.S.reply = null; kn.dbg.step(30) }); mx = Math.max(mx, await texts(p)); if ((await p.evaluate(() => kn.mode)) !== 'play' && (await p.evaluate(() => kn.mode)) !== 'oops') break }
  expect(mx <= 2, mx); return mx
})
await t('止めないと、やらかし画面が出て記録とトークに残る', async () => {
  await p.evaluate(() => { const S = kn.S; S.act.L = S.act.R = null; S.log.length = 0; kn.dbg.set('t', 20); if (kn.mode !== 'play') throw new Error('mode ' + kn.mode); kn.dbg.disaster('long'); kn.dbg.step(2) })
  await p.waitForTimeout(150)
  const r = await p.evaluate(() => ({ mode: kn.mode, oops: document.querySelector('#oops').classList.contains('show'), log: kn.S.log.length, chat: document.querySelector('#chat .msg.me.long') !== null }))
  await p.evaluate(() => kn.dbg.step(200))
  expect(r.mode === 'oops' && r.oops && r.log === 1 && r.chat, JSON.stringify(r)); return r
})
await t('音: 鳴らす操作をしても実際には無音（Chromium）・呼んだ回数は増える', async () => {
  const r = await p.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls, played: Object.keys(Snd.played).length }))
  expect(r.ok && r.calls > 0 && r.played > 3, JSON.stringify(r)); return r
})
await p.evaluate(() => kn.dbg.pause(false))
await p.close()

// ---- 終わり方4つ
async function night(setup, label) {
  const q = await open(browser)
  await q.evaluate(() => { kn.dbg.skipTut(); kn.dbg.seed(5) })
  await q.click('#bStart')
  await q.evaluate(() => kn.dbg.pause())
  await q.evaluate(setup)
  for (let i = 0; i < 60 && (await q.evaluate(() => kn.mode)) !== 'end'; i++) await q.evaluate(() => kn.dbg.step(120))
  await q.waitForTimeout(300)
  const r = await q.evaluate(() => ({ ...window.__knResult, view: !document.querySelector('#vResult').hidden, tm: window.__tmLog.map(e => e.name), birds: Snd.played.birds || 0 }))
  await q.screenshot({ path: `${ROOT}/shots/v-end-${label}.png` })
  return { q, r }
}
let idleScore
await t('何もしない夜: やらかし3回で終わり、称号は一番下・点は最低', async () => {
  const { q, r } = await night(() => {}, 'idle')
  idleScore = r.score
  expect(r.view && r.ending === 'down' && r.disasters === 3 && r.resisted === 0 && r.title === 'スマホを持ったまま固まった夜' && r.tm.includes('game_end'), JSON.stringify(r))
  await q.close(); return r
})
await t('朝まで: 6:00 で鳥の声、結果が出る', async () => {
  const { q, r } = await night(() => { kn.S.reply = null; kn.dbg.set('t', 83.5); kn.S.resisted = 9; kn.S.act.L = kn.S.act.R = null; kn.dbg.set('nextSpawn', 99) }, 'morning')
  expect(r.view && r.ending === 'morning' && r.birds >= 1 && r.title === '鋼の親指' && r.score > idleScore, JSON.stringify(r))
  await q.close(); return r
})
await t('返信が来る夜（お母さん）', async () => {
  const { q, r } = await night(() => { kn.S.reply = { kind: 'mom', at: kn.S.t + 0.2 }; kn.S.resisted = 4 }, 'reply')
  expect(r.view && r.ending === 'reply' && r.title === 'お母さんが出た夜', JSON.stringify(r))
  await q.close(); return r
})
await t('電池が切れる夜', async () => {
  const { q, r } = await night(() => { kn.S.reply = null; kn.dbg.set('battery', 0.05); kn.S.resisted = 3 }, 'battery')
  expect(r.view && r.ending === 'battery' && r.title === 'スマホが先に寝た夜', JSON.stringify(r))
  await q.close(); return r
})
await t('結果: 記録の画像が描けていて、Xと保存と記事への1行がある', async () => {
  const { q } = await night(() => { kn.S.reply = null; kn.dbg.set('t', 83.8); kn.S.resisted = 7; kn.S.act.L = kn.S.act.R = null }, 'result')
  const r = await q.evaluate(() => {
    const c = document.querySelector('#rec'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i]; s += v; s2 += v * v; n++ }
    const l = document.querySelector('#loveLink'), btn = document.querySelector('#rBtns').getBoundingClientRect(), lr = l.getBoundingClientRect()
    return { varc: Math.round(s2 / n - (s / n) ** 2), love: l.getAttribute('href'), below: lr.top >= btn.bottom - 1, sup: !!document.querySelector('#tmSupport'), supText: document.querySelector('#tmSupport').textContent }
  })
  let opened = null
  await q.evaluate(() => { window.open = u => { window.__opened = u } })
  await q.click('#bX'); opened = await q.evaluate(() => window.__opened)
  const [dl] = await Promise.all([q.waitForEvent('download', { timeout: 5000 }), q.click('#bSave')])
  await q.evaluate(() => document.querySelector('#loveLink').addEventListener('click', e => e.preventDefault()))
  await q.click('#loveLink')
  const tm = await q.evaluate(() => window.__tmLog.map(e => e.name))
  expect(r.varc > 300 && r.love === 'love.html' && r.below && r.sup && r.supText === '作者にホットミルクをおごる' && /x\.com\/intent\/post/.test(opened) && dl.suggestedFilename() === 'kidoku-night.png' && tm.includes('article_click') && tm.includes('share'), JSON.stringify({ r, opened, tm }))
  await q.close(); return r
})

// ---- 3サイズ × 全画面
for (const [w, h, name] of [[360, 640, 's360'], [390, 844, 's390'], [430, 932, 's430']]) {
  const q = await open(browser, { viewport: { width: w, height: h } })
  const views = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await q.click('#bHow'); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` })
  await q.evaluate(() => { kn.dbg.skipTut(); kn.dbg.seed(3) }); await q.click('#bHowGo'); await q.evaluate(() => { kn.dbg.pause(); kn.dbg.step(150); kn.dbg.spawn('like', 0.6); kn.dbg.spawn('long', 0.5); kn.dbg.banner('friend'); kn.dbg.step(25) })
  views.play = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  await t(`${name}: 押す所が全部画面内で44px以上`, async () => {
    const r = await q.evaluate(() => ['#tAvatar', '#tSearch', '#tCall', '#tCam', '#tInput', '#banner'].map(s => { const b = document.querySelector(s).getBoundingClientRect(); return [s, Math.round(b.width), Math.round(b.height), b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth] }))
    expect(r.every(x => x[1] >= 44 && x[2] >= 44 && x[3]), JSON.stringify(r))
  })
  await t(`${name}: 遊ぶ画面ではみ出しなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length, JSON.stringify(o)) })
  await q.evaluate(() => { kn.S.reply = null; kn.dbg.set('t', 83.9); kn.S.resisted = 11; kn.S.log = [{ at: '3:40', label: '2015年の写真にいいね' }, { at: '4:51', label: '長文メッセージ1,300字' }]; kn.S.closest = { label: '夜中の電話', rem: 0.31 }; kn.S.act.L = kn.S.act.R = null; for (let i = 0; i < 6; i++) kn.dbg.step(100) })
  await q.waitForTimeout(400)
  views.result = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-result.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: エラーなし`, async () => { expect(!q.errs.length, q.errs.join('|')) })
  await q.close()
}

// ---- 記事ページ
await t('記事: PR表記が先頭・h1が1つ・説明文とOGP・ゲームへ戻るリンク・禁止の言葉なし', async () => {
  const q = await open(browser, {}, 'love.html')
  const r = await q.evaluate(() => ({
    first: document.body.innerText.trim().split('\n')[0], h1: document.querySelectorAll('h1').length, title: document.title.length,
    desc: document.querySelector('meta[name=description]').content.length, og: !!document.querySelector('meta[property="og:image"]'),
    back: !!document.querySelector('a[href="./"]'), txt: document.body.innerText,
  }))
  const ogl = await q.request.get(URL0 + 'og-love.png')
  await q.screenshot({ path: `${ROOT}/shots/love-top.png` }); await q.screenshot({ path: `${ROOT}/shots/love-full.png`, fullPage: true })
  const o = await overflow(q)
  expect(r.first === '※この記事はアフィリエイト広告を含みます' && r.h1 === 1 && r.desc >= 80 && r.desc <= 125 && r.og && r.back && ogl.status() === 200 && !/当たる|必ず復縁|今だけ|\bAI\b/.test(r.txt) && !q.errs.length && o.sw <= o.W, JSON.stringify({ ...r, txt: undefined, ogl: ogl.status(), errs: q.errs, o }))
  await q.close(); return { title: r.title, desc: r.desc }
})
await t('記事: AFF_URL が空ならアプリの紹介を丸ごと出さない', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); await muteContext(ctx)
  await ctx.route(/config\.js/, r => r.fulfill({ contentType: 'text/javascript', body: "window.LOVE_CONFIG={AFF_URL:'',APP_NAME:'x'}" }))
  const q = await ctx.newPage(); await q.goto(URL0 + 'love.html')
  const r = await q.evaluate(() => ({ hidden: document.querySelector('#appBox').hidden, vis: document.querySelector('#appBox').checkVisibility(), pr: (document.body.innerText.match(/\bPR\b/g) || []).length }))
  await q.screenshot({ path: `${ROOT}/shots/love-noaff.png`, fullPage: true })
  expect(r.hidden && !r.vis && r.pr === 0, JSON.stringify(r)); await ctx.close(); return r
})
await t('記事: AFF_URL があれば PR・17歳以上・ポイント制つきで新しいタブに出す（ASP には飛ばない）', async () => {
  const q = await open(browser, {}, 'love.html')
  const cfg = readFileSync(ROOT + '/config.js', 'utf8').match(/AFF_URL: '([^']*)'/)[1]
  const r = await q.evaluate(() => { const a = document.querySelector('#appLink'), box = document.querySelector('#appBox'); return { vis: box.checkVisibility(), href: a.href, rel: a.rel, target: a.target, pr: box.querySelector('.badge').textContent, near: a.parentElement.contains(box.querySelector('.badge')), txt: box.innerText } })
  await q.evaluate(() => document.querySelector('#appLink').addEventListener('click', e => e.preventDefault()))
  await q.click('#appLink')
  const tm = await q.evaluate(() => window.__tmLog.map(e => e.name))
  await q.locator('#appBox').screenshot({ path: `${ROOT}/shots/love-app.png` })
  expect(r.vis && r.href === cfg && cfg.startsWith('https://ac.cross-system.com/') && /sponsored/.test(r.rel) && /noopener/.test(r.rel) && r.target === '_blank' && r.pr === 'PR' && r.near && /17歳以上/.test(r.txt) && /ポイント制/.test(r.txt) && tm.includes('app_click'), JSON.stringify({ ...r, tm }))
  await q.close(); return { href: r.href.slice(0, 40) }
})
await browser.close()

// ---- WebKit（iPhone 相当）で本物のタップ
const wb = await webkit.launch()
const wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await t('WebKit: タップで始めてチュートリアルの衝動を止める', async () => {
  await wp.evaluate(() => kn.dbg.seed(2))
  await wp.tap('#bStart'); await wp.waitForTimeout(500)
  await tapAt(wp, await wp.evaluate(() => kn.targetXY('avatar')), true)
  const r = await wp.evaluate(() => ({ res: kn.S.resisted, tut: kn.S.tut }))
  expect(r.res === 1 && r.tut === 2, JSON.stringify(r)); return r
})
await t('WebKit: 夜の中で本物のタップで止める', async () => {
  await wp.evaluate(() => { kn.dbg.pause(); kn.dbg.skipTut(); kn.endNight && 0 })
  await wp.evaluate(() => { const S = kn.S; S.act.L = S.act.R = null; kn.S.tut = 0 })
  // チュートリアルを飛ばして夜へ
  await wp.evaluate(() => { document.querySelector('#tut').hidden = true; kn.S.banner = null })
  await wp.evaluate(() => { kn.dbg.pause(false) })
  await wp.evaluate(() => { document.querySelector('#bAgain').click() })
  await wp.evaluate(() => { kn.dbg.pause(); kn.dbg.step(120); kn.dbg.spawn('ex', 0.3); kn.dbg.step(2) })
  await tapAt(wp, await wp.evaluate(() => kn.targetXY('search')), true)
  const r = await wp.evaluate(() => ({ act: kn.active().length, res: kn.S.resisted, mode: kn.mode }))
  expect(r.act === 0 && r.res === 1 && r.mode === 'play', JSON.stringify(r)); return r
})
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: 実際には無音（タップで音を鳴らしたあと）', async () => {
  const r = await wp.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls }))
  expect(r.ok && r.calls > 0, JSON.stringify(r)); return r
})
await awayTest(wp)
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
await awayNavTest(wp)
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

// ---- ページを離れたら音を止める（WebKit。裏に回る→戻る（bfcache の pageshow）で鳴らない、触ると戻る（resume を呼ぶ）。音は出さない。mute.mjs が resume を数えるだけにしているので state は見ない）
async function awayTest(pg, o = {}) {
  await t('WebKit: 裏に回ると BGM と環境音が止まり suspend。戻っても触るまで鳴らない（bfcache の pageshow でも）', async () => {
    const r = await pg.evaluate(async (fb) => {
      const sl = ms => new Promise(r => setTimeout(r, ms))
      if (!Snd.ctx) Snd.init()
      await sl(900); let fbUsed = false
      if (!Snd.playing().length && fb) { fbUsed = true; Snd.loop('__bed', fb, 0.2); for (let i = 0; i < 40 && !Snd.playing().length; i++) await sl(100) }
      const before = Snd.playing().length
      const c = Snd.ctx; let sus = 0; const os = c.suspend.bind(c); c.suspend = () => { sus++; return os() }
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'))
      const hid = { away: Snd.away, playing: Snd.playing().length, sus, gain: Snd.master.gain.value }
      const nm = Object.keys(Snd.files)[0], src = nm ? Snd.play(nm) : null; Snd.loop('__q', fb || Object.values(Snd.files)[0][0], 0.2)   // 裏にいる間の音は鳴らさない
      await sl(400); const quiet = Snd.playing().length
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
      await sl(400); const back = { away: Snd.away, playing: Snd.playing().length, gain: Snd.master.gain.value }
      Snd.loop('__q', null)
      return { before, fbUsed, hid, src: !!src, quiet, back, calls0: window.__soundCalls || 0 }
    }, o.fb || null)
    const xy = o.tap ? await pg.evaluate(o.tap) : await pg.evaluate(() => ({ x: 8, y: innerHeight * 0.5 }))
    await pg.touchscreen.tap(xy.x, xy.y); await pg.waitForTimeout(800)
    const after = await pg.evaluate(() => ({ away: Snd.away, playing: Snd.playing().length, wake: Snd.life.wake, calls: window.__soundCalls || 0, mute: window.__muteOk() }))
    if (r.fbUsed) await pg.evaluate(() => Snd.loop('__bed', null))
    expect(r.before >= 1 && r.hid.away && r.hid.playing === 0 && r.hid.sus === 1 && r.hid.gain === 0 && !r.src && r.quiet === 0 && r.back.away && r.back.playing === 0 && r.back.gain === 0 && !after.away && after.playing >= r.before && after.wake === 1 && after.calls > r.calls0 && after.mute, JSON.stringify({ r, after }))
    return { before: r.before, after: after.playing, fb: r.fbUsed }
  })
}
async function awayNavTest(pg, o = {}) {
  await t('WebKit: 別のページへ移る（pagehide）と止まり、戻るで戻っても鳴っていない', async () => {
    await pg.evaluate(() => { if (!Snd.ctx) Snd.init(); addEventListener('pagehide', () => { try { sessionStorage.setItem('__awayHide', JSON.stringify({ away: Snd.away, playing: Snd.playing().length, hide: Snd.life.hide })) } catch (e) {} }) })
    const e0 = pg.errs.length
    await pg.goto(o.to || URL0 + 'privacy.html'); await pg.waitForTimeout(300)
    await pg.goBack({ waitUntil: 'commit' }).catch(() => {}); await pg.waitForFunction(() => document.readyState === 'complete' && typeof Snd === 'object', null, { timeout: 15000 }); await pg.waitForTimeout(1000)
    const back = await pg.evaluate(() => ({ playing: Snd.playing().length, ctx: !!Snd.ctx, away: Snd.away, h: JSON.parse(sessionStorage.getItem('__awayHide') || '{}') }))
    expect(back.h.away && back.h.playing === 0 && back.playing === 0 && pg.errs.length === e0, JSON.stringify(back) + pg.errs.slice(e0).join('|')); return back
  })
}
