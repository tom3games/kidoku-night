import './mute-auto.mjs'
// 遊び方ごとの分布。node sim.mjs  （種を変えて12夜ずつ。ゲームの処理そのものを1/60秒ずつ進め、bot は反応の遅れつきで押す）
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH } from './mute.mjs'
const ROOT = import.meta.dirname
const PORT = 5737
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH)
const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await p.goto(`http://localhost:${PORT}/`)
await p.waitForFunction(() => window.__knReady)
await p.evaluate(() => kn.dbg.skipTut())
const BOTS = {
  attentive: { react: 0.5, gap: 0.35, banner: 'read' },     // 人の速さで見て押す。友達と母だけ開く
  slowReader: { react: 0.9, gap: 0.6, banner: 'read' },      // ゆっくりでも読んで押す
  late: { react: 1.8, gap: 0.6, banner: 'random' },          // 気づくのが遅い。通知は適当に開く
  masher: { mash: 0.4, banner: 'all' },                      // 全部を連打する
  idle: {},                                                  // 何もしない
}
const out = {}
for (const [name, bot] of Object.entries(BOTS)) {
  const rows = []
  for (let seed = 1; seed <= 12; seed++) {
    const r = await p.evaluate(({ bot, seed }) => {
      kn.dbg.seed(seed * 7919)
      document.querySelector('#bAgain').click()
      kn.dbg.pause()
      const seen = new WeakMap(), bseen = new WeakMap()
      let now = 0, lastTap = -9, nextMash = 0, rnd = seed
      const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647
      const T = ['avatar', 'search', 'call', 'cam', 'input']
      for (let f = 0; f < 60 * 140 && kn.mode !== 'end'; f++) {
        kn.dbg.step(1); now += 1 / 60
        if (kn.mode !== 'play') continue
        const S = kn.S
        if (bot.mash) {
          if (now >= nextMash) { nextMash = now + bot.mash; kn.tap(T[Math.floor(rand() * 5)]) }
          if (S.banner && !S.banner.opened && !bseen.has(S.banner)) { bseen.set(S.banner, now) }
          if (S.banner && now - bseen.get(S.banner) > 0.3) kn.tapBanner()
          continue
        }
        if (bot.react == null) continue
        const acts = ['L', 'R'].map(s => S.act[s]).filter(Boolean)
        for (const a of acts) if (!seen.has(a)) seen.set(a, now)
        const ready = acts.filter(a => now - seen.get(a) >= bot.react)
        if (ready.length && now - lastTap >= bot.gap) {
          ready.sort((x, y) => (y.ph === 'go' ? y.p : 0) - (x.ph === 'go' ? x.p : 0))
          const tg = { like: 'avatar', long: 'input', call: 'call', story: 'cam', ex: 'search' }[ready[0].type]
          kn.tap(tg); lastTap = now; continue
        }
        const bn = S.banner
        if (bn && !bn.opened) {
          if (!bseen.has(bn)) bseen.set(bn, { t: now, open: bot.banner === 'random' ? rand() < 0.5 : bn.kind !== 'trap' })
          const d = bseen.get(bn)
          const busy = acts.some(a => a.ph === 'go' && a.p > 0.5)
          if (d.open && now - d.t >= 0.8 && now - lastTap >= bot.gap && !busy) { kn.tapBanner(); lastTap = now }
        }
      }
      return window.__knResult
    }, { bot, seed })
    rows.push(r)
  }
  const avg = k => +(rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(1)
  const ends = {}; for (const r of rows) ends[r.ending] = (ends[r.ending] || 0) + 1
  const titles = {}; for (const r of rows) titles[r.title] = (titles[r.title] || 0) + 1
  out[name] = { score: avg('score'), min: Math.min(...rows.map(r => r.score)), max: Math.max(...rows.map(r => r.score)), resisted: avg('resisted'), disasters: avg('disasters'), self: avg('self'), traps: avg('traps'), calm: avg('calm'), ends, titles }
  console.log(name.padEnd(11), JSON.stringify(out[name]))
}
await b.close(); server.kill()
const o = out
const okOrder = o.attentive.score > o.late.score && o.late.score > o.idle.score && o.masher.score < o.attentive.score && o.idle.score <= Math.min(o.attentive.min, o.slowReader.min, o.late.min)
console.log(okOrder ? '\nOK: 見て押す > 遅い > 何もしない（何もしないが最低）・連打は見て押すに負ける' : '\nNG: 順番がおかしい')
process.exit(okOrder ? 0 : 1)
