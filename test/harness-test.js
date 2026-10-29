(function(){
'use strict';
const scn = (location.hash || '#tests').slice(1);
const out = []; let pass = 0, fail = 0;
const log = s => out.push(s);
const ok = (c, m) => { if (c) pass++; else fail++; out.push((c ? 'PASS  ' : 'FAIL  ') + m); };
const $ = id => document.getElementById(id);
const q = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const key = (code, opt) => window.dispatchEvent(new KeyboardEvent('keydown', Object.assign({code, bubbles:true, cancelable:true}, opt || {})));
const num = id => +$(id).textContent;
const tgt = () => { const t = document.querySelectorAll('.key.target'); return t.length === 1 ? t[0].dataset.code : null; };
const strikesOn = () => document.querySelectorAll('#strikes i.on').length;
const shown = () => !$('overlay').classList.contains('show') ? 'none' : ['pReady','pWarn','pDone'].filter(i => $(i).classList.contains('show')).join(',');
const playable = [...document.querySelectorAll('.key:not(.dead)')].map(k => k.dataset.code);
const wrongOf = (n) => playable.filter(c => c !== tgt())[n || 0];
const adv = ms => window.__adv(ms);
const click = id => $(id).click();

/* ---- 獨立於程式本體的「標準注音鍵盤」對照表 ---- */
const DEF = [
  [['Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus'], 'ㄅㄉˇˋㄓˊ˙ㄚㄞㄢㄦ'],
  [['KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP'], 'ㄆㄊㄍㄐㄔㄗㄧㄛㄟㄣ'],
  [['KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon'], 'ㄇㄋㄎㄑㄕㄘㄨㄜㄠㄤ'],
  [['KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash'], 'ㄈㄌㄏㄒㄖㄙㄩㄝㄡㄥ']
];
const CODE2SYM = {}, SYM2CODE = {};
DEF.forEach(([codes, s]) => [...s].forEach((ch, i) => { CODE2SYM[codes[i]] = ch; SYM2CODE[ch] = codes[i]; }));
const FING = {
  pL:['Digit1','KeyQ','KeyA','KeyZ'], rL:['Digit2','KeyW','KeyS','KeyX'], mL:['Digit3','KeyE','KeyD','KeyC'],
  iL:['Digit4','Digit5','KeyR','KeyT','KeyF','KeyG','KeyV','KeyB'], iR:['Digit6','Digit7','KeyY','KeyU','KeyH','KeyJ','KeyN','KeyM'],
  mR:['Digit8','KeyI','KeyK','Comma'], rR:['Digit9','KeyO','KeyL','Period'], pR:['Digit0','Minus','KeyP','Semicolon','Slash']
};
const FOF = {}; Object.entries(FING).forEach(([f, cs]) => cs.forEach(c => FOF[c] = f));
const TONE_BY_PATH = {'M30 80 L70 20':'ˊ', 'M20 26 L50 78 L80 26':'ˇ', 'M30 20 L70 80':'ˋ'};
function symOf(node){
  const s = node.querySelector('svg');
  if (s){ const p = s.querySelector('path'); if (p) return TONE_BY_PATH[p.getAttribute('d')] || '?'; if (s.querySelector('circle')) return '˙'; return '?'; }
  return node.textContent.trim();
}

/* ---- 打完一整局(含一次連錯暫停),回傳實際打出的統計 ---- */
function fullGame(){
  click('startBtn');
  let R = 0, W = 0, loc = 0, timeBad = 0, firstBad = '';
  const press = good => {
    if (good){ key(tgt()); R++; loc = 0; } else { key(wrongOf(Math.floor(Math.random() * 6))); W++; loc++; }
  };
  for (let sec = 1; sec <= 199; sec++){
    const n = 2 + (sec % 3);
    for (let i = 0; i < n; i++) press(loc >= 2 || Math.random() > 0.22);
    if (sec === 100){
      press(true);
      for (let i = 0; i < 5; i++){ key(wrongOf(i)); W++; }
      if (shown() !== 'pWarn'){ timeBad++; firstBad = firstBad || 'warn missing @100'; }
      const t0 = num('time'); adv(7000);
      if (num('time') !== t0){ timeBad++; firstBad = firstBad || 'time moved during warn'; }
      click('resumeBtn'); loc = 0;
    }
    adv(1000);
    if (num('time') !== 200 - sec){ timeBad++; firstBad = firstBad || `sec ${sec}: shows ${num('time')}`; }
  }
  adv(900);
  const nearEnd = {time:num('time'), shown:shown()};
  press(true); press(false);
  adv(100);
  return {R, W, timeBad, firstBad, nearEnd};
}

async function tests(){
  /* A. 對照表 / 版面 */
  ok(playable.length === 41, `41 symbol keys on keyboard (got ${playable.length})`);
  let capBad = 0, fingBad = 0;
  playable.forEach(c => {
    const k = document.querySelector(`.key[data-code="${c}"]`);
    if (symOf(k.querySelector('.cap')) !== CODE2SYM[c]) capBad++;
    if (!k.classList.contains('f-' + FOF[c])) fingBad++;
  });
  ok(capBad === 0, 'every key cap holds the standard zhuyin symbol');
  ok(fingBad === 0, 'every key coloured for the correct finger');
  const lbl = [...document.querySelectorAll('.flabel')].map(l => l.dataset.f).join(',');
  ok(lbl === 'pL,rL,mL,iL,iL,iR,iR,mR,rR,pR', 'finger label order ' + lbl);
  const lblText = [...document.querySelectorAll('.flabel')].map(l => l.textContent).join('|');
  ok(lblText === '小指|無名指|中指|食指|食指|食指|食指|中指|無名指|小指', 'finger label text ' + lblText);

  /* B. 開始前 */
  ok(shown() === 'pReady', 'initial: ready panel shown');
  ok(num('time') === 200 && num('score') === 0, 'initial time=200 score=0');
  ok(tgt() === null, 'no target before start');
  adv(5000);
  ok(num('time') === 200, 'timer does NOT run before start button (5s fake)');
  key('KeyA'); key('KeyQ');
  ok(num('score') === 0, 'keys ignored while on ready screen');

  /* C. 開始 / 計時 */
  click('startBtn');
  ok(shown() === 'none', 'overlay hidden after start');
  ok(tgt() !== null, 'exactly one target key highlighted');
  ok(num('time') === 200, 'time still 200 immediately after start');
  adv(1000); ok(num('time') === 199, 'after 1.0s -> 199');
  adv(500);  ok(num('time') === 199, 'after 1.5s -> 199');
  adv(500);  ok(num('time') === 198, 'after 2.0s -> 198');

  /* D. 打對 */
  let old = tgt();
  key(old);
  ok(num('score') === 500, 'correct -> +500');
  ok(tgt() !== null && tgt() !== old, 'target changes after correct');

  /* E. 打錯 */
  old = tgt();
  key(wrongOf(0));
  ok(num('score') === 450, 'wrong -> -50 (450)');
  ok(tgt() === old, 'target unchanged after wrong');
  ok(strikesOn() === 1, 'strike dot = 1');
  key(wrongOf(1)); key(wrongOf(2));
  ok(num('score') === 350 && strikesOn() === 3, 'three wrong total -> 350, 3 strikes');
  key(wrongOf(3));
  ok(strikesOn() === 4 && shown() === 'none', '4 consecutive wrong: no pause yet');
  key(tgt());
  ok(num('score') === 800 && strikesOn() === 0, 'correct resets strike streak; score 800');

  /* F. 應被忽略的按鍵 */
  ['Space','ShiftLeft','Backquote','Equal','Numpad1','Tab','Enter','Quote','BracketLeft'].forEach(c => key(c));
  key(tgt(), {repeat:true});
  key(tgt(), {ctrlKey:true});
  ok(num('score') === 800 && strikesOn() === 0, 'unmapped keys / key-repeat / ctrl-combo ignored');

  /* G. 連錯 5 次 → 暫停 */
  const tBefore = num('time');
  for (let i = 0; i < 5; i++) key(wrongOf(i));
  ok(shown() === 'pWarn', '5 consecutive wrong -> warning panel');
  ok(num('score') === 550, 'score 550 after 5 wrong');
  adv(10000);
  ok(num('time') === tBefore, 'timer frozen while warning (10s fake)');
  key(tgt()); key(wrongOf(0)); key('Space'); key('Enter');
  ok(num('score') === 550 && shown() === 'pWarn', 'keys ignored during warning');
  click('resumeBtn');
  ok(shown() === 'none' && strikesOn() === 0, 'click resume -> overlay hidden, strikes reset');
  adv(1000);
  ok(num('time') === tBefore - 1, `timer resumes cleanly (${tBefore} -> ${num('time')})`);
  key(tgt());
  ok(num('score') === 1050, 'can score again after resume');

  /* H. 重新測驗 */
  click('restartBtn');
  ok(shown() === 'pReady' && num('score') === 0 && num('time') === 200 && tgt() === null && strikesOn() === 0, 'restart -> clean ready state');
  adv(3000); ok(num('time') === 200, 'timer idle on ready after restart');

  /* I. 700 次連續打對:映射 / 手指 / 不重複 / 全符號都出現 */
  click('startBtn');
  ok(num('score') === 0 && num('time') === 200, 'fresh start values');
  const seen = new Set(); let prev = null, dup = 0, mapBad = 0, capBad2 = 0, fBad = 0, handBad = 0;
  for (let i = 0; i < 700; i++){
    const t = tgt(), sym = symOf($('sym')), kcap = symOf(q('.key.target .cap'));
    if (SYM2CODE[sym] !== t) mapBad++;
    if (kcap !== sym) capBad2++;
    if (sym === prev) dup++;
    seen.add(sym); prev = sym;
    const f = FOF[t], act = [...document.querySelectorAll('.flabel.active')];
    if (!act.length || act.some(l => l.dataset.f !== f)) fBad++;
    if (q('#handL').classList.contains('active') !== f.endsWith('L') || q('#handR').classList.contains('active') !== f.endsWith('R')) handBad++;
    key(t);
  }
  ok(mapBad === 0, 'orb symbol always matches highlighted key (700 rounds)');
  ok(capBad2 === 0, 'highlighted key shows same symbol as orb');
  ok(dup === 0, 'never the same symbol twice in a row');
  ok(seen.size === 41, `all 41 symbols appeared (got ${seen.size})`);
  ok(fBad === 0, 'finger label highlight matches target key finger');
  ok(handBad === 0, 'hand bracket highlight correct');
  ok(num('score') === 350000, 'score 700*500 = 350000');
  ok(document.querySelectorAll('.key.target').length === 1, 'only one highlighted key');

  /* J. 切換鈕 */
  click('showAllBtn'); ok(q('#keyboard').classList.contains('show-all'), 'show-all toggle on');
  click('showAllBtn'); ok(!q('#keyboard').classList.contains('show-all'), 'show-all toggle off');
  click('soundBtn'); ok($('soundBtn').getAttribute('aria-pressed') === 'false', 'sound toggle off');
  click('restartBtn');

  /* K. 完整一局 */
  const g = fullGame();
  ok(g.timeBad === 0, 'countdown correct every second 1..199 ' + g.firstBad);
  ok(g.nearEnd.time === 1 && g.nearEnd.shown === 'none', `at 199.9s still playing, shows ${g.nearEnd.time}`);
  ok(shown() === 'pDone', 'game ends exactly at 200s');
  ok(num('time') === 0, 'time shows 0 at end');
  const R = g.R + 0, W = g.W + 0, total = R + W;
  log(`INFO  full game: right=${R} wrong=${W}`);
  ok(num('rScore') === 500 * R - 50 * W, `final score ${num('rScore')} == 500*${R}-50*${W}`);
  ok(num('score') === num('rScore'), 'HUD score equals result score');
  ok(num('rRight') === R && num('rWrong') === W && num('rTotal') === total, 'result counts right/wrong/total match');
  const pr = (R / total * 100).toFixed(1), pw = (W / total * 100).toFixed(1);
  ok($('pctG').textContent === `對 ${pr}%` && $('pctR').textContent === `錯 ${pw}%`, `percent text ${$('pctG').textContent} / ${$('pctR').textContent}`);
  ok(Math.abs(parseFloat(pr) + parseFloat(pw) - 100) < 0.11, 'percentages sum to 100');
  ok($('rExtra').textContent.includes('最常打錯'), 'most-missed list shown');
  ok(!$('rComment').textContent.includes('undefined') && $('rComment').textContent.length > 3, 'comment: ' + $('rComment').textContent);
  const sc = num('rScore');
  key('KeyA'); key('KeyQ'); adv(5000);
  ok(num('rScore') === sc && num('score') === sc && shown() === 'pDone', 'keys & time ignored after game over');
  await sleep(700);
  ok(Math.abs(parseFloat($('barG').style.width) - parseFloat(pr)) < 0.2 && Math.abs(parseFloat($('barR').style.width) - parseFloat(pw)) < 0.2, `bar widths ${$('barG').style.width}/${$('barR').style.width}`);

  /* L. 再練一次 + 完全不按 */
  click('againBtn');
  ok(shown() === 'pReady' && num('score') === 0 && num('time') === 200, 'again -> ready, clean');
  click('startBtn'); adv(199900);
  ok(shown() === 'none' && num('time') === 1, 'idle game still running at 199.9s');
  adv(100);
  ok(shown() === 'pDone' && num('rScore') === 0 && num('rTotal') === 0, 'zero-key game ends with 0');
  ok($('pctG').textContent === '對 —' && $('pctR').textContent === '錯 —', 'no NaN percentages');
  ok(!/NaN|undefined/.test(q('#pDone').textContent), 'no NaN/undefined text in result panel');

  /* M. 負分 */
  click('againBtn'); click('startBtn');
  key(wrongOf(0)); key(wrongOf(1));
  ok(num('score') === -100, 'negative score displays -100');
  click('restartBtn');
}

const rc = e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
function snap(label){
  const de = document.documentElement;
  const o = {label, vw:innerWidth, vh:innerHeight, scrollH:de.scrollHeight, scrollW:de.scrollWidth,
    vOverflow:de.scrollHeight > innerHeight, hOverflow:de.scrollWidth > innerWidth,
    hud:rc(q('.hud')), orb:rc(q('#orb')), kb:rc(q('#keyboard')), fingers:rc(q('#fingers')), hands:rc(q('.hands')), footer:rc(q('.footer')), credit:rc(q('.credit'))};
  const p = q('.panel.show');
  if ($('overlay').classList.contains('show') && p){ o.panel = rc(p); o.panelFits = o.panel[1] >= 0 && o.panel[3] <= innerHeight && o.panel[0] >= 0 && o.panel[2] <= innerWidth; }
  o.keysOutside = [...document.querySelectorAll('.key')].filter(k => { const r = k.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.bottom > innerHeight; }).length;
  o.orbKbGap = o.kb[1] - o.orb[3];
  log(JSON.stringify(o));
}

async function layout(){
  snap('ready');
  click('startBtn'); for (let i = 0; i < 3; i++) key(tgt()); key(wrongOf(0)); adv(9000);
  snap('playing');
  for (let i = 0; i < 5; i++) key(wrongOf(i));
  snap('warn');
  click('resumeBtn'); click('restartBtn');
  fullGame(); await sleep(900);
  snap('done');
}

async function shots(){
  if (scn === 'playing'){ click('startBtn'); for (let i = 0; i < 3; i++) key(tgt()); key(wrongOf(0)); adv(9000); }
  if (scn === 'warn'){ click('startBtn'); adv(5000); for (let i = 0; i < 5; i++) key(wrongOf(i)); }
  if (scn === 'done'){ fullGame(); await sleep(900); }
  if (scn === 'playing-all'){ click('startBtn'); key(tgt()); click('showAllBtn'); adv(3000); }
}

function finish(){
  log(`SUMMARY pass=${pass} fail=${fail}`);
  const pre = document.createElement('pre'); pre.id = 'testout'; pre.style.display = 'none';
  pre.textContent = out.join('\n').replace(/[^\x00-\x7e]/g, c => '\\u' + c.charCodeAt(0).toString(16));
  document.body.append(pre);
  document.title = 'DONE';
}

window.addEventListener('error', e => { out.push('FAIL  uncaught error: ' + e.message); });
const run = scn === 'tests' ? tests : scn === 'layout' ? layout : shots;
Promise.resolve().then(run).catch(e => { out.push('FAIL  exception: ' + (e && e.stack || e)); fail++; }).then(finish);
})();
