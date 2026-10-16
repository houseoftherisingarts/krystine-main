// Le visage de Krystine au premier écran, au téléphone (la Ronde, 16 oct. 2026) :
// la carte « Et jamais autant besoin de repères » montait sur la photo et coupait
// le visage au nez ou au menton sur les petits écrans. La vidéo garde son ancrage,
// mais sa hauteur se règle sur la place libre au-dessus de la carte : le menton
// (vers 45 % de la hauteur de la vidéo) reste toujours au moins 16 px au-dessus d'elle.
(function () {
  var MENTON = 0.45;
  var mq = window.matchMedia('(max-width:900px)');
  function maj() {
    var hero = document.querySelector('section.hero#oeuvre');
    if (!hero) return;
    var copy = hero.querySelector('.copy');
    var v = hero.querySelector('.scene video');
    if (!copy || !v) return;
    if (!mq.matches) { v.style.height = ''; return; }
    v.style.height = '';
    var base = v.getBoundingClientRect().height;
    var haut = parseFloat(getComputedStyle(v).top) || 0;
    var carte = copy.getBoundingClientRect().top - hero.getBoundingClientRect().top;
    var max = (carte - 16 - haut) / MENTON;
    if (max > 0 && max < base) v.style.height = Math.round(max) + 'px';
  }
  maj();
  window.addEventListener('resize', maj);
  window.addEventListener('load', maj);
  setTimeout(maj, 400);
  setTimeout(maj, 1500);
})();
