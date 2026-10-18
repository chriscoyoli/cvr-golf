/*
 * Passphrase gate for the prototype.
 * Load this first in <head>. It hides the page until the passphrase is
 * entered, then remembers it in this browser.
 *
 * Note: GitHub Pages is static hosting, so this keeps casual visitors out
 * but is not real security. The repository files themselves are public.
 *
 * To change the passphrase, replace HASH with the SHA-256 hex of
 * "cvr-golf-gate:" + your passphrase, e.g.
 *   node -e "console.log(require('crypto').createHash('sha256').update('cvr-golf-gate:NEWPASS').digest('hex'))"
 */
(function () {
  'use strict';
  var HASH = '05aa308e16757fda27d545386b8fff2a908fddecf4835812032dbd7b9fbfb6f6';
  var KEY = 'cvrcms:gate';

  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  if (stored() === HASH) return;

  var hide = document.createElement('style');
  hide.id = 'cvr-gate-hide';
  hide.textContent = 'body > :not(#cvr-gate){display:none !important}';
  document.head.appendChild(hide);

  function sha256(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  function unlock() {
    try { localStorage.setItem(KEY, HASH); } catch (e) { /* session only */ }
    var g = document.getElementById('cvr-gate');
    if (g) g.remove();
    hide.remove();
  }

  function build() {
    var wrap = document.createElement('div');
    wrap.id = 'cvr-gate';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'cvr-gate-title');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:20px;' +
      'background:#f3efe8;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#23272a';
    wrap.innerHTML =
      '<form style="width:min(360px,100%);background:#fff;border:1px solid #e3ded6;border-radius:14px;padding:28px 24px;box-shadow:0 20px 60px rgba(35,39,42,.12);text-align:center">' +
      '<div style="width:34px;height:34px;margin:0 auto 14px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffb36b,#f6871f 55%,#d8690c)"></div>' +
      '<h1 id="cvr-gate-title" style="margin:0 0 6px;font:600 22px/1.2 Georgia,serif">Golf Academy preview</h1>' +
      '<p style="margin:0 0 18px;color:#4b5258;font-size:14px">Enter the passphrase to continue.</p>' +
      '<input id="cvr-gate-input" type="password" autocomplete="current-password" aria-label="Passphrase" ' +
      'style="width:100%;box-sizing:border-box;height:42px;padding:0 12px;border:1px solid #d4cec4;border-radius:9px;font-size:16px;outline:none">' +
      '<p id="cvr-gate-err" role="alert" style="margin:10px 0 0;min-height:20px;color:#b23b2e;font-size:13px"></p>' +
      '<button type="submit" style="margin-top:6px;width:100%;height:42px;border:0;border-radius:9px;background:#23272a;color:#fff;font-weight:600;font-size:15px;cursor:pointer">Continue</button>' +
      '</form>';
    document.body.appendChild(wrap);
    var input = document.getElementById('cvr-gate-input');
    var err = document.getElementById('cvr-gate-err');
    input.addEventListener('focus', function () { input.style.borderColor = '#f6871f'; });
    input.addEventListener('blur', function () { input.style.borderColor = '#d4cec4'; });
    wrap.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      sha256('cvr-golf-gate:' + input.value.trim().toLowerCase()).then(function (h) {
        if (h === HASH) unlock();
        else { err.textContent = 'That passphrase is not right.'; input.select(); }
      });
    });
    setTimeout(function () { input.focus(); }, 30);
  }

  if (document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
