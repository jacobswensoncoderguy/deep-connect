const {JSDOM}=require('jsdom');
const fs=require('fs');
const html=fs.readFileSync(__dirname+'/index.html','utf8')
  .replace(/<script src="https:\/\/[^"]*"><\/script>/g,'');
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){ w.fetch=()=>Promise.reject(new Error('no net'));
    w.onerror=m=>errs.push(String(m));
    w.addEventListener('error',e=>errs.push(e.message||String(e.error))); }});
setTimeout(()=>{
  const w=dom.window, d=w.document, ok=[], bad=[];
  const T=(n,f)=>{ try{ f(); ok.push(n); }catch(e){ bad.push(n+' -> '+e.message); } };
  w.who='U1'; w.UID='U1'; w.COUPLE='C';
  w.PEOPLE=[{id:'U1',display_name:'Jake',partner_name:'Abbie',couple_id:'C'}];
  w.ME=w.PEOPLE[0];
  w.customs=[]; w.hidden=[]; w.sess=[]; w.daily=[]; w.checks={};
  d.getElementById('c-date').value='2026-11-21';
  d.getElementById('c-t0').value='18:30';

  T('protocol renders',()=>{ w.protocol();
    if(d.getElementById('g-pre').children.length<2) throw new Error('no tiles'); });
  T('all 7 grids fill',()=>{ ['g-pre','g-peri','g-bed','g-d1','g-week','g-pep','g-train']
    .forEach(id=>{ if(d.getElementById(id).children.length<1) throw new Error(id+' empty'); }); });
  T('dose summary',()=>{ if(!d.getElementById('dosesum').textContent.includes('mg total')) throw new Error('empty'); });
  T('check off an item',()=>{ w.checks[w.key()]={gf:{at:new Date().toISOString(),skipped:false}};
    w.protocol(); if(!w.ck('gf')) throw new Error('not marked'); });
  T('actual time anchors',()=>{ w.checks[w.key()]={dose1:{at:new Date('2026-11-21T19:00:00').toISOString(),skipped:false}};
    const p=w.peak(); if(typeof p!=='number'||isNaN(p)) throw new Error('peak NaN'); });
  T('skip an item',()=>{ w.checks[w.key()]={pt:{at:new Date().toISOString(),skipped:true}};
    w.protocol(); if(!w.isSkipped('pt')||w.ck('pt')) throw new Error('skip wrong'); });
  T('open detail sheet',()=>{ w.checks[w.key()]={};
    w.openSheet({id:'gf',n:'Grapefruit juice',d:'x',off:-60},'pre',true);
    if(!d.getElementById('sh-name')) throw new Error('no editor'); });
  T('sheet has date+time',()=>{ if(!d.getElementById('sh-date')||!d.getElementById('sh-time')) throw new Error('missing'); });
  T('open add sheet',()=>{ w.openAdd('peri',true);
    if(!d.getElementById('ad-name')) throw new Error('no add form'); });
  T('custom item renders',()=>{ w.customs=[{id:'X1',section:'peri',subject_id:'U1',
      name:'Ketamine 40 mg',detail:'IM',off_min:90,builtin_id:null}];
    w.protocol();
    if(!d.getElementById('g-peri').textContent.includes('Ketamine')) throw new Error('not shown'); });
  T('override renames builtin',()=>{ w.checks={}; w.hidden=[]; w.RECDATE=null; w.customs=[{id:'X2',section:'pre',subject_id:'U1',
      name:'Tadalafil 10 mg',detail:null,off_min:-45,builtin_id:'tad'}];
    w.protocol();
    if(!d.getElementById('g-pre').textContent.includes('Tadalafil 10 mg')) throw new Error('not renamed'); });
  T('hidden item disappears',()=>{ w.customs=[];
    w.hidden=[{item_id:'pt',subject_id:'U1'}]; w.protocol();
    if(d.getElementById('g-pre').textContent.includes('PT-141')) throw new Error('still there'); });
  T('time<->offset round trip',()=>{ w.hidden=[];
    const o=w.timeToOff('20:00'); const t=w.offToTime(o);
    if(t!=='20:00') throw new Error('got '+t); });
  T('past sessions table',()=>{ w.sess=[{date:'2026-11-14',person:'U1','c-t0':'18:00',
      'c-d1':100,'c-v1':'Gummies','c-d2':50,'c-v2':'Capsule',bump:false,gap:7}];
    w.render();
    if(!d.getElementById('t-sess').textContent.includes('2026-11-14')) throw new Error('missing'); });
  T('switcher shows partner',()=>{ w.whoBar();
    if(!d.getElementById('whobtns').textContent.includes('Abbie')) throw new Error('no Abbie'); });
  T('switch to partner',()=>{ w.who='__them'; w.protocol(); w.whoBar();
    if(w.nameOf('__them')!=='Abbie') throw new Error('name wrong'); w.who='U1'; });
  T('tile has a tick box',()=>{ w.customs=[]; w.hidden=[]; w.checks={}; w.protocol();
    const t=d.getElementById('g-pre').querySelector('.ti .tick');
    if(!t) throw new Error('no tick box'); });
  T('tile body opens editor',()=>{ const tile=d.getElementById('g-pre').querySelector('.ti');
    tile.onclick(); if(!d.getElementById('sh-name')) throw new Error('editor did not open'); });
  T('editor offers remove',()=>{ if(!d.getElementById('sh-hide')) throw new Error('no remove option'); });
  T('editor offers time fields',()=>{ if(!d.getElementById('sh-time')||!d.getElementById('sh-date'))
      throw new Error('no time fields'); });
  T('editing the actual time updates the tile',()=>{
    w.checks={}; w.customs=[]; w.protocol();
    const dose1=w.PERI().find(x=>x.id==='dose1');
    w.openSheet(dose1,'peri',true);
    d.getElementById('sh-date').value='2026-11-21';
    d.getElementById('sh-time').value='17:28';
    d.getElementById('sh-save').onclick();
    const t=[...d.getElementById('g-peri').querySelectorAll('.ti')].find(x=>x.textContent.includes('Dose 1'));
    if(!t.textContent.includes('5:28')) throw new Error('tile shows '+t.textContent.trim()); });
  T('planned label is the planned time',()=>{
    const t=[...d.getElementById('g-peri').querySelectorAll('.ti')].find(x=>x.textContent.includes('Dose 1'));
    if(!t.textContent.includes('planned 6:30 PM')) throw new Error('got '+t.textContent.trim()); });
  T('scheduled field shows planned not actual',()=>{
    const dose1=w.PERI().find(x=>x.id==='dose1');
    w.openSheet(dose1,'peri',true);
    if(d.getElementById('sh-plan').value!=='18:30')
      throw new Error('got '+d.getElementById('sh-plan').value); });
  T('computed items cannot freeze their text',()=>{ w.checks={}; w.hidden=[]; w.RECDATE=null;
    w.customs=[{id:'Z',section:'peri',subject_id:'U1',builtin_id:'dose1',
      name:'STALE TEXT',detail:'stale',off_min:null}];
    w.protocol();
    if(d.getElementById('g-peri').textContent.includes('STALE TEXT'))
      throw new Error('override froze a computed item'); 
    w.customs=[]; w.protocol(); });
  T('time<->offset has no drift',()=>{
    w.checks={'U1|2026-11-21':{dose1:{at:new Date('2026-11-21T19:30:00').toISOString(),skipped:false}}};
    const off=w.timeToOff('19:00');
    if(off!==30) throw new Error('expected 30, got '+off);
    w.checks={}; });
  T('clear buttons exist',()=>{ w.addClears();
    if(!d.querySelectorAll('.clr').length) throw new Error('none'); });
  T('actual dose re-anchors everything',()=>{
    w.checks={}; w.customs=[]; w.hidden=[]; w.protocol();
    const txt=()=>d.getElementById('g-peri').textContent;
    if(!txt().includes('7:30 PM')) throw new Error('planned dose2 missing');
    w.checks={'U1|2026-11-21':{dose1:{at:new Date('2026-11-21T17:28:00').toISOString(),skipped:false}}};
    w.protocol();
    if(!txt().includes('6:28 PM')) throw new Error('dose2 did not shift: '+txt().slice(0,200));
    if(!txt().includes('was 7:30 PM')) throw new Error('original time not shown'); });
  // calendar only schedules what is still ahead, so test against a future session
  const FD=new Date(Date.now()+86400000);
  const FS=FD.getFullYear()+'-'+String(FD.getMonth()+1).padStart(2,'0')+'-'+String(FD.getDate()).padStart(2,'0');
  const calSetup=()=>{ w.customs=[]; w.hidden=[]; w.sess=[]; w.RECDATE=null;
    d.getElementById('c-date').value=FS;
    d.getElementById('c-t0').value='18:30';
    d.getElementById('rec-date').value=FS;
    w.checks={[`U1|${FS}`]:{dose1:{at:new Date(FS+'T17:28:00').toISOString(),skipped:false}}};
    w.protocol(); };
  T('calendar uses UTC stamps',()=>{ calSetup(); const ics=w.buildIcs();
    const dts=ics.match(/DTSTART:\d{8}T\d{6}Z/g)||[];
    if(!dts.length) throw new Error('no UTC DTSTART'); 
    if(/TZID=/.test(ics)) throw new Error('still emitting TZID'); });
  T('calendar follows actuals',()=>{ calSetup(); const ics=w.buildIcs();
    // dose2 anchored to 5:28 start = 6:28 PM Boise = 01:28Z next day
    const want=new Date(FS+'T18:28:00');
    const z=want.getUTCFullYear()+String(want.getUTCMonth()+1).padStart(2,'0')+
      String(want.getUTCDate()).padStart(2,'0')+'T'+String(want.getUTCHours()).padStart(2,'0')+
      String(want.getUTCMinutes()).padStart(2,'0')+'00Z';
    if(!ics.includes(z)) throw new Error('dose2 not re-anchored: want '+z); });
  T('calendar skips what is done',()=>{ calSetup(); const ics=w.buildIcs();
    if(/SUMMARY:Dose 1/.test(ics)) throw new Error('already-taken item still scheduled'); });
  T('calendar includes custom items',()=>{ calSetup();
    w.customs=[{id:'K',section:'peri',subject_id:'U1',name:'Ketamine 40 mg',detail:'',off_min:120,builtin_id:null}];
    const ics=w.buildIcs(); w.customs=[];
    if(!/Ketamine/.test(ics)) throw new Error('custom item missing from calendar'); });
  T('onset controls exist',()=>{
    if(!d.getElementById('felt-now')||!d.getElementById('felt-time')) throw new Error('missing'); });
  T('push toggle exists',()=>{ if(!d.getElementById('pushtog')) throw new Error('missing'); });
  T('onset table renders',()=>{
    w.checks={'U1|2026-11-14':{dose1:{at:new Date('2026-11-14T18:00:00').toISOString(),skipped:false}}};
    w.sess=[{date:'2026-11-14',person:'U1','c-t0':'18:00','c-d1':100,'c-v1':'Liquid softgel',
      'c-d2':50,'c-v2':'Capsule',bump:false,gap:7,
      feltAt:new Date('2026-11-14T18:32:00').toISOString()}];
    w.render();
    const t=d.getElementById('t-onset').textContent;
    if(!t.includes('32 min')) throw new Error('got: '+t.slice(0,160)); });
  T('reminder list follows actuals',()=>{
    w.checks={'U1|2026-11-21':{dose1:{at:new Date('2026-11-21T17:28:00').toISOString(),skipped:false}}};
    d.getElementById('c-date').value='2026-11-21'; w.protocol();
    const L=w.reminderList();
    if(!L.length) throw new Error('empty');
    if(L.some(x=>x.item_id==='dose1')) throw new Error('already-taken item queued'); });
  T('service worker file referenced',()=>{
    if(!/sw\.js/.test(d.documentElement.innerHTML)) throw new Error('no sw.js'); });
  T('recovery is day aware',()=>{
    w.sess=[{date:'2026-11-21',person:'U1','c-t0':'18:30','c-d1':100,'c-v1':'Liquid softgel',
      'c-d2':100,'c-v2':'Gummies',bump:false,gap:7}];
    w.checks={}; w.customs=[]; w.hidden=[];
    d.getElementById('rec-date').value='2026-11-22'; w.RECDATE='2026-11-22'; w.protocol();
    if(!d.getElementById('recday').textContent.includes('DAY 1')) throw new Error('banner: '+d.getElementById('recday').textContent);
    if(!d.getElementById('g-d1').textContent.includes('tyrosine')) throw new Error('day 1 items missing');
    if(d.getElementById('g-week').textContent.includes('Morning')) throw new Error('day 2-10 items showing on day 1'); });
  T('day 3 drops ALA and shows week stack',()=>{
    d.getElementById('rec-date').value='2026-11-24'; w.RECDATE='2026-11-24'; w.protocol();
    if(!d.getElementById('recday').textContent.includes('DAY 3')) throw new Error('wrong day');
    if(!d.getElementById('g-week').textContent.includes('No ALA from today')) throw new Error('ALA note missing');
    if(d.getElementById('g-d1').textContent.includes('tyrosine')) throw new Error('day 1 items still showing'); });
  T('recovery check-offs are per day',()=>{
    w.RECDATE='2026-11-22'; w.protocol();
    const tile=[...d.getElementById('g-d1').querySelectorAll('.ti')][0];
    const tick=tile.querySelector('.tick'); tick.onclick({stopPropagation(){}});
    w.RECDATE='2026-11-23'; w.protocol();
    const t2=[...d.getElementById('g-week').querySelectorAll('.ti')][0];
    if(t2 && t2.querySelector('.tick').classList.contains('on'))
      throw new Error('tick leaked across days'); 
    w.checks={}; w.RECDATE='2026-11-22'; });
  T('finish session sheet',()=>{
    w.openFinish();
    ['f-peak','f-load','f-plat','f-notes','f-go'].forEach(id=>{
      if(!d.getElementById(id)) throw new Error('missing '+id); }); });
  T('history shows outcome columns',()=>{
    w.sess=[{date:'2026-11-21',person:'U1','c-t0':'18:30','c-d1':100,'c-v1':'Liquid softgel',
      'c-d2':100,'c-v2':'Gummies',bump:false,gap:7,peakScore:8,bodyLoad:6,plateau:3.5,
      finishedAt:new Date().toISOString()}];
    w.render();
    const t=d.getElementById('t-sess').textContent;
    if(!t.includes('Peak')||!t.includes('3.5h')) throw new Error('got '+t.slice(0,200)); });
  T('pre-load block renders',()=>{
    w.customs=[]; w.hidden=[]; w.RECDATE=null;
    d.getElementById('c-date').value='2026-11-28';
    d.getElementById('c-t0').value='18:30';
    w.checks={}; w.protocol();
    const t=d.getElementById('g-load').textContent;
    if(!t.includes('ALA 1,200 mg')) throw new Error('no preload items: '+t.slice(0,120));
    if(!t.includes('two days out')) throw new Error('no day -2: '+t.slice(0,200));
    if(!t.includes('day before')) throw new Error('no day -1');
    if(!t.includes('11/26')) throw new Error('no dated label');
    if(!d.getElementById('loadhint').textContent.includes('2026-11-26')) throw new Error('wrong start date'); });
  T('mid-session rounds still there',()=>{
    if(!d.getElementById('g-peri').textContent.includes('ALA 300 mg'))
      throw new Error('hourly rounds removed'); });
  T('pre-load has its own evidence',()=>{
    const e=w.EV['l-am']; if(!e||!/Aguirre/.test(e.fig)) throw new Error('missing card'); });
  T('mg per kg shows in the summary',()=>{
    w.customs=[]; w.hidden=[]; w.RECDATE=null; w.checks={}; w.sess=[];
    d.getElementById('c-date').value='2026-11-28';
    d.getElementById('c-t0').value='18:30';
    d.getElementById('c-bump').classList.remove('on');
    d.getElementById('c-wt').value='120';
    d.getElementById('c-d1').value='100'; d.getElementById('c-d2').value='100';
    w.protocol();
    if(Math.abs(w.mgPerKg()-3.674)>0.02) throw new Error('got '+w.mgPerKg());
    if(!d.getElementById('dosesum').textContent.includes('3.67')) throw new Error('not in summary');
    if(!d.getElementById('dosekg').textContent.includes('very high')) throw new Error('band wrong'); });
  T('matched dose reads moderate',()=>{
    d.getElementById('c-wt').value='200';
    d.getElementById('c-d1').value='100'; d.getElementById('c-d2').value='125';
    w.protocol();
    if(Math.abs(w.mgPerKg()-2.48)>0.02) throw new Error('got '+w.mgPerKg());
    if(!d.getElementById('dosekg').textContent.includes('moderate')) throw new Error('band wrong'); });
  T('compares against the other person',()=>{
    w.PEOPLE=[{id:'U1',display_name:'Jake',couple_id:'C'},
              {id:'U2',display_name:'Abbie',couple_id:'C'}];
    w.ME=w.PEOPLE[0];
    w.sess=[{date:'2026-11-21',person:'U2',mgkg:3.67}];
    w.protocol();
    const t=d.getElementById('dosekg').textContent;
    if(!t.includes('lower')||!t.includes('Abbie')) throw new Error('got '+t); });
  T('no weight prompts instead of guessing',()=>{
    d.getElementById('c-wt').value=''; w.PEOPLE[0].weight_lb=null; w.protocol();
    if(!d.getElementById('dosekg').textContent.includes('Add a body weight'))
      throw new Error('got '+d.getElementById('dosekg').textContent); });
  T('history carries mg/kg',()=>{
    w.sess=[{date:'2026-11-21',person:'U1','c-t0':'18:30','c-d1':100,'c-v1':'Liquid softgel',
      'c-d2':100,'c-v2':'Gummies',bump:false,gap:7,mgkg:3.674,wt:120}];
    w.render();
    const t=d.getElementById('t-sess').textContent;
    if(!t.includes('3.67')) throw new Error('got '+t.slice(0,200)); });
  T('only one body weight field',()=>{
    if(d.querySelectorAll('#v-session input[id="c-wt"]').length!==1)
      throw new Error('duplicate weight fields'); });
  T('session date defaults to today',()=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d.getElementById('c-date').value))
      throw new Error('blank: '+JSON.stringify(d.getElementById('c-date').value)); });
  T('past session opens an editor',()=>{
    w.sess=[{date:'2026-11-21',person:'U1','c-t0':'17:30','c-d1':100,'c-v1':'Liquid softgel',
      'c-d2':100,'c-v2':'Gummies',bump:true,'c-bd':25,'c-bt':'20:30','c-vehicle':'Gummies',
      gap:7,wt:200,mgkg:2.48,peakScore:8,bodyLoad:4,plateau:3,
      feltAt:new Date('2026-11-21T18:02:00').toISOString()}];
    w.render();
    const tr=d.getElementById('t-sess').querySelector('tr[data-s]');
    tr.onclick();
    ['e-date','e-wt','e-t0','e-d1','e-v1','e-d2','e-v2','e-bd','e-bt','e-felt',
     'e-peak','e-load','e-plat','e-notes','e-save','e-del'].forEach(id=>{
      if(!d.getElementById(id)) throw new Error('missing '+id); }); });
  T('editor prefills what was logged',()=>{
    if(d.getElementById('e-d1').value!=='100') throw new Error('dose1: '+d.getElementById('e-d1').value);
    if(d.getElementById('e-v1').value!=='Liquid softgel') throw new Error('form1');
    if(d.getElementById('e-bd').value!=='25') throw new Error('third dose');
    if(d.getElementById('e-felt').value!=='18:02') throw new Error('felt: '+d.getElementById('e-felt').value);
    if(d.getElementById('e-peak').value!=='8') throw new Error('peak'); });
  T('editor recomputes mg/kg live',()=>{
    if(!d.getElementById('e-kg').textContent.includes('2.48')) throw new Error('got '+d.getElementById('e-kg').textContent);
    d.getElementById('e-d2').value='50';
    d.getElementById('e-d2').dispatchEvent(new w.Event('input',{bubbles:true}));
    d.getElementById('e-wt').dispatchEvent(new w.Event('input',{bubbles:true}));
    if(!d.getElementById('e-kg').textContent.includes('1.93')) throw new Error('did not update: '+d.getElementById('e-kg').textContent); });
  T('delete asks twice',()=>{
    const b=d.getElementById('e-del'); b.onclick();
    if(!b.textContent.includes('Tap again')) throw new Error('deleted on first tap'); });
  T('calendar builds',()=>{ const ics=w.buildIcs();
    if(!/BEGIN:VEVENT/.test(ics)) throw new Error('bad ics'); });

  console.log('LOAD ERRORS:',errs.length?errs.join(' | '):'none');
  console.log('PASS '+ok.length+':', ok.join(', '));
  if(bad.length){ console.log('\nFAIL '+bad.length+':'); bad.forEach(b=>console.log('  '+b)); }
  process.exit(bad.length?1:0);
},900);
