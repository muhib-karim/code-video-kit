// code-video-kit gallery. Dependency-free; reads registry.json (and the
// optional render-times.json produced by the gallery workflow).
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  var grid = document.getElementById('grid');
  var chipsEl = document.getElementById('chips');
  var emptyEl = document.getElementById('empty');
  var statsEl = document.getElementById('stats');
  var measuredEl = document.getElementById('measured');
  var searchEl = document.getElementById('search');
  var liveEl = document.getElementById('live');

  var state = { components: [], groups: [], timings: {}, group: 'all', query: '' };

  // ---------- helpers ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;
        else node.setAttribute(key, value === true ? '' : String(value));
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function announce(message) {
    liveEl.textContent = '';
    window.setTimeout(function () {
      liveEl.textContent = message;
    }, 30);
  }

  function copyText(text, button) {
    var done = function () {
      var original = button.getAttribute('data-label') || button.textContent;
      button.setAttribute('data-label', original);
      button.textContent = 'Copied';
      button.setAttribute('data-state', 'copied');
      announce('Copied to clipboard');
      window.setTimeout(function () {
        button.textContent = original;
        button.removeAttribute('data-state');
      }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () {
        fallbackCopy(text) ? done() : announce('Copy failed, select the text manually');
      });
    } else if (fallbackCopy(text)) {
      done();
    } else {
      announce('Copy failed, select the text manually');
    }
  }

  function fallbackCopy(text) {
    var area = el('textarea', { readonly: true, 'aria-hidden': 'true' });
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  function fetchJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok) throw new Error(url + ': HTTP ' + res.status);
      return res.json();
    });
  }

  function seconds(c) {
    return (c.durationInFrames / c.fps).toFixed(1) + 's';
  }

  // ---------- URL state ----------
  function readURL() {
    var params = new URLSearchParams(window.location.search);
    state.group = params.get('group') || 'all';
    state.query = params.get('q') || '';
    searchEl.value = state.query;
  }

  function writeURL() {
    var params = new URLSearchParams();
    if (state.group !== 'all') params.set('group', state.group);
    if (state.query) params.set('q', state.query);
    var qs = params.toString();
    window.history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
  }

  // ---------- video playback ----------
  var playing = null;
  var playAttempt = 0;

  function ensureVideo(media) {
    var video = media.querySelector('video');
    if (video) return video;
    video = el('video', {
      muted: true,
      loop: true,
      playsinline: true,
      preload: 'auto',
      'aria-hidden': 'true',
      tabindex: '-1',
    });
    video.muted = true;
    video.src = media.getAttribute('data-src');
    video.addEventListener('error', function () {
      if (playing === media) stop(media);
    });
    media.appendChild(video);
    return video;
  }

  function play(media) {
    if (playing && playing !== media) stop(playing);
    var video = ensureVideo(media);
    var attempt = ++playAttempt;
    var p = video.play();
    if (p && p.catch) p.catch(function () {
      if (attempt === playAttempt && playing === media) stop(media);
    });
    media.setAttribute('data-playing', 'true');
    media.setAttribute('aria-pressed', 'true');
    media.querySelector('.play-label').textContent = 'Pause';
    playing = media;
  }

  function stop(media) {
    var video = media.querySelector('video');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    media.setAttribute('data-playing', 'false');
    media.setAttribute('aria-pressed', 'false');
    media.querySelector('.play-label').textContent = 'Play';
    if (playing === media) {
      playAttempt++;
      playing = null;
    }
  }

  // ---------- rendering ----------
  function renderChips() {
    chipsEl.innerHTML = '';
    var groups = [{ id: 'all', label: 'All' }].concat(state.groups);
    groups.forEach(function (g) {
      var count = g.id === 'all'
        ? state.components.length
        : state.components.filter(function (c) { return c.group === g.id; }).length;
      var chip = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(state.group === g.id), 'data-group': g.id }, [
        document.createTextNode(g.label),
        el('span', { class: 'count', text: String(count), 'aria-hidden': 'true' }),
      ]);
      chip.setAttribute('aria-label', g.label + ', ' + count + ' components');
      chip.addEventListener('click', function () {
        state.group = g.id;
        writeURL();
        renderChips();
        renderGrid();
      });
      chipsEl.appendChild(chip);
    });
  }

  function groupLabel(id) {
    var g = state.groups.find(function (x) { return x.id === id; });
    return g ? g.label : id;
  }

  function card(c) {
    var poster = 'media/' + c.id + '.png';
    var timing = state.timings[c.id];

    var media = el('button', {
      type: 'button',
      class: 'media',
      'data-src': 'media/' + c.id + '.mp4',
      'data-playing': 'false',
      'aria-pressed': 'false',
      'aria-label': 'Play preview of ' + c.title,
    });
    var img = el('img', {
      src: poster,
      alt: 'Poster frame of the ' + c.title + ' component',
      loading: 'lazy',
      decoding: 'async',
      width: '640',
      height: '360',
    });
    img.addEventListener('error', function () {
      img.remove();
      media.insertBefore(el('span', { class: 'placeholder', text: 'Preview renders in CI' }), media.firstChild);
    });
    media.appendChild(img);
    media.appendChild(
      el('span', { class: 'play', 'aria-hidden': 'true' }, [
        el('span', { html: '<svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z" fill="currentColor"/></svg>' }),
        el('span', { class: 'play-label', text: 'Play' }),
      ]),
    );

    media.addEventListener('click', function () {
      if (media.getAttribute('data-playing') === 'true') stop(media);
      else play(media);
    });
    if (canHover && !reduceMotion) {
      media.addEventListener('pointerenter', function () { play(media); });
      media.addEventListener('pointerleave', function () { stop(media); });
    }

    var meta = el('p', { class: 'meta' }, [
      el('span', { text: seconds(c) + ' · ' + c.durationInFrames + 'f' }),
      el('span', { text: c.width + '×' + c.height + ' @ ' + c.fps }),
      timing ? el('span', { text: timing.ms_per_frame + ' ms/frame', title: 'Measured render time on the CI runner' }) : null,
    ]);

    var codeId = 'usage-' + c.id;
    var copyBtn = el('button', { type: 'button', class: 'btn-copy', 'aria-label': 'Copy usage for ' + c.title, text: 'Copy' });
    copyBtn.addEventListener('click', function () { copyText(c.usage, copyBtn); });

    var usage = el('details', { class: 'usage' }, [
      el('summary', { text: 'Usage' }),
      el('div', { class: 'snippet' }, [el('pre', {}, [el('code', { id: codeId, text: c.usage })]), copyBtn]),
    ]);

    return el('article', { class: 'card', 'aria-labelledby': 'title-' + c.id }, [
      media,
      el('div', { class: 'body' }, [
        el('div', { class: 'title-row' }, [
          el('h3', { id: 'title-' + c.id, text: c.title }),
          el('span', { class: 'tag', text: groupLabel(c.group) }),
        ]),
        el('p', { class: 'desc', text: c.description }),
        meta,
        usage,
      ]),
    ]);
  }

  function matches(c) {
    if (state.group !== 'all' && c.group !== state.group) return false;
    if (!state.query) return true;
    var q = state.query.toLowerCase();
    return (c.title + ' ' + c.name + ' ' + c.description + ' ' + c.id).toLowerCase().indexOf(q) !== -1;
  }

  function renderGrid() {
    if (playing) stop(playing);
    var list = state.components.filter(matches);
    grid.innerHTML = '';
    grid.removeAttribute('aria-busy');
    list.forEach(function (c) { grid.appendChild(card(c)); });
    if (list.length === 0) {
      emptyEl.hidden = false;
      emptyEl.innerHTML = '';
      emptyEl.appendChild(el('strong', { text: 'No components match' }));
      emptyEl.appendChild(el('span', { text: 'Try another group or clear the search.' }));
    } else {
      emptyEl.hidden = true;
    }
    announce(list.length + ' of ' + state.components.length + ' components shown');
  }

  function showError(err) {
    grid.innerHTML = '';
    grid.removeAttribute('aria-busy');
    emptyEl.hidden = false;
    emptyEl.innerHTML = '';
    emptyEl.appendChild(el('strong', { text: 'The gallery registry is not available yet' }));
    var hint = el('span', {});
    hint.appendChild(document.createTextNode('It is generated by the gallery workflow. Locally, run '));
    hint.appendChild(el('code', { text: 'npm run build && npm run emit:registry && npm run render:all' }));
    hint.appendChild(document.createTextNode(' and serve this folder.'));
    emptyEl.appendChild(hint);
    if (window.console) console.error(err);
  }

  // ---------- boot ----------
  document.querySelectorAll('[data-copy-target]').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = document.getElementById(button.getAttribute('data-copy-target'));
      if (target) copyText(target.textContent.trim(), button);
    });
  });

  var searchTimer = null;
  searchEl.addEventListener('input', function () {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function () {
      state.query = searchEl.value.trim();
      writeURL();
      renderGrid();
    }, 120);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && playing) stop(playing);
    if (e.key === '/' && document.activeElement !== searchEl && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      searchEl.focus();
    }
  });

  readURL();

  Promise.all([
    fetchJSON('registry.json'),
    fetchJSON('render-times.json').catch(function () { return null; }),
  ])
    .then(function (results) {
      var registry = results[0];
      var times = results[1];
      state.components = registry.components || [];
      state.groups = registry.groups || [];
      if (!state.groups.some(function (g) { return g.id === state.group; })) state.group = 'all';
      if (times && Array.isArray(times.results)) {
        times.results.forEach(function (r) { state.timings[r.id] = r; });
        if (times.runner) {
          measuredEl.textContent = 'Previews rendered on ' + times.runner.cpu + ' (' + times.runner.cores + ' cores)';
        }
      }
      statsEl.textContent =
        state.components.length + ' components · ' + state.groups.length + ' groups · 1280×720 @ 30 fps · ' +
        (reduceMotion ? 'click a preview to play' : canHover ? 'hover or click a preview to play' : 'tap a preview to play');
      renderChips();
      renderGrid();
    })
    .catch(showError);
})();
