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
  T('override renames builtin',()=>{ w.customs=[{id:'X2',section:'pre',subject_id:'U1',
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
  T('clear buttons exist',()=>{ w.addClears();
    if(!d.querySelectorAll('.clr').length) throw new Error('none'); });
  T('calendar builds',()=>{ const ics=w.buildIcs();
    if(!/BEGIN:VEVENT/.test(ics)) throw new Error('bad ics'); });

  console.log('LOAD ERRORS:',errs.length?errs.join(' | '):'none');
  console.log('PASS '+ok.length+':', ok.join(', '));
  if(bad.length){ console.log('\nFAIL '+bad.length+':'); bad.forEach(b=>console.log('  '+b)); }
  process.exit(bad.length?1:0);
},900);
