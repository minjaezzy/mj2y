/* ============================================================
   ms.mj2y.com — 군 생활 메이트  (v2 editorial)
   휴가 계산기 · 달력 · 수방사 급식 — vanilla JS · localStorage
   ============================================================ */
(() => {
'use strict';

/* ---------- storage ---------------------------------------- */
const KEY = 'mj2y.ms.v1';
const DEFAULTS = () => ({
  profile: { name:'', unit:'', enlist:'', discharge:'' },
  entitlements: [
    { id:uid(), name:'연가',                 type:'fixed',   days:24, on:true, cat:'연가' },
    { id:uid(), name:'상황병 보상휴가',        type:'monthly', perMonth:1, on:true, cat:'포상' },
    { id:uid(), name:'신병위로외박',          type:'fixed',   days:4,  on:true, cat:'외박' },
    { id:uid(), name:'구직휴가',              type:'fixed',   days:2,  on:true, cat:'청원' },
    { id:uid(), name:'시설방문(서대문형무소 등)', type:'fixed', days:1,  on:true, cat:'공가' },
    { id:uid(), name:'위로휴가',              type:'fixed',   days:0,  on:true, cat:'위로' },
  ],
  leaves: [],
  plans:  {},
  meals:  {},
  ui: { month:isoMonth(new Date()), mealDate:todayISO(), xout:true, lfilter:'all', tab:'leave' }
});

let S = load();
function load(){ try{ const v=JSON.parse(localStorage.getItem(KEY)); if(v&&v.profile) return migrate(v); }catch(e){} return DEFAULTS(); }
function migrate(v){ const d=DEFAULTS(); v.ui=Object.assign(d.ui,v.ui||{}); v.plans=v.plans||{}; v.meals=v.meals||{}; v.leaves=v.leaves||[]; return v; }
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); }
function uid(){ return Math.random().toString(36).slice(2,9); }

/* ---------- date utils ------------------------------------- */
function todayISO(){ return isoDate(new Date()); }
function isoDate(d){ return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; }
function isoMonth(d){ return `${d.getFullYear()}-${p2(d.getMonth()+1)}`; }
function p2(n){ return String(n).padStart(2,'0'); }
function parseISO(s){ if(!s) return null; const [y,m,d]=s.split('-').map(Number); return new Date(y,(m||1)-1,d||1); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function daysInclusive(a,b){ const A=parseISO(a),B=parseISO(b); if(!A||!B) return 0; return Math.round((B-A)/864e5)+1; }
function monthsBetween(a,b){ const A=parseISO(a),B=parseISO(b); if(!A||!B||B<A) return 0;
  let m=(B.getFullYear()-A.getFullYear())*12+(B.getMonth()-A.getMonth()); if(B.getDate()<A.getDate()) m--; return Math.max(0,m); }
const WD = ['일','월','화','수','목','금','토'];
const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const fmtKo = s => { const d=parseISO(s); return d?`${d.getMonth()+1}.${d.getDate()}(${WD[d.getDay()]})`:''; };
const fmtShort = s => { const d=parseISO(s); return d?`${d.getMonth()+1}.${d.getDate()}`:''; };

/* ---------- categories ------------------------------------- */
const CAT_LIST = ['연가','포상','위로','외박','청원','공가','기타'];

/* ---------- DOM helpers ------------------------------------ */
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const el = (t,a,...kids)=>{ const n=document.createElement(t); a=a||{};
  for(const k in a){ if(a[k]==null) continue; if(k==='class')n.className=a[k]; else if(k==='html')n.innerHTML=a[k];
    else if(k.startsWith('on'))n.addEventListener(k.slice(2),a[k]); else n.setAttribute(k,a[k]); }
  kids.flat().forEach(c=>c!=null&&c!==false&&n.append(c.nodeType?c:document.createTextNode(c))); return n; };
const esc = s => (s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function sealParts(iso){ const d=parseISO(iso); return { dow:WD[d.getDay()], num:d.getDate(), mon:`${MON[d.getMonth()]} '${String(d.getFullYear()).slice(2)}` }; }
function sealEl(iso, cls){ const s=sealParts(iso);
  return el('span',{class:'seal '+(cls||'')}, el('span',{class:'s-dow'},s.dow), el('span',{class:'s-num'},String(s.num)), el('span',{class:'s-mon'},s.mon)); }

/* =====================================================================
   MATH
   ===================================================================== */
function monthsServedTotal(){ return monthsBetween(S.profile.enlist, S.profile.discharge); }
function monthsServedToDate(){ const t=todayISO(); const cap=S.profile.discharge&&t>S.profile.discharge?S.profile.discharge:t; return monthsBetween(S.profile.enlist,cap); }
function entDays(e,toDate){ if(!e.on) return 0; if(e.type==='monthly'){ const m=toDate?monthsServedToDate():monthsServedTotal(); return (e.perMonth||0)*m; } return Number(e.days)||0; }
function totalGranted(toDate){ return S.entitlements.reduce((s,e)=>s+entDays(e,toDate),0); }
function usedDays(status){ return S.leaves.filter(l=>l.status===status).reduce((s,l)=>s+daysInclusive(l.start,l.end),0); }
function dday(){ if(!S.profile.discharge) return null; return Math.round((parseISO(S.profile.discharge)-parseISO(todayISO()))/864e5); }
function servePct(){ if(!S.profile.enlist||!S.profile.discharge) return 0; const a=parseISO(S.profile.enlist),b=parseISO(S.profile.discharge),n=parseISO(todayISO()); return Math.max(0,Math.min(100,Math.round((n-a)/(b-a)*100))); }

/* =====================================================================
   HEADER / D-DAY SEAL
   ===================================================================== */
function renderHeader(){
  const d=dday(), disc=S.profile.discharge, zone=$('#dday-zone'); if(!zone) return;
  let top,mid,bot;
  if(d==null){ top='—'; mid='D-?'; bot='입대일 입력'; }
  else { top = disc?disc.replace(/-/g,'.'):''; mid = d>0?`D-${d}`:d===0?'D-DAY':`D+${-d}`; bot = d>0?'전역까지':d===0?'오늘 전역':'전역 완료'; }
  zone.innerHTML='';
  zone.append(
    el('div',{class:'rays'}),
    el('button',{class:'dday-seal','aria-label':'복무 정보 입력', onclick:openProfile},
      el('span',{class:'seal'},
        el('span',{class:'s-dow'},top),
        el('span',{class:'s-num', style:'font-size:'+(mid.length>4?'1.7rem':'2.1rem')}, mid),
        el('span',{class:'s-mon'},bot))),
    (disc&&S.profile.enlist)? el('div',{class:'serve'},
      el('div',{class:'serve-track'}, el('div',{class:'serve-fill', id:'serve-fill'})),
      el('div',{class:'serve-meta'}, el('span',null,S.profile.unit||'복무 진행'), el('span',{id:'serve-pct'},'0%'))) : null
  );
  if(disc&&S.profile.enlist){ const pct=servePct(); const f=$('#serve-fill'); if(f) f.style.width=pct+'%'; const pe=$('#serve-pct'); if(pe) pe.textContent=pct+'%'; }
}

/* =====================================================================
   TAB 1 — 휴가 계산
   ===================================================================== */
function renderLeave(){
  const root=$('#tab-leave'); if(!root) return;
  const granted=totalGranted(false), grantedNow=totalGranted(true);
  const used=usedDays('used'), planned=usedDays('planned');
  const remain=granted-used, remainAfter=remain-planned;
  root.innerHTML='';

  // scoreboard
  root.append(el('div',{class:'stat-band'},
    stat('총 부여', granted, S.profile.enlist?`현재까지 ${grantedNow}일 적립`:'복무기간 기준'),
    stat('사용', used, `${S.leaves.filter(l=>l.status==='used').length}건 다녀옴`),
    stat('잔여', remain, planned?`예정 빼면 ${remainAfter}일`:'남은 휴가', true)
  ));

  // entitlements
  const ent=el('section',{class:'mt-lg'});
  ent.append(
    el('div',{class:'block-head'},
      el('div',null, el('div',{class:'bh-t'},'받을 수 있는 휴가'),
        el('p',{class:'block-note'},'토글로 켜고 끄고, 일수는 바로 고쳐 써요. ‘월 적립’은 복무기간으로 자동 계산돼요.')),
      el('button',{class:'btn sm', onclick:addEnt},'＋ 종류 추가')),
  );
  const list=el('div',{class:'mt'}); S.entitlements.forEach(e=>list.append(entRow(e))); ent.append(list);
  root.append(ent);

  // leave records (editorial list)
  const f=S.ui.lfilter||'all';
  let rows=[...S.leaves]; if(f!=='all') rows=rows.filter(l=>l.status===f);
  rows.sort((a,b)=> a.start<b.start?1:-1);
  const today=todayISO();
  const nextPlanned=S.leaves.filter(l=>l.status==='planned'&&l.end>=today).sort((a,b)=>a.start<b.start?-1:1)[0];

  const lv=el('section',{class:'mt-lg'});
  lv.append(
    el('div',{class:'block-head'},
      el('div',null, el('div',{class:'bh-t'},'휴가 기록'),
        el('div',{class:'lfilter mt', style:'margin-top:10px'},
          fbtn('전체','all',f), fbtn('다녀옴','used',f), fbtn('예정','planned',f))),
      el('div',{class:'leave-cta'},
        el('button',{class:'btn sm', onclick:()=>openLeaveEditor(null,'used')},'＋ 다녀온 휴가'),
        el('button',{class:'btn sm fill', onclick:()=>openLeaveEditor(null,'planned')},'＋ 예정 휴가'))
    )
  );
  const elist=el('div',{class:'elist mt'});
  if(!rows.length) elist.append(el('div',{class:'empty-note'}, f==='all'?'아직 기록이 없어요. 다녀온 휴가나 예정 휴가를 적어보세요.':'해당하는 기록이 없어요.'));
  rows.forEach(l=>elist.append(leaveRow(l, nextPlanned&&nextPlanned.id===l.id)));
  lv.append(elist);
  root.append(lv);
}

function stat(label,val,sub,big){
  return el('div',{class:'stat'+(big?' big':'')},
    el('div',{class:'stat-l'},label),
    el('div',{class:'stat-n'}, el('span',{class:'v tnum'},String(val)), el('span',{class:'u'},'일')),
    el('div',{class:'stat-s'},sub));
}
function fbtn(label,val,cur){ return el('button',{'aria-pressed':String(cur===val), onclick:()=>{ S.ui.lfilter=val; save(); renderLeave(); }}, label); }

function entRow(e){
  const row=el('div',{class:'ent-row'+(e.on?'':' off')});
  const tog=el('label',{class:'toggle'}, el('input',{type:'checkbox', ...(e.on?{checked:'checked'}:{}), onchange:ev=>{ e.on=ev.target.checked; save(); renderLeave(); }}), el('span',{class:'track'}));
  const name=el('input',{type:'text', class:'ent-name', value:e.name, onchange:ev=>{ e.name=ev.target.value; save(); }});
  const cat=el('select',{class:'ent-cat', onchange:ev=>{ e.cat=ev.target.value; save(); }}, ...CAT_LIST.map(c=>el('option',{value:c, ...(e.cat===c?{selected:'selected'}:{})},c)));
  let amt;
  if(e.type==='monthly'){
    amt=el('div',{class:'ent-amt'},
      el('input',{type:'number', min:'0', step:'0.5', class:'ent-num', value:e.perMonth, onchange:ev=>{ e.perMonth=Number(ev.target.value)||0; save(); renderLeave(); }}),
      el('span',{class:'ent-unit'},'/월'),
      el('span',{class:'ent-accr'}, '= '+entDays(e,false)+'일'));
  } else {
    amt=el('div',{class:'ent-amt'}, el('input',{type:'number', min:'0', step:'1', class:'ent-num', value:e.days, onchange:ev=>{ e.days=Number(ev.target.value)||0; save(); renderLeave(); }}), el('span',{class:'ent-unit'},'일'));
  }
  const del=el('button',{class:'icon-btn', title:'삭제', onclick:()=>{ if(confirm(`'${e.name}' 삭제할까요?`)){ S.entitlements=S.entitlements.filter(x=>x.id!==e.id); save(); renderLeave(); } }},'✕');
  row.append(tog,name,cat,amt,del); return row;
}
function addEnt(){ S.entitlements.push({id:uid(),name:'새 휴가',type:'fixed',days:1,on:true,cat:'기타'}); save(); renderLeave();
  setTimeout(()=>{ const ins=$$('.ent-name'); const last=ins[ins.length-1]; last&&last.focus(); last&&last.select(); },30); }

function leaveRow(l, isNext){
  const days=daysInclusive(l.start,l.end), planned=l.status==='planned';
  const row=el('div',{class:'erow'+(isNext?' mark':'')+(planned&&!isNext?'':'')});
  row.append(
    sealEl(l.start, planned?'':'ink'),
    el('div',{class:'ebody'},
      el('div',{class:'etitle'}, l.label||catName(l.cat)),
      el('div',{class:'esub'}, l.cat + (l.note?(' · '+l.note):'')),
      el('div',{class:'emeta'}, `${fmtShort(l.start)} – ${fmtShort(l.end)} · ${days}일`)),
    el('div',{class:'eright'},
      el('span',{class:'chip '+(planned?'seal':'hi')}, planned?'예정':'다녀옴'),
      el('button',{class:'icon-btn', title:'수정', onclick:()=>openLeaveEditor(l)},'✎'),
      el('button',{class:'icon-btn', title:'삭제', onclick:()=>{ S.leaves=S.leaves.filter(x=>x.id!==l.id); save(); renderLeave(); renderCalendar(); }},'✕'))
  );
  return row;
}
function catName(c){ return c||'휴가'; }

/* ---------- leave editor (modal) --------------------------- */
function openLeaveEditor(l, status){
  const editing = !!(l && S.leaves.some(x=>x.id===l.id));
  const data = l ? {...l} : { id:uid(), label:'', cat:'연가', start:todayISO(), end:todayISO(), status:status||'used', note:'' };
  const body=el('div',{class:'col gap-sm'},
    field('이름', el('input',{type:'text', id:'le-label', class:'serif-in', value:data.label||'', placeholder:'예: 정기휴가, 포상휴가'})),
    el('div',{class:'row gap-sm'},
      field('종류', el('select',{id:'le-cat'}, ...CAT_LIST.map(c=>el('option',{value:c,...(data.cat===c?{selected:'selected'}:{})},c)))),
      field('상태', el('select',{id:'le-status'},
        el('option',{value:'used',...(data.status==='used'?{selected:'selected'}:{})},'다녀옴 (사용)'),
        el('option',{value:'planned',...(data.status==='planned'?{selected:'selected'}:{})},'예정 (계획)')))),
    el('div',{class:'row gap-sm'},
      field('시작', el('input',{type:'date', id:'le-start', value:data.start})),
      field('복귀(마지막 날)', el('input',{type:'date', id:'le-end', value:data.end}))),
    field('메모 (선택)', el('input',{type:'text', id:'le-note', value:data.note||'', placeholder:'장소·동행 등'})),
    el('p',{class:'label', id:'le-count', style:'margin-top:4px'},'')
  );
  const upd=()=>{ const s=$('#le-start').value,e=$('#le-end').value; $('#le-count').textContent=(s&&e)?`총 ${daysInclusive(s,e)}일`:''; };
  modal(editing?'휴가 수정':(data.status==='planned'?'예정 휴가 추가':'다녀온 휴가 추가'), body, [
    {label:'저장', cls:'btn fill', on:()=>{
      data.label=$('#le-label').value.trim(); data.cat=$('#le-cat').value; data.status=$('#le-status').value;
      data.start=$('#le-start').value; data.end=$('#le-end').value; data.note=$('#le-note').value.trim();
      if(!data.start||!data.end){ alert('날짜를 입력해 주세요'); return false; }
      if(data.end<data.start){ const t=data.start; data.start=data.end; data.end=t; }
      if(editing){ const t=S.leaves.find(x=>x.id===l.id); Object.assign(t,data); } else { S.leaves.push(data); }
      save(); renderLeave(); renderCalendar(); return true; }}
  ]);
  setTimeout(()=>{ $('#le-start').addEventListener('change',upd); $('#le-end').addEventListener('change',upd); upd(); $('#le-label').focus(); },10);
}
function field(label,input){ return el('label',{class:'field'}, el('span',{class:'field-label'},label), input); }

/* =====================================================================
   TAB 2 — 달력
   ===================================================================== */
function renderCalendar(){
  const root=$('#tab-cal'); if(!root) return;
  const [y,m]=S.ui.month.split('-').map(Number);
  const startDow=new Date(y,m-1,1).getDay(), dim=new Date(y,m,0).getDate(), today=todayISO();
  root.innerHTML='';

  const head=el('div',{class:'cal-head'},
    el('div',{class:'cal-title'}, el('span',{class:'cm'}, `${p2(m)}`), el('span',{class:'cy'}, `${MON[m-1]} ${y}`)),
    el('div',{class:'cal-nav'},
      el('button',{class:'nav-arrow', onclick:()=>shiftMonth(-1),'aria-label':'이전 달'},'‹'),
      el('button',{class:'btn sm ghost', onclick:()=>{ S.ui.month=isoMonth(new Date()); save(); renderCalendar(); }},'오늘'),
      el('button',{class:'nav-arrow', onclick:()=>shiftMonth(1),'aria-label':'다음 달'},'›')));

  const grid=el('div',{class:'cal-grid'});
  WD.forEach((w,i)=>grid.append(el('div',{class:'cal-dow'+(i===0?' sun':i===6?' sat':'')}, w)));
  for(let i=0;i<startDow;i++) grid.append(el('div',{class:'cal-cell blank'}));
  for(let d=1; d<=dim; d++){
    const iso=`${y}-${p2(m)}-${p2(d)}`, dow=new Date(y,m-1,d).getDay();
    const cell=el('div',{class:'cal-cell'+(dow===0?' sun':dow===6?' sat':''), 'data-date':iso, role:'button', tabindex:'0'});
    if(iso===today) cell.classList.add('today');
    if(S.profile.discharge===iso) cell.classList.add('discharge');
    if(S.ui.xout&&S.profile.enlist&&iso<today&&iso>=S.profile.enlist) cell.classList.add('xout');
    cell.append(el('div',null, el('span',{class:'cell-num'}, String(d)), iso===today?el('span',{class:'today-tag'},'오늘'):null,
      S.profile.discharge===iso?el('span',{class:'dis-tag'},'전역'):null));
    const covers=S.leaves.filter(l=>iso>=l.start&&iso<=l.end);
    covers.slice(0,2).forEach(l=>{ const isStart=iso===l.start||dow===0;
      cell.append(el('div',{class:'cell-band'+(l.status==='planned'?' planned':'')}, isStart?el('span',{class:'band-lbl'}, l.label||l.cat):'')); });
    if(S.plans[iso]) cell.append(el('div',{class:'cell-plan'}, S.plans[iso]));
    cell.addEventListener('click',()=>openDay(iso));
    cell.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openDay(iso); } });
    grid.append(cell);
  }

  const legend=el('div',{class:'cal-legend'},
    lg('b-leave','휴가'), lg('b-plan','예정'), lg('b-today','오늘'), lg('b-dis','전역일'),
    el('label',{class:'toggle', style:'margin-left:auto', title:'지난 날 줄 긋기'},
      el('input',{type:'checkbox', ...(S.ui.xout?{checked:'checked'}:{}), onchange:ev=>{ S.ui.xout=ev.target.checked; save(); renderCalendar(); }}),
      el('span',{class:'track'}), el('span',{class:'lg-item', style:'margin-left:9px'},'전역 카운트다운')));

  root.append(el('div',{class:'panel'}, head, grid), legend);
}
function lg(cls,label){ return el('span',{class:'lg-item'}, el('i',{class:cls}), label); }
function shiftMonth(n){ const [y,m]=S.ui.month.split('-').map(Number); S.ui.month=isoMonth(new Date(y,m-1+n,1)); save(); renderCalendar(); }

function openDay(iso){
  const plan=S.plans[iso]||'', covers=S.leaves.filter(l=>iso>=l.start&&iso<=l.end);
  const body=el('div',{class:'col gap-sm'},
    el('div',{class:'row center gap-sm'}, sealEl(iso,'ink'), el('div',{class:'esub serif italic', style:'font-size:1.1rem'}, fmtKo(iso))),
    field('이 날 메모 / 계획', el('textarea',{id:'day-plan', rows:'3', placeholder:'예: 면회, 진료, 사역, 전투휴무…'}, plan)),
    covers.length? el('div',{class:'col gap-sm'}, el('div',{class:'label'},'이 날의 휴가'),
      ...covers.map(l=>el('div',{class:'row center gap-sm'}, el('span',{class:'chip '+(l.status==='planned'?'seal':'hi')}, l.label||l.cat), el('span',{class:'emeta'}, `${fmtShort(l.start)}–${fmtShort(l.end)}`)))) : null
  );
  modal(fmtKo(iso)+' 메모', body, [
    {label:'＋ 이 날부터 휴가', cls:'btn', on:()=>{ savePlan(iso); closeModal(); openLeaveEditor({id:uid(),label:'',cat:'연가',start:iso,end:iso,status:'planned',note:''}); return false; }},
    {label:'저장', cls:'btn fill', on:()=>{ savePlan(iso); renderCalendar(); return true; }}
  ]);
  setTimeout(()=>$('#day-plan')&&$('#day-plan').focus(),10);
}
function savePlan(iso){ const t=$('#day-plan').value.trim(); if(t) S.plans[iso]=t; else delete S.plans[iso]; save(); }

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
    el('div',{class:'mn-c'}, el('span',{class:'chip ink'},'수방사 급식'), el('span',{class:'mn-date'}, fmtKo(date))),
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
   PROFILE / MODAL / TABS / BOOT
   ===================================================================== */
function openProfile(){
  const p=S.profile;
  const body=el('div',{class:'col gap-sm'},
    el('p',{class:'block-note', style:'margin:0 0 6px'},'입대일·전역일을 넣으면 D-day · 월 적립 휴가 · 카운트다운 달력이 자동으로 채워져요.'),
    el('div',{class:'row gap-sm'}, field('이름 (선택)', el('input',{type:'text', id:'pf-name', value:p.name, placeholder:'홍길동'})), field('부대 (선택)', el('input',{type:'text', id:'pf-unit', value:p.unit, placeholder:'수방사 ○○대대'}))),
    el('div',{class:'row gap-sm'}, field('입대일', el('input',{type:'date', id:'pf-enlist', value:p.enlist})), field('전역일', el('input',{type:'date', id:'pf-discharge', value:p.discharge}))));
  modal('복무 정보', body, [
    {label:'저장', cls:'btn fill', on:()=>{ S.profile={ name:$('#pf-name').value.trim(), unit:$('#pf-unit').value.trim(), enlist:$('#pf-enlist').value, discharge:$('#pf-discharge').value };
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
  if(name==='leave') renderLeave(); if(name==='cal') renderCalendar(); if(name==='meal') renderMeals();
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
