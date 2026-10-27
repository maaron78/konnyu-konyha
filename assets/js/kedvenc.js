/* Könnyű Konyha: "Kedvenc" hearts, kept per device and reported to an ntfy topic.

   Markup contract (AURA):
     <script src="assets/js/kedvenc.js" data-topic="TOPIC" defer></script>
       optional: data-server="https://ntfy.sh" (default)
     <button type="button" class="kedvenc" data-kedvenc="recipe-id" aria-pressed="false" aria-label="Kedvenc">...</button>
       Every button for the same id stays in sync. Keep it OUTSIDE the card's <a>;
       if it is inside, the click is still stopped from following the link.
     <div data-kedvencek> ... cards with data-recept="recipe-id" ... </div>
       The Favourites view: cards not favourited on this device are hidden.
     <p data-kedvencek-ures>...</p>   shown only while the device has no favourite.

   What goes to the topic (plain-text JSON body, so the request is a CORS
   "simple request" without a preflight):
     {"v":1,"tipus":"jeloles","recept":"id","allapot":"be"|"ki","eszkoz":"<random>","t":<ms>}
     {"v":1,"tipus":"halmaz","kedvencek":["id",...],"eszkoz":"<random>","t":<ms>}
   The device id is random and local; no name ever leaves the page. Every event
   is idempotent, so a resend after an unclear failure only duplicates a row.
   "halmaz" goes out on page load whenever the set changed since the last
   successful one, so a topic message that expired before the poller read it
   is replaced by the next full set. An empty set goes out only from a device
   that already sent one (the resync after unhearting everything), so a first
   visit sends nothing. */
(function () {
  var d = document, me = d.currentScript;
  var TOPIC = me && me.getAttribute('data-topic');
  var SERVER = ((me && me.getAttribute('data-server')) || 'https://ntfy.sh').replace(/\/+$/, '');
  var K_SET = 'kk-kedvenc', K_DEV = 'kk-eszkoz', K_QUEUE = 'kk-kedvenc-sor', K_SENT = 'kk-kedvenc-kuldott';
  var MAX_QUEUE = 200;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function json(k, dflt) { try { var v = JSON.parse(get(k)); return v == null ? dflt : v; } catch (e) { return dflt; } }

  function device() {
    var id = get(K_DEV);
    if (!id || !/^[0-9a-f]{16}$/.test(id)) {
      var b = new Uint8Array(8);
      (window.crypto || window.msCrypto).getRandomValues(b);
      id = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
      put(K_DEV, id);
    }
    return id;
  }

  var favs = json(K_SET, {});            // id -> 1
  if (typeof favs !== 'object' || Array.isArray(favs)) favs = {};
  function list() { return Object.keys(favs).sort(); }

  function paint() {
    d.querySelectorAll('[data-kedvenc]').forEach(function (b) {
      b.setAttribute('aria-pressed', favs[b.getAttribute('data-kedvenc')] ? 'true' : 'false');
    });
    var view = d.querySelector('[data-kedvencek]');
    if (view) {
      var n = 0;
      view.querySelectorAll('[data-recept]').forEach(function (c) {
        var on = !!favs[c.getAttribute('data-recept')];
        c.hidden = !on; if (on) n++;
      });
      d.querySelectorAll('[data-kedvencek-ures]').forEach(function (e) { e.hidden = n > 0; });
    }
  }

  var sending = false;
  function flush() {
    if (!TOPIC || sending) return;
    var q = json(K_QUEUE, []);
    if (!q.length) return;
    sending = true;
    var ev = q[0];
    fetch(SERVER + '/' + encodeURIComponent(TOPIC), { method: 'POST', body: JSON.stringify(ev), keepalive: true })
      .then(function (r) {
        sending = false;
        if (!r.ok) return;                       // 429 or 5xx: stays queued for the next load
        var rest = json(K_QUEUE, []);
        if (rest.length && rest[0].t === ev.t && rest[0].tipus === ev.tipus) rest.shift();
        put(K_QUEUE, JSON.stringify(rest));
        if (ev.tipus === 'halmaz') put(K_SENT, JSON.stringify(ev.kedvencek));
        flush();
      }, function () { sending = false; });     // offline: stays queued
  }

  function enqueue(ev) {
    ev.v = 1; ev.eszkoz = device(); ev.t = Date.now();
    var q = json(K_QUEUE, []);
    q.push(ev);
    if (q.length > MAX_QUEUE) q = q.slice(q.length - MAX_QUEUE);
    put(K_QUEUE, JSON.stringify(q));
  }

  function toggle(id) {
    if (favs[id]) delete favs[id]; else favs[id] = 1;
    put(K_SET, JSON.stringify(favs));
    paint();
    enqueue({ tipus: 'jeloles', recept: id, allapot: favs[id] ? 'be' : 'ki' });
    flush();
  }

  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-kedvenc]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    toggle(b.getAttribute('data-kedvenc'));
  }, true);

  paint();
  var sent = get(K_SENT);
  if (JSON.stringify(list()) !== sent && (list().length || sent !== null)) {
    var q = json(K_QUEUE, []).filter(function (ev) { return ev.tipus !== 'halmaz'; });
    put(K_QUEUE, JSON.stringify(q));
    enqueue({ tipus: 'halmaz', kedvencek: list() });
  }
  flush();
})();
