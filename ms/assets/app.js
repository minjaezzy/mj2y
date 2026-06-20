/* ============================================================
   ms.mj2y.com — 군 생활 메이트  (v3)
   휴가 계산기 · 달력 · 급식 — vanilla JS · localStorage
   ============================================================ */
(() => {
'use strict';

/* ---------- storage ---------------------------------------- */
const KEY = 'mj2y.ms.v1';
const DEFAULTS = () => ({
  profile: { enlist:'', discharge:'' },
  used: 0,                                  // 사용한 휴가 일수 (직접 입력)
  entitlements: [
    { id:uid(), name:'연가',                 type:'fixed',   days:24, on:true },
    { id:uid(), name:'상황병 보상휴가',        type:'monthly', perMonth:1, months:null, on:true },
    { id:uid(), name:'신병위로외박',          type:'fixed',   days:4,  on:true },
    { id:uid(), name:'구직휴가',              type:'fixed',   days:2,  on:true },
    { id:uid(), name:'시설방문 휴가',          type:'fixed',   days:1,  on:true },
    { id:uid(), name:'위로휴가',              type:'fixed',   days:0,  on:true },
  ],
  entries: [],          // 달력 일정 {id, start, end, text}
  meals:  {},           // 'YYYY-MM-DD' -> {b,l,d}
  report: { title:'전쟁기념관 견학 보고서', place:'전쟁기념관', date:todayISO(), unit:'', rank:'', name:'', serviceNo:'', reflection:'', photos:[] },
  ui: { month:isoMonth(new Date()), mealDate:todayISO(), xout:true, tab:'leave' }
});

let S = load();
function load(){ try{ const v=JSON.parse(localStorage.getItem(KEY)); if(v) return migrate(v); }catch(e){} return DEFAULTS(); }
function migrate(v){
  const d=DEFAULTS();
  v.profile = v.profile||{}; v.ui=Object.assign(d.ui,v.ui||{});
  v.entitlements = v.entitlements||d.entitlements;
  v.entitlements.forEach(e=>{ if(e.type==='monthly'&&e.months===undefined) e.months=null; });
  v.meals = v.meals||{};
  v.report = Object.assign(d.report, v.report||{}); v.report.photos = v.report.photos||[];
  // 사용 일수: 예전 기록(status 'used')이 있으면 그 합으로 초기화
  if(typeof v.used!=='number'){
    v.used = (v.leaves||[]).filter(l=>l.status==='used').reduce((s,l)=>s+daysInclusive(l.start,l.end),0);
  }
  // 달력 일정: 예전 leaves + plans 를 entries 로 통합
  if(!v.entries){
    v.entries = (v.leaves||[]).map(l=>({ id:l.id||uid(), start:l.start, end:l.end, text:l.text||l.label||l.cat||'일정' }));
    if(v.plans) for(const date in v.plans) v.entries.push({ id:uid(), start:date, end:date, text:v.plans[date] });
  }
  delete v.leaves; delete v.plans;
  return v;
}
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); }
function uid(){ return Math.random().toString(36).slice(2,9); }

/* ---------- date utils ------------------------------------- */
function todayISO(){ return isoDate(new Date()); }
function isoDate(d){ return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; }
function isoMonth(d){ return `${d.getFullYear()}-${p2(d.getMonth()+1)}`; }
function p2(n){ return String(n).padStart(2,'0'); }
function parseISO(s){ if(!s) return null; const [y,m,d]=s.split('-').map(Number); return new Date(y,(m||1)-1,d||1); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function dayDiff(a,b){ return Math.round((parseISO(b)-parseISO(a))/864e5); }   // b - a
function daysInclusive(a,b){ const n=dayDiff(a,b); return isNaN(n)?0:n+1; }
function monthsBetween(a,b){ const A=parseISO(a),B=parseISO(b); if(!A||!B||B<A) return 0;
  let m=(B.getFullYear()-A.getFullYear())*12+(B.getMonth()-A.getMonth()); if(B.getDate()<A.getDate()) m--; return Math.max(0,m); }
const WD = ['일','월','화','수','목','금','토'];
const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const fmtKo = s => { const d=parseISO(s); return d?`${d.getMonth()+1}.${d.getDate()}(${WD[d.getDay()]})`:''; };
const fmtShort = s => { const d=parseISO(s); return d?`${d.getMonth()+1}.${d.getDate()}`:''; };
const fmtDot = s => s ? s.replace(/-/g,'.') : '';

/* ---------- DOM helpers ------------------------------------ */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const el = (t,a,...kids)=>{ const n=document.createElement(t); a=a||{};
  for(const k in a){ if(a[k]==null) continue; if(k==='class')n.className=a[k]; else if(k==='html')n.innerHTML=a[k];
    else if(k.startsWith('on'))n.addEventListener(k.slice(2),a[k]); else n.setAttribute(k,a[k]); }
  kids.flat().forEach(c=>c!=null&&c!==false&&n.append(c.nodeType?c:document.createTextNode(c))); return n; };
const esc = s => (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function sealParts(iso){ const d=parseISO(iso); return { dow:WD[d.getDay()], num:d.getDate(), mon:`${MON[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` }; }

/* =====================================================================
   복무 계산
   ===================================================================== */
function monthsServedTotal(){ return monthsBetween(S.profile.enlist, S.profile.discharge); }
function effMonths(e){ return (e.months!=null && e.months!=='') ? Number(e.months) : monthsServedTotal(); }
function entDays(e){ if(!e.on) return 0; if(e.type==='monthly') return (Number(e.perMonth)||0)*effMonths(e); return Number(e.days)||0; }
function totalGranted(){ return S.entitlements.reduce((s,e)=>s+entDays(e),0); }
function dday(){ if(!S.profile.discharge) return null; return dayDiff(todayISO(), S.profile.discharge); }
function serviceDays(){ if(!S.profile.enlist||!S.profile.discharge) return null; return dayDiff(S.profile.enlist,S.profile.discharge); }
function servedDays(){ if(!S.profile.enlist) return null; return Math.max(0, dayDiff(S.profile.enlist, todayISO())); }
function servePct(){ const tot=serviceDays(); if(!tot||tot<=0) return 0; return Math.max(0,Math.min(100, Math.round(servedDays()/tot*100))); }

/* =====================================================================
   HEADER — D-day seal
   ===================================================================== */
function renderHeader(){
  const d=dday(), zone=$('#dday-zone'); if(!zone) return;
  let top,mid,bot;
  if(d==null){ top='—'; mid='D-?'; bot='전역일 입력'; }
  else { top=fmtDot(S.profile.discharge); mid = d>0?`D-${d}`:d===0?'D-DAY':`D+${-d}`; bot = d>0?'전역까지':d===0?'오늘 전역':'전역 완료'; }
  zone.innerHTML='';
  zone.append(
    el('div',{class:'rays'}),
    el('button',{class:'dday-seal','aria-label':'복무 정보', onclick:openProfile},
      el('span',{class:'seal'}, el('span',{class:'s-dow'},top),
        el('span',{class:'s-num', style:'font-size:'+(mid.length>4?'1.7rem':'2.1rem')}, mid),
        el('span',{class:'s-mon'},bot)))
  );
}

/* =====================================================================
   TAB 1 — 휴가 계산
   ===================================================================== */
function renderLeave(){
  const root=$('#tab-leave'); if(!root) return;
  const granted=totalGranted(), used=Number(S.used)||0, remain=granted-used;
  root.innerHTML='';

  // scoreboard
  root.append(el('div',{class:'stat-band'},
    stat('총 부여', granted, '받을 수 있는 휴가 합계'),
    stat('사용', used, '직접 입력'),
    stat('잔여', remain, '남은 휴가', true)
  ));

  // 복무 진행률
  root.append(progressBlock());

  // 사용한 휴가 입력 (제일 편한 방식)
  const usedBox=el('section',{class:'used-box'},
    el('div',{class:'col'}, el('div',{class:'bh-t'},'사용한 휴가'),
      el('p',{class:'block-note'},'지금까지 다녀온 휴가 일수를 적어주세요. 잔여는 자동으로 계산돼요.')),
    el('div',{class:'stepper-wrap'},
      el('div',{class:'stepper'},
        el('button',{'aria-label':'감소', onclick:()=>bumpUsed(-1)},'−'),
        el('input',{type:'number', min:'0', step:'1', id:'used-input', value:used, onchange:ev=>{ S.used=Math.max(0,Number(ev.target.value)||0); save(); renderLeave(); }}),
        el('button',{'aria-label':'증가', onclick:()=>bumpUsed(1)},'＋')),
      el('span',{class:'su'},'일'))
  );
  if(S.entries.length){ const sum=S.entries.reduce((s,e)=>s+daysInclusive(e.start,e.end),0);
    usedBox.append(el('button',{class:'pull-link', onclick:()=>{ S.used=sum; save(); renderLeave(); }}, `달력 일정 합계(${sum}일)로 맞추기`)); }
  root.append(usedBox);

  // 받을 수 있는 휴가
  const ent=el('section',{class:'mt-lg'});
  ent.append(el('div',{class:'block-head'},
    el('div',null, el('div',{class:'bh-t'},'받을 수 있는 휴가'),
      el('p',{class:'block-note'},'토글로 켜고 끄고, 일수는 바로 고쳐 써요. ‘월 적립’은 일수와 개월 수를 직접 정할 수 있어요.')),
    el('button',{class:'btn sm', onclick:addEnt},'＋ 종류 추가')));
  const list=el('div',{class:'mt'}); S.entitlements.forEach(e=>list.append(entRow(e))); ent.append(list);
  root.append(ent);
}
function bumpUsed(n){ S.used=Math.max(0,(Number(S.used)||0)+n); save(); renderLeave(); }

function stat(label,val,sub,big){
  return el('div',{class:'stat'+(big?' big':'')}, el('div',{class:'stat-l'},label),
    el('div',{class:'stat-n'}, el('span',{class:'v tnum'},String(val)), el('span',{class:'u'},'일')),
    el('div',{class:'stat-s'},sub));
}

function progressBlock(){
  const tot=serviceDays(), d=dday();
  if(tot==null || d==null){
    return el('div',{class:'progress empty', onclick:openProfile},
      el('span',{class:'label'},'복무 진행률'),
      el('p',{class:'block-note', style:'margin:6px 0 0'},'입대일·전역일을 모두 넣으면 진행률과 남은 복무일수가 표시돼요. 눌러서 입력 →'));
  }
  const pct=servePct(), served=servedDays();
  const left = d>0?`남은 복무 ${d}일`:d===0?'오늘 전역!':'전역 완료';
  return el('div',{class:'progress'},
    el('div',{class:'row between center'},
      el('span',{class:'label'},'복무 진행률'),
      el('span',{class:'p-pct'}, pct+'%')),
    el('div',{class:'p-track'}, el('div',{class:'p-fill', style:`width:${pct}%`})),
    el('div',{class:'p-meta'},
      el('span',null, `입대 ${fmtDot(S.profile.enlist)}`),
      el('span',{class:'p-mid'}, `${left} · 복무 ${served}일째 / 총 ${tot}일`),
      el('span',null, `전역 ${fmtDot(S.profile.discharge)}`))
  );
}

function entRow(e){
  const row=el('div',{class:'ent-row'+(e.on?'':' off')});
  const tog=el('label',{class:'toggle'}, el('input',{type:'checkbox', ...(e.on?{checked:'checked'}:{}), onchange:ev=>{ e.on=ev.target.checked; save(); renderLeave(); }}), el('span',{class:'track'}));
  const name=el('input',{type:'text', class:'ent-name', value:e.name, onchange:ev=>{ e.name=ev.target.value; save(); }});
  let amt;
  if(e.type==='monthly'){
    amt=el('div',{class:'ent-amt'},
      el('input',{type:'number', min:'0', step:'0.5', class:'ent-num', value:e.perMonth, title:'월 적립 일수', onchange:ev=>{ e.perMonth=Number(ev.target.value)||0; save(); renderLeave(); }}),
      el('span',{class:'ent-unit'},'일/월 ×'),
      el('input',{type:'number', min:'0', step:'1', class:'ent-num', value:effMonths(e), title:'받는 개월 수', onchange:ev=>{ e.months=Math.max(0,Number(ev.target.value)||0); save(); renderLeave(); }}),
      el('span',{class:'ent-unit'},'개월'),
      el('span',{class:'ent-accr'}, '= '+entDays(e)+'일'));
  } else {
    amt=el('div',{class:'ent-amt'}, el('input',{type:'number', min:'0', step:'1', class:'ent-num', value:e.days, onchange:ev=>{ e.days=Number(ev.target.value)||0; save(); renderLeave(); }}), el('span',{class:'ent-unit'},'일'));
  }
  const del=el('button',{class:'icon-btn', title:'삭제', onclick:()=>{ if(confirm(`'${e.name}' 삭제할까요?`)){ S.entitlements=S.entitlements.filter(x=>x.id!==e.id); save(); renderLeave(); } }},'✕');
  row.append(tog,name,amt,del); return row;
}
function addEnt(){ S.entitlements.push({id:uid(),name:'새 휴가',type:'fixed',days:1,on:true}); save(); renderLeave();
  setTimeout(()=>{ const ins=$$('.ent-name'); const last=ins[ins.length-1]; last&&last.focus(); last&&last.select(); },30); }

/* =====================================================================
   TAB 2 — 달력 (기간 + 내용)
   ===================================================================== */
function renderCalendar(){
  const root=$('#tab-cal'); if(!root) return;
  const [y,m]=S.ui.month.split('-').map(Number);
  const startDow=new Date(y,m-1,1).getDay(), dim=new Date(y,m,0).getDate(), today=todayISO();
  root.innerHTML='';

  const head=el('div',{class:'cal-head'},
    el('div',{class:'cal-title'}, el('span',{class:'cm'}, `${p2(m)}`), el('span',{class:'cy'}, `${MON[m-1]} ${y}`)),
    el('div',{class:'cal-nav'},
      el('button',{class:'btn sm fill', onclick:()=>openEntry()},'＋ 일정'),
      el('button',{class:'nav-arrow', onclick:()=>shiftMonth(-1),'aria-label':'이전 달'},'‹'),
      el('button',{class:'btn sm ghost', onclick:()=>{ S.ui.month=isoMonth(new Date()); save(); renderCalendar(); }},'오늘'),
      el('button',{class:'nav-arrow', onclick:()=>shiftMonth(1),'aria-label':'다음 달'},'›')));

  const grid=el('div',{class:'cal-grid'});
  WD.forEach((w,i)=>grid.append(el('div',{class:'cal-dow'+(i===0?' sun':i===6?' sat':'')}, w)));
  for(let i=0;i<startDow;i++) grid.append(el('div',{class:'cal-cell blank'}));
  for(let dnum=1; dnum<=dim; dnum++){
    const iso=`${y}-${p2(m)}-${p2(dnum)}`, dow=new Date(y,m-1,dnum).getDay();
    const cell=el('div',{class:'cal-cell'+(dow===0?' sun':dow===6?' sat':''), 'data-date':iso, role:'button', tabindex:'0'});
    if(iso===today) cell.classList.add('today');
    if(S.profile.discharge===iso) cell.classList.add('discharge');
    if(S.ui.xout&&S.profile.enlist&&iso<today&&iso>=S.profile.enlist) cell.classList.add('xout');
    cell.append(el('div',null, el('span',{class:'cell-num'}, String(dnum)),
      iso===today?el('span',{class:'today-tag'},'오늘'):null,
      S.profile.discharge===iso?el('span',{class:'dis-tag'},'전역'):null));
    const covers=S.entries.filter(en=>iso>=en.start&&iso<=en.end);
    covers.slice(0,3).forEach(en=>{ const isStart=iso===en.start||dow===0;
      const band=el('div',{class:'cell-band', onclick:ev=>{ ev.stopPropagation(); openEntry(en); }}, isStart?el('span',{class:'band-lbl'}, en.text):'');
      cell.append(band); });
    cell.addEventListener('click',()=>openEntry({ start:iso, end:iso }));
    cell.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openEntry({start:iso,end:iso}); } });
    grid.append(cell);
  }

  const legend=el('div',{class:'cal-legend'},
    lg('b-leave','일정'), lg('b-today','오늘'), lg('b-dis','전역일'),
    el('label',{class:'toggle', style:'margin-left:auto', title:'지난 날 줄 긋기'},
      el('input',{type:'checkbox', ...(S.ui.xout?{checked:'checked'}:{}), onchange:ev=>{ S.ui.xout=ev.target.checked; save(); renderCalendar(); }}),
      el('span',{class:'track'}), el('span',{class:'lg-item', style:'margin-left:9px'},'전역 카운트다운')));
  root.append(el('div',{class:'panel'}, head, grid), legend);
}
function lg(cls,label){ return el('span',{class:'lg-item'}, el('i',{class:cls}), label); }
function shiftMonth(n){ const [y,m]=S.ui.month.split('-').map(Number); S.ui.month=isoMonth(new Date(y,m-1+n,1)); save(); renderCalendar(); }

function openEntry(entry){
  const editing = !!(entry && entry.id && S.entries.some(x=>x.id===entry.id));
  const data = entry ? {start:entry.start||todayISO(), end:entry.end||entry.start||todayISO(), text:entry.text||'', id:entry.id} : {start:todayISO(),end:todayISO(),text:''};
  const body=el('div',{class:'col gap-sm'},
    field('내용', el('input',{type:'text', id:'en-text', class:'serif-in', value:data.text, placeholder:'예: 정기휴가, 면회, 외박, 진료…'})),
    el('div',{class:'row gap-sm'},
      field('시작', el('input',{type:'date', id:'en-start', value:data.start})),
      field('종료', el('input',{type:'date', id:'en-end', value:data.end}))),
    el('p',{class:'label', id:'en-count', style:'margin-top:4px'},'')
  );
  const upd=()=>{ const s=$('#en-start').value,e=$('#en-end').value; $('#en-count').textContent=(s&&e)?`${daysInclusive(s,e)}일`:''; };
  const actions=[{label:'저장', cls:'btn fill', on:()=>{
    const text=$('#en-text').value.trim(), s=$('#en-start').value; let e=$('#en-end').value||s;
    if(!text){ alert('내용을 적어주세요'); return false; } if(!s){ alert('날짜를 정해주세요'); return false; }
    if(e<s){ const t=s; e=s; data.start=t; }
    const obj={ start:s, end:e<s?s:e, text };
    if(editing){ const t=S.entries.find(x=>x.id===data.id); Object.assign(t,obj); } else { obj.id=uid(); S.entries.push(obj); }
    save(); renderCalendar(); if($('#tab-leave') && !$('#tab-leave').classList.contains('hidden')) renderLeave(); return true; }}];
  if(editing) actions.unshift({label:'삭제', cls:'btn ghost', on:()=>{ S.entries=S.entries.filter(x=>x.id!==data.id); save(); renderCalendar(); return true; }});
  modal(editing?'일정 수정':'일정 추가', body, actions);
  setTimeout(()=>{ $('#en-start').addEventListener('change',upd); $('#en-end').addEventListener('change',upd); upd(); $('#en-text').focus(); },10);
}
function field(label,input){ return el('label',{class:'field'}, el('span',{class:'field-label'},label), input); }

/* =====================================================================
   TAB 3 — 급식
   ===================================================================== */
const MEALS=[['b','아침','◷'],['l','점심','☀'],['d','저녁','☾']];
function renderMeals(){
  const root=$('#tab-meal'); if(!root) return;
  const date=S.ui.mealDate||todayISO(); root.innerHTML='';
  const base=parseISO(date), dow=(base.getDay()+6)%7, monday=addDays(base,-dow);
  const strip=el('div',{class:'meal-week'});
  for(let i=0;i<7;i++){ const dd=addDays(monday,i), iso=isoDate(dd), meal=S.meals[iso]||{}, filled=!!(meal.b||meal.l||meal.d);
    strip.append(el('button',{class:'mw-cell'+(iso===date?' active':'')+(iso===todayISO()?' today':''), onclick:()=>{ S.ui.mealDate=iso; save(); renderMeals(); }},
      el('span',{class:'mw-dow'}, WD[dd.getDay()]), el('span',{class:'mw-d'}, String(dd.getDate())), el('span',{class:'mw-dot'+(filled?' on':'')}))); }

  const nav=el('div',{class:'meal-nav'},
    el('button',{class:'nav-arrow', onclick:()=>shiftMeal(-1),'aria-label':'이전 날'},'‹'),
    el('div',{class:'mn-c'}, el('span',{class:'chip ink'},'오늘의 급식'), el('span',{class:'mn-date'}, fmtKo(date))),
    el('button',{class:'nav-arrow', onclick:()=>shiftMeal(1),'aria-label':'다음 날'},'›'));

  const meal=S.meals[date]||{b:'',l:'',d:''};
  const row=el('div',{class:'meal-row'});
  MEALS.forEach(([k,label,ic])=> row.append(el('div',{class:'tray'},
    el('div',{class:'tray-l'}, el('span',null,label), el('span',{class:'ic'}, ic)),
    el('textarea',{class:'tray-text', rows:'5', placeholder:'메뉴를 적어주세요\n예) 쌀밥 · 미역국 · 제육볶음', oninput:ev=>queueMeal(date,k,ev.target.value)}, meal[k]||''))));

  root.append(strip, el('div',{class:'panel flat'}, nav, row),
    el('p',{class:'label', style:'text-align:center;margin-top:18px'},'적은 식단은 이 기기에 자동 저장돼요'));
}
let mealTimer;
function queueMeal(date,k,v){ const m=S.meals[date]||(S.meals[date]={b:'',l:'',d:''}); m[k]=v; clearTimeout(mealTimer);
  mealTimer=setTimeout(()=>{ if(!m.b&&!m.l&&!m.d) delete S.meals[date]; save(); const dot=$('.mw-cell.active .mw-dot'); if(dot) dot.classList.toggle('on', !!(m.b||m.l||m.d)); },400); }
function shiftMeal(n){ S.ui.mealDate=isoDate(addDays(parseISO(S.ui.mealDate||todayISO()),n)); save(); renderMeals(); }

/* =====================================================================
   TAB 4 — 견학 보고서 (사진 올리고 인쇄)
   ===================================================================== */
function fmtDateKo(s){ const d=parseISO(s); return d?`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${WD[d.getDay()]})`:''; }

function renderReport(){
  const root=$('#tab-report'); if(!root) return; const r=S.report; root.innerHTML='';
  const edit=el('section',{class:'report-edit no-print'},
    el('div',{class:'block-head'},
      el('div',null, el('div',{class:'bh-t'},'견학 보고서 만들기'),
        el('p',{class:'block-note'},'사진을 올리고 빈칸을 채우면 아래 보고서가 완성돼요. 인쇄하거나 PDF로 저장해서 제출하세요.')),
      el('button',{class:'btn fill', onclick:()=>window.print()},'🖨  인쇄 / PDF 저장')),
    el('label',{class:'rp-drop'},
      el('input',{type:'file', accept:'image/*', multiple:'multiple', style:'display:none', onchange:onPhotos}),
      el('span',{class:'rp-plus'},'＋'), el('span',null,'견학 인증 사진 올리기'),
      el('span',{class:'rp-hint'},'여러 장 가능 · 휴대폰 사진 그대로 OK')),
    el('div',{class:'rp-thumbs'}, ...r.photos.map((src,i)=>
      el('div',{class:'rp-thumb'}, el('img',{src}), el('button',{class:'rp-del', title:'삭제', onclick:()=>{ r.photos.splice(i,1); saveReport(); renderReport(); }},'✕')))),
    el('div',{class:'rp-fields'},
      rfield('제목','title'), rfield('견학 장소','place'), rfield('견학 일시','date','date'),
      rfield('소속 (부대)','unit'), rfield('계급','rank'), rfield('성명','name'), rfield('군번','serviceNo')),
    el('label',{class:'field', style:'margin-top:12px'}, el('span',{class:'field-label'},'소감 / 느낀 점'),
      el('textarea',{rows:'5', placeholder:'견학하며 느낀 점을 적어주세요…', oninput:ev=>{ r.reflection=ev.target.value; updatePreview(); saveReportDebounced(); }}, r.reflection)));
  root.append(edit, buildReportSheet());
}
function rfield(label,key,type){ return el('label',{class:'field'}, el('span',{class:'field-label'},label),
  el('input',{type:type||'text', value:S.report[key]||'', oninput:ev=>{ S.report[key]=ev.target.value; updatePreview(); saveReportDebounced(); }})); }

function buildReportSheet(){
  const r=S.report, dateStr=fmtDateKo(r.date);
  return el('div',{class:'report-sheet', id:'report-sheet'},
    el('h1',{class:'rs-title'}, r.title||'견학 보고서'),
    el('table',{class:'rs-info'}, el('tbody',null,
      infoRow('소속', r.unit, '계급', r.rank),
      infoRow('성명', r.name, '군번', r.serviceNo),
      infoRow('견학 장소', r.place, '견학 일시', dateStr))),
    el('div',{class:'rs-sec'}, el('div',{class:'rs-h'},'소감 및 느낀 점'),
      el('div',{class:'rs-body'}, r.reflection ? r.reflection : ' ')),
    r.photos.length ? el('div',{class:'rs-sec rs-photo-sec'}, el('div',{class:'rs-h'},'붙임 · 견학 사진'),
      el('div',{class:'rs-photos'}, ...r.photos.map(src=>el('figure',{class:'rs-ph'}, el('img',{src}))))) : null,
    el('div',{class:'rs-sign'},
      el('span',{class:'rs-date'}, dateStr || '20  .   .   .'),
      el('span',{class:'rs-by'}, '작성자  '+(r.name||'____________')+'  (서명/인)')));
}
function infoRow(l1,v1,l2,v2){ return el('tr',null,
  el('th',null,l1), el('td',null, v1||' '), el('th',null,l2), el('td',null, v2||' ')); }
function updatePreview(){ const old=$('#report-sheet'); if(old) old.replaceWith(buildReportSheet()); }

function resizeImage(file, max=1280, q=0.82){ return new Promise(res=>{
  const img=new Image(); img.onload=()=>{ let w=img.width,h=img.height;
    if(w>max||h>max){ if(w>=h){ h=Math.round(h*max/w); w=max; } else { w=Math.round(w*max/h); h=max; } }
    const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
    try{ res(c.toDataURL('image/jpeg',q)); }catch(e){ res(null); } URL.revokeObjectURL(img.src); };
  img.onerror=()=>res(null); img.src=URL.createObjectURL(file); }); }
async function onPhotos(ev){ const files=[...ev.target.files]; ev.target.value='';
  for(const f of files){ const d=await resizeImage(f); if(d) S.report.photos.push(d); }
  saveReport(); renderReport(); }
function saveReport(){ try{ save(); }catch(e){ alert('사진 용량이 커서 일부는 저장되지 않았어요(이번 인쇄에는 보여요). 사진 수를 줄이면 다음에도 남아요.'); } }
let _rT; function saveReportDebounced(){ clearTimeout(_rT); _rT=setTimeout(saveReport,500); }

/* =====================================================================
   PROFILE / MODAL / TABS / BOOT
   ===================================================================== */
function openProfile(){
  const p=S.profile;
  const body=el('div',{class:'col gap-sm'},
    el('p',{class:'block-note', style:'margin:0 0 6px'},'입대일·전역일을 넣으면 D-day · 복무 진행률 · 월 적립 휴가가 자동으로 채워져요.'),
    el('div',{class:'row gap-sm'},
      field('입대일', el('input',{type:'date', id:'pf-enlist', value:p.enlist})),
      field('전역일', el('input',{type:'date', id:'pf-discharge', value:p.discharge}))));
  modal('복무 정보', body, [
    {label:'저장', cls:'btn fill', on:()=>{ S.profile={ enlist:$('#pf-enlist').value, discharge:$('#pf-discharge').value };
      save(); renderHeader(); renderLeave(); renderCalendar(); return true; }}
  ]);
}

let _modal=null;
function modal(title, bodyNode, actions){
  closeModal();
  const card=el('div',{class:'modal-card rise'},
    el('div',{class:'row between center'}, el('h3',null,title), el('button',{class:'icon-btn','aria-label':'닫기', onclick:closeModal},'✕')),
    el('hr',{class:'hairline', style:'margin:14px 0 18px'}),
    bodyNode,
    el('div',{class:'row gap-sm end', style:'margin-top:22px'},
      el('button',{class:'btn ghost', onclick:closeModal},'취소'),
      ...(actions||[]).map(a=>el('button',{class:a.cls||'btn', onclick:()=>{ if(a.on()!==false) closeModal(); }}, a.label))));
  _modal=el('div',{class:'modal-back', onclick:e=>{ if(e.target===_modal) closeModal(); }}, card);
  document.body.append(_modal); document.addEventListener('keydown', escClose);
}
function closeModal(){ if(_modal){ _modal.remove(); _modal=null; document.removeEventListener('keydown', escClose); } }
function escClose(e){ if(e.key==='Escape') closeModal(); }

function switchTab(name){
  $$('.tab').forEach(t=>t.setAttribute('aria-selected', String(t.dataset.tab===name)));
  $$('.tab-panel').forEach(pp=>pp.classList.toggle('hidden', pp.id!=='tab-'+name));
  if(name==='leave') renderLeave(); if(name==='cal') renderCalendar(); if(name==='meal') renderMeals(); if(name==='report') renderReport();
  S.ui.tab=name; save();
}
function boot(){
  $$('.tab').forEach(t=>t.addEventListener('click',()=>switchTab(t.dataset.tab)));
  renderHeader(); switchTab(S.ui.tab||'leave');
  if(!S.profile.enlist&&!S.profile.discharge) setTimeout(openProfile,500);
}
window.MS={ openProfile, switchTab,
  resetAll:()=>{ if(confirm('모든 기록을 지울까요? 되돌릴 수 없어요.')){ localStorage.removeItem(KEY); S=DEFAULTS(); renderHeader(); renderLeave(); renderCalendar(); renderMeals(); } },
  exportData:()=>{ const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='mj2y-ms-backup.json'; a.click(); } };

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
