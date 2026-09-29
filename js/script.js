(function(){
  function load(src, next){
    var s=document.createElement('script');
    s.src=src;
    s.onload=next||null;
    document.head.appendChild(s);
  }
  load('js/core.js?v=1', function(){ load('js/app.js?v=1'); });
})();
