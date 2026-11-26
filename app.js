
const DATA = window.__DATA__;
// 今日の日付は、開いたときの日本の日付にする（データの日付に固定しない）
const TODAY = (()=>{ try{ return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); }
  catch(e){ const d=new Date(Date.now()+9*3600e3); return d.toISOString().slice(0,10); } })();
const WD = ["日","月","火","水","木","金","土"];
const SHORT = {"のんふぃく！":"のんふぃく","アキシブproject":"アキシブ","ヒロインズ研究生大阪":"研究生大阪","ヒロインズ研究生":"研究生","Pastel Closet":"パスクロ","夜光性アミューズ":"よるあみ","ナナコロビヤオキ":"ナナコロ","テンシンランマン":"テンラン","パラレルサイダー":"パラサイ","ポンコツコンポ":"ポンコツ","なう♡すとれーじ":"なうすと","ZUTTOMOTTO":"ずっとも","ハルカエコー":"ハルカ","ラストシーン":"ラスシ","ドレスコード":"ドレコ","GILTY×GILTY":"ギルギル","AdamLilith":"アダムス","CAL&RES":"コーレス","パラディーク":"パラディ","ウメコマチ":"ウメコ","フルコース":"フルコ","HEROINES":"全体"};
const short = g => SHORT[g] || g;
const PALETTE = ["#ff2aa0","#9b3cf0","#ff8a00","#0096c7","#1a9e5c","#e8436b","#4f5bd5","#c2410c","#0e8f8a","#b43fd1","#d4a000","#6b7280"];
const COLORS = {}; DATA.groups.forEach((g,i)=>COLORS[g]=PALETTE[i%PALETTE.length]);
const color = g => COLORS[g] || "#6b7280";

// 日付は文字列（YYYY-MM-DD）のまま計算する（時差でずれないように）
const parse = s => { const [y,m,d] = s.split("-").map(Number); return {y,m,d}; };
const fmt = (y,m,d) => `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const addDays = (s,n) => { const p=parse(s); const t=new Date(Date.UTC(p.y,p.m-1,p.d+n)); return fmt(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate()); };
const dow = s => { const p=parse(s); return new Date(Date.UTC(p.y,p.m-1,p.d)).getUTCDay(); };
const md = s => { const p=parse(s); return `${p.m}/${p.d}`; };
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

let view="today", tab="list", sel=TODAY;
let selGo=TODAY, curGo=(()=>{const t=parse(TODAY);return {y:t.y,m:t.m};})();  // 行く予定のカレンダー
let mapSpan="month", mapCity="";  // 地図: 期間と選んだ都市
let fmode="all", pick=new Set();  // 表示するグループ: all=すべて / oshi=推しだけ / pick=選んだグループ
try{ pick=new Set(JSON.parse(localStorage.getItem("pick")||"[]")); }catch(e){}
const ZOOMS=[1,1.3,1.6,2]; let zi=0; try{ zi=Math.min(ZOOMS.length-1,Math.max(0,+(localStorage.getItem("zoom")||0))); }catch(e){}
let cur=(()=>{const t=parse(TODAY);return {y:t.y,m:t.m};})();  // 「1か月」で表示中の月
let oshi=new Set(), notify={day:true,prev:true,ticket:true,newev:true,detail:true}, going=new Set(), watch=new Set();
try{ oshi=new Set(JSON.parse(localStorage.getItem("oshi")||"[]")); notify=Object.assign(notify, JSON.parse(localStorage.getItem("notify")||"{}"));
     going=new Set(JSON.parse(localStorage.getItem("going")||"[]")); watch=new Set(JSON.parse(localStorage.getItem("watch")||"[]")); }catch(e){}
const save=()=>{ try{ localStorage.setItem("oshi",JSON.stringify([...oshi])); localStorage.setItem("notify",JSON.stringify(notify));
     localStorage.setItem("going",JSON.stringify([...going])); localStorage.setItem("watch",JSON.stringify([...watch])); }catch(e){} queueCloud(); };
const key = e => `${e.g}|${e.d}|${e.t}`;

const pool = () => DATA.events.filter(e => fmode==="all" || (fmode==="oshi" ? oshi.has(e.g) : pick.has(e.g)));
const between = (lo,hi) => pool().filter(e => e.d>=lo && e.d<=hi);

function evCard(e){
  const t=e.tm[0]||""; const [s,en]=t.split("-");
  return `<button type="button" class="ev" data-i="${DATA.events.indexOf(e)}"><div class="bar" style="background:${color(e.g)}"></div>
    <div class="tm">${s?esc(s):"時間<br>未定"}${en?`<small>〜${esc(en)}</small>`:""}</div>
    <div class="info"><div class="g" style="color:${color(e.g)}">${esc(e.g)}${e.u?'<span class="tent">未確定</span>':''}${going.has(key(e))?'<span class="mk go">✓ 行く</span>':''}${watch.has(key(e))?'<span class="mk wt">★ 注目</span>':''}${e.k.length?'<span class="mk tk">🎫 申込情報あり</span>':''}</div><div class="t">${esc(e.t)}</div>${e.v?`<div class="v">📍 ${esc(e.v)}</div>`:""}${(e.up||[]).length?`<div class="upd">📝 「${esc(e.up[e.up.length-1].from)}」から詳細が出ました</div>`:""}</div></button>`;
}
function dayBlocks(evs){
  if(!evs.length) return `<div class="empty">${fmode==="oshi"&&!oshi.size?"マイページから推しグループを選んでください":fmode==="pick"&&!pick.size?"「グループを選ぶ」から見たいグループを選んでください":"この期間の予定はありません"}</div>`;
  const by={}; evs.forEach(e=>(by[e.d]=by[e.d]||[]).push(e));
  return Object.keys(by).sort().map(d=>`<section class="day"><div class="dayh"><b>${md(d)}(${WD[dow(d)]})</b>${d===TODAY?'<span class="badge">今日</span>':''}<span>${by[d].length}件</span></div>${by[d].map(evCard).join("")}</section>`).join("");
}
function monthCal(y,m,nav,evsIn,kind){
  const first=fmt(y,m,1); const start=dow(first);
  const days=new Date(Date.UTC(y,m,0)).getUTCDate();
  const go=kind==="go"; const selD=go?selGo:sel;
  const evs=evsIn?evsIn.filter(e=>e.d>=fmt(y,m,1)&&e.d<=fmt(y,m,days)):between(fmt(y,m,1),fmt(y,m,days));
  const by={}; evs.forEach(e=>{ (by[e.d]=by[e.d]||[]); if(!by[e.d].some(x=>x.g===e.g)) by[e.d].push(e); });
  let cells="";
  for(let i=0;i<start;i++) cells+=`<div class="cell blank"></div>`;
  for(let d=1; d<=days; d++){
    const ds=fmt(y,m,d); const list=by[ds]||[];
    const labs=list.slice(0,3).map(e=>`<span class="lab ${e.u?'u':''}" style="background:${color(e.g)}">${going.has(key(e))?"✓":""}${esc(short(e.g))}</span>`).join("");
    const more=list.length>3?`<span class="more">+${list.length-3}</span>`:"";
    cells+=`<button type="button" class="cell ${ds===TODAY?'today':''} ${ds<TODAY?'past':''} ${ds===selD?'sel':''}" ${go?'data-gd':'data-d'}="${ds}"><span class="num">${d}</span>${labs}${more}</button>`;
  }
  const gs=[...new Set(evs.map(e=>e.g))];
  return `<div class="month"><div class="mh">${nav?`<button type="button" class="mv" ${go?'data-gmv':'data-mv'}="-1" aria-label="前の月">‹</button>`:''}<div class="mt"><b>${y}年${m}月</b><span>${evs.length}件・${gs.length}グループ</span></div>${nav?`<button type="button" class="mv" ${go?'data-gmv':'data-mv'}="1" aria-label="次の月">›</button>`:''}</div>
    ${nav&&!go?`<div class="zm">表示の大きさ <button type="button" data-z="-1" aria-label="小さく">－</button><button type="button" data-z="1" aria-label="大きく">＋</button></div>`:""}
    <div class="calwrap" style="--z:${ZOOMS[zi]}"><div class="wk">${WD.map(w=>`<div>${w}</div>`).join("")}</div><div class="grid">${cells}</div></div>
    <div class="legend">${gs.map(g=>`<span style="background:${color(g)}">${esc(short(g))}＝${esc(g)}</span>`).join("")}</div></div>`;
}
function renderMain(){
  const main=document.getElementById("main");
  if(view==="map"){ main.innerHTML=renderMap(); }
  else if(view==="today"){ main.innerHTML=dayBlocks(between(TODAY,TODAY)); }
  else if(view==="week"){ main.innerHTML=dayBlocks(between(TODAY,addDays(TODAY,6))); }
  else {
    const t=parse(TODAY); let months=[[cur.y,cur.m]];
    if(view==="all"){ months=[[t.y,t.m]];
      const last=DATA.events.reduce((a,e)=>e.d>a?e.d:a,TODAY); const l=parse(last);
      let y=t.y,m=t.m; while(y<l.y||(y===l.y&&m<l.m)){ m++; if(m>12){m=1;y++;} months.push([y,m]); }
    }
    const selEvs=between(sel,sel);
    main.innerHTML = months.map(([y,m])=>monthCal(y,m,view==="month")).join("") +
      `<div class="daylist"><h3>${md(sel)}(${WD[dow(sel)]})の予定</h3>${selEvs.length?selEvs.map(evCard).join(""):'<div class="empty">この日の予定はありません</div>'}</div>`;
  }
  main.innerHTML += `<p class="note">各グループの公式カレンダー・公式Xの情報をもとに毎日自動で更新します。<br>誤りや漏れがある場合があります。正確な情報は各公式をご確認ください。<br>予定のデータ: ${DATA.asof} 時点（試作品）</p>`;
}
function renderFilter(){
  document.getElementById("filter").innerHTML =
    `<button type="button" class="chip ${fmode==="all"?'on':''}" data-f="all">すべて</button><button type="button" class="chip ${fmode==="oshi"?'on':''}" data-f="oshi">推しだけ（${oshi.size}）</button><button type="button" class="chip ${fmode==="pick"?'on':''}" data-f="pick">グループを選ぶ${pick.size?`（${pick.size}）`:""}</button>`;
}
function renderSettings(){
  document.getElementById("settings").innerHTML=`<h2 class="mp">マイページ</h2><h3>推しグループ（タップで選ぶ）</h3><div class="gs">${DATA.groups.filter(g=>g!=="HEROINES").map(g=>`<button type="button" class="chip ${oshi.has(g)?'on':''}" data-g="${esc(g)}">${esc(g)}</button>`).join("")}</div>
  <h3>通知の設定</h3>
  <div class="sw">推しのライブの前日（20時）<button type="button" class="tog ${notify.prev?'on':''}" data-n="prev"></button></div>
  <div class="sw">推しのライブの当日（朝8時）<button type="button" class="tog ${notify.day?'on':''}" data-n="day"></button></div>
  <div class="sw">注目ライブの申込情報が出たとき<button type="button" class="tog ${notify.ticket?'on':''}" data-n="ticket"></button></div>
  <div class="sw">推しの新しい予定が追加されたとき<button type="button" class="tog ${notify.newev?'on':''}" data-n="newev"></button></div>
  <div class="sw">未確定の予定（「HEROINES主催@都内」など）の詳細が出たとき<button type="button" class="tog ${notify.detail?'on':''}" data-n="detail"></button></div>
  <p class="note">通知はアプリ版で動きます（試作品では届きません）。<br>新しい予定は、公式カレンダー・公式Xで見つけたその日のうちにお知らせします。</p>
  <h3>データの引き継ぎ</h3>
  <div class="bk card"><p class="note" style="text-align:left;margin:0 0 8px">推し・行く予定・注目は、この端末に保存しています。iPhoneがアプリを閉じたときに消すことがあるので、コードをメモ帳などに保存しておくと、消えても戻せます。</p>
    <div class="btns"><button type="button" class="btn sub" data-a="bkcopy">引き継ぎコードをコピー</button></div>
    <textarea id="bkout" readonly style="display:none" aria-label="引き継ぎコード"></textarea>
    <p class="note" style="text-align:left;margin:12px 0 6px">消えてしまったときは、保存したコードを下に貼り付けてください。</p>
    <textarea id="bkin" placeholder="LYT1. から始まるコード" aria-label="戻すコード"></textarea>
    <div class="btns"><button type="button" class="btn" data-a="bkrestore">コードから戻す</button></div></div>`;
}
function renderMy(){
  const up = e => e.d>=TODAY;
  const g = DATA.events.filter(e=>going.has(key(e))&&up(e));
  const w = DATA.events.filter(e=>watch.has(key(e))&&up(e));
  const tk = w.filter(e=>e.k.length);
  const gAll = DATA.events.filter(e=>going.has(key(e)));
  const gSel = gAll.filter(e=>e.d===selGo);
  document.getElementById("my").innerHTML =
    `<h3>📅 行く予定のカレンダー</h3>${monthCal(curGo.y,curGo.m,true,gAll,"go")}
     <div class="daylist"><h3>${md(selGo)}(${WD[dow(selGo)]})に行く予定</h3>${gSel.length?gSel.map(evCard).join(""):'<div class="empty small">この日に行く予定はありません</div>'}</div>
     <h3>✓ 行く予定のライブ（${g.length}）</h3>${g.length?g.map(evCard).join(""):'<div class="empty small">予定をタップして「このライブに行く」を押すと、ここに並びます</div>'}
     <h3>★ 注目しているライブ（${w.length}）</h3>${w.length?w.map(evCard).join(""):'<div class="empty small">予定をタップして「注目する」を押すと、ここに並びます。チケットや申込の情報が出たら通知します</div>'}
     ${tk.length?`<h3>🎫 注目ライブの申込情報</h3>${tk.flatMap(e=>e.k.map(k=>`<div class="tkr card"><b>${esc(e.g)}｜${esc(e.t)}</b><span>${esc(k.w)}：${md(k.u.slice(0,10))}(${WD[dow(k.u.slice(0,10))]}) ${esc(k.u.slice(11))}まで</span>${k.src?`<a href="${esc(k.src)}" target="_blank" rel="noopener">公式の投稿を見る</a>`:""}</div>`)).join("")}`:""}`;
}
function render(){
  const L=tab==="list", M=tab==="my", S=tab==="settings";
  document.getElementById("main").style.display=L?"block":"none";
  document.getElementById("filter").style.display=L?"flex":"none";
  document.getElementById("settings").style.display=S?"block":"none";
  document.getElementById("my").style.display=M?"block":"none";
  document.getElementById("seg").style.visibility=L?"visible":"hidden";
  if(L){ renderFilter(); renderMain(); } else if(M) renderMy(); else renderSettings();
  document.getElementById("bell").style.visibility=L?"visible":"hidden";
  updateDot();
}
function openSheet(e){
  const t=e.tm[0]||""; const sh=document.getElementById("sheet");
  sh.innerHTML=`<div class="grab"></div><div class="g" style="color:${color(e.g)};font-size:13px">${esc(e.g)}</div><h2>${esc(e.t)}</h2>
   <div class="row"><span>日付</span><span>${md(e.d)}(${WD[dow(e.d)]})</span></div>
   <div class="row"><span>時間</span><span>${t?esc(t.replace("-","〜")):"未定"}</span></div>
   <div class="row"><span>会場</span><span>${e.v?esc(e.v):"—"}</span></div>
   <div class="row"><span>情報元</span><span>${esc(e.s)}</span></div>${e.u?'<div class="row"><span>状態</span><span>未確定（詳細が出たら通知します）</span></div>':''}
   ${e.k.length?`<div class="tks"><div class="tkh">🎫 チケット・申込</div>${e.k.map(k=>`<div class="tkr"><b>${esc(k.w)}</b><span>${md(k.u.slice(0,10))}(${WD[dow(k.u.slice(0,10))]}) ${esc(k.u.slice(11))}まで</span>${k.src?`<a href="${esc(k.src)}" target="_blank" rel="noopener">公式の投稿を見る</a>`:""}</div>`).join("")}</div>`:`<div class="tks none">チケット・申込の情報はまだありません。${watch.has(key(e))?"出たら通知します。":"「注目する」にすると、出たときに通知します。"}</div>`}
   <div class="btns">
     <button type="button" class="btn ${going.has(key(e))?'sub':''}" data-a="go" data-i="${DATA.events.indexOf(e)}">${going.has(key(e))?"✓ 行く予定（タップで外す）":"このライブに行く"}</button>
     <button type="button" class="btn ${watch.has(key(e))?'sub':''}" data-a="watch" data-i="${DATA.events.indexOf(e)}">${watch.has(key(e))?"★ 注目中（タップで外す）":"★ 注目する（申込情報が出たら通知）"}</button>
     <button type="button" class="btn sub" data-a="cal">iPhoneのカレンダーに追加</button></div>`;
  sh.style.display="block"; document.getElementById("bg").style.display="block";
}
function inboxItems(){
  const items=[]; const tom=addDays(TODAY,1);
  DATA.events.forEach(e=>{
    const k=key(e);
    const mark = going.has(k) ? "行く予定" : watch.has(k) ? "注目" : "";
    if(mark&&notify.ticket) e.k.forEach(t=>{ if(t.u.slice(0,10)>=TODAY) items.push({id:"tk|"+k+"|"+t.w, ic:"🎫", t:`【${mark}】${e.g}「${e.t}」の${t.w}が出ています`, sub:`${md(t.u.slice(0,10))}(${WD[dow(t.u.slice(0,10))]}) ${t.u.slice(11)}まで`, i:DATA.events.indexOf(e), sort:t.u, mine:true}); });
    if(e.d>=TODAY && (mark||oshi.has(e.g)) && notify.detail) (e.up||[]).forEach(u=>items.push({id:"up|"+k+"|"+u.from, ic:"📝", t:`${mark?`【${mark}】`:""}${e.g}の${md(e.d)}「${u.from}」の詳細が出ました`, sub:`「${e.t}」${e.v?` 📍 ${e.v}`:""}${e.tm[0]?` ${e.tm[0].replace("-","〜")}`:""}`, i:DATA.events.indexOf(e), sort:"1"+u.at, mine:true}));
    if(e.d>=TODAY && oshi.has(e.g) && notify.newev && e.n && e.n>=addDays(TODAY,-7)) items.push({id:"nw|"+k, ic:"🆕", t:`${e.g}の新しい予定：${md(e.d)}「${e.t}」`, sub:(e.v?`📍 ${e.v}`:"会場未定")+`（${md(e.n)}に追加）`, i:DATA.events.indexOf(e), sort:"2"+e.n, mine:true});
    const mine = going.has(k) || oshi.has(e.g);
    if(mine && notify.prev && e.d===tom) items.push({mine:true, id:"pv|"+k, ic:"📅", t:`明日は${e.g}「${e.t}」`, sub:e.v?`📍 ${e.v}`:"会場は公式でご確認ください", i:DATA.events.indexOf(e), sort:"0"+e.d});
    if(mine && notify.day && e.d===TODAY) items.push({mine:true, id:"dy|"+k, ic:"🎤", t:`今日は${e.g}「${e.t}」`, sub:(e.tm[0]?e.tm[0].replace("-","〜"):"時間未定")+(e.v?` 📍 ${e.v}`:""), i:DATA.events.indexOf(e), sort:"0"+e.d});
  });
  return items.sort((a,b)=>a.sort<b.sort?-1:1);
}
let readIds=new Set(); try{ readIds=new Set(JSON.parse(localStorage.getItem("read")||"[]")); }catch(e){}
function updateDot(){ const n=inboxItems().filter(x=>!readIds.has(x.id)).length; const d=document.getElementById("dot"); d.textContent=n>99?"99+":n; d.style.display=n?"flex":"none"; }
function openInbox(){
  const items=inboxItems(); const sh=document.getElementById("sheet");
  sh.innerHTML=`<div class="grab"></div><div class="ibh"><b>お知らせ</b>${items.length?'<button type="button" data-a="readall">すべて既読</button>':''}</div>
   ${items.length?items.map(x=>`<button type="button" class="ib ${readIds.has(x.id)?'':'newi'}" data-i="${x.i}" data-rid="${esc(x.id)}" style="width:100%;text-align:left;border:0;background:${readIds.has(x.id)?'none':'#fff8fd'}"><span class="ic">${x.ic}</span><span>${esc(x.t)}<small>${esc(x.sub)}</small></span></button>`).join(""):'<div class="empty small">お知らせはまだありません。<br>推しを選んだり、ライブに「行く」「注目」を付けると、ここに届きます。</div>'}
   <p class="note">アプリ版では、新しい予定・未確定の予定の詳細・申込情報もここに届き、スマホの通知でもお知らせします。</p>`;
  sh.style.display="block"; document.getElementById("bg").style.display="block";
}
const saveRead=()=>{ try{ localStorage.setItem("read",JSON.stringify([...readIds])); }catch(e){} queueCloud(); };
function openPicker(){
  const sh=document.getElementById("sheet");
  sh.innerHTML=`<div class="grab"></div><div class="ibh"><b>見たいグループを選ぶ</b>${pick.size?'<button type="button" data-a="pickclear">選択をリセット</button>':''}</div>
   <p class="note" style="text-align:left;margin:0 0 10px">いくつでも選べます。推しとは別に、今だけ見たいグループで絞り込めます。</p>
   <div class="gs">${DATA.groups.filter(g=>g!=="HEROINES").map(g=>`<button type="button" class="chip ${pick.has(g)?'on':''}" data-pg="${esc(g)}">${esc(g)}</button>`).join("")}</div>
   <div class="btns"><button type="button" class="btn" data-a="pickok">${pick.size?`${pick.size}グループの予定を見る`:"すべてのグループを見る"}</button></div>`;
  sh.style.display="block"; document.getElementById("bg").style.display="block";
}
function closeSheet(){ document.getElementById("sheet").style.display="none"; document.getElementById("bg").style.display="none"; }
function toast(m){ const t=document.getElementById("toast"); t.textContent=m; t.style.display="block"; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display="none",2600); }


/* ---------- 地図 ---------- */
const CITY_POS={"札幌":[141.35,43.06],"仙台":[140.87,38.27],"新潟":[139.02,37.9],"金沢":[136.65,36.56],"長野":[138.19,36.65],"さいたま":[139.5,36.15],"千葉":[140.45,35.5],"東京":[139.69,35.69],"横浜":[139.35,35.15],"静岡":[138.38,34.98],"名古屋":[136.9,35.18],"京都":[135.77,35.1],"大阪":[135.5,34.69],"神戸":[135.05,34.62],"岡山":[133.93,34.66],"広島":[132.46,34.39],"福岡":[130.4,33.59],"熊本":[130.7,32.8],"鹿児島":[130.56,31.6],"那覇":[127.68,26.21]};
const LAND=[
 [[141.6,45.4],[142.5,44.8],[143.6,44.2],[144.8,43.9],[145.6,43.4],[145.2,43.0],[143.9,42.9],[143.2,42.0],[141.8,42.6],[141.0,42.3],[140.0,41.4],[139.9,42.2],[140.5,43.0],[141.4,43.4],[141.6,44.3]],
 [[141.5,41.4],[141.6,40.4],[142.0,39.6],[141.6,38.3],[141.0,37.9],[141.0,36.9],[140.7,36.0],[140.8,35.7],[139.9,34.9],[139.8,35.3],[139.1,35.1],[138.8,34.6],[138.2,34.6],[137.0,34.6],[136.8,34.3],[136.0,33.5],[135.1,33.9],[135.4,34.5],[134.2,34.6],[133.0,34.4],[132.2,33.9],[130.9,34.0],[131.4,34.4],[132.6,35.4],[133.4,35.5],[134.4,35.6],[135.7,35.5],[136.0,35.9],[136.7,36.9],[137.0,37.4],[137.3,36.8],[138.5,37.4],[139.4,38.1],[139.7,38.9],[140.0,39.9],[139.9,40.6],[140.3,41.2],[141.0,41.2],[140.9,41.5]],
 [[132.4,33.4],[133.0,32.7],[133.3,33.4],[134.2,33.2],[134.7,33.8],[134.6,34.2],[133.9,34.4],[133.0,34.0],[132.6,33.9]],
 [[129.6,33.3],[130.4,33.9],[131.0,33.9],[131.7,33.3],[131.9,32.6],[131.4,31.4],[130.7,31.0],[130.2,31.3],[130.3,32.2],[129.7,32.6]]];
const PX=([lo,la])=>[((lo-129)*22).toFixed(1),((45.9-la)*23.5).toFixed(1)];
function mapPool(){
  const hi = mapSpan==="week"?addDays(TODAY,6):mapSpan==="month"?addDays(TODAY,30):"9999-12-31";
  return pool().filter(e=>e.d>=TODAY&&e.d<=hi);
}
function renderMap(){
  const evs=mapPool(); const by={};
  evs.forEach(e=>{ const c=e.c||"不明"; (by[c]=by[c]||[]).push(e); });
  const land=LAND.map(poly=>`<polygon class="land" points="${poly.map(p=>PX(p).join(",")).join(" ")}"/>`).join("");
  const dots=Object.keys(CITY_POS).filter(c=>c!=="那覇").sort((a,b)=>(by[b]||[]).length-(by[a]||[]).length).map(c=>{ const n=(by[c]||[]).length; if(!n) return "";
    const [x,y]=PX(CITY_POS[c]); const r=Math.min(18,7+Math.sqrt(n)*2.2);
    return `<g class="mdot" data-city="${c}"><circle cx="${x}" cy="${y}" r="${r}" fill="${c===mapCity?'#9b3cf0':'#ff2aa0'}" fill-opacity=".85" stroke="#fff" stroke-width="2"/><text x="${x}" y="${(+y+4)}" text-anchor="middle" style="fill:#fff;stroke:none;font-size:10px">${n}</text><text x="${(+x+r+3)}" y="${(+y+4)}">${c}</text></g>`; }).join("");
  const naha=(by["那覇"]||[]).length;
  const inset=`<rect x="8" y="10" width="86" height="40" rx="8" fill="#fff" stroke="#b8c7d9"/><text x="14" y="26" style="font-size:10px">沖縄</text>${naha?`<g class="mdot" data-city="那覇"><circle cx="60" cy="35" r="9" fill="${mapCity==='那覇'?'#9b3cf0':'#ff2aa0'}" stroke="#fff" stroke-width="2"/><text x="60" y="39" text-anchor="middle" style="fill:#fff;stroke:none;font-size:10px">${naha}</text></g>`:""}`;
  const order=[...Object.keys(CITY_POS),"オンライン","不明"].filter(c=>by[c]);
  const list=mapCity?(by[mapCity]||[]):[];
  return `<div class="span">${[["week","1週間"],["month","1か月"],["all","すべて"]].map(([k,l])=>`<button type="button" class="chip ${mapSpan===k?'on':''}" data-ms="${k}">${l}</button>`).join("")}</div>
   <div class="jmap"><svg viewBox="0 0 380 350" role="img" aria-label="日本地図（都市ごとの予定の数）">${land}${dots}${inset}</svg></div>
   <p class="note" style="margin:0 0 6px">丸の数字はその都市の予定の数。丸か下のボタンをタップすると一覧が出ます。</p>
   <div class="cities">${order.map(c=>`<button type="button" class="${c===mapCity?'on':''}" data-city="${c}">${c==="不明"?"会場未定・不明":c}<b>${by[c].length}</b></button>`).join("")||'<span class="note">この期間の予定はありません</span>'}</div>
   ${mapCity?`<div class="daylist" id="citylist"><h3>${mapCity==="不明"?"会場未定・不明":mapCity}の予定（${list.length}件）</h3>${dayBlocks(list)}</div>`:""}`;
}

/* ---------- 予定の名前が変わったとき（未確定→詳細）に、行く予定・注目の印を引き継ぐ ---------- */
function migrateKeys(){
  const alias={}; DATA.events.forEach(e=>(e.up||[]).forEach(u=>alias[`${e.g}|${e.d}|${u.from}`]=key(e)));
  let changed=false;
  [going,watch].forEach(set=>[...set].forEach(k=>{ if(alias[k]&&!set.has(alias[k])){ set.delete(k); set.add(alias[k]); changed=true; } }));
  if(changed) save();
}

/* ---------- 起動時の大きなお知らせ（推し・行く予定・注目） ---------- */
let popShown=false;
function showPop(force){
  if(popShown&&!force) return;
  const items=inboxItems().filter(x=>x.mine&&!readIds.has(x.id));
  if(!items.length) return;
  popShown=true;
  const pop=document.getElementById("pop");
  pop.innerHTML=`<button type="button" class="x" data-a="popclose" aria-label="閉じる">×</button><h2>推しのお知らせ</h2><p class="sub">${items.length}件の新しいお知らせがあります</p>
    ${items.map(x=>`<button type="button" class="ib" data-i="${x.i}" data-rid="${esc(x.id)}" data-pop="1" style="width:100%;text-align:left;border:0"><span class="ic">${x.ic}</span><span>${esc(x.t)}<small>${esc(x.sub)}</small></span></button>`).join("")}`;
  pop.style.display="block"; document.getElementById("popbg").style.display="block";
}
function closePop(markRead){
  if(markRead){ inboxItems().filter(x=>x.mine).forEach(x=>readIds.add(x.id)); saveRead(); updateDot(); }
  document.getElementById("pop").style.display="none"; document.getElementById("popbg").style.display="none";
}

/* ---------- 引き継ぎコード（データが消えたときに戻す） ---------- */
function backupCode(){
  const st={o:[...oshi],g:[...going],w:[...watch],p:[...pick],n:notify,z:zi};
  return "LYT1."+btoa(unescape(encodeURIComponent(JSON.stringify(st))));
}
function restoreCode(code){
  const m=String(code||"").trim().match(/^LYT1\.([A-Za-z0-9+/=]+)$/); if(!m) return false;
  try{ const st=JSON.parse(decodeURIComponent(escape(atob(m[1]))));
    applyState({oshi:st.o,going:st.g,watch:st.w,pick:st.p,notify:st.n,zoom:st.z}); migrateKeys(); save(); queueCloud(); return true; }catch(e){ return false; }
}

// ボタンは1か所でまとめて受け取る（どの画面でも確実に反応するように）
document.addEventListener("click", ev=>{
  const dot=ev.target.closest&&ev.target.closest("g.mdot"); if(dot&&dot.tagName&&dot.tagName.toLowerCase()==="g"){ mapCity=dot.dataset.city===mapCity?"":dot.dataset.city; renderMain(); document.getElementById("citylist")?.scrollIntoView({behavior:"smooth",block:"start"}); return; }
  const b=ev.target.closest("button"); if(!b){ if(ev.target.id==="bg") closeSheet(); if(ev.target.id==="popbg") closePop(false); return; }
  if(b.dataset.a==="popclose"){ closePop(true); return; }
  if(b.dataset.pop){ readIds.add(b.dataset.rid); saveRead(); updateDot(); closePop(false); openSheet(DATA.events[+b.dataset.i]); return; }
  if(b.dataset.ms){ mapSpan=b.dataset.ms; renderMain(); return; }
  if(b.dataset.city){ mapCity=b.dataset.city===mapCity?"":b.dataset.city; renderMain(); document.getElementById("citylist")?.scrollIntoView({behavior:"smooth",block:"start"}); return; }
  if(b.dataset.gd){ selGo=b.dataset.gd; renderMy(); return; }
  if(b.dataset.gmv){ let m=curGo.m+Number(b.dataset.gmv), y=curGo.y; if(m<1){m=12;y--;} if(m>12){m=1;y++;} curGo={y,m}; const t=parse(TODAY); selGo=(y===t.y&&m===t.m)?TODAY:fmt(y,m,1); renderMy(); return; }
  if(b.dataset.a==="bkcopy"){ const c=backupCode(); const box=document.getElementById("bkout"); if(box){ box.value=c; box.style.display="block"; }
    try{ navigator.clipboard.writeText(c).then(()=>toast("引き継ぎコードをコピーしました。メモ帳などに保存してください"),()=>toast("下に表示したコードを長押しでコピーしてください")); }catch(e){ toast("下に表示したコードを長押しでコピーしてください"); } return; }
  if(b.dataset.a==="bkrestore"){ const v=document.getElementById("bkin")?.value; if(restoreCode(v)){ toast("データを戻しました"); renderSettings(); updateDot(); } else toast("コードが読み取れませんでした。もう一度貼り付けてください"); return; }
  if(b.dataset.v){ view=b.dataset.v; mapCity=""; sel=TODAY; cur=(()=>{const t=parse(TODAY);return {y:t.y,m:t.m};})(); document.querySelectorAll("#seg button").forEach(x=>x.classList.toggle("on",x===b)); render(); window.scrollTo(0,0); return; }
  if(b.dataset.f==="pick"){ openPicker(); return; }
  if(b.dataset.f){ fmode=b.dataset.f; render(); return; }
  if(b.dataset.pg){ const g=b.dataset.pg; pick.has(g)?pick.delete(g):pick.add(g); try{ localStorage.setItem("pick",JSON.stringify([...pick])); }catch(e){} queueCloud(); openPicker(); return; }
  if(b.dataset.a==="pickclear"){ pick.clear(); try{ localStorage.setItem("pick","[]"); }catch(e){} queueCloud(); openPicker(); return; }
  if(b.dataset.a==="pickok"){ fmode=pick.size?"pick":"all"; closeSheet(); render(); return; }
  if(b.dataset.z){ zi=Math.min(ZOOMS.length-1,Math.max(0,zi+Number(b.dataset.z))); try{ localStorage.setItem("zoom",zi); }catch(e){} queueCloud(); renderMain(); return; }
  if(b.dataset.mv){ let m=cur.m+Number(b.dataset.mv), y=cur.y; if(m<1){m=12;y--;} if(m>12){m=1;y++;} cur={y,m};
    const t=parse(TODAY); sel=(y===t.y&&m===t.m)?TODAY:fmt(y,m,1); renderMain(); return; }
  if(b.dataset.d){ sel=b.dataset.d; renderMain(); document.querySelector(".daylist")?.scrollIntoView({behavior:"smooth",block:"start"}); return; }
  if(b.dataset.a==="go"||b.dataset.a==="watch"){ const e=DATA.events[+b.dataset.i]; const set=b.dataset.a==="go"?going:watch; const k=key(e);
    set.has(k)?set.delete(k):set.add(k); save(); updateDot(); openSheet(e); if(tab==="list") renderMain(); else renderMy();
    toast(b.dataset.a==="go"?(going.has(k)?"行く予定に入れました":"行く予定から外しました"):(watch.has(k)?"注目に入れました。申込情報が出たら通知します（アプリ版）":"注目を外しました")); return; }
  if(b.dataset.a==="inbox"){ openInbox(); return; }
  if(b.dataset.a==="readall"){ inboxItems().forEach(x=>readIds.add(x.id)); saveRead(); openInbox(); updateDot(); return; }
  if(b.dataset.rid){ readIds.add(b.dataset.rid); saveRead(); updateDot(); }
  if(b.dataset.i){ openSheet(DATA.events[+b.dataset.i]); return; }
  if(b.dataset.g){ const g=b.dataset.g; oshi.has(g)?oshi.delete(g):oshi.add(g); save(); renderSettings(); updateDot(); return; }
  if(b.dataset.n){ notify[b.dataset.n]=!notify[b.dataset.n]; save(); renderSettings(); return; }
  if(b.dataset.tab){ tab=b.dataset.tab; document.querySelectorAll("#nav button").forEach(x=>x.classList.toggle("on",x===b)); render(); window.scrollTo(0,0); return; }
  if(b.dataset.a==="cal"){ toast("アプリ版で動きます（試作品では追加されません）"); return; }
});

/* 選んだ内容をClaudeのアカウントにも保存する（ログイン中で保存できる人だけ。できなければこの端末だけに保存） */
var cloudRef=null, cloudBusy=false, cloudAgain=false, cloudTimer=null;
function cloudState(){ return {oshi:[...oshi], notify:Object.assign({},notify), going:[...going], watch:[...watch], pick:[...pick], zoom:zi, read:[...readIds].slice(-500)}; }
async function pushCloud(){
  if(!cloudRef) return;
  if(cloudBusy){ cloudAgain=true; return; }
  cloudBusy=true;
  try{ await cloudRef.set(cloudState()); }
  catch(e){ if(e&&(e.code==="invalid_argument"||e.code==="revoked"||e.code==="not_granted")) cloudRef=null; }
  cloudBusy=false;
  if(cloudAgain){ cloudAgain=false; pushCloud(); }
}
function queueCloud(){ if(!cloudRef) return; clearTimeout(cloudTimer); cloudTimer=setTimeout(pushCloud,700); }
function applyState(d){
  if(!d||typeof d!=="object") return;
  const fill=(set,arr)=>{ if(Array.isArray(arr)){ set.clear(); arr.forEach(x=>typeof x==="string"&&set.add(x)); } };
  fill(oshi,d.oshi); fill(going,d.going); fill(watch,d.watch); fill(pick,d.pick); fill(readIds,d.read);
  if(d.notify&&typeof d.notify==="object") Object.keys(notify).forEach(k=>{ if(typeof d.notify[k]==="boolean") notify[k]=d.notify[k]; });
  if(typeof d.zoom==="number") zi=Math.min(ZOOMS.length-1,Math.max(0,d.zoom|0));
  try{ localStorage.setItem("oshi",JSON.stringify([...oshi])); localStorage.setItem("notify",JSON.stringify(notify));
       localStorage.setItem("going",JSON.stringify([...going])); localStorage.setItem("watch",JSON.stringify([...watch]));
       localStorage.setItem("pick",JSON.stringify([...pick])); localStorage.setItem("zoom",zi); localStorage.setItem("read",JSON.stringify([...readIds])); }catch(e){}
}
(async()=>{
  try{
    if(!window.claude||typeof claude.use!=="function") return;
    const [db,user]=await Promise.all([claude.use("db"),claude.use("user")]);
    if(!db||!user) return;
    const id=await user.id(); if(!id) return;
    const ref=db.doc("data/users/"+id+"/prefs");
    const snap=await ref.get();
    cloudRef=ref;
    if(snap.exists){ applyState(snap.data()); migrateKeys(); render(); updateDot(); if(!popShown) showPop(false); }
    else if(oshi.size||going.size||watch.size||pick.size) pushCloud();
  }catch(e){}
})();
migrateKeys();
render();
setTimeout(()=>showPop(false),400);
