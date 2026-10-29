// 注入在 <head> 最前面:假時鐘,讓測試可以瞬間「快轉」200 秒
(function(){
  let T = 0; const cbs = [];
  performance.now = () => T;
  window.setInterval = (f) => { cbs.push(f); return 1; };
  window.__adv = (ms) => { for (let i = 0; i < Math.round(ms / 100); i++){ T += 100; cbs.forEach(f => f()); } };
})();
