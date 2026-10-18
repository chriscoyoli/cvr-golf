/*
 * Shared helpers for the Golf Academy page and its editor.
 * - Works out which GitHub repository the site lives in.
 * - Loads published content and named drafts.
 * - Talks to the GitHub API when the editor saves.
 */
(function () {
  'use strict';

  var CMS = (window.CVRCMS = window.CVRCMS || {});
  var SLUG_RE = /^[a-z0-9][a-z0-9-]{0,59}$/;

  CMS.slugify = function (text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  };

  CMS.isValidSlug = function (slug) {
    return SLUG_RE.test(String(slug || ''));
  };

  /* The folder the site is served from, e.g. https://owner.github.io/repo/ */
  CMS.siteBase = function () {
    return new URL('./', window.location.href).href;
  };

  /* ---------- Repository settings ---------- */

  var repoPromise = null;
  var OVERRIDE_KEY = 'cvrcms:repo-override';

  CMS.getRepo = function () {
    if (repoPromise) return repoPromise;
    repoPromise = fetch(CMS.siteBase() + 'cms.config.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (cfg) {
        var repo = {
          owner: (cfg.owner || '').trim(),
          repo: (cfg.repo || '').trim(),
          branch: (cfg.branch || 'main').trim(),
          siteName: cfg.siteName || 'Golf Academy'
        };
        var host = window.location.hostname;
        if ((!repo.owner || !repo.repo) && /\.github\.io$/i.test(host)) {
          repo.owner = repo.owner || host.split('.')[0];
          var first = window.location.pathname.split('/').filter(Boolean)[0];
          var looksLikeFile = first && /\.[a-z0-9]+$/i.test(first);
          repo.repo = repo.repo || (first && !looksLikeFile ? first : host);
        }
        try {
          var override = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || 'null');
          if (override && override.owner && override.repo) {
            repo.owner = override.owner;
            repo.repo = override.repo;
            repo.branch = override.branch || repo.branch;
          }
        } catch (e) { /* storage unavailable */ }
        return repo;
      });
    return repoPromise;
  };

  CMS.setRepoOverride = function (value) {
    try {
      if (value) localStorage.setItem(OVERRIDE_KEY, JSON.stringify(value));
      else localStorage.removeItem(OVERRIDE_KEY);
    } catch (e) { /* ignore */ }
    repoPromise = null;
  };

  /* Raw file URL on GitHub, used as a fallback for freshly uploaded photos
     while GitHub Pages is still publishing them (usually under a minute). */
  CMS.rawUrl = function (repo, path) {
    if (!repo || !repo.owner || !repo.repo) return null;
    return 'https://raw.githubusercontent.com/' + repo.owner + '/' + repo.repo + '/' +
      encodeURIComponent(repo.branch) + '/' + path.split('/').map(encodeURIComponent).join('/');
  };

  /* ---------- Loading content ---------- */

  function getJSON(url, opts) {
    return fetch(url, opts).then(function (r) {
      if (!r.ok) {
        var err = new Error('HTTP ' + r.status + ' for ' + url);
        err.status = r.status;
        throw err;
      }
      return r.json();
    });
  }

  CMS.loadPublished = function () {
    return getJSON(CMS.siteBase() + 'content/published.json?v=' + Date.now(), { cache: 'no-store' });
  };

  /* Drafts are read straight from GitHub first so a link works the moment it
     is saved, then from the site itself as a fallback. */
  CMS.loadDraft = function (slug) {
    if (!CMS.isValidSlug(slug)) return Promise.reject(new Error('That preview link is not valid.'));
    var sitePath = CMS.siteBase() + 'content/drafts/' + slug + '.json?v=' + Date.now();
    return CMS.getRepo().then(function (repo) {
      if (!repo.owner) return getJSON(sitePath, { cache: 'no-store' });
      var token = CMS.getToken();
      var headers = { Accept: 'application/vnd.github.raw+json' };
      if (token) headers.Authorization = 'Bearer ' + token;
      var api = 'https://api.github.com/repos/' + repo.owner + '/' + repo.repo +
        '/contents/content/drafts/' + slug + '.json?ref=' + encodeURIComponent(repo.branch);
      return getJSON(api, { headers: headers, cache: 'no-store' }).catch(function () {
        return getJSON(sitePath, { cache: 'no-store' });
      });
    });
  };

  /* ---------- GitHub access token (editor only) ---------- */

  var TOKEN_KEY = 'cvrcms:token';
  CMS.getToken = function () {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  };
  CMS.setToken = function (token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token.trim());
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* ignore */ }
  };

  /* ---------- GitHub API ---------- */

  function GitHubError(status, message) {
    var e = new Error(message);
    e.status = status;
    e.name = 'GitHubError';
    return e;
  }

  CMS.gh = function (path, opts) {
    opts = opts || {};
    var token = CMS.getToken();
    var headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store'
    }).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
        if (!res.ok) {
          var msg = (data && data.message) || ('GitHub returned ' + res.status);
          throw GitHubError(res.status, msg);
        }
        return data;
      });
    });
  };

  function contentsPath(repo, path) {
    return '/repos/' + repo.owner + '/' + repo.repo + '/contents/' +
      path.split('/').map(encodeURIComponent).join('/');
  }

  CMS.ghGetSha = function (repo, path) {
    return CMS.gh(contentsPath(repo, path) + '?ref=' + encodeURIComponent(repo.branch))
      .then(function (d) { return d && d.sha; })
      .catch(function (e) { if (e.status === 404) return null; throw e; });
  };

  CMS.ghPutFile = function (repo, path, base64, message) {
    return CMS.ghGetSha(repo, path).then(function (sha) {
      var body = { message: message, content: base64, branch: repo.branch };
      if (sha) body.sha = sha;
      return CMS.gh(contentsPath(repo, path), { method: 'PUT', body: body });
    });
  };

  CMS.ghDeleteFile = function (repo, path, message) {
    return CMS.ghGetSha(repo, path).then(function (sha) {
      if (!sha) return null;
      return CMS.gh(contentsPath(repo, path), {
        method: 'DELETE',
        body: { message: message, sha: sha, branch: repo.branch }
      });
    });
  };

  CMS.ghList = function (repo, path) {
    return CMS.gh(contentsPath(repo, path) + '?ref=' + encodeURIComponent(repo.branch))
      .catch(function (e) { if (e.status === 404) return []; throw e; });
  };

  CMS.ghCheckAccess = function (repo) {
    return CMS.gh('/repos/' + repo.owner + '/' + repo.repo).then(function (d) {
      return { canWrite: !!(d && d.permissions && (d.permissions.push || d.permissions.admin)), isPrivate: !!d.private, fullName: d.full_name };
    });
  };

  CMS.textToBase64 = function (text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  };
})();
