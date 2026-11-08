// 既読無視の夜 本体
;(function () {
  'use strict'
  const D = window.KN_DATA
  const $ = s => document.querySelector(s)
  const T_NIGHT = 84            // 2:00〜6:00 を84秒で（1時間=21秒）
  const DT = 1 / 60
  const BAT0 = 17
  const VIEWS = ['vLoad', 'vTitle', 'vHow', 'vPlay', 'vResult']
  const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }

  // ---------- 乱数（毎晩くじ。同じ種なら同じ夜） ----------
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
  let rng = mulberry(Date.now() & 0xffffffff)
  const pick = a => a[Math.floor(rng() * a.length)]
  const lerp = (a, b, k) => a + (b - a) * k
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
  const ease = k => 1 - Math.pow(1 - k, 2)

  // ---------- 絵（切り絵のアイコン） ----------
  function av(kind) {
    const edge = 'stroke="#fff8ea" stroke-width="1.6"'
    if (kind === 'him') return `<rect width="40" height="40" fill="#5a8f9a"/><path d="M6 40c1-9 7-13 14-13s13 4 14 13z" fill="#2b3150" ${edge}/><circle cx="20" cy="18" r="8.5" fill="#f0c3a0" ${edge}/><path d="M11 17c0-7 5-10 10-10 6 0 9 4 9 9-3-3-8-4-13-3-2 1-4 2-6 4z" fill="#2a1d17"/>`
    if (kind === 'mom') return `<rect width="40" height="40" fill="#e0b14a"/><path d="M6 40c1-9 7-13 14-13s13 4 14 13z" fill="#8a5a44" ${edge}/><circle cx="20" cy="19" r="8" fill="#f0c3a0" ${edge}/><path d="M10 18c-2-8 5-12 10-12s12 4 10 12c-2-4-4-5-6-5-3-2-6-2-8 0-2 0-4 2-6 5z" fill="#5a3a2a"/><circle cx="12" cy="13" r="3" fill="#5a3a2a"/><circle cx="28" cy="13" r="3" fill="#5a3a2a"/>`
    if (kind === 'friend') return `<rect width="40" height="40" fill="#7fb36a"/><circle cx="12" cy="20" r="6" fill="#f0c3a0" ${edge}/><circle cx="28" cy="20" r="6" fill="#e9b48f" ${edge}/><circle cx="20" cy="27" r="6.5" fill="#f3cfae" ${edge}/><path d="M6 18c0-5 3-7 6-7s6 2 6 7c-2-2-4-3-6-3s-4 1-6 3z" fill="#2a1d17"/><path d="M22 18c0-5 3-7 6-7s6 3 6 8c-3-1-5-3-6-5-1 2-3 3-6 4z" fill="#7a4a2a"/>`
    if (kind === 'ex') return `<rect width="40" height="40" fill="#d98aa0"/><path d="M8 40c0-6 1-16 3-22 2-8 16-8 18 0 2 6 3 16 3 22z" fill="#3a2418"/><path d="M8 40c1-8 6-11 12-11s11 3 12 11z" fill="#f4efe6" ${edge}/><circle cx="20" cy="19" r="7.5" fill="#f0c3a0" ${edge}/><path d="M12 18c0-6 4-9 8-9s8 3 8 9c-3-3-6-4-8-5-2 2-5 4-8 5z" fill="#3a2418"/>`
    return ''
  }
  function appIcon(app) {
    if (app === 'ぽつり') return `<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#f2795b"/><path d="M9 12h22c2 0 3 1 3 3v10c0 2-1 3-3 3H18l-6 5v-5H9c-2 0-3-1-3-3V15c0-2 1-3 3-3z" fill="#fff"/></svg>`
    if (app === 'ミセル') return `<svg viewBox="0 0 40 40"><rect width="40" height="40" fill="#e0b14a"/><path d="M6 20 Q20 8 34 20 Q20 32 6 20 Z" fill="#fff"/><circle cx="20" cy="20" r="5.5" fill="#e0b14a"/><circle cx="21.5" cy="18.5" r="1.6" fill="#fff"/></svg>`
    if (app === 'ゆるり会') return `<svg viewBox="0 0 40 40">${av('friend')}</svg>`
    if (app === '母') return `<svg viewBox="0 0 40 40">${av('mom')}</svg>`
    if (app === 'him') return `<svg viewBox="0 0 40 40">${av('him')}</svg>`
    return ''
  }
  function photoSvg(subject, year) {
    const sky = pick(['#8ec5d6', '#f3b37a', '#9cc9a0', '#e7a6b5'])
    return `<svg viewBox="0 0 240 180"><rect width="240" height="180" fill="${sky}"/><rect y="128" width="240" height="52" fill="#d9c79c"/>
      <circle cx="196" cy="34" r="16" fill="#fff3c4"/>
      <g stroke="#fff8ea" stroke-width="2.5"><path d="M50 180c0-30 10-46 28-46s28 16 28 46z" fill="#2b3150"/><circle cx="78" cy="108" r="17" fill="#f0c3a0"/><path d="M60 104c0-14 8-20 18-20s19 6 18 20c-6-7-14-9-22-7-5 1-10 4-14 7z" fill="#e8c35a"/>
      <path d="M128 180c0-28 10-44 26-44s26 16 26 44z" fill="#c4533a"/><circle cx="154" cy="112" r="15" fill="#e9b48f"/><path d="M139 108c0-12 7-18 15-18s16 6 15 18c-5-5-11-7-17-6-5 1-9 3-13 6z" fill="#2a1d17"/></g>
      <path d="M100 100l8-22 5 2-5 18 8-16 5 2-9 20z" fill="#f0c3a0" stroke="#fff8ea" stroke-width="1.5"/>
      <path d="M71 110q7 4 14 0M147 116q7 5 14 0" stroke="#2a1d17" stroke-width="2.4" fill="none"/>
      <text x="10" y="170" font-size="12" fill="#5a4a2a" font-family="sans-serif">${year}.08</text></svg>`
  }
  $('#avHim').innerHTML = av('him')

  // ---------- 音 ----------
  const SND = {
    buzz: ['snd/buzz1.mp3', 'snd/buzz2.mp3', 'snd/buzz3.mp3'], ring: 'snd/ringback.mp3', reply: 'snd/reply.mp3', birds: 'snd/birds.mp3',
    notif: ['snd/notif1.mp3', 'snd/notif2.mp3'], trapN: 'snd/notif3.mp3', tap: ['snd/tap1.mp3', 'snd/tap2.mp3', 'snd/tap3.mp3'],
    type: ['snd/type1.mp3', 'snd/type2.mp3'], send: 'snd/send.mp3', swish: ['snd/swish1.mp3', 'snd/swish2.mp3', 'snd/swish3.mp3'],
    fail: ['snd/fail1.mp3', 'snd/fail2.mp3'], morning: 'snd/morning.mp3', result: 'snd/result.mp3',
  }
  Snd.def(SND)
  let muted = store.get('kn_mute') === '1'
  Snd.setMute(muted)
  function ensureAudio() {
    Snd.init()
    if (!Snd.loops.amb) { Snd.loop('amb', 'snd/fridge.mp3', 0.2); Snd.loop('amb2', 'snd/clock.mp3', 0.1) }
  }
  function setMuted(m) {
    muted = m; Snd.setMute(m); store.set('kn_mute', m ? '1' : '0')
    $('#bMute').classList.toggle('off', m); $('#bMuteT').textContent = m ? '音 なし' : '音 あり'
  }
  setMuted(muted)

  // ---------- 画面切り替え ----------
  function show(id) { for (const v of VIEWS) $('#' + v).hidden = v !== id; if (id === 'vPlay') layout() }

  // ---------- 状態 ----------
  let S = null
  let mode = 'idle'
  function newNight(seed) {
    if (seed != null) rng = mulberry(seed)
    const r = rng()
    const reply = r < 0.68 ? null : r < 0.83 ? 'sleep' : r < 0.93 ? 'wrong' : 'mom'
    S = {
      t: 0, battery: BAT0, act: { L: null, R: null }, nextSpawn: 1.0, nextBanner: 6 + rng() * 3, banner: null,
      resisted: 0, close: 0, self: 0, calm: 0, traps: 0, closest: null, log: [], lastType: null,
      reply: reply ? { kind: reply, at: lerp(T_NIGHT * 0.42, T_NIGHT * 0.83, rng()) } : null,
      exName: pick(D.ex), ending: null, think: null, cueT: 0, oopsT: 0, oops: null, outroT: 0, tut: 0, tutT: 0,
    }
    resetChat()
    $('#banner').classList.remove('show', 'opened'); $('#oops').classList.remove('show'); $('#cue').classList.remove('show')
    $('#think').classList.remove('show'); $('#screen').style.filter = ''
    for (const k of ['like', 'ex', 'story']) hidePreview(k)
  }
  function resetChat() {
    $('#chat').innerHTML = '<div class="day">今日</div><div class="msg me">駅ついた！東口にいる</div><div class="msg them">5分で行く</div><div class="msg me">パスタおいしすぎた</div><div class="msg them">わかる、また行こ</div><div class="msg them">今日ありがとね</div><div class="msg them">気をつけて帰ってね</div><div class="msg me">楽しかった！また行こうね</div><div class="msg me">今度あのお店も行きたい</div><div class="meta">既読 1:12</div>'
    setInput('')
  }
  function addChat(html) {
    const c = $('#chat'); c.insertAdjacentHTML('beforeend', html)
    while (c.children.length > 13) c.removeChild(c.children[1])
  }
  function clockText(t) {
    const min = 120 + Math.floor(clamp(t, 0, T_NIGHT) / T_NIGHT * 240)
    return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0')
  }
  const thumbOf = type => D.imp[type].thumb
  const mult = () => 1 + 1.9 * Math.pow(S.t / T_NIGHT, 1.3)
  function remainSec(imp) {
    const d = D.imp[imp.type], m = mult()
    return imp.ph === 'tell' ? (d.tell - imp.tt) / m + d.base / m : (1 - imp.p) * d.base / m
  }

  // ---------- 衝動 ----------
  function startImp(type, p0, opts = {}) {
    const side = thumbOf(type)
    if (S.act[side]) return null
    const imp = { type, ph: p0 > 0 ? 'go' : 'tell', tt: 0, p: p0 || 0, self: !!opts.self, tut: !!opts.tut, think: opts.think || pick(D.imp[type].think) }
    if (type === 'like') imp.year = 2014 + Math.floor(rng() * 4), imp.subject = pick(D.likePhoto)
    if (type === 'long') imp.text = pick(D.long), imp.chars = 800 + Math.floor(rng() * 9) * 100
    if (type === 'story') imp.cap = pick(D.storyCap), imp.view = pick(D.storyView)
    S.act[side] = imp; S.lastType = type
    say(imp.think)
    if (mode === 'play') Snd.play('tap', { vol: 0.25 })
    return imp
  }
  function spawn() {
    const free = ['L', 'R'].filter(s => !S.act[s])
    if (!free.length) return
    const types = Object.keys(D.imp).filter(k => free.includes(thumbOf(k)) && k !== S.lastType)
    if (!types.length) return
    // 同時に2つは 2:40 から
    if (S.t < T_NIGHT * 0.16 && (S.act.L || S.act.R)) return
    startImp(pick(types), 0)
  }
  function cancelImp(side) {
    const imp = S.act[side]; if (!imp) return
    S.act[side] = null
    hidePreview(imp.type)
    if (imp.self) { say(pick(D.stopped), 'stamp'); Snd.play('swish', { vol: 0.5 }); return }
    const rem = remainSec(imp)
    const close = imp.ph === 'go' && imp.p >= 0.8
    S.resisted++
    if (close) S.close++
    if (imp.ph === 'go' && imp.p >= 0.5 && (!S.closest || rem < S.closest.rem)) S.closest = { type: imp.type, rem, label: impLabel(imp) }
    say(close ? pick(D.close) : pick(D.stopped), close ? 'stamp close' : 'stamp')
    Snd.play('swish', { vol: close ? 0.9 : 0.6 })
    if (imp.tut) tutNext()
  }
  function impLabel(imp) {
    switch (imp.type) {
      case 'like': return `${imp.year}年の写真にいいね`
      case 'long': return `長文メッセージ${imp.chars.toLocaleString()}字`
      case 'call': return '夜中の電話'
      case 'story': return `ストーリー「${imp.cap}」`
      case 'ex': return `元カノの${S.exName}をフォロー`
    }
  }
  function disaster(side) {
    const imp = S.act[side]; S.act[side] = null; hidePreview(imp.type)
    S.log.push({ type: imp.type, at: clockText(S.t), label: impLabel(imp), self: imp.self })
    S.battery -= 2
    mode = 'oops'; S.oops = imp; S.oopsT = imp.type === 'call' ? 2.8 : 2.2
    say(null)
    const o = $('#oops'), Y = 2026 - imp.year
    let h = ''
    if (imp.type === 'like') {
      h = `<div class="ap-hdr">${appIcon('ミセル').replace('<svg', '<svg width="26" height="26" style="border-radius:7px"')}ミセル</div><div class="photo">${photoSvg(imp.subject, imp.year)}<div class="cap">${D.him}　${imp.subject}</div></div><svg id="heart" viewBox="0 0 100 90"><use href="#i-heart"/></svg><div class="what">${Y}年前の写真に<br>いいねしました<small>${imp.year}年8月の${imp.subject}</small></div>`
      Snd.play('tap', { vol: 0.8 }); Snd.play('fail', { vol: 0.8, delay: 0.3 })
      addChat(`<div class="sys">ミセルで ${imp.year}年の写真にいいね ${clockText(S.t)}</div>`)
    } else if (imp.type === 'long') {
      h = `<div class="longScr"><div class="msg me">今度あのお店も行きたい</div><div class="msg me">${imp.text}あと、</div><div class="sys">全文 ${imp.chars.toLocaleString()}字</div></div><div class="what" style="bottom:auto;top:20%">送信しました<small>既読はまだつかない</small></div>`
      Snd.play('send', { vol: 0.9 }); Snd.play('fail', { vol: 0.8, delay: 0.35 })
      addChat(`<div class="msg me long">${imp.text}</div><div class="meta">${clockText(S.t)}</div>`)
    } else if (imp.type === 'call') {
      h = `<div class="callScr"><svg class="av" viewBox="0 0 40 40">${av('him')}</svg><b>${D.him}</b><span id="callSt">発信中…</span><span class="end"><svg width="30" height="30" style="color:#fff;transform:rotate(135deg)"><use href="#i-call"/></svg></span></div><div class="what" style="bottom:4%">夜中の${clockText(S.t)}に<br>電話をかけました</div>`
      Snd.play('ring', { vol: 0.7 })
      addChat(`<div class="sys">通話をキャンセルしました ${clockText(S.t)}</div>`)
    } else if (imp.type === 'story') {
      h = `<div class="storyScr"><div class="bars"><i></i></div><div class="sc">${imp.cap}</div></div><div class="what">ストーリーを投稿しました<small>閲覧 1人: ${imp.view}</small></div>`
      Snd.play('send', { vol: 0.8 }); Snd.play('fail', { vol: 0.8, delay: 0.3 })
      addChat(`<div class="sys">ストーリー「${imp.cap}」を投稿 ${clockText(S.t)}</div>`)
    } else if (imp.type === 'ex') {
      h = `<div class="prof"><svg class="av" viewBox="0 0 40 40">${av('ex')}</svg><b>${S.exName}</b><span style="font-size:13px;color:#9aa1b8">しょうたさんとつながりがあります</span><span class="fb">リクエスト済み</span></div><div class="what">元カノの${S.exName}に<br>フォロー申請しました</div>`
      Snd.play('tap', { vol: 0.8 }); Snd.play('fail', { vol: 0.8, delay: 0.3 })
      addChat(`<div class="sys">${S.exName}さんにフォロー申請 ${clockText(S.t)}</div>`)
    }
    o.innerHTML = h
    requestAnimationFrame(() => o.classList.add('show'))
    buzzPhone()
  }
  function hidePreview(type) {
    if (type === 'like') $('#pvYear').hidden = true
    if (type === 'ex') $('#pvSearch').hidden = true
    if (type === 'story') $('#pvStory').hidden = true
    if (type === 'long') setInput('')
  }
  let inputShown = null
  function setInput(txt) {
    if (txt === inputShown) return; inputShown = txt
    $('#tInput .txt').innerHTML = txt ? '<bdi>' + txt + '</bdi>' : '<span class="ph">メッセージ</span>'
  }

  // ---------- 心の声（同時に1つ） ----------
  let thinkTimer = 0
  function say(txt, cls) {
    const el = $('#think')
    if (!txt) { el.classList.remove('show'); thinkTimer = 0; return }
    el.className = ''; el.textContent = txt
    if (cls) for (const c of cls.split(' ')) el.classList.add(c)
    void el.offsetWidth; el.classList.add('show')
    thinkTimer = 0.9 + txt.length * 0.09
  }

  // ---------- 通知 ----------
  function showBanner(kind, opts = {}) {
    let data
    if (kind === 'friend') data = pick(D.friend)
    else if (kind === 'mom') data = pick(D.mom)
    else if (kind === 'trap') { data = { ...pick(D.trap) }; if (data.go === 'ex') data.text += S.exName }
    else if (kind === 'reply') data = { from: D.him, text: opts.text, app: 'him' }
    const b = { kind, data, life: opts.life || 3.4, opened: false, openT: 0, tut: !!opts.tut }
    S.banner = b
    const el = $('#banner'), icon = kind === 'reply' ? 'him' : data.from
    el.querySelector('.ic').innerHTML = appIcon(icon)
    el.querySelector('.bt b').textContent = kind === 'reply' ? D.him : data.from
    el.querySelector('.bt span').textContent = data.text
    el.classList.remove('opened'); el.classList.add('show')
    if (kind === 'reply') Snd.play('reply', { vol: 0.9, jitter: 0 })
    else Snd.play(kind === 'trap' ? 'trapN' : 'notif', { vol: 0.7 })
    Snd.play('buzz', { vol: 0.45 })
    buzzPhone()
  }
  function hideBanner() { $('#banner').classList.remove('show'); if (S) S.banner = null }
  function tapBanner() {
    const b = S && S.banner
    if (!b || b.opened || b.kind === 'reply') return
    if (!(mode === 'play' || (mode === 'tut' && b.tut))) return
    if (b.kind === 'friend' || b.kind === 'mom') {
      b.opened = true; b.openT = 0.8
      $('#banner').classList.add('opened')
      const k = b.kind === 'mom' ? 0.45 : 0.3
      for (const s of ['L', 'R']) { const a = S.act[s]; if (a) { if (a.ph === 'tell') a.tt = 0; else a.p = Math.max(0, a.p - k) } }
      S.nextSpawn += b.kind === 'mom' ? 2.5 : 1.5
      S.calm++
      say(b.kind === 'mom' ? '母…' : 'ちょっと落ち着いた')
      Snd.play('tap', { vol: 0.5 })
      if (b.tut) tutNext()
    } else if (b.kind === 'trap') {
      hideBanner(); S.traps++
      const go = b.data.go, side = thumbOf(go), cur = S.act[side]
      if (cur) { if (cur.ph === 'tell') { cur.ph = 'go'; cur.p = 0.3 } else cur.p = Math.min(0.95, cur.p + 0.3); say('見ちゃった') }
      else startImp(go, 0.55, { think: '見ちゃった', tut: mode === 'tut' })
      if (mode === 'tut') tutShow('ほら、親指が走った。止めて', false, $(TG[D.imp[go].target]))
      Snd.play('tap', { vol: 0.5 })
    }
  }

  // ---------- 入力 ----------
  function tapTarget(name) {
    if (!S) return
    if (mode !== 'play' && mode !== 'tut') return
    for (const s of ['L', 'R']) { const a = S.act[s]; if (a && D.imp[a.type].target === name) { cancelImp(s); return } }
    if (mode === 'tut') return
    // うずいていない所を押した = 自分で開いた
    const type = Object.keys(D.imp).find(k => D.imp[k].target === name)
    if (startImp(type, 0.6, { self: true, think: D.self })) S.self++
  }
  function buzzPhone() { const p = $('#phone'); p.classList.remove('buzz'); void p.offsetWidth; p.classList.add('buzz') }

  // ---------- チュートリアル ----------
  function tutShow(text, btn, fingerAt) {
    $('#tut').hidden = !text; $('#tut p').textContent = text || ''
    const b = $('#tut button'); b.hidden = !btn
    const f = $('#finger')
    f.toggleAttribute('hidden', !fingerAt)
    if (fingerAt) { const r = fingerAt.getBoundingClientRect(); f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + r.height / 2) + 'px' }
  }
  function tutStart() { mode = 'tut'; S.tut = 1; S.tutT = 0; startImp('like', 0, { tut: true, think: '昔の写真 見るだけ' }); tutShow('親指が勝手に動いた。光った所をタップ', false, $('#tAvatar')) }
  function tutNext() {
    if (S.tut === 1) { S.tut = 2; S.tutT = 0.7; tutShow('', false) }
    else if (S.tut === 2) { S.tut = 3; S.tutT = 1.1; tutShow('', false) }
    else if (S.tut === 4) { S.tut = 5; tutShow('ほら走った。止めればセーフ', true) }
  }
  function tutStep(dt) {
    if (S.tutT > 0) {
      S.tutT -= dt
      if (S.tutT <= 0) {
        if (S.tut === 2) { showBanner('friend', { life: 999, tut: true }); tutShow('友達と母の通知は、開くと落ち着く', false, $('#banner')) }
        if (S.tut === 3) { hideBanner(); showBanner('trap', { life: 999, tut: true }); S.tut = 4; tutShow('彼の名前の通知はワナ。開かない', true) }
      }
    }
    if (S.banner && S.banner.opened) { S.banner.openT -= dt; if (S.banner.openT <= 0 && S.tut !== 4) hideBanner() }
    // チュートリアル中の衝動はゆっくり進み、途中で止まる
    for (const s of ['L', 'R']) { const a = S.act[s]; if (!a) continue; if (a.ph === 'tell') { a.tt += dt; if (a.tt >= D.imp[a.type].tell) a.ph = 'go' } else a.p = Math.min(0.62, a.p + dt / 6) }
  }
  function tutDone() {
    tutShow('', false); hideBanner()
    for (const s of ['L', 'R']) S.act[s] = null
    hidePreview('like'); store.set('kn_tut', '1')
    beginNight()
  }
  $('#tut button').addEventListener('click', () => { if (S && (S.tut === 4 || S.tut === 5)) { if (S.tut === 4 && (S.act.L || S.act.R)) return; tutDone() } })

  // ---------- 夜の始まりと終わり ----------
  function cue(big, small, cls, sec) {
    const c = $('#cue'); c.className = cls || ''; c.querySelector('b').textContent = big; c.querySelector('span').textContent = small
    void c.offsetWidth; c.classList.add('show'); S.cueT = sec
  }
  function beginNight() {
    newNight(window.__knSeed)
    mode = 'cue'; cue('午前2時', '既読のまま、返事がない', '', 1.7)
    if (window.TM) TM.start()
    Snd.loop('bgm', 'snd/bgm.mp3', 0.12, 2)
  }
  function startGame(fromHow) {
    ensureAudio()
    newNight(window.__knSeed)
    show('vPlay')
    if (store.get('kn_tut') !== '1' || window.__knTut) tutStart()
    else beginNight()
  }
  function endNight(kind) {
    if (mode === 'outro' || mode === 'end') return
    S.ending = kind
    for (const s of ['L', 'R']) { if (S.act[s]) hidePreview(S.act[s].type); S.act[s] = null }
    say(null)
    mode = 'outro'
    if (kind === 'morning') { cue('6:00', '朝が来た', 'morning', 2.2); Snd.play('birds', { vol: 0.8, jitter: 0 }); Snd.play('morning', { vol: 0.7, delay: 0.4, jitter: 0 }); Snd.loop('bgm', null) }
    else if (kind === 'down') { cue('封印', 'スマホを布団の下に入れた', '', 2.0); Snd.loop('bgm', null) }
    else if (kind === 'battery') { $('#screen').style.filter = 'brightness(0)'; cue('0%', 'スマホが先に寝た', '', 2.2); Snd.loop('bgm', null) }
    else if (kind === 'reply') { /* 通知を見せたまま */ Snd.loop('bgm', null) }
    S.outroT = kind === 'reply' ? 2.6 : 2.3
  }
  function arriveReply() {
    let k = S.reply.kind
    if (k === 'sleep' && S.log.some(l => l.type === 'call')) k = 'sleepCall'
    S.reply.final = k
    for (const s of ['L', 'R']) { if (S.act[s]) hidePreview(S.act[s].type); S.act[s] = null }
    hideBanner(); showBanner('reply', { text: D.replies[k].text, life: 999 })
    say('きた', 'stamp')
    endNight('reply')
  }

  // ---------- 1コマ（固定60Hz） ----------
  function step(dt) {
    if (!S) return
    if (thinkTimer > 0) { thinkTimer -= dt; if (thinkTimer <= 0) $('#think').classList.remove('show') }
    if (mode === 'cue') { S.cueT -= dt; if (S.cueT <= 0) { $('#cue').classList.remove('show'); mode = 'play' } return }
    if (mode === 'tut') { tutStep(dt); return }
    if (mode === 'oops') {
      S.oopsT -= dt
      if (S.oops.type === 'call' && S.oopsT < 1.2 && !S.oops.cut) { S.oops.cut = true; const st = $('#callSt'); if (st) st.textContent = 'キャンセルしました'; Snd.play('fail', { vol: 0.8 }) }
      if (S.oopsT <= 0) { $('#oops').classList.remove('show'); S.oops = null; if (S.log.length >= 3) endNight('down'); else mode = 'play' }
      return
    }
    if (mode === 'outro') { S.outroT -= dt; if (S.outroT <= 0) { mode = 'end'; showResult() } return }
    if (mode !== 'play') return
    S.t += dt
    const m = mult()
    let active = 0
    for (const s of ['L', 'R']) {
      const a = S.act[s]; if (!a) continue; active++
      const d = D.imp[a.type]
      if (a.ph === 'tell') { a.tt += dt * m; if (a.tt >= d.tell) a.ph = 'go' }
      else {
        const before = a.p
        a.p += dt * m / d.base
        if (a.type === 'long' && Math.floor(before * 24) !== Math.floor(a.p * 24)) Snd.play('type', { vol: 0.35 })
        if (a.p >= 1) { disaster(s); return }
      }
    }
    S.battery -= dt * (0.1 + 0.07 * active)
    S.nextSpawn -= dt
    if (S.nextSpawn <= 0) { spawn(); S.nextSpawn = lerp(2.6, 1.1, S.t / T_NIGHT) + rng() * 0.9 }
    if (S.banner) {
      if (S.banner.opened) { S.banner.openT -= dt; if (S.banner.openT <= 0) hideBanner() }
      else { S.banner.life -= dt; if (S.banner.life <= 0) hideBanner() }
    } else {
      S.nextBanner -= dt
      if (S.nextBanner <= 0) {
        const trapP = lerp(0.3, 0.5, S.t / T_NIGHT), r = rng()
        showBanner(r < trapP ? 'trap' : r < trapP + (1 - trapP) * 0.6 ? 'friend' : 'mom')
        S.nextBanner = 5.5 + rng() * 4
      }
    }
    if (S.reply && S.t >= S.reply.at) { arriveReply(); return }
    if (S.battery <= 0) { S.battery = 0; endNight('battery'); return }
    if (S.t >= T_NIGHT) endNight('morning')
  }

  // ---------- 描く ----------
  let geo = null
  const TG = { avatar: '#tAvatar', search: '#tSearch', call: '#tCall', cam: '#tCam', input: '#tInput' }
  function layout() {
    const st = $('#vPlay').getBoundingClientRect()
    const pr = $('#phone').getBoundingClientRect()
    const rects = {}
    for (const k in TG) { const r = $(TG[k]).getBoundingClientRect(); rects[k] = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2, w: r.width } }
    geo = { W: st.width, H: st.height, pr, rects,
      rest: { L: { x: pr.left + 24, y: pr.bottom - 2 }, R: { x: pr.right - 24, y: pr.bottom - 2 } },
      base: { L: { x: pr.left - 26, y: pr.bottom + 80 }, R: { x: pr.right + 26, y: pr.bottom + 80 } } }
    for (const s of ['L', 'R']) if (!tip[s]) tip[s] = { ...geo.rest[s] }
    drawHands()
  }
  const tip = { L: null, R: null }
  function drawHands() {
    const g = geo, pr = g.pr
    $('#handsBack').setAttribute('viewBox', `0 0 ${g.W} ${g.H}`)
    const palm = (cx, flip) => `<g transform="translate(${cx} ${Math.min(pr.bottom + 30, g.H - 10)}) scale(${flip} 1)" filter="url(#cut)">
      <path d="M-30 ${g.H}L-10 60c-6-30 4-60 30-70 20-6 40 6 40 30v20c18-4 30 8 28 26l-14 ${g.H}z" fill="#b87a7a" stroke="#fff8ea" stroke-width="3"/>
      <path d="M-14 50c-8-36 6-70 34-74 22-2 36 14 34 38l-4 40z" fill="var(--skin)" stroke="#fff8ea" stroke-width="3"/>
      <path d="M6-34c4-6 14-8 20-4M10-22c4-5 12-6 18-3" stroke="var(--skin-dk)" stroke-width="2" fill="none"/></g>`
    $('#handsBack').innerHTML = palm(pr.left + 6, 1) + palm(pr.right - 6, -1)
    $('#thumbs').setAttribute('viewBox', `0 0 ${g.W} ${g.H}`)
  }
  let lastR = performance.now()
  function render() {
    const now = performance.now(), rdt = Math.min(0.1, (now - lastR) / 1000); lastR = now
    if (!S || !geo || $('#vPlay').hidden) return
    $('#clock').textContent = clockText(S.t)
    const left = Math.max(0, Math.ceil((T_NIGHT - S.t) / 21 * 2) / 2)
    $('#toMorning').textContent = left >= 1 ? `朝まで ${Math.ceil(left)}時間` : '朝まで もうすぐ'
    const bat = Math.max(0, Math.ceil(S.battery))
    $('#batTxt').textContent = bat + '%'; $('#bat i').style.width = clamp(bat, 3, 100) + '%'; $('#bat').classList.toggle('low', bat <= 10)
    // 輪と、うずき
    const on = {}
    for (const s of ['L', 'R']) { const a = S.act[s]; if (a) on[D.imp[a.type].target] = a }
    for (const k in TG) {
      const el = $(TG[k]), a = on[k]
      el.classList.toggle('on', !!a && a.ph === 'go'); el.classList.toggle('tell', !!a && a.ph === 'tell')
      const c = el.querySelector('.ring circle')
      if (c) c.style.strokeDashoffset = a ? String(151 * (1 - (a.ph === 'go' ? a.p : 0.02))) : '151'
      if (k === 'input') el.querySelector('.bar').style.width = a && a.ph === 'go' ? (a.p * 100) + '%' : '0'
    }
    // 小窓
    const like = on.avatar, ex = on.search, story = on.cam, long = on.input
    if (like && like.ph === 'go') { $('#pvYear').hidden = false; $('#pvYear').textContent = Math.round(2025 - (2025 - like.year) * Math.min(1, like.p / 0.92)) + '年' } else $('#pvYear').hidden = true
    if (ex && ex.ph === 'go') { $('#pvSearch').hidden = false; const n = S.exName; $('#pvSearchTxt').textContent = n.slice(0, Math.ceil(ex.p * 1.6 * n.length)) + (ex.p > 0.65 ? ' 元カノ' : '') } else $('#pvSearch').hidden = true
    if (story && story.ph === 'go') { $('#pvStory').hidden = false; $('#pvStory').style.transform = `scale(${0.4 + story.p * 0.6}) rotate(${-6 + story.p * 4}deg)` } else $('#pvStory').hidden = true
    if (long && long.ph === 'go') setInput(long.text.slice(0, Math.floor(long.p * long.text.length)))
    else if (!long) setInput('')
    // 親指
    let svg = ''
    for (const s of ['L', 'R']) {
      const a = S.act[s], R = geo.rest[s]
      let want = R
      if (a && mode !== 'oops') {
        const tr = geo.rects[D.imp[a.type].target]
        const dx = R.x - tr.x, dy = R.y - tr.y, len = Math.hypot(dx, dy) || 1
        const E = { x: tr.x + dx / len * (tr.r + 6), y: tr.y + dy / len * (tr.r + 6) }
        const k = a.ph === 'tell' ? 0.05 + 0.03 * Math.sin(now / 45) : 0.08 + 0.92 * ease(a.p)
        want = { x: lerp(R.x, E.x, k), y: lerp(R.y, E.y, k) }
      }
      const cur = tip[s], f = Math.min(1, rdt * (a ? 10 : 16))
      cur.x += (want.x - cur.x) * f; cur.y += (want.y - cur.y) * f
      const B = geo.base[s], ang = Math.atan2(cur.y - B.y, cur.x - B.x) * 180 / Math.PI
      const nx = cur.x - Math.cos(ang * Math.PI / 180) * 9, ny = cur.y - Math.sin(ang * Math.PI / 180) * 9
      svg += `<g filter="url(#cut)"><line x1="${B.x}" y1="${B.y}" x2="${cur.x}" y2="${cur.y}" stroke="#fff8ea" stroke-width="38" stroke-linecap="round"/><line x1="${B.x}" y1="${B.y}" x2="${cur.x}" y2="${cur.y}" stroke="var(--skin)" stroke-width="31" stroke-linecap="round"/>
 <line x1="${B.x}" y1="${B.y}" x2="${lerp(B.x, cur.x, .35)}" y2="${lerp(B.y, cur.y, .35)}" stroke="var(--skin)" stroke-width="40" stroke-linecap="round"/>
        <path d="M${cur.x - Math.cos(ang * Math.PI / 180) * 30 - Math.sin(ang * Math.PI / 180) * 9} ${cur.y - Math.sin(ang * Math.PI / 180) * 30 + Math.cos(ang * Math.PI / 180) * 9}l${Math.sin(ang * Math.PI / 180) * 18} ${-Math.cos(ang * Math.PI / 180) * 18}" stroke="var(--skin-dk)" stroke-width="2" fill="none"/>
        <ellipse cx="${nx}" cy="${ny}" rx="11" ry="8.5" transform="rotate(${ang} ${nx} ${ny})" fill="#f8ddcd" stroke="#e7b49a" stroke-width="1.5"/></g>`
    }
    $('#thumbs').innerHTML = svg
  }
  let last = performance.now(), acc = 0, paused = false
  function frame(now) {
    acc += Math.min(0.25, (now - last) / 1000); last = now
    while (acc >= DT) { if (!paused) step(DT); acc -= DT }
    render()
    requestAnimationFrame(frame)
  }

  // ---------- 結果: 今夜の私の記録 ----------
  function resultTitle() {
    const d = S.log.length
    if (S.ending === 'reply') return D.replies[S.reply.final].title
    if (S.ending === 'battery') return D.batteryTitle
    if (S.resisted === 0) return S.self >= 3 ? D.mashTitle : D.idleTitle
    if (d === 0) return S.close >= 3 ? 'ギリギリの女王' : '鋼の親指'
    return D.titles.find(x => x.d === d && !x.close).t
  }
  function score() { return S.resisted * 10 - S.log.length * 25 + (S.ending === 'morning' ? 30 : 0) + (S.ending === 'reply' ? 20 : 0) }
  function wrap(ctx, text, x, y, maxW, lh) {
    let line = '', yy = y
    for (const ch of text) { if (ctx.measureText(line + ch).width > maxW && line) { ctx.fillText(line, x, yy); line = ch; yy += lh } else line += ch }
    if (line) ctx.fillText(line, x, yy)
    return yy + lh
  }
  function drawRecord() {
    const c = $('#rec'), ctx = c.getContext('2d'), W = c.width, H = c.height
    const hand = '"Yusei Magic","Hiragino Maru Gothic ProN",sans-serif', round = '"M PLUS Rounded 1c","Hiragino Maru Gothic ProN",sans-serif'
    ctx.fillStyle = '#fbf6ea'; ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#e6dcc6'; ctx.lineWidth = 2
    for (let y = 330; y < H - 90; y += 70) { ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 50, y); ctx.stroke() }
    // ステータスバー
    ctx.fillStyle = '#2a2622'; ctx.font = `800 34px ${round}`; ctx.textBaseline = 'middle'
    const endT = S.ending === 'morning' ? '6:00' : clockText(S.t)
    ctx.fillText(endT, 56, 48)
    const bat = Math.max(0, Math.ceil(S.battery))
    ctx.textAlign = 'right'; ctx.font = `500 28px ${round}`; ctx.fillText(bat + '%', W - 120, 48)
    ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 3; ctx.strokeRect(W - 106, 34, 46, 26); ctx.fillStyle = bat <= 10 ? '#e2483d' : '#2a2622'; ctx.fillRect(W - 102, 38, Math.max(3, 38 * bat / 100), 18); ctx.fillStyle = '#2a2622'; ctx.fillRect(W - 58, 42, 5, 10)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#c4533a'; ctx.font = `500 32px ${round}`; ctx.fillText('〈 メモ', 44, 112)
    ctx.textAlign = 'right'; ctx.fillText('完了', W - 50, 112); ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#2a2622'; ctx.font = `68px ${hand}`; ctx.fillText('今夜の私の記録', 56, 230)
    const now = new Date()
    ctx.fillStyle = '#8a7f70'; ctx.font = `500 26px ${round}`; ctx.fillText(`${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日　午前2:00〜${endT}`, 58, 285)
    let y = 380
    const row = (k, v, color) => { ctx.fillStyle = '#8a7f70'; ctx.font = `500 28px ${round}`; ctx.fillText(k, 58, y); ctx.fillStyle = color || '#2a2622'; ctx.font = `800 38px ${round}`; y = wrap(ctx, v, 58, y + 50, W - 116, 50) + 18 }
    row('止めた衝動', `${S.resisted}回${S.close ? `（うちギリギリ ${S.close}回）` : ''}`)
    if (S.closest) row('一番危なかった', `${S.closest.label}　あと${S.closest.rem.toFixed(1)}秒`)
    row('やらかし', S.log.length ? S.log.map(l => `${l.at} ${l.label}`).join('\n').split('\n')[0] + (S.log.length > 1 ? ` ほか${S.log.length - 1}件` : '') : 'なし', S.log.length ? '#c4533a' : '#3d7a5a')
    if (S.ending === 'reply') row('返信', `「${D.replies[S.reply.final].text}」`)
    else if (S.ending === 'morning') row('返信', 'まだ来ない。でも朝になった')
    else if (S.ending === 'battery') row('返信', '電池が先に切れた')
    else row('返信', 'まだ来ない')
    // 称号のハンコ
    const title = resultTitle()
    ctx.save(); ctx.translate(W / 2, H - 200); ctx.rotate(-0.05)
    ctx.font = `60px ${hand}`
    const tw = Math.min(W - 140, ctx.measureText(title).width + 80)
    ctx.strokeStyle = '#c4533a'; ctx.lineWidth = 6; ctx.strokeRect(-tw / 2, -62, tw, 112)
    ctx.lineWidth = 2; ctx.strokeRect(-tw / 2 + 9, -53, tw - 18, 94)
    ctx.fillStyle = '#c4533a'; ctx.textAlign = 'center'; ctx.font = `500 22px ${round}`; ctx.fillText('称号', 0, -72)
    ctx.font = `60px ${hand}`; let fs = 60; while (ctx.measureText(title).width > tw - 40 && fs > 30) { fs -= 2; ctx.font = `${fs}px ${hand}` }
    ctx.fillText(title, 0, 14)
    ctx.restore()
    ctx.fillStyle = '#a99d8b'; ctx.font = `500 24px ${round}`; ctx.textAlign = 'center'; ctx.fillText('既読無視の夜　tom3games.github.io/kidoku-night', W / 2, H - 40); ctx.textAlign = 'left'
    return title
  }
  function fitRecord() {
    const w = $('#rWrap').clientWidth, h = $('#rWrap').clientHeight, c = $('#rec')
    const k = Math.min(w / c.width, h / c.height)
    c.style.width = Math.floor(c.width * k) + 'px'; c.style.height = Math.floor(c.height * k) + 'px'
  }
  let lastTitle = ''
  function showResult() {
    show('vResult')
    lastTitle = drawRecord()
    fitRecord()
    Snd.play('result', { vol: 0.7, jitter: 0 })
    if (window.TM) TM.end(score(), S.ending === 'morning' || S.ending === 'reply')
    $('#screen').style.filter = ''
    window.__knResult = { ending: S.ending, resisted: S.resisted, close: S.close, self: S.self, disasters: S.log.length, title: lastTitle, score: score(), battery: S.battery, traps: S.traps, calm: S.calm }
  }
  function toast(t) { const m = $('#rMsg'); m.textContent = t; m.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => { m.hidden = true }, 1800) }
  const URL0 = 'https://tom3games.github.io/kidoku-night/'
  $('#bX').addEventListener('click', () => {
    const first = S.log[0]
    const text = `既読無視の夜、親指を${S.resisted}回止めた。称号「${lastTitle}」` + (first ? `\nやらかし: ${first.label}` : '') + '\n#既読無視の夜 #バカゲー'
    if (window.TM) TM.share('x')
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(URL0), '_blank', 'noopener')
  })
  $('#bSave').addEventListener('click', () => {
    if (window.TM) TM.share('save')
    $('#rec').toBlob(async b => {
      const f = new File([b], 'kidoku-night.png', { type: 'image/png' })
      try { if (navigator.canShare && navigator.canShare({ files: [f] }) && /iP(hone|ad)|Android/.test(navigator.userAgent)) { await navigator.share({ files: [f] }); return } } catch (e) { if (e && e.name === 'AbortError') return }
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'kidoku-night.png'; document.body.appendChild(a); a.click(); a.remove()
      toast('画像を保存しました')
    }, 'image/png')
  })
  $('#loveLink').addEventListener('click', () => { if (window.TM && TM.event) TM.event('article_click', { from: 'result', title: lastTitle }) })
  $('#bAgain').addEventListener('click', () => { ensureAudio(); show('vPlay'); beginNight() })

  // ---------- ボタン ----------
  // iOS と古い端末のために touchstart と pointerdown の両方で受け、同じ1回は二重に数えない
  let lastTouch = 0
  function onPress(el, fn) {
    el.addEventListener('touchstart', e => { e.preventDefault(); lastTouch = performance.now(); fn() }, { passive: false })
    el.addEventListener('pointerdown', e => { e.preventDefault(); if (performance.now() - lastTouch < 600) return; fn() })
  }
  for (const k in TG) onPress($(TG[k]), () => tapTarget(k))
  onPress($('#banner'), tapBanner)
  $('#bStart').addEventListener('click', () => startGame())
  $('#bHowGo').addEventListener('click', () => startGame(true))
  $('#bHow').addEventListener('click', () => show('vHow'))
  $('#bHowBack').addEventListener('click', () => show('vTitle'))
  $('#bMute').addEventListener('click', () => { ensureAudio(); setMuted(!muted) })
  $('#bMuteT').addEventListener('click', () => { ensureAudio(); setMuted(!muted) })
  addEventListener('resize', () => { if (!$('#vPlay').hidden) layout(); if (!$('#vResult').hidden) fitRecord() })

  // ---------- 読み込み（本物の件数で進むバー。12秒で必ず消す） ----------
  const PRE = ['snd/fridge.mp3', 'snd/clock.mp3', ...SND.buzz, ...SND.notif, SND.trapN, ...SND.tap, ...SND.swish, ...SND.fail, SND.send, SND.reply]
  let got = 0
  const total = PRE.length + 1
  const tick = () => { got++; $('#loadBar i').style.width = Math.round(got / total * 100) + '%' }
  const fontP = (document.fonts && document.fonts.load ? Promise.all([document.fonts.load('20px "Yusei Magic"', '既読無視の夜'), document.fonts.load('800 20px "M PLUS Rounded 1c"', '夜をはじめる')]) : Promise.resolve()).catch(() => {}).then(tick)
  const sndP = PRE.map(u => fetch(u).then(r => r.arrayBuffer()).catch(() => {}).then(tick))
  let readyDone = false
  function ready() {
    if (readyDone) return; readyDone = true
    show('vTitle')
    window.__knReady = true
  }
  Promise.all([fontP, ...sndP]).then(ready)
  setTimeout(ready, 12000)
  window.__knJs = true
  requestAnimationFrame(frame)

  // ---------- 検証用の窓口 ----------
  window.kn = {
    get S() { return S }, get mode() { return mode },
    targetXY(name) { const r = $(TG[name]).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } },
    bannerXY() { const r = $('#banner').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, shown: $('#banner').classList.contains('show') } },
    active() { return ['L', 'R'].map(s => S && S.act[s] && { type: S.act[s].type, target: D.imp[S.act[s].type].target, ph: S.act[s].ph, p: S.act[s].p, self: S.act[s].self }).filter(Boolean) },
    banner() { return S && S.banner && { kind: S.banner.kind, opened: S.banner.opened } },
    tap: tapTarget, tapBanner, endNight,
    dbg: {
      pause(v = true) { paused = v }, step(n = 1) { for (let i = 0; i < n; i++) step(DT); render() },
      seed(s) { window.__knSeed = s }, spawn(type, p) { return !!startImp(type, p || 0) }, banner(kind) { showBanner(kind) },
      skipTut() { store.set('kn_tut', '1') }, disaster(type) { const side = thumbOf(type); if (!S.act[side]) startImp(type, 0.99); S.act[side].p = 0.999; S.act[side].ph = 'go' },
      set(k, v) { S[k] = v },
    },
  }
})()
