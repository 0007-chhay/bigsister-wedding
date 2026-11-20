/* ==========================================================================
   ធៀបការ វ៉ាន ច័ន្ទគ្រឹស្នា & មិន ស្រីលក្ខ
   --------------------------------------------------------------------------
   ឈ្មោះភ្ញៀវ:  index.html?to=សុខ%20ចាន់ធី&h=លោក
               បង្កើត link ងាយៗ: បើក  index.html#link
   សារជូនពរ:   រក្សាទុកក្នុង Supabase (ឥតគិតថ្លៃ) — បំពេញ SUPABASE_URL និង SUPABASE_KEY ខាងក្រោម
               បើទុកទទេ ផ្នែកសារជូនពរនឹងបង្ហាញថា "មិនទាន់ដំណើរការ"

   SQL សម្រាប់ Supabase (SQL Editor → New query → Run):
     create table wishes (
       id bigint generated always as identity primary key,
       name text check (char_length(name) <= 60),
       message text not null check (char_length(message) between 2 and 500),
       created_at timestamptz not null default now()
     );
     alter table wishes enable row level security;
     create policy "anyone can read"  on wishes for select using (true);
     create policy "anyone can write" on wishes for insert with check (true);
   លុបសារមិនល្អ: Supabase → Table Editor → wishes → ជ្រើសជួរ → Delete
   ========================================================================== */

var SUPABASE_URL = '';   // ឧ. https://abcdxyz.supabase.co
var SUPABASE_KEY = '';   // Project Settings → API → anon public key

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);

  /* ---------- ឈ្មោះភ្ញៀវលើស្រោមសំបុត្រ (?to=...&h=...) ---------- */
  var guest = (params.get('to') || '').trim().slice(0, 80);
  var hon = (params.get('h') || '').trim().slice(0, 40);
  if (guest) {
    $('envHon').textContent = hon;
    $('envName').textContent = guest;
    $('wName').value = ((hon ? hon + ' ' : '') + guest).slice(0, 60);
  }

  /* ---------- តន្ត្រី ---------- */
  var au = $('music'), fab = $('musicFab');
  var PLAY = '<path d="M7 4l13 8-13 8z"/>', PAUSE = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  function sync() { var on = !au.paused; $('ppIcon').innerHTML = on ? PAUSE : PLAY; fab.classList.toggle('playing', on); }
  function toggle() { if (au.paused) au.play().catch(function () {}); else au.pause(); }
  au.addEventListener('play', sync);
  au.addEventListener('pause', sync);
  au.addEventListener('loadedmetadata', function () { $('tDur').textContent = fmt(au.duration); });
  au.addEventListener('timeupdate', function () {
    $('tCur').textContent = fmt(au.currentTime);
    if (au.duration) $('barFill').style.width = (au.currentTime / au.duration * 100) + '%';
  });
  $('ppBtn').onclick = toggle;
  fab.onclick = toggle;
  $('back10').onclick = function () { au.currentTime = Math.max(0, au.currentTime - 10); };
  $('fwd10').onclick = function () { if (au.duration) au.currentTime = Math.min(au.duration - 1, au.currentTime + 10); };
  $('bar').onclick = function (e) { var r = this.getBoundingClientRect(); if (au.duration) au.currentTime = (e.clientX - r.left) / r.width * au.duration; };

  /* ---------- បើកសំបុត្រ ---------- */
  $('openBtn').onclick = function () {
    $('cover').classList.add('gone');
    document.body.classList.remove('locked');
    fab.classList.add('on');
    au.play().catch(function () {});
  };

  /* ---------- រាប់ថយក្រោយ ---------- */
  var target = new Date('2026-11-21T13:00:00+07:00').getTime();
  var p2 = function (n) { return ('0' + n).slice(-2); };
  function tick() {
    var d = target - Date.now();
    if (d <= 0) {
      $('count').outerHTML = '<div class="count-done">Happily ever after</div><div class="date-km">ថ្ងៃមង្គលបានមកដល់ហើយ</div>';
      clearInterval(timer);
      return;
    }
    $('cD').textContent = p2(Math.floor(d / 864e5));
    $('cH').textContent = p2(Math.floor(d / 36e5) % 24);
    $('cM').textContent = p2(Math.floor(d / 6e4) % 60);
    $('cS').textContent = p2(Math.floor(d / 1e3) % 60);
  }
  var timer = setInterval(tick, 1000);
  tick();

  /* ---------- ចលនាពេល scroll ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- ពង្រីករូបភាព ---------- */
  var lb = $('lb'), lbi = lb.querySelector('img');
  function zoom(src) { lbi.src = src; lb.classList.add('on'); }
  document.addEventListener('click', function (e) {
    var z = e.target.closest('[data-zoom]');
    if (z) return zoom(z.getAttribute('data-zoom'));
    if (e.target.closest('#gallery img')) return zoom(e.target.src);
  });
  lb.onclick = function (e) { if (e.target !== lbi) lb.classList.remove('on'); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('on'); });

  /* ---------- សារជូនពរ (Supabase) ---------- */
  var list = $('wishList'), st = $('wStatus'), btn = $('wSend');
  var ready = !!(SUPABASE_URL && SUPABASE_KEY);
  var API = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/wishes';
  var HEAD = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' };
  var LINK_RE = /(https?:\/\/|www\.|t\.me\/|wa\.me\/|bit\.ly|\.(com|net|org|xyz|top|info|io|me|link|site|online|club|vip|cc|ly|app|shop|store|live|kh|asia|biz|co)\b)/i;

  function ago(iso) {
    var t = new Date(iso).getTime(), s = (Date.now() - t) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' នាទីមុន';
    if (s < 86400) return Math.round(s / 3600) + ' ម៉ោងមុន';
    return new Date(t).toLocaleDateString('en-GB');
  }
  function card(w, top) {
    var el = document.createElement('div'); el.className = 'w';
    var n = document.createElement('div'); n.className = 'n'; n.textContent = w.name || 'ភ្ញៀវកិត្តិយស';
    var m = document.createElement('div'); m.className = 'm'; m.textContent = w.message;
    var a = document.createElement('div'); a.className = 'ago'; a.textContent = ago(w.created_at);
    el.append(n, m, a);
    if (top) list.prepend(el); else list.append(el);
  }
  function say(t, err) { st.textContent = t; st.className = 'form-msg' + (err ? ' err' : ''); }

  if (ready) {
    fetch(API + '?select=name,message,created_at&order=created_at.desc&limit=100', { headers: HEAD })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { rows.forEach(function (w) { card(w, false); }); })
      .catch(function () {});
  }

  $('wishForm').onsubmit = function (e) {
    e.preventDefault();
    var name = $('wName').value.trim().slice(0, 60), msg = $('wMsg').value.trim().slice(0, 500);
    if (msg.length < 2) return say('សូមសរសេរពាក្យជូនពរ', true);
    if (LINK_RE.test(name + ' ' + msg)) return say('សូមកុំដាក់ link ក្នុងពាក្យជូនពរ', true);
    if (!ready) return say('មុខងារនេះមិនទាន់ដំណើរការ', true);
    var last = +sessionStorage.getItem('wishAt') || 0;
    if (Date.now() - last < 20000) return say('សូមរង់ចាំបន្តិច មុននឹងផ្ញើម្តងទៀត', true);

    btn.disabled = true; say('កំពុងផ្ញើ...');
    fetch(API, { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, HEAD), body: JSON.stringify({ name: name, message: msg }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (rows) {
        try { sessionStorage.setItem('wishAt', Date.now()); } catch (x) {}
        $('wMsg').value = '';
        card(rows[0] || { name: name, message: msg, created_at: new Date().toISOString() }, true);
        say('អរគុណសម្រាប់ពាក្យជូនពរ! 🌿');
      })
      .catch(function () { say('មានបញ្ហា សូមព្យាយាមម្តងទៀត', true); })
      .then(function () { btn.disabled = false; });
  };

  /* ---------- បង្កើត link ភ្ញៀវ (បើក index.html#link) ---------- */
  function maker() {
    if ($('maker')) return;
    var HON = ['', 'លោក', 'លោកស្រី', 'លោក លោកស្រី', 'អ្នកនាង', 'កញ្ញា', 'ឯកឧត្តម', 'លោកជំទាវ', 'ឯកឧត្តម លោកជំទាវ', 'លោកឧកញ៉ា', 'លោកគ្រូ', 'អ្នកគ្រូ', 'បងប្អូន', 'សម្លាញ់', 'Mr.', 'Ms.', 'Mr. & Mrs.'];
    var box = document.createElement('div'); box.id = 'maker';
    box.innerHTML = '<div class="box"><h3>បង្កើត link សម្រាប់ភ្ញៀវ</h3>' +
      '<label for="mkH">គោរមងារ</label><select id="mkH">' + HON.map(function (h) { return '<option value="' + h + '">' + (h || '— គ្មាន —') + '</option>'; }).join('') + '</select>' +
      '<label for="mkN">ឈ្មោះភ្ញៀវ</label><input id="mkN" maxlength="80" placeholder="ឧ. សុខ ចាន់ធី">' +
      '<label for="mkOut">សារអញ្ជើញ</label><textarea id="mkOut" rows="4" readonly></textarea>' +
      '<div class="row"><button class="btn solid" type="button" id="mkCopy">ចម្លង</button>' +
      '<button class="btn" type="button" id="mkShare" hidden>ចែករំលែក</button>' +
      '<button class="btn" type="button" id="mkClose">បិទ</button></div></div>';
    document.body.appendChild(box);
    function build() {
      var n = $('mkN').value.trim(), h = $('mkH').value, u = location.origin + location.pathname;
      if (n) u += '?to=' + encodeURIComponent(n) + (h ? '&h=' + encodeURIComponent(h) : '');
      $('mkOut').value = n ? 'សូមគោរពអញ្ជើញ ' + (h ? h + ' ' : '') + n + ' ចូលរួមពិធីមង្គលការរបស់យើងខ្ញុំ វ៉ាន ច័ន្ទគ្រឹស្នា & មិន ស្រីលក្ខ ថ្ងៃទី២១-២២ ខែវិច្ឆិកា ឆ្នាំ២០២៦ 🌿\n' + u : u;
    }
    $('mkN').oninput = build; $('mkH').onchange = build; build();
    $('mkCopy').onclick = function () {
      var t = $('mkOut').value;
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(
        function () { $('mkCopy').textContent = 'បានចម្លង ✓'; setTimeout(function () { $('mkCopy').textContent = 'ចម្លង'; }, 1500); },
        function () { $('mkOut').select(); document.execCommand('copy'); });
    };
    if (navigator.share) { $('mkShare').hidden = false; $('mkShare').onclick = function () { navigator.share({ text: $('mkOut').value }).catch(function () {}); }; }
    $('mkClose').onclick = function () { box.remove(); history.replaceState(null, '', location.pathname + location.search); };
    $('mkN').focus();
  }
  if (location.hash === '#link') maker();
  window.addEventListener('hashchange', function () { if (location.hash === '#link') maker(); });
})();
