(function () {
  'use strict';

  const MAIN_TEXT = 'This action will have consequences';
  const SUB_TEXT = 'Are you sure you want to create this Pull Request?';

  function createModal() {
    if (document.querySelector('.gh-pr-warning-overlay')) return null;

    const overlay = document.createElement('div');
    overlay.className = 'gh-pr-warning-overlay';

    const modal = document.createElement('div');
    modal.className = 'gh-pr-warning-modal';

    const deco = document.createElement('div');
    deco.className = 'gh-pr-warning-deco';
    deco.innerHTML = `
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 2v20" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M5 8h14" stroke="white" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" />
      </svg>`;

    const title = document.createElement('div');
    title.className = 'gh-pr-warning-title';
    title.textContent = 'This action will have consequences';

    const sub = document.createElement('div');
    sub.className = 'gh-pr-warning-sub';
    sub.textContent = 'Are you sure you want to create this Pull Request?';

    const actions = document.createElement('div');
    actions.className = 'gh-pr-warning-actions';

    const confirm = document.createElement('button');
    confirm.className = 'gh-pr-warning-btn gh-pr-warning-confirm';
    confirm.textContent = 'Continue';

    const cancel = document.createElement('button');
    cancel.className = 'gh-pr-warning-btn gh-pr-warning-cancel';
    cancel.textContent = 'Cancel';

    actions.appendChild(confirm);
    actions.appendChild(cancel);

    // Butterfly element
    const butterfly = document.createElement('img');
    butterfly.src = 'https://upload.wikimedia.org/wikipedia/commons/3/32/Butterfly_icon.svg';
    butterfly.className = 'gh-pr-butterfly';

    modal.appendChild(deco);
    modal.appendChild(title);
    modal.appendChild(sub);
    modal.appendChild(actions);
    modal.appendChild(butterfly);
    overlay.appendChild(modal);

    // Play sound
    const audio = new Audio('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg');
    audio.volume = 0.5;
    audio.play().catch(() => {});

    return { overlay, confirm, cancel };
  }

  function showConfirmation() {
    return new Promise((resolve) => {
      const created = createModal();
      if (!created) {
        resolve(true);
        return;
      }
      const { overlay, confirm, cancel } = created;
      document.body.appendChild(overlay);

      function cleanup() {
        try { overlay.remove(); } catch (e) {}
      }

      confirm.addEventListener('click', () => { cleanup(); resolve(true); });
      cancel.addEventListener('click', () => { cleanup(); resolve(false); });

      function onKey(e) {
        if (e.key === 'Escape') { cleanup(); resolve(false); document.removeEventListener('keydown', onKey); }
      }
      document.addEventListener('keydown', onKey);
    });
  }

  function hookPRForm(form) {
    if (!form || form.dataset.__prWarningAttached) return;
    form.dataset.__prWarningAttached = '1';

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      ev.stopPropagation();

      const ok = await showConfirmation();
      if (ok) {
        requestAnimationFrame(() => {
          const flagged = form.dataset.__prWarningAttached;
          delete form.dataset.__prWarningAttached;
          form.submit();
          form.dataset.__prWarningAttached = flagged;
        });
      }
    }, { capture: true });
  }

  function findAndHookPRForms(root = document) {
    const forms = Array.from(root.querySelectorAll('form'));
    for (const f of forms) {
      const action = (f.getAttribute('action') || '').toLowerCase();
      const hasPRButton = !!f.querySelector('button[type="submit"], input[type="submit"]');
      if (hasPRButton && (action.includes('/pull') || location.pathname.includes('/compare/'))) {
        hookPRForm(f);
      }
    }
  }

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) {
        m.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('form')) {
            findAndHookPRForms(node);
          } else {
            findAndHookPRForms(node);
          }
        });
      }
    }
  });

  function init() {
    try {
      findAndHookPRForms(document);
      mo.observe(document, { childList: true, subtree: true });
    } catch (e) {
      console.error('GH PR Warning init error', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
