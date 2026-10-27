(function(){
  var d=document;d.documentElement.classList.add('js');
  function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
  // day tabs: today selected by default
  var tabs=d.querySelectorAll('[data-days] button');
  if(tabs.length){
    var wd=(new Date().getDay()+6)%7; // Mon=0
    function show(i){tabs.forEach(function(b,j){b.setAttribute('aria-selected',j===i?'true':'false')});
      d.querySelectorAll('.panel').forEach(function(p,j){p.classList.toggle('on',j===i)})}
    tabs.forEach(function(b,i){b.addEventListener('click',function(){show(i)});
      if(i===wd){var t=b.querySelector('.t');if(t)t.textContent='ma'}});
    show(wd);
  }
  // servings scaler
  var sb=d.querySelectorAll('[data-serv] button');
  if(sb.length){
    var fr={0.5:'½',1.5:'1½',2.5:'2½',3.5:'3½',0.25:'¼',0.75:'¾'};
    function fmt(n){n=Math.round(n*100)/100;if(fr[n])return fr[n];return String(n%1?Math.round(n*10)/10:n).replace('.',',')}
    function scale(m){d.querySelectorAll('[data-q]').forEach(function(el){
      var q=parseFloat(el.getAttribute('data-q'))*m,q2=el.getAttribute('data-q2'),t=fmt(q);if(q2)t+='-'+fmt(parseFloat(q2)*m);el.textContent=t+(el.getAttribute('data-u')?' '+el.getAttribute('data-u'):'')});
      sb.forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-m')==m?'true':'false')})}
    sb.forEach(function(b){b.addEventListener('click',function(){scale(parseFloat(b.getAttribute('data-m')))})});
  }
  // tickable ingredients
  d.querySelectorAll('.chk input[data-k]').forEach(function(i){
    var k='kk-'+i.getAttribute('data-k');if(store(k)==='1')i.checked=true;
    i.addEventListener('change',function(){store(k,i.checked?'1':'0')})});
  // recipe filters
  var fb=d.querySelectorAll('[data-filter] button');
  if(fb.length){fb.forEach(function(b){b.addEventListener('click',function(){
      var m=b.getAttribute('data-m');fb.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
      d.querySelectorAll('.rcx[data-meal]').forEach(function(c){c.hidden=!(m==='*'||c.getAttribute('data-meal')===m)});
      d.querySelectorAll('.mealhead').forEach(function(h){h.hidden=!(m==='*'||h.getAttribute('data-meal')===m)});
    })})}
  var pb=d.querySelector('[data-print]');if(pb)pb.addEventListener('click',function(){window.print()});
})();
