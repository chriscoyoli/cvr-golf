/*
 * Renders the Golf Academy page body from a content file, using the exact
 * markup and class names of carmelvalleyranch.com so the site's own
 * stylesheet styles it identically. Also provides the small interactive
 * behaviors the page needs (program tabs, mobile menu).
 *
 *   index.html                 -> published content
 *   index.html?draft=<name>    -> a saved draft (shareable preview link)
 *   index.html?mode=editor     -> live preview inside the editor
 */
(function () {
  'use strict';

  var CMS = (window.CVRCMS = window.CVRCMS || {});

  /* ---------- Small utilities ---------- */

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var ALLOWED = {
    P: [], BR: [], EM: [], STRONG: [], B: [], I: [], U: [],
    UL: [], OL: [], LI: [], A: ['href', 'target', 'rel']
  };
  var INLINE = { '#text': 1, BR: 1, EM: 1, STRONG: 1, B: 1, I: 1, U: 1, A: 1 };

  function cleanNode(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1) { n.parentNode.removeChild(n); return; }
      var tag = n.tagName.toUpperCase();
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|NOSCRIPT|SVG|MATH)$/.test(tag)) { n.parentNode.removeChild(n); return; }
      if (tag === 'DIV') {
        // contenteditable sometimes produces <div> lines; treat them as paragraphs
        var p = n.ownerDocument.createElement('p');
        while (n.firstChild) p.appendChild(n.firstChild);
        n.parentNode.replaceChild(p, n);
        n = p;
        tag = 'P';
      }
      if (!ALLOWED[tag]) {
        cleanNode(n);
        while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n);
        n.parentNode.removeChild(n);
        return;
      }
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (ALLOWED[tag].indexOf(a.name.toLowerCase()) === -1) n.removeAttribute(a.name);
      });
      if (tag === 'A') {
        var href = n.getAttribute('href') || '';
        if (/^\s*(javascript|data|vbscript):/i.test(href)) n.removeAttribute('href');
      }
      cleanNode(n);
    });
  }

  /* Cleans rich text down to the handful of tags the page uses, and makes
     sure loose text sits inside a paragraph like the original markup. */
  CMS.sanitizeRich = function (html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html || '';
    var root = tpl.content;
    cleanNode(root);
    var doc = root.ownerDocument;
    var nodes = Array.prototype.slice.call(root.childNodes);
    var run = null;
    nodes.forEach(function (n) {
      var name = n.nodeType === 3 ? '#text' : n.tagName.toUpperCase();
      if (INLINE[name]) {
        if (n.nodeType === 3 && !run && !n.textContent.trim()) { root.removeChild(n); return; }
        if (!run) { run = doc.createElement('p'); root.insertBefore(run, n); }
        run.appendChild(n);
      } else {
        run = null;
      }
    });
    // drop empty paragraphs left behind by editing
    Array.prototype.slice.call(root.querySelectorAll('p, li')).forEach(function (el) {
      if (!el.textContent.replace(/ /g, ' ').trim()) el.parentNode.removeChild(el);
    });
    Array.prototype.slice.call(root.querySelectorAll('ul, ol')).forEach(function (list) {
      if (!list.querySelector('li')) list.parentNode.removeChild(list);
    });
    var out = document.createElement('div');
    out.appendChild(root.cloneNode(true));
    return out.innerHTML;
  };

  function rich(html) { return CMS.sanitizeRich(html); }
  function hasText(html) {
    if (!html) return false;
    var d = document.createElement('div');
    d.innerHTML = html;
    return !!d.textContent.replace(/ /g, ' ').trim();
  }
  function lines(text) {
    return '<p>' + String(text || '').split(/\r?\n/).map(function (l) { return esc(l.trim()); })
      .filter(function (l, i, arr) { return l || i < arr.length - 1; }).join('<br> ') + '</p>';
  }

  function linkAria(link) {
    var m = /^mailto:(.+)$/i.exec(link || '');
    if (m) return 'send an email to ' + m[1];
    m = /^tel:(.+)$/i.exec(link || '');
    if (m) return 'call ' + m[1];
    return '';
  }

  function buttonsHtml(buttons, withSrOnly) {
    return (buttons || []).filter(function (b) { return b && b.label; }).map(function (b) {
      var aria = linkAria(b.link);
      var cls = 'button ' + (b.style === 'hollow' ? 'hollow' : 'solid');
      return ' <a class="' + cls + '" href="' + esc(b.link || '#') + '"' +
        (b.newTab ? ' target="_blank"' : '') +
        (aria ? ' aria-label="' + esc(aria) + '"' : '') + '> ' + esc(b.label) + ' ' +
        (b.newTab && withSrOnly ? '<span class="sr-only">Opens in a new window.</span> ' : '') + '</a>';
    }).join('');
  }

  /* ---------- Block renderers (markup mirrors the live site) ---------- */

  var R = {};

  R.hero = function (b) {
    return '<section class="banner-container m-carousel image-carousel is-anchored ">' +
      '<div class="container is-full-width"><div class="carousel-container no-dots"><div class="carousel-single">' +
      '<div class="carousel-image image-slide carousel-background-overlay"> <img src="' + esc(b.image) + '" alt="' + esc(b.alt) + '" width="1440" height="619"></div>' +
      '</div></div><div class="carousel-text-container"><div class="grid-col carousel-content"><div class="carousel-heading">' +
      '<h1 class="h1">' + esc(b.heading) + '</h1></div></div></div></div></section>';
  };

  R.anchorMenu = function (b) {
    return '<section class="m-anchored-menu"><div class="container"><div class="links-container">' +
      (b.links || []).filter(function (l) { return l.label; }).map(function (l) {
        return ' <a href="#' + esc(l.target) + '">' + esc(l.label) + '</a>';
      }).join('') + '</div></div></section>';
  };

  R.text = function (b) {
    return '<section class="section-container m-text-single is-wide is-centered"><div class="container text-single-container"><div class="grid-col">' +
      '<div class="text-single-content">' + rich(b.body) + '</div></div></div></section>';
  };

  R.heading = function (b) {
    return '<section class="section-container m-text-single is-wide is-centered"><div class="container text-single-container"><div class="grid-col">' +
      '<div class="text-single-heading"><h2 class="h3">' + esc(b.text) + '</h2></div></div></div></section>';
  };

  R.anchor = function (b) {
    return '<section class="m-ancor-link" id="' + esc(b.id) + '"></section>';
  };

  R.divider = function () { return '<hr class="section-divider">'; };

  R.tabs = function (b, ctx) {
    var tabs = b.tabs || [];
    var active = Math.min(Math.max(ctx.activeTab || 0, 0), Math.max(tabs.length - 1, 0));
    var ids = tabs.map(function (t) { return ctx.uniqueId(CMS.slugify(t.name) || 'tab'); });
    var buttons = tabs.map(function (t, i) {
      var on = i === active;
      return ' <button id="tab-' + ids[i] + '" class="category-highlight-tab button ' + (on ? 'active-tab' : '') +
        '" role="tab" aria-controls="' + ids[i] + '" aria-selected="' + on + '">' + esc(t.name) + '</button>';
    }).join('');
    var panels = tabs.map(function (t, i) {
      var rows = (t.rows || []).map(function (r) {
        return '<div class="subcategory grid-row">' +
          (r.title ? '<div class="subcategory-title grid-col"><h3 class="h4">' + esc(r.title) + '</h3></div>' : '') +
          '<div class="subcategory-description grid-col">' + rich(r.description) + '</div>' +
          '<div class="subcategory-price grid-col">' + lines(r.price) + '</div></div>';
      }).join('');
      var btns = buttonsHtml(t.buttons, false);
      return '<div id="' + ids[i] + '" class="category-highlight-tabpanel" role="tabpanel" tabindex="0" aria-labelledby="tab-' + ids[i] + '"' +
        (i === active ? '' : ' hidden=""') + '>' +
        '<h2 class="h3">' + esc(t.name) + '</h2>' +
        (t.subtitle ? '<h3 class="h4">' + esc(t.subtitle) + '</h3>' : '') +
        (hasText(t.intro) ? '<div class="category-highlight-text">' + rich(t.intro) + '</div>' : '') +
        '<div class="subcategories-block">' + rows + '</div>' +
        (hasText(t.note) ? '<div class="additional-text">' + rich(t.note) + '</div>' : '') +
        (btns ? '<div class="category-highlight-buttons button-group">' + btns + '</div>' : '') +
        '</div>';
    }).join('');
    return '<section class="section-container m-category-highlight ' + esc(b.color || 'blue') + '">' +
      '<div class="container is-full-width"><div class="category-highlight-tabs-wrapper">' +
      '<div class="category-highlight-tabs">' + buttons + '</div>' + panels +
      '</div></div></section>';
  };

  R.carousel = function (b) {
    return '<section class="section-container m-carousel m-content-carousel js-content-carousel small-heading text-white-bg narrow">' +
      '<div class="container"><div class="carousel-container "><div class="image-carousel carousel-single">' +
      '<div class="carousel-image image-slide"> <img src="' + esc(b.image) + '" height="450" width="500" alt="' + esc(b.alt) + '"></div>' +
      '</div></div><div class="carousel-text-container "><div class="text-carousel carousel-single"><div class="text-slide"><div class="slide-inner">' +
      '<div class="content-carousel-heading"><h2 class="h3">' + esc(b.heading) + '</h2></div><hr class="short">' +
      '<div class="content-carousel-text">' + rich(b.body) + '</div>' +
      '</div></div></div></div></div></section>';
  };

  R.bio = function (b) {
    var btns = buttonsHtml(b.buttons, true);
    return '<section class="section-container m-text-with-image' + (b.imageLeft ? ' image-left' : '') + '">' +
      '<div class="container"><div class="grid-col module-images"><div class="module-image">' +
      ' <img src="' + esc(b.image) + '" height="" width="" alt="' + esc(b.alt) + '"></div></div>' +
      '<div class="grid-col module-content"><div class="text-with-image-heading"><h2 class="h3">' + esc(b.name) + '</h2>' +
      (b.title ? '<p class="h6 subtitle"> ' + esc(b.title) + '</p>' : '') + '</div><hr class="short">' +
      '<div class="text-with-image-content">' + rich(b.body) + '</div>' +
      (btns ? '<div class="text-with-image-buttons button-group">' + btns + '</div>' : '') +
      '</div></div></section>';
  };

  /* Builds the inner HTML of <main>. ui.activeTabs maps the n-th tab group to
     its selected tab; ui.markBlocks adds data-cms-block for the editor. */
  CMS.renderMain = function (content, ui) {
    ui = ui || {};
    var used = {};
    ['main-content', 'overlay-nav'].forEach(function (id) { used[id] = 1; });
    function uniqueId(base) {
      var id = base, n = 2;
      while (used[id]) id = base + '-' + n++;
      used[id] = 1;
      return id;
    }
    (content.blocks || []).forEach(function (b) { if (b.type === 'anchor' && b.id) used[b.id] = 1; });

    var tabGroup = 0;
    var parts = (content.blocks || []).map(function (b, i) {
      var fn = R[b.type];
      if (!fn) return '';
      var ctx = { uniqueId: uniqueId };
      if (b.type === 'tabs') {
        ctx.activeTab = (ui.activeTabs && ui.activeTabs[tabGroup]) || 0;
        tabGroup++;
      }
      var html = fn(b, ctx);
      if (ui.markBlocks) html = html.replace(/^<(\w+)/, '<$1 data-cms-block="' + i + '"');
      return { type: b.type, html: html };
    }).filter(Boolean);

    // The banner sits directly in <main>; everything else is wrapped like the live page.
    var out = '';
    var rest = parts;
    if (parts[0] && parts[0].type === 'hero') { out = parts[0].html; rest = parts.slice(1); }
    return out + '<div class="content-container">' + rest.map(function (p) { return p.html; }).join('') + '</div>';
  };

  /* ---------- Page behaviors (tabs, mobile menu) ---------- */

  var state = { activeTabs: {} };

  function tabGroupIndex(section) {
    var all = Array.prototype.slice.call(document.querySelectorAll('main .m-category-highlight'));
    return all.indexOf(section);
  }

  function selectTab(button, focus) {
    var section = button.closest('.m-category-highlight');
    if (!section) return;
    var buttons = Array.prototype.slice.call(section.querySelectorAll('.category-highlight-tab'));
    buttons.forEach(function (btn) {
      var on = btn === button;
      btn.classList.toggle('active-tab', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) {
        if (on) panel.removeAttribute('hidden');
        else panel.setAttribute('hidden', '');
      }
    });
    state.activeTabs[tabGroupIndex(section)] = buttons.indexOf(button);
    if (focus) button.focus();
  }

  function bindBehaviors() {
    document.addEventListener('click', function (e) {
      var tab = e.target.closest('.category-highlight-tab');
      if (tab) { selectTab(tab); return; }

      var toggle = e.target.closest('.js-menu-toggle');
      if (toggle) {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close site navigation' : 'Open site navigation');
        var nav = document.getElementById(toggle.getAttribute('aria-controls'));
        if (nav) { if (open) nav.removeAttribute('hidden'); else nav.setAttribute('hidden', ''); }
        document.body.classList.toggle('overlay-nav-open', open);
        return;
      }

      var acc = e.target.closest('.accordion-toggle');
      if (acc) {
        var expanded = acc.getAttribute('aria-expanded') !== 'true';
        acc.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        acc.setAttribute('data-toggle', expanded ? 'open' : 'closed');
        var li = acc.closest('li');
        if (li) li.classList.toggle('sub-nav-open', expanded);
        var sub = document.getElementById(acc.getAttribute('aria-controls'));
        if (sub) { if (expanded) sub.removeAttribute('hidden'); else sub.setAttribute('hidden', ''); }
      }
    });

    document.addEventListener('keydown', function (e) {
      var tab = e.target.closest && e.target.closest('.category-highlight-tab');
      if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        var all = Array.prototype.slice.call(tab.parentNode.querySelectorAll('.category-highlight-tab'));
        var i = all.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1);
        selectTab(all[(i + all.length) % all.length], true);
        e.preventDefault();
      }
      if (e.key === 'Escape' && document.body.classList.contains('overlay-nav-open')) {
        var t = document.querySelector('.js-menu-toggle');
        if (t) t.click();
      }
    });
  }

  /* ---------- Painting ---------- */

  function fixUploadedImages(root) {
    CMS.getRepo().then(function (repo) {
      Array.prototype.slice.call(root.querySelectorAll('img')).forEach(function (img) {
        var src = img.getAttribute('src') || '';
        if (!/^uploads\//.test(src)) return;
        img.addEventListener('error', function onErr() {
          img.removeEventListener('error', onErr);
          var raw = CMS.rawUrl(repo, src);
          if (raw) img.src = raw;
        });
      });
    });
  }

  function paint(content, opts) {
    opts = opts || {};
    var main = document.getElementById('main-content');
    main.innerHTML = CMS.renderMain(content, { activeTabs: state.activeTabs, markBlocks: opts.editor });
    main.removeAttribute('data-cms-loading');
    if (content.page && content.page.title) document.title = content.page.title;
    fixUploadedImages(main);
  }

  function showBadge(text) {
    var params = new URLSearchParams(window.location.search);
    if (params.get('badge') === '0') return;
    var el = document.createElement('div');
    el.setAttribute('role', 'note');
    el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;display:flex;align-items:center;gap:10px;' +
      'background:rgba(33,37,41,.92);color:#fff;font:500 13px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
      'padding:8px 10px 8px 14px;border-radius:999px;box-shadow:0 4px 18px rgba(0,0,0,.25);max-width:calc(100vw - 24px)';
    var span = document.createElement('span');
    span.textContent = text;
    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Hide this note');
    close.textContent = '×';
    close.style.cssText = 'all:unset;cursor:pointer;font-size:18px;line-height:1;padding:0 4px;opacity:.75';
    close.addEventListener('click', function () { el.remove(); });
    el.appendChild(span);
    el.appendChild(close);
    document.body.appendChild(el);
  }

  function showError(message) {
    var main = document.getElementById('main-content');
    main.removeAttribute('data-cms-loading');
    main.innerHTML = '<section class="section-container m-text-single is-wide is-centered"><div class="container text-single-container"><div class="grid-col">' +
      '<div class="text-single-heading"><h2 class="h3">Preview unavailable</h2></div><div class="text-single-content"><p>' + esc(message) +
      '</p></div></div></div></section>';
  }

  /* ---------- Editor live-preview mode ---------- */

  function startEditorMode() {
    var style = document.createElement('style');
    style.textContent = '[data-cms-block]{position:relative;transition:box-shadow .15s}' +
      '[data-cms-block]:hover{box-shadow:inset 0 0 0 2px rgba(246,135,31,.55);cursor:pointer}' +
      '[data-cms-block].cms-focus{box-shadow:inset 0 0 0 3px #f6871f}';
    document.head.appendChild(style);
    var lastContent = null;

    function scrollToBlock(index) {
      var el = document.querySelector('[data-cms-block="' + index + '"]');
      if (!el) return;
      Array.prototype.slice.call(document.querySelectorAll('.cms-focus')).forEach(function (n) { n.classList.remove('cms-focus'); });
      el.classList.add('cms-focus');
      var header = document.querySelector('.site-header');
      var offset = header ? Math.min(header.getBoundingClientRect().height, 200) : 0;
      var top = el.getBoundingClientRect().top + window.pageYOffset - offset - 16;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    }

    window.addEventListener('message', function (e) {
      if (e.origin !== window.location.origin || !e.data || typeof e.data !== 'object') return;
      var msg = e.data;
      if (msg.type === 'cms:render' && msg.content) {
        lastContent = msg.content;
        if (msg.focusTab) state.activeTabs[msg.focusTab.group] = msg.focusTab.tab;
        var y = window.pageYOffset;
        paint(msg.content, { editor: true });
        window.scrollTo(0, y);
        if (typeof msg.scrollTo === 'number') scrollToBlock(msg.scrollTo);
        else if (typeof msg.highlight === 'number') {
          var el = document.querySelector('[data-cms-block="' + msg.highlight + '"]');
          if (el) el.classList.add('cms-focus');
        }
      } else if (msg.type === 'cms:scrollTo') {
        scrollToBlock(msg.block);
      }
    });

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (link && !/^#/.test(link.getAttribute('href'))) e.preventDefault();
      var block = e.target.closest('[data-cms-block]');
      if (block && window.parent !== window) {
        var msg = { type: 'cms:select', block: Number(block.getAttribute('data-cms-block')) };
        var tabBtn = e.target.closest('.category-highlight-tab');
        if (tabBtn) msg.tab = Array.prototype.indexOf.call(tabBtn.parentNode.querySelectorAll('.category-highlight-tab'), tabBtn);
        window.parent.postMessage(msg, window.location.origin);
      }
    }, true);

    if (window.parent !== window) {
      window.parent.postMessage({ type: 'cms:ready' }, window.location.origin);
    }
    return lastContent;
  }

  /* ---------- Boot ---------- */

  function boot() {
    bindBehaviors();
    var params = new URLSearchParams(window.location.search);
    var mode = window.CMS_FORCE_MODE || params.get('mode');
    if (mode === 'editor') { startEditorMode(); return; }

    var draft = (params.get('draft') || '').trim().toLowerCase();
    var load = draft ? CMS.loadDraft(draft) : CMS.loadPublished();
    load.then(function (content) {
      paint(content, {});
      var name = draft ? ((content._meta && content._meta.name) || draft) : '';
      showBadge(draft ? 'Draft preview: ' + name + ' · not the live website' : 'Prototype · not the live website');
      if (window.location.hash) {
        var target = document.getElementById(window.location.hash.slice(1));
        if (target) setTimeout(function () { target.scrollIntoView(); }, 50);
      }
    }).catch(function (err) {
      showError(draft
        ? 'We could not find the preview called "' + draft + '". It may have been renamed or deleted.'
        : 'The page content could not be loaded. (' + err.message + ')');
    });
  }

  if (!window.CMS_NO_BOOT) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
