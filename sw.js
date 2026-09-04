/* Field Kit service worker — cache the shell so the app opens with no signal.

   v3: the page itself is NETWORK-FIRST. Cache-first on index.html meant an
   installed app kept serving the shell it was installed with, so an edit pushed
   here never reached anyone's phone until the cache name changed. Everything
   else stays cache-first, and the cached page is still the offline fallback. */
var CACHE = "fieldkit-v3";
var SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){
    return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;                 // never cache posts to the endpoint
  if(new URL(req.url).origin !== location.origin) return;

  var isPage = req.mode === "navigate" || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  if(isPage){
    e.respondWith(fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){ return hit || caches.match("./index.html"); });
    }));
    return;
  }

  e.respondWith(caches.match(req).then(function(hit){
    return hit || fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy); });
      return res;
    }).catch(function(){ return caches.match("./index.html"); });
  }));
});
