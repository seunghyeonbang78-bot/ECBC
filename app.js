/* Change ONLY this address to your new Cloudflare Worker URL. No passwords belong in this file. */
const API_URL = 'https://YOUR-NEW-WORKER.workers.dev';

const $ = selector => document.querySelector(selector);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storeKey = 'ecbc-owner:' + location.pathname;
let ownerToken = sessionStorage.getItem(storeKey) || '';
let events = [], posts = [], google = null, googleChoices = [], adminTab = 'events';
let ready = false, loading = false, problem = '', edit = null, dirty = false;
let month = today().slice(0,7);
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function dateLabel(day){return new Date(day+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});}
function timeLabel(value){if(value==='24:00')return 'Midnight';const[h,m]=value.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
function eventTime(e){return e.allDay?'All day':timeLabel(e.start)+' – '+timeLabel(e.end);}
function page(){const key=location.hash.slice(1).split('?')[0]||'home';return ['home','training','coach','history','calendar','news','admin'].includes(key)?key:'home';}
const apiConfigured=()=>/^https:\/\//.test(API_URL)&&!API_URL.includes('YOUR-NEW-WORKER');
async function api(path,body){
  if(!apiConfigured())throw new Error('Set API_URL at the top of app.js to your new Cloudflare Worker address.');
  const headers={};if(ownerToken)headers.Authorization='Bearer '+ownerToken;
  if(body!==undefined)headers['Content-Type']='application/json';
  let response;try{response=await fetch(API_URL.replace(/\/$/,'')+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(60000)});}catch{throw new Error('Cannot reach the calendar service. Check the Worker address and SITE_URL setting, then retry.');}
  let result;try{result=await response.json();}catch{throw new Error('The calendar service returned an invalid response.');}
  if(!response.ok){if(response.status===401&&path!=='/api/login'){ownerToken='';sessionStorage.removeItem(storeKey);if(page()==='admin')drawAdmin();}throw new Error(result.error||'Request failed.');}
  return result;
}
async function refresh(quiet=false){
  if(loading)return;loading=true;
  try{const data=await api('/api/club'+(ownerToken?'?admin=1':''));events=data.events;posts=data.posts;ready=true;problem='';}
  catch(e){if(!quiet||!ready)problem=e.message;}
  finally{loading=false;drawCalendar();drawNews();if(page()==='admin'&&ownerToken)drawAdminEntries();}
}
function route(){
  const key=page();for(const p of ['home','training','coach','history','calendar','news','admin'])$('#'+p+'-page').hidden=p!==key;
  $('#navigation').classList.remove('open');$('#menu-button').setAttribute('aria-expanded','false');
  if(key==='calendar')drawCalendar();if(key==='news')drawNews();if(key==='admin'){drawAdmin();if(ownerToken)loadGoogle();}
  const anchor=location.hash.slice(1);if(['play','contact','programs','club'].includes(anchor))setTimeout(()=>document.getElementById(anchor)?.scrollIntoView(),0);else window.scrollTo(0,0);
  if(['calendar','news','admin'].includes(key))refresh();
}
function calendarMarkup(admin=false){
  const[y,m]=month.split('-').map(Number),first=new Date(y,m-1,1).getDay(),days=new Date(y,m,0).getDate();
  const monthName=new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const list=events.filter(e=>e.date.startsWith(month));
  const toolbar=`<div class="calendar-toolbar"><h2 aria-live="polite">${monthName}</h2><div><button class="outline-button" data-action="month" data-step="-1" aria-label="Previous month">Previous</button><button class="outline-button" data-action="today">This month</button><button class="outline-button" data-action="month" data-step="1" aria-label="Next month">Next</button></div></div>`;
  let grid=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="weekday">${d}</div>`).join('');
  const count=admin?Math.ceil((first+days)/7)*7:first+days;
  for(let i=0;i<count;i++){
    const d=i-first+1;if(d<1||d>days){grid+='<div class="calendar-cell blank" aria-hidden="true"></div>';continue;}
    const day=month+'-'+String(d).padStart(2,'0');
    grid+=`<div class="calendar-cell ${admin?'owner-day ':''}${day===today()?'is-today':''}">`;
    grid+=admin?`<button class="owner-add-day" data-action="new-event" data-date="${day}" aria-label="Add event on ${day}"><span class="day-number">${d}</span><span class="day-plus">+</span></button>`:`<span class="day-number">${d}</span>`;
    for(const e of list.filter(e=>e.date===day))grid+=`<button class="calendar-event ${e.cancelled?'cancelled':''}" data-action="event" data-id="${escapeHTML(e.id)}"><span>${escapeHTML(admin?eventTime(e):e.allDay?'All day':timeLabel(e.start))}</span><strong>${e.cancelled?'Cancelled · ':''}${escapeHTML(e.title)}</strong>${admin?'<span>'+escapeHTML(e.location)+'</span>':''}</button>`;
    if(admin)grid+=`<button class="owner-day-space" data-action="new-event" data-date="${day}" aria-label="Add event on ${day}" tabindex="-1"></button>`;
    grid+='</div>';
  }
  let html=toolbar+(problem?`<div class="error-box" role="alert">${escapeHTML(problem)} <button data-action="refresh">Retry</button></div>`:'')+(!ready&&!problem?'<p role="status">Loading calendar…</p>':'');
  html+=`<div class="${admin?'owner-calendar-scroll':''}"><div class="calendar-grid ${admin?'owner-calendar-grid':''}">${grid}</div></div>`;
  if(!admin)html+=`<div class="calendar-list"><h3>Sessions this month</h3>${!list.length&&ready?'<div class="empty-state"><h3>No sessions posted for this month.</h3><p>Check another month or contact the club for availability.</p><a href="tel:+12023908988">Call (202) 390-8988</a></div>':list.map(e=>`<button class="event-list-row" data-action="event" data-id="${escapeHTML(e.id)}"><span>${dateLabel(e.date)}<small>${escapeHTML(eventTime(e))}</small></span><strong>${escapeHTML(e.title)}<small>${escapeHTML(e.location)}</small></strong><span class="tag">${escapeHTML(e.cancelled?'Cancelled':e.category)}</span></button>`).join('')}</div>`;
  return html;
}
function drawCalendar(){$('#calendar-page').innerHTML='<div class="page-heading"><span class="eyebrow">LET’S PLAY</span><h1>Club calendar</h1><p>Open gym, training, and club events. All times are Eastern Time (Maryland).</p></div>'+calendarMarkup();}
function drawNews(){
  $('#news-page').innerHTML='<div class="page-heading"><span class="eyebrow">FROM THE CLUB</span><h1>News & updates</h1></div>'+(problem?`<p class="error-box" role="alert">${escapeHTML(problem)}</p>`:'')+posts.filter(p=>p.status==='published').map(p=>`<article class="news-article"><span class="eyebrow">${dateLabel(p.date)}${p.pinned?' · PINNED':''}</span><h2>${escapeHTML(p.title)}</h2><p class="preserve-lines">${escapeHTML(p.body)}</p></article>`).join('')+(!posts.some(p=>p.status==='published')&&ready?'<p>No announcements yet.</p>':'');
}
function drawAdmin(){
  const root=$('#admin-page');
  if(!ownerToken){root.innerHTML='<div class="owner-login"><span class="eyebrow">OWNER ACCESS</span><h1>Owner login</h1><p>Sign in to manage the club calendar and announcements.</p><form id="login-form"><label>Owner code<input name="code" type="password" required minlength="7" maxlength="128" autocomplete="current-password"></label><button class="button dark">Sign in</button><p class="error-box" id="login-error" role="alert"></p></form></div>';return;}
  const outcome=new URLSearchParams(location.hash.split('?')[1]||'').get('google');
  root.innerHTML=`<div class="admin-heading"><div><span class="eyebrow">OWNER WORKSPACE</span><h1>Your club calendar.</h1><p>Welcome, Owner. Choose a day to keep your club up to date.</p></div><button class="outline-button" data-action="logout">Sign out</button></div><div id="owner-status" class="status-line" role="status">${outcome==='connected'?'Google connected. Choose a calendar below.':outcome==='failed'?'Google connection did not finish. Try again and allow Calendar access.':''}</div><section id="google-panel" class="google-connection" aria-label="Google Calendar connection"><p>Loading Google connection…</p></section><div class="admin-tabs"><button class="outline-button" data-action="tab" data-kind="events">Calendar</button><button class="outline-button" data-action="tab" data-kind="posts">News & updates</button></div><div id="admin-entries"></div><p class="fineprint">Moving from the previous ECBC website? <button class="text-link" data-action="import">Import its public calendar and news once</button></p>`;
  drawAdminEntries();
}
function drawAdminEntries(){
  const root=$('#admin-entries');if(!root)return;
  root.innerHTML=`<div class="admin-toolbar"><div><h2>${adminTab==='events'?'Manage calendar':'Manage announcements'}</h2><p>${adminTab==='events'?'Click a date to add a session. Click an event to edit it. All times are Eastern.':'Write, publish, and update club news.'}</p></div><button class="button dark" data-action="${adminTab==='events'?'new-event':'new-post'}">${adminTab==='events'?'+ Add event':'+ Write update'}</button></div>`;
  if(adminTab==='events')root.innerHTML+='<section class="owner-calendar">'+calendarMarkup(true)+'</section>';
  else root.innerHTML+=posts.map(p=>`<article class="admin-row"><div><span class="tag">${escapeHTML(p.status)}</span><h3>${escapeHTML(p.title)}</h3><p>${dateLabel(p.date)}</p></div><button class="outline-button" data-action="edit-post" data-id="${escapeHTML(p.id)}">Edit</button></article>`).join('');
}
function drawGoogle(){
  const root=$('#google-panel');if(!root||!google)return;
  if(!google.configured){root.innerHTML='<h2>Google Calendar</h2><p>Google connection is not configured yet. Complete the Worker and Google settings in SETUP.md.</p><button class="outline-button" data-action="google-reload">Check again</button>';return;}
  const c=google.connection;
  root.innerHTML=`<h2>Google Calendar</h2><p>Add events in your chosen Google calendar and they will appear in the ECBC calendar automatically.</p><div class="toolbar-actions"><button class="outline-button" data-action="google-connect">${c?'Connect / switch Google account':'Connect Google Calendar'}</button><a class="outline-button" href="https://calendar.google.com/" target="_blank" rel="noopener noreferrer">Open Google Calendar ↗</a></div>`;
  if(c)root.innerHTML+=`<p><strong>${escapeHTML(c.email)}</strong><br>Calendar: ${escapeHTML(c.calendarName||'Not selected')}</p>${c.error?'<p class="error-box" role="alert">'+escapeHTML(c.error)+'</p>':''}<p class="fineprint">${c.syncedAt?'Last synced: '+new Date(c.syncedAt).toLocaleString():'No sync yet'}</p><div class="toolbar-actions"><button class="outline-button" data-action="google-list">Choose calendar</button>${c.calendarId?'<button class="outline-button" data-action="google-sync">Sync now</button>':''}<button class="delete-button" data-action="google-disconnect">Disconnect Google</button></div><p class="fineprint">Use a dedicated ECBC calendar. Other owners may connect their own accounts. Shared calendars are shown only once. Google events update automatically, usually within 1–2 minutes.</p>`;
  if(googleChoices.length)root.innerHTML+=`<form id="google-select-form" class="google-selection"><label>Calendar to show on ECBC<select name="calendarId" class="form-select" required><option value="">Select a calendar</option>${googleChoices.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.summary)}</option>`).join('')}</select></label><label class="check-label"><input type="checkbox" name="publish" required>Publish this calendar’s titles, times, locations and descriptions on the public ECBC website. Events marked private are excluded.</label><button class="button dark">Connect selected calendar</button></form>`;
}
async function loadGoogle(list=false){try{google=await api('/api/google'+(list?'?list=1':''));if(list){googleChoices=google.calendars;if(!googleChoices.length)throw new Error('No readable Google calendars were found.');}drawGoogle();}catch(e){status(e.message,true);}}
function status(message,error=false){const target=$('#owner-status');if(target){target.className=error?'error-box':'success-box';target.textContent=message;}}
function modal(html){$('#modal-body').innerHTML=html;dirty=false;$('#modal').showModal();}
function closeModal(){if(dirty&&!confirm('Discard unsaved changes?'))return;dirty=false;edit=null;$('#modal').close();}
function showEvent(id){
  const e=events.find(x=>x.id===id);if(!e)return;
  if(ownerToken&&page()==='admin'&&e.source!=='google'){editor('events',e);return;}
  modal(`<h2 id="modal-title">${escapeHTML(e.title)}</h2><p>${dateLabel(e.date)} · Eastern Time</p><span class="tag">${escapeHTML(e.cancelled?'Cancelled':e.category)}</span><p>${escapeHTML(eventTime(e))}<br><strong>${escapeHTML(e.location)}</strong></p><p class="preserve-lines">${escapeHTML(e.description)}</p>${ownerToken&&page()==='admin'&&e.source==='google'?'<p>Edit this event in Google Calendar. ECBC will sync the change.</p><a class="button dark" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(e.googleUrl||'https://calendar.google.com/')+'">Edit in Google Calendar ↗</a>':''}`);
}
function editor(kind,row=null,day=today()){
  edit={kind,row};const e=row||{title:'',date:day,start:'19:00',end:'21:00',location:'',description:'',category:'Open gym',body:'',status:'draft',pinned:0,cancelled:0};
  const field=(label,name,type='text',max=200)=>`<label>${label}<input name="${name}" type="${type}" value="${escapeHTML(e[name])}" ${['title','date','start','end','location'].includes(name)?'required':''} maxlength="${max}"></label>`;
  modal(`<h2 id="modal-title">${row?'Edit':'New'} ${kind==='events'?'event':'update'}</h2><form id="editor-form"><div class="editor-grid">${field('Title','title','text',kind==='events'?120:180)}${field('Date','date','date')}${kind==='events'?`${field('Start time (Eastern)','start','time')}${field('End time (Eastern)','end','time')}${field('Location','location')}<label>Session type<select name="category">${['Open gym','Group training','Private coaching','Tournament','Closure'].map(c=>`<option${c===e.category?' selected':''}>${c}</option>`).join('')}</select></label><label class="full-field">Details<textarea name="description" rows="5" maxlength="5000">${escapeHTML(e.description)}</textarea></label>${!row?'<label>Create weekly sessions<input name="repeat" type="number" min="1" max="12" value="1"><small>1 = this date only. Up to 12 dates.</small></label>':''}<label class="check-label"><input name="cancelled" type="checkbox"${e.cancelled?' checked':''}>Mark as cancelled</label>`:`<label>Visibility<select name="status"><option value="draft"${e.status==='draft'?' selected':''}>Draft</option><option value="published"${e.status==='published'?' selected':''}>Published</option></select></label><label class="full-field">Your update<textarea name="body" rows="10" required maxlength="20000">${escapeHTML(e.body)}</textarea></label><label class="check-label"><input type="checkbox" name="pinned"${e.pinned?' checked':''}>Pin to top</label>`}</div><p id="editor-error" class="error-box" role="alert"></p><div class="editor-actions"><button class="button dark" type="submit">Save ${kind==='events'?'event':'update'}</button>${row?'<button class="delete-button" type="button" data-action="delete">Delete</button>':''}</div></form>`);
}
$('#menu-button').onclick=()=>{const open=$('#navigation').classList.toggle('open');$('#menu-button').setAttribute('aria-expanded',String(open));};
$('#modal-close').onclick=closeModal;
$('#modal').addEventListener('cancel',e=>{e.preventDefault();closeModal();});
$('#modal').addEventListener('input',()=>dirty=true);
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',route);
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action;
  if(action==='month'){const[y,m]=month.split('-').map(Number);const d=new Date(y,m-1+Number(button.dataset.step),1);month=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');drawCalendar();drawAdminEntries();return;}
  if(action==='today'){month=today().slice(0,7);drawCalendar();drawAdminEntries();return;}
  if(action==='tab'){adminTab=button.dataset.kind;drawAdminEntries();return;}
  if(action==='event'){showEvent(button.dataset.id);return;}
  if(action==='new-event'){editor('events',null,button.dataset.date||today());return;}
  if(action==='new-post'){editor('posts');return;}
  if(action==='edit-post'){editor('posts',posts.find(p=>p.id===button.dataset.id));return;}
  button.disabled=true;
  try{
    if(action==='refresh')await refresh();
    if(action==='logout'){await api('/api/logout',{});ownerToken='';sessionStorage.removeItem(storeKey);google=null;googleChoices=[];drawAdmin();await refresh();}
    if(action==='google-connect'){const result=await api('/api/google/connect',{});location.assign(result.url);}
    if(action==='google-list')await loadGoogle(true);
    if(action==='google-reload')await loadGoogle();
    if(action==='google-sync'){await api('/api/google',{action:'sync'});await loadGoogle();await refresh();status('Calendar sync checked.');}
    if(action==='google-disconnect'&&confirm('Disconnect this account from ECBC? Its Google events will stay in Google.')){await api('/api/google',{action:'disconnect'});googleChoices=[];await loadGoogle();await refresh();status('Google disconnected.');}
    if(action==='import'&&confirm('Copy public events and news from the current ECBC website? This is a one-time copy, not continuous sync.')){await api('/api/import',{confirm:true});await refresh();status('Public schedule and news imported.');}
    if(action==='delete'&&edit?.row&&confirm('Delete this entry?')){await api('/api/club',{kind:edit.kind,op:'delete',id:edit.row.id,version:edit.row.version});dirty=false;closeModal();await refresh();status('Entry deleted.');}
  }catch(e){if(action==='delete'&&$('#editor-error'))$('#editor-error').textContent=e.message;else status(e.message,true);}finally{button.disabled=false;}
});
document.addEventListener('submit',async event=>{
  const form=event.target;if(!['login-form','editor-form','google-select-form'].includes(form.id))return;
  event.preventDefault();const button=form.querySelector('button[type=submit],button:not([type])');button.disabled=true;
  const data=Object.fromEntries(new FormData(form));
  try{
    if(form.id==='login-form'){const result=await api('/api/login',{code:data.code});ownerToken=result.token;sessionStorage.setItem(storeKey,ownerToken);drawAdmin();await loadGoogle();await refresh();}
    if(form.id==='editor-form'){
      data.cancelled=data.cancelled?1:0;data.pinned=data.pinned?1:0;data.repeat=Number(data.repeat||1);
      await api('/api/club',{kind:edit.kind,op:edit.row?'update':'create',id:edit.row?.id,version:edit.row?.version,data});
      if(edit.kind==='events')month=data.date.slice(0,7);dirty=false;closeModal();await refresh();status('Saved. Published entries are now visible on the website.');
    }
    if(form.id==='google-select-form'){await api('/api/google',{action:'select',calendarId:data.calendarId,publish:!!data.publish});googleChoices=[];await loadGoogle();await refresh();status('Calendar connected. Add events in Google Calendar and ECBC will update automatically.');}
  }catch(e){const target=form.querySelector('[role=alert]');if(target)target.textContent=e.message;else status(e.message,true);}finally{button.disabled=false;}
});
setInterval(()=>{if(!document.hidden){refresh(true);if(page()==='admin'&&ownerToken&&!googleChoices.length)loadGoogle();}},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});
route();
