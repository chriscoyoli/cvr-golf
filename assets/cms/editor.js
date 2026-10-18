/*
 * Golf Academy page editor.
 * Edits the content file, shows it live in the real page template, and saves
 * previews / publishes through the GitHub API.
 */
(function () {
  'use strict';

  var CMS = window.CVRCMS;

  /* ======================================================================
   * DOM helpers
   * ==================================================================== */

  function el(tag, props) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
      else if (k === 'style') node.style.cssText = v;
      else if (k in node && typeof v !== 'string') node[k] = v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }
  function append(node, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(node, c); }); return; }
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }

  var ICON = {
    hero: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1.5"/></svg>',
    anchorMenu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h4M10 7h4M16 7h4M4 13h16M4 17h10"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 10h16M4 14h16M4 18h10"/></svg>',
    heading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16M18 4v16M6 12h12"/></svg>',
    tabs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h6V5h6v3h6v11H3z"/><path d="M7 13h10M7 16h6"/></svg>',
    carousel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="9" height="14" rx="1.5"/><path d="M15 8h6M15 12h6M15 16h4"/></svg>',
    bio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    bold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/></svg>',
    italic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 5h-4M14 19h-4M14 5l-4 14"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    unlink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.8 13.4 20.5 11.7a5 5 0 0 0-7-7L11.8 6.4M5.2 10.6 3.5 12.3a5 5 0 0 0 7 7l1.7-1.7M8 16l8-8"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V5h14v2M11 5l-3 14M7 19h6M15 15l5 5M20 15l-5 5"/></svg>'
  };
  function icon(name) { return el('span', { html: ICON[name], 'aria-hidden': 'true', style: 'display:contents' }); }

  /* ======================================================================
   * State
   * ==================================================================== */

  var state = {
    repo: null,
    content: null,
    source: { kind: 'published', slug: '', name: '' },
    savedSnapshot: '',
    dirty: false,
    open: {},          // block index -> true
    activeTab: {},     // block index -> tab index being edited
    openRow: {},       // "b-t-r" -> true
    previewReady: false,
    device: 'desktop'
  };

  var TYPE = {
    hero: { kind: 'Top banner' },
    anchorMenu: { kind: 'Jump links' },
    text: { kind: 'Text' },
    heading: { kind: 'Section heading' },
    tabs: { kind: 'Programs and prices' },
    carousel: { kind: 'Feature' },
    bio: { kind: 'Team member' }
  };

  function workKey() {
    var r = state.repo || {};
    return 'cvrcms:work:' + (r.owner || 'local') + '/' + (r.repo || 'site');
  }

  /* ======================================================================
   * Toasts and dialogs
   * ==================================================================== */

  function toast(message, opts) {
    opts = opts || {};
    var t = el('div', { class: 'toast' + (opts.error ? ' err' : '') },
      opts.spinner ? el('span', { class: 'spinner' }) : null,
      el('span', { text: message }),
      (opts.actions || []).map(function (a) {
        return el('button', { type: 'button', text: a.label, on: { click: function () { a.run(); dismiss(); } } });
      }));
    function dismiss() { if (t.parentNode) t.parentNode.removeChild(t); }
    $('#toasts').appendChild(t);
    if (!opts.sticky) setTimeout(dismiss, opts.ms || (opts.error ? 7000 : 3200));
    return { el: t, dismiss: dismiss, set: function (msg) { t.querySelector('span:not(.spinner)').textContent = msg; } };
  }

  function modal(build) {
    var root = $('#modalRoot');
    var prevFocus = document.activeElement;
    var box = el('div', { class: 'modal-box', role: 'dialog', 'aria-modal': 'true' });
    var wrap = el('div', { class: 'modal', on: { mousedown: function (e) { if (e.target === wrap) close(); } } }, box);
    function close() {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      document.removeEventListener('keydown', onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    build(box, close);
    root.appendChild(wrap);
    var first = box.querySelector('input:not([type=hidden]), button.btn-primary, button.btn-accent, button');
    if (first) setTimeout(function () { first.focus(); if (first.select && first.tagName === 'INPUT') first.select(); }, 20);
    return close;
  }

  function confirmBox(opts) {
    return new Promise(function (resolve) {
      modal(function (box, close) {
        append(box, [
          el('h2', { text: opts.title }),
          el('p', { class: 'lead', text: opts.text }),
          opts.extra || null,
          el('div', { class: 'modal-actions' },
            el('button', { class: 'btn', type: 'button', text: opts.cancel || 'Cancel', on: { click: function () { close(); resolve(false); } } }),
            el('button', { class: 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary'), type: 'button', text: opts.ok || 'OK', on: { click: function () { close(); resolve(true); } } }))
        ]);
      });
    });
  }

  function ghMessage(err) {
    var name = state.repo ? state.repo.owner + '/' + state.repo.repo : 'the repository';
    if (!err || !err.status) return 'Could not reach GitHub. Check your internet connection and try again.';
    if (err.status === 401) return 'GitHub did not accept the access key. It may have expired. Open Settings to add a new one.';
    if (err.status === 403 || err.status === 404) return 'This access key cannot save to ' + name + '. Open Settings to check it.';
    if (err.status === 409) return 'Someone else saved at the same moment. Please try again.';
    if (err.status === 422) return 'GitHub rejected the save: ' + err.message;
    return 'GitHub error (' + err.status + '): ' + err.message;
  }

  /* ======================================================================
   * Change tracking, autosave, preview sync
   * ==================================================================== */

  function updateDocState() {
    $('#docKind').textContent = state.source.kind === 'draft' ? 'Preview' : 'Published';
    $('#docName').textContent = state.source.kind === 'draft' ? state.source.name : 'Golf Academy page';
    $('#docDirty').hidden = !state.dirty;
    $('#btnDiscard').hidden = !state.dirty;
    $('#stageNote').textContent = state.dirty ? 'Live preview (unsaved)' : 'Live preview';
    document.title = (state.dirty ? '• ' : '') + 'Golf Academy Page Editor';
  }

  var persistWork = debounce(function () {
    try {
      localStorage.setItem(workKey(), JSON.stringify({ content: state.content, source: state.source, at: Date.now() }));
    } catch (e) {
      if (!persistWork.warned) {
        persistWork.warned = true;
        toast('New photos are too large to keep if you close this tab. Share or publish to save them.', { ms: 8000 });
      }
    }
  }, 400);

  function clearWork() { try { localStorage.removeItem(workKey()); } catch (e) { /* ignore */ } }

  function changed(opts) {
    opts = opts || {};
    state.dirty = JSON.stringify(state.content) !== state.savedSnapshot;
    updateDocState();
    persistWork();
    if (!state.dirty) clearWork();
    schedulePreview(opts);
  }

  var pendingFocus = null;
  var sendPreview = debounce(function () {
    var frame = $('#preview');
    if (!state.previewReady || !frame.contentWindow) return;
    frame.contentWindow.postMessage({
      type: 'cms:render',
      content: state.content,
      focusTab: pendingFocus && pendingFocus.focusTab,
      scrollTo: pendingFocus && pendingFocus.scrollTo,
      highlight: pendingFocus && pendingFocus.highlight
    }, window.location.origin);
    pendingFocus = null;
  }, 120);

  function schedulePreview(opts) {
    if (opts && (opts.focusTab || typeof opts.scrollTo === 'number' || typeof opts.highlight === 'number')) {
      pendingFocus = Object.assign(pendingFocus || {}, opts);
    }
    sendPreview();
  }

  function tabGroupIndex(blockIndex) {
    var n = 0;
    for (var i = 0; i < blockIndex; i++) if (state.content.blocks[i].type === 'tabs') n++;
    return n;
  }

  function scrollPreviewTo(blockIndex) {
    var frame = $('#preview');
    if (state.previewReady && frame.contentWindow) {
      frame.contentWindow.postMessage({ type: 'cms:scrollTo', block: blockIndex }, window.location.origin);
    }
  }

  /* ======================================================================
   * Field components
   * ==================================================================== */

  function field(label, control, opts) {
    opts = opts || {};
    var id = 'f' + Math.random().toString(36).slice(2, 9);
    if (control && control.tagName && /INPUT|TEXTAREA|SELECT/.test(control.tagName)) control.id = id;
    return el('div', { class: 'field' },
      el('label', { for: id }, el('span', { text: label }), opts.optional ? el('span', { class: 'opt', text: 'Optional' }) : null),
      control,
      opts.hint ? el('div', { class: 'hint', text: opts.hint }) : null);
  }

  function textInput(obj, key, opts) {
    opts = opts || {};
    var input = el('input', {
      class: 'input' + (opts.big ? ' input-big' : ''), type: 'text', value: obj[key] || '',
      placeholder: opts.placeholder || '', spellcheck: true,
      on: {
        input: function () { obj[key] = input.value; if (opts.onInput) opts.onInput(input.value); changed(opts.change && opts.change()); },
        blur: function () {
          if (opts.normalize) {
            var v = opts.normalize(input.value);
            if (v !== input.value) { input.value = v; obj[key] = v; changed(opts.change && opts.change()); }
          }
        }
      }
    });
    return input;
  }

  function linesInput(obj, key, opts) {
    opts = opts || {};
    var ta = el('textarea', {
      class: 'textarea', rows: Math.max(2, String(obj[key] || '').split('\n').length), spellcheck: true,
      placeholder: opts.placeholder || '',
      on: { input: function () { obj[key] = ta.value; changed(opts.change && opts.change()); } }
    });
    ta.value = obj[key] || '';
    return ta;
  }

  var paragraphSeparatorSet = false;
  function richInput(obj, key, opts) {
    opts = opts || {};
    if (!paragraphSeparatorSet) {
      try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* ignore */ }
      paragraphSeparatorSet = true;
    }
    var area = el('div', {
      class: 'rte-area', contenteditable: 'true', role: 'textbox', 'aria-multiline': 'true',
      'data-placeholder': opts.placeholder || 'Type here', spellcheck: 'true'
    });
    area.innerHTML = obj[key] || '';
    var savedRange = null;

    function sync() {
      var html = CMS.sanitizeRich(area.innerHTML);
      if (!area.textContent.trim()) html = '';
      obj[key] = html;
      changed(opts.change && opts.change());
      refreshState();
    }
    function cmd(name, value) {
      area.focus();
      document.execCommand(name, false, value);
      sync();
    }
    function refreshState() {
      $$('[data-cmd]', bar).forEach(function (b) {
        var c = b.getAttribute('data-cmd');
        var on = false;
        try { on = (c === 'bold' || c === 'italic' || c === 'insertUnorderedList') && document.queryCommandState(c); } catch (e) { /* ignore */ }
        b.classList.toggle('on', !!on && document.activeElement === area);
      });
    }
    function tool(cmdName, label, iconName, handler) {
      return el('button', {
        type: 'button', 'data-cmd': cmdName, title: label, 'aria-label': label,
        on: { mousedown: function (e) { e.preventDefault(); }, click: handler || function () { cmd(cmdName); } }
      }, icon(iconName));
    }

    var linkRow = el('div', { class: 'rte-link', hidden: true });
    var linkInput = el('input', { class: 'input', type: 'text', placeholder: 'Web address, email or phone number' });
    append(linkRow, [
      linkInput,
      el('button', { class: 'btn btn-small btn-primary', type: 'button', text: 'Add link', on: { click: applyLink } }),
      el('button', { class: 'btn btn-small', type: 'button', text: 'Cancel', on: { click: function () { linkRow.hidden = true; area.focus(); } } })
    ]);
    linkInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } });
    function openLink() {
      var sel = window.getSelection();
      if (!sel.rangeCount || !area.contains(sel.anchorNode) || sel.isCollapsed) {
        toast('Select the words you want to turn into a link first.');
        return;
      }
      savedRange = sel.getRangeAt(0).cloneRange();
      linkInput.value = '';
      linkRow.hidden = false;
      linkInput.focus();
    }
    function applyLink() {
      var url = normalizeLink(linkInput.value);
      linkRow.hidden = true;
      if (!url || !savedRange) { area.focus(); return; }
      area.focus();
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      cmd('createLink', url);
    }

    var bar = el('div', { class: 'rte-bar' },
      tool('bold', 'Bold', 'bold'),
      tool('italic', 'Italic', 'italic'),
      el('span', { class: 'sep' }),
      tool('insertUnorderedList', 'Bulleted list', 'list'),
      tool('createLink', 'Link', 'link', openLink),
      tool('unlink', 'Remove link', 'unlink'),
      tool('removeFormat', 'Clear formatting', 'eraser'),
      el('span', { class: 'rte-tip', text: 'Shift+Enter: line break' }));

    area.addEventListener('input', sync);
    area.addEventListener('keyup', refreshState);
    area.addEventListener('mouseup', refreshState);
    area.addEventListener('blur', function () { setTimeout(refreshState, 0); });
    area.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
    area.addEventListener('drop', function (e) { e.preventDefault(); });

    return el('div', { class: 'rte' }, bar, linkRow, area);
  }

  function normalizeLink(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    if (/^(https?:|mailto:|tel:|#|\/)/i.test(v)) return v;
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'mailto:' + v;
    if (/^\+?[\d\s().-]{7,}$/.test(v)) return 'tel:' + v.replace(/[^\d+]/g, '');
    if (/^[\w-]+(\.[\w-]+)+/.test(v)) return 'https://' + v;
    return v;
  }

  /* ---------- Images ---------- */

  function readAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('That file could not be opened as a photo.')); };
      img.src = src;
    });
  }

  /* Shrinks very large photos so the page stays fast. Returns a data URL. */
  function prepareImage(file, maxWidth) {
    if (!/^image\//.test(file.type)) return Promise.reject(new Error('Please choose a photo (JPG, PNG, WebP or GIF).'));
    return readAsDataURL(file).then(function (dataUrl) {
      if (/svg|gif/.test(file.type)) return { url: dataUrl, width: 0, height: 0 };
      return loadImage(dataUrl).then(function (img) {
        var w = img.naturalWidth, h = img.naturalHeight;
        var keepPng = file.type === 'image/png' && file.size < 1500000;
        if (w <= maxWidth && file.size < 900000 && !/heic|heif/.test(file.type)) return { url: dataUrl, width: w, height: h };
        var scale = Math.min(1, maxWidth / w);
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        var ctx = canvas.getContext('2d');
        if (!keepPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch); }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, cw, ch);
        return { url: canvas.toDataURL(keepPng ? 'image/png' : 'image/jpeg', 0.86), width: cw, height: ch };
      });
    });
  }

  function imageField(obj, key, altKey, opts) {
    opts = opts || {};
    var img = el('img', { alt: '' });
    var badge = el('span', { class: 'img-badge', hidden: true });
    var thumb = el('div', { class: 'img-thumb' }, img, badge);
    var warn = el('div', { class: 'hint warn', hidden: true });
    var fileInput = el('input', { type: 'file', accept: 'image/*', hidden: true });

    function showThumb() {
      var src = obj[key] || '';
      img.src = src;
      img.onerror = function () {
        img.onerror = null;
        if (/^uploads\//.test(src) && state.repo) { var raw = CMS.rawUrl(state.repo, src); if (raw) img.src = raw; }
      };
      badge.hidden = !/^data:/.test(src);
      badge.textContent = 'New, not saved yet';
    }
    showThumb();

    function takeFile(file) {
      if (!file) return;
      var t = toast('Preparing photo', { spinner: true, sticky: true });
      prepareImage(file, opts.maxWidth || 2400).then(function (res) {
        t.dismiss();
        obj[key] = res.url;
        if (altKey && !obj[altKey]) {
          obj[altKey] = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ');
          if (altInput) altInput.value = obj[altKey];
        }
        showThumb();
        if (opts.minWidth && res.width && res.width < opts.minWidth) {
          warn.textContent = 'This photo is ' + res.width + ' px wide. At least ' + opts.minWidth + ' px looks sharper here.';
          warn.hidden = false;
        } else warn.hidden = true;
        changed(opts.change && opts.change());
      }).catch(function (err) { t.dismiss(); toast(err.message, { error: true }); });
    }

    fileInput.addEventListener('change', function () { takeFile(fileInput.files[0]); fileInput.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) {
      thumb.addEventListener(ev, function (e) { e.preventDefault(); thumb.classList.add('is-drop'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      thumb.addEventListener(ev, function (e) { e.preventDefault(); thumb.classList.remove('is-drop'); });
    });
    thumb.addEventListener('drop', function (e) { takeFile(e.dataTransfer.files[0]); });

    var altInput = altKey ? textInput(obj, altKey, { placeholder: 'Describe the photo', change: opts.change }) : null;

    return el('div', { class: 'field' },
      el('div', { class: 'field-label' }, el('span', { text: opts.label || 'Photo' })),
      el('div', { class: 'img-field' },
        thumb,
        el('div', { class: 'img-actions' },
          el('button', { class: 'btn btn-small', type: 'button', text: 'Replace photo', on: { click: function () { fileInput.click(); } } }),
          el('div', { class: 'hint', text: opts.hint || 'Drag a photo onto the thumbnail or click Replace.' }),
          fileInput)),
      warn,
      altInput ? field('Photo description', altInput, { hint: 'Read aloud by screen readers. One short sentence.' }) : null);
  }

  /* ---------- Buttons list ---------- */

  function buttonsField(owner, opts) {
    opts = opts || {};
    if (!owner.buttons) owner.buttons = [];
    var wrap = el('div', { class: 'field' });
    function draw() {
      wrap.innerHTML = '';
      append(wrap, el('div', { class: 'field-label' }, el('span', { text: 'Buttons' }), el('span', { class: 'opt', text: 'Optional' })));
      owner.buttons.forEach(function (b, i) {
        var style = el('select', {
          class: 'select', 'aria-label': 'Button style',
          on: { change: function () { b.style = style.value; changed(opts.change && opts.change()); } }
        }, el('option', { value: 'solid', text: 'Filled' }), el('option', { value: 'hollow', text: 'Outline' }));
        style.value = b.style === 'hollow' ? 'hollow' : 'solid';
        var labelIn = textInput(b, 'label', { placeholder: 'Button text', change: opts.change });
        labelIn.setAttribute('aria-label', 'Button text');
        var linkIn = textInput(b, 'link', { placeholder: 'Email, phone or web address', normalize: normalizeLink, change: opts.change });
        linkIn.setAttribute('aria-label', 'Button link');
        var newTab = el('input', { type: 'checkbox', checked: !!b.newTab, on: { change: function () { b.newTab = newTab.checked; changed(opts.change && opts.change()); } } });
        append(wrap, el('div', { class: 'btnlist-item' },
          labelIn, linkIn,
          el('button', {
            class: 'mini danger', type: 'button', title: 'Remove button', 'aria-label': 'Remove button',
            on: { click: function () { owner.buttons.splice(i, 1); draw(); changed(opts.change && opts.change()); } }
          }, icon('trash')),
          el('div', { class: 'btnlist-extra' }, style, el('label', { class: 'check' }, newTab, 'Open in a new tab'))));
      });
      append(wrap, el('button', {
        class: 'add-row', type: 'button',
        on: { click: function () { owner.buttons.push({ label: 'New button', link: '', style: owner.buttons.length ? 'hollow' : 'solid', newTab: false }); draw(); changed(opts.change && opts.change()); } }
      }, icon('plus'), 'Add a button'));
      append(wrap, el('div', { class: 'hint', text: 'Type an email address or phone number and it becomes an email or call button.' }));
    }
    draw();
    return wrap;
  }

  /* ======================================================================
   * Block cards
   * ==================================================================== */

  function cardTitle(b) {
    if (b.type === 'bio') return b.name || 'Team member';
    if (b.type === 'heading') return b.text || 'Heading';
    if (b.type === 'hero') return b.heading || 'Top banner';
    return b.label || TYPE[b.type].kind;
  }

  function renderCards() {
    var host = $('#cards');
    var scroll = $('#panel').scrollTop;
    host.innerHTML = '';
    state.content.blocks.forEach(function (b, i) {
      if (!TYPE[b.type]) return;
      host.appendChild(blockCard(b, i));
    });
    host.appendChild(pageCard());
    $('#panel').scrollTop = scroll;
  }

  function blockCard(b, i) {
    var open = !!state.open[i];
    var titleEl = el('span', { class: 'card-title', text: cardTitle(b) });
    var body = el('div', { class: 'card-body' });
    var card = el('section', { class: 'card' + (open ? ' is-open' : ''), 'data-block': i },
      el('button', {
        class: 'card-head', type: 'button', 'aria-expanded': open ? 'true' : 'false',
        on: {
          click: function () {
            state.open[i] = !state.open[i];
            if (state.open[i]) {
              card.classList.add('is-open');
              this.setAttribute('aria-expanded', 'true');
              fill();
              body.hidden = false;
              scrollPreviewTo(i);
            } else {
              card.classList.remove('is-open');
              this.setAttribute('aria-expanded', 'false');
              body.hidden = true;
            }
          }
        }
      },
        el('span', { class: 'card-icon' }, icon(b.type)),
        el('span', { class: 'card-titles' }, el('span', { class: 'card-kind', text: TYPE[b.type].kind }), titleEl),
        el('span', { class: 'card-chev' }, icon('chev'))),
      body);
    body.hidden = !open;

    function retitle() { titleEl.textContent = cardTitle(b); }
    function fill() {
      body.innerHTML = '';
      append(body, editors[b.type](b, i, retitle));
    }
    if (open) fill();
    return card;
  }

  function pageCard() {
    var open = !!state.open.page;
    var body = el('div', { class: 'card-body', hidden: !open });
    var card = el('section', { class: 'card' + (open ? ' is-open' : '') },
      el('button', {
        class: 'card-head', type: 'button', 'aria-expanded': open ? 'true' : 'false',
        on: { click: function () { state.open.page = !state.open.page; renderCards(); } }
      },
        el('span', { class: 'card-icon' }, icon('page')),
        el('span', { class: 'card-titles' }, el('span', { class: 'card-kind', text: 'Page settings' }), el('span', { class: 'card-title', text: 'Browser tab title' })),
        el('span', { class: 'card-chev' }, icon('chev'))),
      body);
    if (open) {
      state.content.page = state.content.page || {};
      append(body, field('Title shown in the browser tab', textInput(state.content.page, 'title'), { hint: 'Also used when the link is shared.' }));
    }
    return card;
  }

  var editors = {};

  editors.hero = function (b, i, retitle) {
    return [
      field('Page title on the photo', textInput(b, 'heading', { big: true, onInput: retitle })),
      imageField(b, 'image', 'alt', { label: 'Banner photo', minWidth: 1900, maxWidth: 2600, hint: 'Wide landscape photo, at least 1900 px wide. The center stays in view on phones.' })
    ];
  };

  editors.anchorMenu = function (b) {
    return [el('div', { class: 'hint', style: 'margin-top:12px', text: 'These links jump to sections further down the page. You can rename them; each one keeps pointing at the same section.' })]
      .concat((b.links || []).map(function (l) {
        return field('Link to "' + l.target.replace(/-/g, ' ') + '" section', textInput(l, 'label'));
      }));
  };

  editors.text = function (b) {
    return [field('Text', richInput(b, 'body'))];
  };

  editors.heading = function (b, i, retitle) {
    return [field('Heading', textInput(b, 'text', { big: true, onInput: retitle }))];
  };

  editors.carousel = function (b) {
    return [
      field('Heading', textInput(b, 'heading', { big: true })),
      field('Text', richInput(b, 'body')),
      imageField(b, 'image', 'alt', { label: 'Photo', minWidth: 500, maxWidth: 1400, hint: 'Shown at about 500 x 450 px. Landscape or square works best.' })
    ];
  };

  editors.bio = function (b, i, retitle) {
    var flip = el('input', { type: 'checkbox', checked: !!b.imageLeft, on: { change: function () { b.imageLeft = flip.checked; changed(); } } });
    var bios = [];
    state.content.blocks.forEach(function (x, j) { if (x.type === 'bio') bios.push(j); });
    var pos = bios.indexOf(i);
    return [
      field('Name', textInput(b, 'name', { big: true, onInput: retitle })),
      field('Title', textInput(b, 'title', { placeholder: 'e.g. PGA Head Golf Professional' })),
      field('Bio', richInput(b, 'body')),
      imageField(b, 'image', 'alt', { label: 'Headshot', minWidth: 600, maxWidth: 1400, hint: 'Portrait or square headshot.' }),
      el('div', { class: 'field' }, el('label', { class: 'check' }, flip, 'Photo on the left')),
      buttonsField(b),
      el('div', { class: 'card-tools' },
        el('button', { class: 'btn btn-small', type: 'button', disabled: pos <= 0, on: { click: function () { moveBlock(i, bios[pos - 1]); } } }, icon('up'), 'Move up'),
        el('button', { class: 'btn btn-small', type: 'button', disabled: pos >= bios.length - 1, on: { click: function () { moveBlock(i, bios[pos + 1]); } } }, icon('down'), 'Move down'),
        el('button', { class: 'btn btn-small', type: 'button', on: { click: function () { addBio(i, true); } } }, icon('copy'), 'Duplicate'),
        el('button', { class: 'btn btn-small btn-danger', type: 'button', on: { click: function () { removeBlock(i, b.name || 'this team member'); } } }, icon('trash'), 'Remove')),
      pos === bios.length - 1
        ? el('button', { class: 'add-row', type: 'button', style: 'margin-top:12px', on: { click: function () { addBio(i, false); } } }, icon('plus'), 'Add a team member')
        : null
    ];
  };

  function moveBlock(from, to) {
    var blocks = state.content.blocks;
    var tmp = blocks[from];
    blocks[from] = blocks[to];
    blocks[to] = tmp;
    var o = state.open[from]; state.open[from] = state.open[to]; state.open[to] = o;
    renderCards();
    changed({ scrollTo: to });
  }

  function addBio(afterIndex, duplicate) {
    var src = state.content.blocks[afterIndex];
    var b = duplicate ? clone(src) : {
      type: 'bio', label: 'New team member', imageLeft: !src.imageLeft, image: src.image, alt: '',
      name: 'New team member', title: '', body: '<p>Write a short bio here.</p>', buttons: []
    };
    if (duplicate) { b.name = src.name + ' (copy)'; b.imageLeft = !src.imageLeft; }
    state.content.blocks.splice(afterIndex + 1, 0, b);
    shiftOpen(afterIndex + 1, 1);
    state.open[afterIndex + 1] = true;
    renderCards();
    changed({ scrollTo: afterIndex + 1 });
    flashCard(afterIndex + 1);
  }

  function removeBlock(i, name) {
    confirmBox({ title: 'Remove ' + name + '?', text: 'This takes the section off the page. You can undo it with Discard if you have not saved yet.', ok: 'Remove', danger: true })
      .then(function (yes) {
        if (!yes) return;
        state.content.blocks.splice(i, 1);
        shiftOpen(i, -1);
        renderCards();
        changed();
      });
  }

  function shiftOpen(from, delta) {
    var next = {};
    Object.keys(state.open).forEach(function (k) {
      if (k === 'page') { next.page = state.open.page; return; }
      var n = Number(k);
      if (n < from) next[n] = state.open[k];
      else if (delta > 0 || n > from) next[n + delta] = state.open[k];
    });
    state.open = next;
  }

  /* ---------- Tabs (programs and prices) ---------- */

  editors.tabs = function (b, i, retitle) {
    var group = tabGroupIndex(i);
    var t = Math.min(state.activeTab[i] || 0, Math.max(b.tabs.length - 1, 0));
    state.activeTab[i] = t;
    var tab = b.tabs[t];
    function focus() { return { focusTab: { group: group, tab: state.activeTab[i] }, highlight: i }; }

    function selectTab(n) {
      state.activeTab[i] = n;
      schedulePreview({ focusTab: { group: group, tab: n }, scrollTo: i });
      rerender();
    }
    function rerender() {
      var card = $('.card[data-block="' + i + '"] .card-body');
      card.innerHTML = '';
      append(card, editors.tabs(b, i, retitle));
    }

    var chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'Choose a tab to edit' },
      b.tabs.map(function (tb, n) {
        return el('button', { class: 'chip', type: 'button', 'aria-pressed': n === t ? 'true' : 'false', text: tb.name || 'Untitled tab', on: { click: function () { selectTab(n); } } });
      }),
      el('button', {
        class: 'chip chip-add', type: 'button', text: '+ Add tab',
        on: {
          click: function () {
            b.tabs.push({ name: 'New tab', subtitle: '', intro: '', rows: [{ title: 'New program', description: '<p>Describe the program.</p>', price: '$' }], note: '', buttons: [] });
            state.activeTab[i] = b.tabs.length - 1;
            changed(focus());
            rerender();
          }
        }
      }));

    var out = [
      el('div', { class: 'hint', style: 'margin-top:12px', text: 'Each tab is a set of programs with prices. Pick a tab to edit it.' }),
      chips
    ];
    if (!tab) return out;

    var nameInput = textInput(tab, 'name', {
      big: true, change: focus,
      onInput: function () { var chip = $$('.chip', chips)[t]; if (chip) chip.textContent = tab.name || 'Untitled tab'; }
    });

    var rowsWrap = el('div');
    function drawRows() {
      rowsWrap.innerHTML = '';
      append(rowsWrap, el('div', { class: 'rows-head' }, el('h4', { text: 'Programs and prices' })));
      tab.rows.forEach(function (r, n) {
        var key = i + '-' + t + '-' + n;
        var isOpen = !!state.openRow[key];
        var tTitle = el('span', { class: 't', text: r.title || 'Untitled row' });
        var tPrice = el('span', { class: 'p', text: (r.price || '').split('\n')[0] });
        var body = el('div', { class: 'rowcard-body', hidden: !isOpen });
        var rc = el('div', { class: 'rowcard' + (isOpen ? ' is-open' : '') },
          el('div', { class: 'rowcard-head' },
            el('button', {
              class: 'rowcard-toggle', type: 'button', 'aria-expanded': isOpen ? 'true' : 'false',
              on: {
                click: function () {
                  state.openRow[key] = !state.openRow[key];
                  rc.classList.toggle('is-open', state.openRow[key]);
                  this.setAttribute('aria-expanded', state.openRow[key] ? 'true' : 'false');
                  body.hidden = !state.openRow[key];
                  if (state.openRow[key] && !body.childNodes.length) fillRow();
                  schedulePreview({ focusTab: { group: group, tab: t }, scrollTo: i });
                }
              }
            }, tTitle, tPrice),
            el('button', { class: 'mini', type: 'button', title: 'Move up', 'aria-label': 'Move up', disabled: n === 0, on: { click: function () { moveRow(n, n - 1); } } }, icon('up')),
            el('button', { class: 'mini', type: 'button', title: 'Move down', 'aria-label': 'Move down', disabled: n === tab.rows.length - 1, on: { click: function () { moveRow(n, n + 1); } } }, icon('down')),
            el('button', { class: 'mini', type: 'button', title: 'Duplicate', 'aria-label': 'Duplicate', on: { click: function () { tab.rows.splice(n + 1, 0, clone(r)); state.openRow[i + '-' + t + '-' + (n + 1)] = true; drawRows(); changed(focus()); } } }, icon('copy')),
            el('button', {
              class: 'mini danger', type: 'button', title: 'Remove', 'aria-label': 'Remove',
              on: {
                click: function () {
                  confirmBox({ title: 'Remove "' + (r.title || 'this row') + '"?', text: 'The row and its price will be taken off this tab.', ok: 'Remove', danger: true })
                    .then(function (yes) { if (yes) { tab.rows.splice(n, 1); state.openRow = {}; drawRows(); changed(focus()); } });
                }
              }
            }, icon('trash'))),
          body);
        function fillRow() {
          append(body, [
            field('Program name', textInput(r, 'title', { change: focus, onInput: function (v) { tTitle.textContent = v || 'Untitled row'; } }), { optional: true }),
            field('Description', richInput(r, 'description', { change: focus })),
            field('Price', (function () {
              var ta = linesInput(r, 'price', { change: focus, placeholder: '$0' });
              ta.addEventListener('input', function () { tPrice.textContent = ta.value.split('\n')[0]; });
              return ta;
            })(), { hint: 'Put each price on its own line.' })
          ]);
        }
        if (isOpen) fillRow();
        rowsWrap.appendChild(rc);
      });
      append(rowsWrap, el('button', {
        class: 'add-row', type: 'button',
        on: {
          click: function () {
            tab.rows.push({ title: 'New program', description: '<p>Describe the program.</p>', price: '$' });
            state.openRow[i + '-' + t + '-' + (tab.rows.length - 1)] = true;
            drawRows();
            changed(focus());
          }
        }
      }, icon('plus'), 'Add a program'));
    }
    function moveRow(from, to) {
      var x = tab.rows[from];
      tab.rows[from] = tab.rows[to];
      tab.rows[to] = x;
      state.openRow = {};
      drawRows();
      changed(focus());
    }
    drawRows();

    var sub = el('div', { class: 'subpanel' },
      field('Tab name', nameInput),
      field('Subheading', textInput(tab, 'subtitle', { change: focus }), { optional: true }),
      field('Intro text', richInput(tab, 'intro', { change: focus, placeholder: 'Optional text above the prices' }), { optional: true }),
      rowsWrap,
      field('Note below the prices', richInput(tab, 'note', { change: focus, placeholder: 'Optional' }), { optional: true }),
      buttonsField(tab, { change: focus }),
      el('div', { class: 'subpanel-tools' },
        el('button', { class: 'btn btn-small', type: 'button', disabled: t === 0, on: { click: function () { swapTabs(t, t - 1); } } }, icon('left'), 'Move left'),
        el('button', { class: 'btn btn-small', type: 'button', disabled: t === b.tabs.length - 1, on: { click: function () { swapTabs(t, t + 1); } } }, icon('right'), 'Move right'),
        el('button', {
          class: 'btn btn-small btn-danger', type: 'button', disabled: b.tabs.length <= 1,
          on: {
            click: function () {
              confirmBox({ title: 'Remove the "' + tab.name + '" tab?', text: 'The tab and all of its programs will be taken off the page.', ok: 'Remove tab', danger: true })
                .then(function (yes) {
                  if (!yes) return;
                  b.tabs.splice(t, 1);
                  state.activeTab[i] = Math.max(0, t - 1);
                  state.openRow = {};
                  changed(focus());
                  rerender();
                });
            }
          }
        }, icon('trash'), 'Remove tab')));

    function swapTabs(a, z) {
      var x = b.tabs[a];
      b.tabs[a] = b.tabs[z];
      b.tabs[z] = x;
      state.activeTab[i] = z;
      state.openRow = {};
      changed(focus());
      rerender();
    }

    out.push(sub);
    return out;
  };

  function openCard(i, flash) {
    if (!state.open[i]) {
      state.open[i] = true;
      renderCards();
    }
    var card = $('.card[data-block="' + i + '"]');
    if (!card) return;
    if (window.matchMedia('(max-width: 760px)').matches) document.body.classList.remove('show-preview');
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (flash) flashCard(i);
  }

  function flashCard(i) {
    var card = $('.card[data-block="' + i + '"]');
    if (!card) return;
    card.classList.add('is-flash');
    setTimeout(function () { card.classList.remove('is-flash'); }, 900);
  }

  /* ======================================================================
   * Preview frame
   * ==================================================================== */

  var DEVICES = { desktop: 1440, tablet: 834, phone: 390 };

  function layoutFrame() {
    var wrap = $('#frameWrap');
    var holder = $('#frameHolder');
    var frame = $('#preview');
    var width = DEVICES[state.device];
    var availW = wrap.clientWidth - 32;
    var availH = wrap.clientHeight - 32;
    if (availW <= 0 || availH <= 0) return;
    var scale = Math.min(1, availW / width);
    frame.style.width = width + 'px';
    frame.style.height = Math.round(availH / scale) + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    holder.style.width = Math.round(width * scale) + 'px';
    holder.style.height = availH + 'px';
    holder.style.marginLeft = -Math.round(width * scale / 2) + 'px';
  }

  function startPreview() {
    var frame = $('#preview');
    window.addEventListener('message', function (e) {
      if (e.origin !== window.location.origin || !e.data) return;
      if (e.data.type === 'cms:ready') {
        state.previewReady = true;
        $('#frameLoading').hidden = true;
        schedulePreview();
      } else if (e.data.type === 'cms:select') {
        var b = state.content && state.content.blocks[e.data.block];
        if (b && b.type === 'tabs' && typeof e.data.tab === 'number' && state.activeTab[e.data.block] !== e.data.tab) {
          state.activeTab[e.data.block] = e.data.tab;
          state.openRow = {};
          state.open[e.data.block] = true;
          renderCards();
        }
        openCard(e.data.block, true);
      }
    });
    if (window.CMS_PREVIEW_SRCDOC) frame.srcdoc = window.CMS_PREVIEW_SRCDOC;
    else frame.src = 'index.html?mode=editor';
    layoutFrame();
    window.addEventListener('resize', debounce(layoutFrame, 60));
    $$('.seg [data-device]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.device = btn.getAttribute('data-device');
        $$('.seg [data-device]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        layoutFrame();
      });
    });
  }

  /* ======================================================================
   * Loading content
   * ==================================================================== */

  function setContent(content, source) {
    state.content = content;
    state.content.blocks = state.content.blocks || [];
    state.source = source;
    state.savedSnapshot = JSON.stringify(content);
    state.dirty = false;
    state.open = { 0: true };
    state.activeTab = {};
    state.openRow = {};
    renderCards();
    updateDocState();
    schedulePreview({ scrollTo: 0 });
    var url = new URL(window.location.href);
    if (source.kind === 'draft') url.searchParams.set('draft', source.slug);
    else url.searchParams.delete('draft');
    history.replaceState(null, '', url.pathname + url.search);
  }

  function loadSource(source) {
    var p = source.kind === 'draft' ? CMS.loadDraft(source.slug) : CMS.loadPublished();
    return p.then(function (content) {
      if (source.kind === 'draft') source.name = (content._meta && content._meta.name) || source.slug;
      setContent(content, source);
      return content;
    });
  }

  function offerRestore() {
    var work;
    try { work = JSON.parse(localStorage.getItem(workKey()) || 'null'); } catch (e) { work = null; }
    if (!work || !work.content) return;
    var sameSource = work.source && work.source.kind === state.source.kind && (work.source.slug || '') === (state.source.slug || '');
    if (!sameSource || JSON.stringify(work.content) === state.savedSnapshot) return;
    var when = new Date(work.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    toast('You have unsaved edits from ' + when + '.', {
      sticky: true,
      actions: [
        { label: 'Restore them', run: function () { state.content = work.content; renderCards(); changed(); } },
        { label: 'Discard', run: clearWork }
      ]
    });
  }

  /* ======================================================================
   * Saving
   * ==================================================================== */

  function requireConnection() {
    if (!state.repo || !state.repo.owner) {
      openSettings('This editor needs to know which GitHub repository to save to.');
      return false;
    }
    if (!CMS.getToken()) {
      openSettings('Add your GitHub access key to save and share previews.');
      return false;
    }
    return true;
  }

  function stampFolder() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  /* Uploads any new photos (held as data: URLs) and swaps in their paths. */
  function uploadPendingImages(progress) {
    var found = [];
    (function walk(o) {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) {
        var v = o[k];
        if (typeof v === 'string' && /^data:image\//.test(v)) { if (found.indexOf(v) === -1) found.push(v); }
        else walk(v);
      });
    })(state.content);
    if (!found.length) return Promise.resolve();
    var stamp = stampFolder();
    var map = {};
    return found.reduce(function (chain, dataUrl, n) {
      return chain.then(function () {
        progress('Uploading photo ' + (n + 1) + ' of ' + found.length);
        var m = /^data:image\/([a-z0-9.+-]+);base64,(.*)$/i.exec(dataUrl);
        if (!m) throw new Error('A photo could not be read. Please replace it and try again.');
        var ext = { jpeg: 'jpg', 'svg+xml': 'svg' }[m[1].toLowerCase()] || m[1].toLowerCase();
        var path = 'uploads/' + stamp + '-' + (n + 1) + '.' + ext;
        return CMS.ghPutFile(state.repo, path, m[2], 'Add photo ' + path).then(function () { map[dataUrl] = path; });
      });
    }, Promise.resolve()).then(function () {
      (function swap(o) {
        if (Array.isArray(o)) o.forEach(swap);
        else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) {
          if (typeof o[k] === 'string' && map[o[k]]) o[k] = map[o[k]];
          else swap(o[k]);
        });
      })(state.content);
    });
  }

  function cleanForSave(content) {
    return clone(content);
  }

  function saveDraft(name) {
    var slug = CMS.slugify(name);
    var t = toast('Saving preview', { spinner: true, sticky: true });
    return uploadPendingImages(function (msg) { t.set(msg); }).then(function () {
      t.set('Saving preview');
      var c = cleanForSave(state.content);
      c._meta = { name: name, savedAt: new Date().toISOString(), kind: 'draft' };
      var json = JSON.stringify(c, null, 2) + '\n';
      return CMS.ghPutFile(state.repo, 'content/drafts/' + slug + '.json', CMS.textToBase64(json), 'Save preview "' + name + '"').then(function () {
        state.content = c;
        state.source = { kind: 'draft', slug: slug, name: name };
        state.savedSnapshot = JSON.stringify(c);
        clearWork();
        renderCards();
        changed();
        var url = new URL(window.location.href);
        url.searchParams.set('draft', slug);
        history.replaceState(null, '', url.pathname + url.search);
        t.dismiss();
        return CMS.siteBase() + '?draft=' + slug;
      });
    }).catch(function (err) { t.dismiss(); throw err; });
  }

  function publish() {
    var t = toast('Publishing', { spinner: true, sticky: true });
    return uploadPendingImages(function (msg) { t.set(msg); }).then(function () {
      t.set('Publishing');
      var c = cleanForSave(state.content);
      c._meta = { name: 'Published page', savedAt: new Date().toISOString(), kind: 'published', from: state.source.kind === 'draft' ? state.source.slug : '' };
      var json = JSON.stringify(c, null, 2) + '\n';
      return CMS.ghPutFile(state.repo, 'content/published.json', CMS.textToBase64(json), 'Publish Golf Academy page' + (state.source.kind === 'draft' ? ' from preview "' + state.source.name + '"' : ''))
        .then(function () {
          state.content = c;
          state.source = { kind: 'published', slug: '', name: '' };
          state.savedSnapshot = JSON.stringify(c);
          clearWork();
          var url = new URL(window.location.href);
          url.searchParams.delete('draft');
          history.replaceState(null, '', url.pathname + url.search);
          renderCards();
          changed();
          t.dismiss();
        });
    }).catch(function (err) { t.dismiss(); throw err; });
  }

  /* ======================================================================
   * Dialogs: share, publish, previews, settings
   * ==================================================================== */

  function copyText(text, input) {
    function fallback() { if (input) { input.select(); document.execCommand('copy'); } }
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    fallback();
    return Promise.resolve();
  }

  function shareDialog() {
    if (!requireConnection()) return;
    var defaultName = state.source.kind === 'draft' ? state.source.name : '';
    modal(function (box, close) {
      var nameInput = el('input', { class: 'input input-big', type: 'text', value: defaultName, placeholder: 'e.g. Winter pricing update' });
      var slugLine = el('div', { class: 'slug' });
      var note = el('div', { class: 'callout', hidden: true });
      var saveBtn = el('button', { class: 'btn btn-accent', type: 'button', text: 'Save and get link' });
      function updateSlug() {
        var slug = CMS.slugify(nameInput.value);
        slugLine.textContent = slug ? CMS.siteBase() + '?draft=' + slug : 'Give the preview a name to create its link.';
        saveBtn.disabled = !slug;
        if (slug && state.source.kind === 'draft' && slug === state.source.slug) {
          note.className = 'callout'; note.hidden = false;
          note.textContent = 'This updates the existing link, so anyone who already has it sees the new version.';
        } else note.hidden = true;
      }
      nameInput.addEventListener('input', updateSlug);
      nameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !saveBtn.disabled) saveBtn.click(); });
      saveBtn.addEventListener('click', function () {
        var name = nameInput.value.trim();
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving';
        saveDraft(name).then(function (link) {
          box.innerHTML = '';
          showShareResult(box, close, name, link);
        }).catch(function (err) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save and get link';
          note.className = 'callout err'; note.hidden = false; note.textContent = ghMessage(err);
        });
      });
      updateSlug();
      append(box, [
        el('h2', { text: 'Share a preview' }),
        el('p', { class: 'lead', text: 'Saves your changes as a preview with its own link. The published page stays as it is until you publish.' }),
        field('Preview name', nameInput),
        slugLine,
        note,
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn', type: 'button', text: 'Cancel', on: { click: close } }),
          saveBtn)
      ]);
    });
  }

  function showShareResult(box, close, name, link) {
    var linkInput = el('input', { class: 'input', type: 'text', readonly: true, value: link });
    var copyBtn = el('button', {
      class: 'btn btn-primary', type: 'button', text: 'Copy link',
      on: { click: function () { copyText(link, linkInput).then(function () { copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy link'; }, 1600); }); } }
    });
    var subject = 'Golf Academy page preview: ' + name;
    var body = 'Here is a preview of the proposed updates to the Golf Academy page:\n\n' + link + '\n\nIt is a draft for review and is not on the live website.';
    append(box, [
      el('h2', { text: 'Your preview link is ready' }),
      el('p', { class: 'lead', text: '"' + name + '" is saved. Paste this link into an email or message.' }),
      el('div', { class: 'linkbox' }, linkInput, copyBtn),
      el('div', { class: 'callout', text: 'Anyone with the link can view it. A brand new photo can take about a minute to appear for others.' }),
      el('div', { class: 'modal-actions' },
        el('a', { class: 'btn left', href: 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), text: 'Start an email' }),
        el('a', { class: 'btn', href: link, target: '_blank', rel: 'noopener', text: 'Open preview' }),
        el('button', { class: 'btn btn-primary', type: 'button', text: 'Done', on: { click: close } }))
    ]);
    linkInput.addEventListener('focus', function () { linkInput.select(); });
    setTimeout(function () { linkInput.focus(); }, 30);
  }

  function publishDialog() {
    if (!requireConnection()) return;
    modal(function (box, close) {
      var note = el('div', { class: 'callout', hidden: true });
      var go = el('button', { class: 'btn btn-primary', type: 'button', text: 'Publish' });
      go.addEventListener('click', function () {
        go.disabled = true; go.textContent = 'Publishing';
        publish().then(function () {
          close();
          toast('Published. The page updates for everyone within about a minute.', {
            ms: 6000, actions: [{ label: 'Open page', run: function () { window.open(CMS.siteBase(), '_blank', 'noopener'); } }]
          });
        }).catch(function (err) {
          go.disabled = false; go.textContent = 'Publish';
          note.className = 'callout err'; note.hidden = false; note.textContent = ghMessage(err);
        });
      });
      append(box, [
        el('h2', { text: 'Publish these changes?' }),
        el('p', { class: 'lead', text: 'This makes the version you are editing the main version of the prototype page at ' + CMS.siteBase() + '.' }),
        el('p', { text: 'It does not change carmelvalleyranch.com. Saved preview links keep working.' }),
        note,
        el('div', { class: 'modal-actions' },
          el('button', { class: 'btn', type: 'button', text: 'Cancel', on: { click: close } }),
          go)
      ]);
    });
  }

  function guardUnsaved() {
    if (!state.dirty) return Promise.resolve(true);
    return confirmBox({ title: 'Leave your unsaved changes?', text: 'Opening another version replaces what you are editing now. Share or publish first if you want to keep it.', ok: 'Open anyway', danger: true });
  }

  function previewsDialog() {
    modal(function (box, close) {
      var list = el('ul', { class: 'draftlist' }, el('li', { class: 'empty', text: 'Loading saved previews' }));
      append(box, [
        el('h2', { text: 'Saved previews' }),
        el('p', { class: 'lead', text: 'Open one to keep editing it, or copy its link to share again.' }),
        list,
        el('div', { class: 'modal-actions' },
          el('button', {
            class: 'btn left', type: 'button', text: 'Edit the published page',
            on: { click: function () { guardUnsaved().then(function (ok) { if (!ok) return; close(); loadSource({ kind: 'published' }).catch(function (e) { toast(e.message, { error: true }); }); }); } }
          }),
          el('button', { class: 'btn btn-primary', type: 'button', text: 'Close', on: { click: close } }))
      ]);
      if (!state.repo || !state.repo.owner) {
        list.innerHTML = '';
        append(list, el('li', { class: 'empty', text: 'Connect the editor to GitHub in Settings to see saved previews.' }));
        return;
      }
      CMS.ghList(state.repo, 'content/drafts').then(function (files) {
        files = (files || []).filter(function (f) { return f.type === 'file' && /\.json$/.test(f.name); });
        list.innerHTML = '';
        if (!files.length) { append(list, el('li', { class: 'empty', text: 'No saved previews yet. Use Share preview to create one.' })); return; }
        files.forEach(function (f) {
          var slug = f.name.replace(/\.json$/, '');
          var link = CMS.siteBase() + '?draft=' + slug;
          var title = el('strong', { text: slug.replace(/-/g, ' ') });
          var meta = el('span', { text: '' });
          var current = state.source.kind === 'draft' && state.source.slug === slug;
          var li = el('li', null,
            el('div', { class: 'meta' }, title, meta),
            el('div', { class: 'tools' },
              el('button', {
                class: 'btn btn-small', type: 'button', text: 'Copy link',
                on: { click: function () { var b = this; copyText(link).then(function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy link'; }, 1500); }); } }
              }),
              el('button', {
                class: 'btn btn-small', type: 'button', text: current ? 'Editing' : 'Open', disabled: current,
                on: {
                  click: function () {
                    guardUnsaved().then(function (ok) {
                      if (!ok) return;
                      close();
                      loadSource({ kind: 'draft', slug: slug, name: slug }).catch(function () { toast('That preview could not be opened.', { error: true }); });
                    });
                  }
                }
              }),
              el('button', {
                class: 'mini danger', type: 'button', title: 'Delete preview', 'aria-label': 'Delete preview',
                on: {
                  click: function () {
                    if (!CMS.getToken()) { close(); openSettings('Add your GitHub access key to delete previews.'); return; }
                    var label = title.textContent;
                    confirmBox({ title: 'Delete "' + label + '"?', text: 'Its link will stop working for everyone you shared it with.', ok: 'Delete', danger: true }).then(function (yes) {
                    if (!yes) return;
                    li.style.opacity = '.5';
                    CMS.ghDeleteFile(state.repo, 'content/drafts/' + f.name, 'Delete preview "' + label + '"').then(function () {
                      li.remove();
                      toast('Deleted "' + label + '". Its link no longer works.');
                      if (current) { state.source = { kind: 'published', slug: '', name: '' }; updateDocState(); }
                    }).catch(function (err) { li.style.opacity = ''; toast(ghMessage(err), { error: true }); });
                    });
                  }
                }
              }, icon('trash'))));
          list.appendChild(li);
          if (f.download_url) {
            fetch(f.download_url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
              if (!d || !d._meta) return;
              if (d._meta.name) title.textContent = d._meta.name;
              if (d._meta.savedAt) meta.textContent = 'Saved ' + new Date(d._meta.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            }).catch(function () { /* names are cosmetic */ });
          }
        });
      }).catch(function (err) {
        list.innerHTML = '';
        append(list, el('li', { class: 'empty', text: ghMessage(err) }));
      });
    });
  }

  function openSettings(reason) {
    modal(function (box, close) {
      var repo = state.repo || { owner: '', repo: '', branch: 'main' };
      var owner = el('input', { class: 'input', type: 'text', value: repo.owner || '', placeholder: 'GitHub user or organization' });
      var name = el('input', { class: 'input', type: 'text', value: repo.repo || '', placeholder: 'Repository name' });
      var branch = el('input', { class: 'input', type: 'text', value: repo.branch || 'main' });
      var token = el('input', { class: 'input', type: 'password', value: CMS.getToken(), placeholder: 'github_pat_...', autocomplete: 'off', spellcheck: false });
      var status = el('div', { class: 'callout', hidden: true });
      var fileIn = el('input', { type: 'file', accept: 'application/json,.json', hidden: true });

      function say(kind, text) { status.className = 'callout ' + kind; status.textContent = text; status.hidden = false; }

      function saveAndTest() {
        var next = { owner: owner.value.trim(), repo: name.value.trim(), branch: branch.value.trim() || 'main' };
        if (!next.owner || !next.repo) { say('err', 'Enter the GitHub owner and repository name.'); return; }
        CMS.setRepoOverride(next);
        CMS.setToken(token.value.trim());
        state.repo = Object.assign({}, state.repo || {}, next);
        if (!token.value.trim()) { say('warn', 'Saved. Add an access key to be able to save changes.'); return; }
        say('', 'Checking access');
        CMS.ghCheckAccess(state.repo).then(function (r) {
          if (r.canWrite) say('ok', 'Connected to ' + r.fullName + '. You can share previews and publish from this computer.');
          else say('err', 'This key can read ' + r.fullName + ' but cannot save to it. Give it "Contents: Read and write" permission.');
        }).catch(function (err) { say('err', ghMessage(err)); });
      }

      fileIn.addEventListener('change', function () {
        var f = fileIn.files[0];
        if (!f) return;
        f.text().then(function (text) {
          var data = JSON.parse(text);
          if (!data || !Array.isArray(data.blocks)) throw new Error('bad');
          state.content = data;
          close();
          renderCards();
          changed({ scrollTo: 0 });
          toast('Loaded ' + f.name + '. Share or publish to save it.');
        }).catch(function () { say('err', 'That file is not a Golf Academy content file.'); });
      });

      append(box, [
        el('h2', { text: 'Settings' }),
        reason ? el('div', { class: 'callout warn', text: reason }) : null,
        el('div', { class: 'section-title', text: 'GitHub access key' }),
        field('Access key', token, { hint: 'Stored only in this browser on this computer. Needed to share previews and publish.' }),
        el('details', { class: 'help' },
          el('summary', { text: 'How do I get an access key?' }),
          el('ol', null,
            el('li', { html: 'Sign in to GitHub and open <b>Settings</b>, then <b>Developer settings</b>, then <b>Fine-grained tokens</b>.' }),
            el('li', { html: 'Click <b>Generate new token</b>. Under <b>Repository access</b>, choose <b>Only select repositories</b> and pick <code>' + (repo.repo || 'this repository') + '</code>.' }),
            el('li', { html: 'Under <b>Repository permissions</b>, set <b>Contents</b> to <b>Read and write</b>.' }),
            el('li', { html: 'Generate it, copy the key, and paste it above.' }))),
        el('div', { class: 'section-title', text: 'Repository' }),
        el('div', { class: 'row2' }, field('Owner', owner), field('Repository', name)),
        field('Branch', branch, { hint: 'Usually main. Filled in automatically on github.io sites.' }),
        status,
        el('div', { class: 'section-title', text: 'Backup' }),
        el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px' },
          el('button', {
            class: 'btn btn-small', type: 'button', text: 'Download content file',
            on: {
              click: function () {
                var blob = new Blob([JSON.stringify(cleanForSave(state.content), null, 2)], { type: 'application/json' });
                var a = el('a', { href: URL.createObjectURL(blob), download: 'golf-academy-content.json' });
                document.body.appendChild(a); a.click(); a.remove();
              }
            }
          }),
          el('button', { class: 'btn btn-small', type: 'button', text: 'Load a content file', on: { click: function () { fileIn.click(); } } }),
          fileIn),
        el('div', { class: 'modal-actions' },
          el('button', {
            class: 'btn btn-danger left', type: 'button', text: 'Forget key',
            on: { click: function () { CMS.setToken(''); token.value = ''; say('', 'The access key was removed from this browser.'); } }
          }),
          el('button', { class: 'btn', type: 'button', text: 'Close', on: { click: close } }),
          el('button', { class: 'btn btn-primary', type: 'button', text: 'Save and test', on: { click: saveAndTest } }))
      ]);
    });
  }

  /* ======================================================================
   * Boot
   * ==================================================================== */

  function bindTopbar() {
    $('#btnShare').addEventListener('click', shareDialog);
    $('#btnPublish').addEventListener('click', publishDialog);
    $('#btnDrafts').addEventListener('click', previewsDialog);
    $('#btnSettings').addEventListener('click', function () { openSettings(); });
    $('#btnOpenSaved').addEventListener('click', function () {
      var link = state.source.kind === 'draft' ? CMS.siteBase() + '?draft=' + state.source.slug : CMS.siteBase();
      window.open(link, '_blank', 'noopener');
    });
    $('#btnDiscard').addEventListener('click', function () {
      confirmBox({ title: 'Discard your changes?', text: 'This goes back to the last saved version of what you are editing.', ok: 'Discard changes', danger: true })
        .then(function (yes) {
          if (!yes) return;
          clearWork();
          setContent(JSON.parse(state.savedSnapshot), state.source);
        });
    });
    $('#btnTogglePreview').addEventListener('click', function () {
      document.body.classList.toggle('show-preview');
      this.textContent = document.body.classList.contains('show-preview') ? 'Edit' : 'Preview';
      setTimeout(layoutFrame, 30);
    });
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); shareDialog(); }
    });
  }

  function boot() {
    bindTopbar();
    startPreview();
    CMS.getRepo().then(function (repo) {
      state.repo = repo;
      var slug = (new URLSearchParams(window.location.search).get('draft') || '').trim().toLowerCase();
      var source = slug ? { kind: 'draft', slug: slug, name: slug } : { kind: 'published' };
      return loadSource(source).catch(function (err) {
        if (source.kind === 'draft') {
          toast('That preview could not be found, so the published page was opened instead.', { error: true });
          return loadSource({ kind: 'published' });
        }
        throw err;
      });
    }).then(offerRestore).catch(function (err) {
      $('#cards').innerHTML = '';
      append($('#cards'), el('div', { class: 'callout err', text: 'The page content could not be loaded. ' + err.message }));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
