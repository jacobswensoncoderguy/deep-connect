/* Deep Connect — shows reminders when the app is closed */
self.addEventListener('push', function(ev){
  var d={title:'Deep Connect', body:''};
  try{ d=ev.data.json(); }catch(e){ try{ d.body=ev.data.text(); }catch(e2){} }
  ev.waitUntil(self.registration.showNotification(d.title||'Deep Connect',{
    body:d.body||'', tag:d.tag||'dc', renotify:true,
    icon:'icon-192.png', badge:'icon-192.png',
    vibrate:[120,60,120]
  }));
});
self.addEventListener('notificationclick', function(ev){
  ev.notification.close();
  ev.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(ws){
    for(var i=0;i<ws.length;i++){ if('focus' in ws[i]) return ws[i].focus(); }
    if(clients.openWindow) return clients.openWindow('./');
  }));
});
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(ev){ ev.waitUntil(self.clients.claim()); });
