(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ---------- Small helpers ---------- */
  var STOP = {};
  ('a an and the of to in on for with is are how what why your my you i it at by from or as be this that can do does vs').split(' ')
    .forEach(function (w) { STOP[w] = true; });
  var SMALL = { a: 1, an: 1, and: 1, the: 1, of: 1, to: 1, in: 1, on: 1, for: 1, with: 1, or: 1, at: 1, by: 1, vs: 1 };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function unique(arr) {
    var seen = {}, out = [];
    arr.forEach(function (x) {
      x = clean(x);
      var k = x.toLowerCase();
      if (x && !seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  }

  function splitList(s, sep) { return unique(String(s || '').split(sep)); }

  function sigWords(s) {
    var words = clean(s).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, ' ').split(' ');
    return unique(words.filter(function (w) { return w.length > 2 && !STOP[w]; }));
  }

  function titleCase(s) {
    return clean(s).split(' ').map(function (w, i) {
      var l = w.toLowerCase();
      if (i > 0 && SMALL[l]) { return l; }
      return l.charAt(0).toUpperCase() + l.slice(1);
    }).join(' ');
  }

  function ensureEnd(s) {
    s = clean(s);
    return /[.!?]$/.test(s) ? s : s + '.';
  }

  function setError(form, msg) {
    var e = $('.form-error', form);
    if (e) { e.textContent = msg || ''; }
  }

  function flash(el, msg) {
    if (!el) { return; }
    el.textContent = msg;
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.textContent = ''; }, 2500);
  }

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return fallbackCopy(text); }
      );
    }
    return Promise.resolve(fallbackCopy(text));
  }

  /* ---------- Menu, year, copy buttons ---------- */
  function initChrome() {
    var toggle = $('.nav-toggle'), nav = $('#site-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    var y = $('#year');
    if (y) { y.textContent = new Date().getFullYear(); }

    $all('[data-copy-target]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.getElementById(btn.getAttribute('data-copy-target'));
        var status = document.getElementById(btn.getAttribute('data-status'));
        if (!target || !target.value) { flash(status, 'Nothing to copy yet'); return; }
        copyText(target.value).then(function (ok) {
          flash(status, ok ? 'Copied!' : 'Select the text and press Ctrl+C');
        });
      });
    });
  }

  /* ---------- 1. Tag generator ---------- */
  function buildTags(topic, extras) {
    var y = new Date().getFullYear();
    var mods = ['tutorial', 'for beginners', 'tips', 'guide', 'explained', 'step by step', 'ideas', 'review', 'basics', 'mistakes'];
    var tags = [topic];
    extras.forEach(function (x) { tags.push(x); });
    mods.forEach(function (m) { tags.push(topic + ' ' + m); });
    tags.push('how to ' + topic, 'best ' + topic, 'learn ' + topic, topic + ' ' + y);
    extras.forEach(function (x) { tags.push(topic + ' ' + x); });
    var words = sigWords(topic);
    if (words.length > 1) { words.forEach(function (w) { tags.push(w); }); }
    return unique(tags);
  }

  function fitToLimit(tags, limit) {
    var out = [], len = 0;
    for (var i = 0; i < tags.length; i++) {
      var add = tags[i].length + (out.length ? 2 : 0);
      if (len + add > limit) { continue; }
      out.push(tags[i]);
      len += add;
    }
    return out;
  }

  function initTags() {
    var form = $('#tag-form');
    if (!form) { return; }
    var out = $('#tag-output'), count = $('#tag-count');

    function updateCount() {
      var n = out.value.length;
      var tagCount = out.value.split(',').filter(function (t) { return clean(t); }).length;
      count.textContent = tagCount + ' tags · ' + n + ' / 500 characters';
      count.classList.toggle('warn', n > 500);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var topic = clean($('#tag-topic').value).toLowerCase();
      if (!topic) { setError(form, 'Please enter a topic or main keyword first.'); return; }
      setError(form, '');
      var extras = splitList($('#tag-extra').value.toLowerCase(), /[,\n]/);
      out.value = fitToLimit(buildTags(topic, extras), 450).join(', ');
      $('#tag-result').hidden = false;
      updateCount();
    });
    out.addEventListener('input', updateCount);
  }

  /* ---------- 2. Title generator ---------- */
  var TITLE_TEMPLATES = [
    'How to {T} (Step-by-Step for Beginners)',
    'How to {T} in {Y}: A Simple Guide',
    '{T} Explained Simply',
    'The Beginner\'s Guide to {T}',
    '{T} Tutorial: Start Here',
    '{N} {T} Tips You Should Know',
    '{N} Common {T} Mistakes to Avoid',
    '{N} Things I Wish I Knew About {T}',
    '{T} Mistakes Beginners Make (and How to Fix Them)',
    'Is {T} Worth It? A Honest Look',
    'What Is {T}? A Quick Explanation',
    '{T} for {A}: Where to Start',
    'Best {T} Ideas for {A}',
    '{T} for {A}: {N} Simple Tips',
    '{T}: What to Know Before You Start',
    'Stop Making This {T} Mistake'
  ];

  function renderTitles(list, container) {
    container.innerHTML = '';
    list.forEach(function (t, i) {
      var li = document.createElement('li');
      li.className = 'title-item';

      var input = document.createElement('input');
      input.type = 'text';
      input.value = t;
      input.maxLength = 100;
      input.setAttribute('aria-label', 'Title suggestion ' + (i + 1) + ' (editable)');

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline btn-small';
      btn.textContent = 'Copy';

      var meta = document.createElement('span');
      meta.className = 'char-count';

      function update() {
        var n = input.value.length;
        meta.textContent = n + ' characters' + (n > 60 ? ' · may be shortened in search results' : '');
        meta.classList.toggle('warn', n > 60);
      }
      input.addEventListener('input', update);
      btn.addEventListener('click', function () {
        copyText(input.value).then(function (ok) {
          btn.textContent = ok ? 'Copied!' : 'Press Ctrl+C';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1800);
        });
      });

      update();
      li.appendChild(input);
      li.appendChild(btn);
      li.appendChild(meta);
      container.appendChild(li);
    });
  }

  function initTitles() {
    var form = $('#title-form');
    if (!form) { return; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var topic = clean($('#title-topic').value);
      if (!topic) { setError(form, 'Please enter your video topic first.'); return; }
      setError(form, '');
      var audience = clean($('#title-audience').value);
      var num = parseInt($('#title-number').value, 10);
      var hasNum = !isNaN(num) && num > 0 && num < 100;
      var year = String(new Date().getFullYear());

      var titles = TITLE_TEMPLATES.filter(function (t) {
        if (t.indexOf('{A}') > -1 && !audience) { return false; }
        if (t.indexOf('{N}') > -1 && !hasNum) { return false; }
        return true;
      }).map(function (t) {
        return t.replace(/\{T\}/g, titleCase(topic))
          .replace(/\{A\}/g, titleCase(audience))
          .replace(/\{N\}/g, String(num))
          .replace(/\{Y\}/g, year);
      });

      renderTitles(unique(titles), $('#title-list'));
      $('#title-result').hidden = false;
    });
  }

  /* ---------- 3. Description generator ---------- */
  function makeTag(str) {
    var t = String(str).toLowerCase().replace(/[^\p{L}\p{N}_]+/gu, '');
    return (t && !/^\d+$/.test(t)) ? '#' + t : '';
  }

  function initDescription() {
    var form = $('#desc-form');
    if (!form) { return; }
    var out = $('#desc-output'), count = $('#desc-count');

    function updateCount() {
      var n = out.value.length;
      count.textContent = n + ' / 5,000 characters';
      count.classList.toggle('warn', n > 5000);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = clean($('#desc-title').value);
      var about = clean($('#desc-about').value);
      if (!title || !about) { setError(form, 'Please fill in the video title and a one-sentence summary.'); return; }
      setError(form, '');

      var points = splitList($('#desc-points').value, /\n/);
      var links = splitList($('#desc-links').value, /\n/);
      var channel = clean($('#desc-channel').value);

      var lines = [title, '', ensureEnd(about)];
      if (points.length) {
        lines.push('', 'In this video:');
        points.forEach(function (p) { lines.push('• ' + p); });
      }
      if ($('#desc-ts').checked) {
        lines.push('', 'Timestamps:', '00:00 Intro', '[mm:ss] Add your section title', '[mm:ss] Add your section title', '[mm:ss] Wrap-up');
      }
      if (links.length) {
        lines.push('', 'Links:');
        links.forEach(function (l) { lines.push(l); });
      }
      lines.push('', channel
        ? 'Thanks for watching! Subscribe to ' + channel + ' for more videos like this.'
        : 'Thanks for watching! Subscribe for more videos like this.');
      if ($('#desc-hash').checked) {
        var tags = unique(sigWords(title).map(makeTag).filter(Boolean)).slice(0, 3);
        if (tags.length) { lines.push('', tags.join(' ')); }
      }

      out.value = lines.join('\n');
      $('#desc-result').hidden = false;
      updateCount();
    });
    out.addEventListener('input', updateCount);
  }

  /* ---------- 4. Hashtag generator ---------- */
  function initHashtags() {
    var form = $('#hash-form');
    if (!form) { return; }
    var out = $('#hash-output'), note = $('#hash-note');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var topic = clean($('#hash-topic').value);
      if (!topic) { setError(form, 'Please enter a topic first.'); return; }
      setError(form, '');

      var extras = splitList($('#hash-extra').value, /[,\n]/);
      var limit = parseInt($('#hash-count').value, 10) || 5;
      var words = sigWords(topic);
      var cands = [makeTag(topic)];
      extras.forEach(function (x) { cands.push(makeTag(x)); });
      cands.push(makeTag(topic + ' tips'), makeTag(topic + ' tutorial'), makeTag('learn ' + topic), makeTag(topic + ' for beginners'));
      words.forEach(function (w) { cands.push(makeTag(w)); });

      var tags = unique(cands.filter(Boolean)).slice(0, limit);
      out.value = tags.join(' ');
      note.textContent = tags.length + ' hashtags. ' + (tags.length > 3
        ? 'YouTube shows only the first 3 above your title. Put your most important ones first.'
        : 'These will appear above your video title.');
      $('#hash-result').hidden = false;
    });
  }

  /* ---------- 5. Keyword ideas ---------- */
  var KW_GROUPS = [
    { name: 'Question ideas', items: ['how to {k}', 'what is {k}', 'how does {k} work', 'why is {k} important', 'is {k} worth it', 'can beginners learn {k}', 'where to start with {k}', 'when to use {k}'] },
    { name: 'Topic angles', items: ['{k} for beginners', '{k} tutorial', '{k} tips', '{k} ideas', '{k} mistakes', '{k} step by step', '{k} explained', '{k} examples', '{k} checklist', '{k} basics'] },
    { name: 'Comparison and review ideas', items: ['best {k}', '{k} alternatives', '{k} review', '{k} pros and cons', '{k} compared', 'top {k} tips'] }
  ];

  function searchLink(phrase) {
    var a = document.createElement('a');
    a.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(phrase);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = 'Check ↗';
    a.setAttribute('aria-label', 'Search YouTube for ' + phrase + ' (opens in a new tab)');
    return a;
  }

  function renderGroup(container, name, phrases) {
    var wrap = document.createElement('div');
    wrap.className = 'kw-group';
    var h = document.createElement('h3');
    h.textContent = name;
    var ul = document.createElement('ul');
    ul.className = 'kw-list';
    phrases.forEach(function (p) {
      var li = document.createElement('li');
      li.appendChild(document.createTextNode(p));
      li.appendChild(searchLink(p));
      ul.appendChild(li);
    });
    wrap.appendChild(h);
    wrap.appendChild(ul);
    container.appendChild(wrap);
  }

  function initKeywords() {
    var form = $('#kw-form');
    if (!form) { return; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var seed = clean($('#kw-seed').value).toLowerCase();
      if (!seed) { setError(form, 'Please enter a seed keyword first.'); return; }
      setError(form, '');

      var container = $('#kw-groups');
      container.innerHTML = '';
      var all = [];

      KW_GROUPS.forEach(function (g) {
        var phrases = g.items.map(function (t) { return t.replace(/\{k\}/g, seed); });
        all = all.concat(phrases);
        renderGroup(container, g.name, phrases);
      });

      var letters = 'abcdefghijklmnopqrstuvwxyz'.split('').map(function (l) { return seed + ' ' + l; });
      all = all.concat(letters);
      renderGroup(container, 'Alphabet prompts (type these into YouTube search and see what it suggests)', letters);

      $('#kw-all').value = unique(all).join('\n');
      $('#kw-result').hidden = false;
    });
  }

  /* ---------- Start ---------- */
  initChrome();
  initTags();
  initTitles();
  initDescription();
  initHashtags();
  initKeywords();
})();
