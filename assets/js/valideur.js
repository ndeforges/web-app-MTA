// Interface VALIDEUR – v3 (compatible store.js v3 + db.json v3)
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // ------- UI helpers -------
  function stat(icon, label, val) {
    return `<div class="stat"><div class="icon"><i data-lucide="${icon}" class="w-5 h-5"></i></div><div><div class="label">${label}</div><div class="value">${val}</div></div></div>`;
  }

  function phaseBadge(phase) {
    if (!phase) return `<span class="badge">—</span>`;
    const t = phase.type;
    const lvl = phase.level ? ` ${phase.level}` : '';
    const tone =
      t === 'FI' ? 'background:#dbeafe;color:#1e3a8a' :
      t === 'PB' ? 'background:#fde68a;color:#92400e' :
      t === 'PTDF' ? 'background:#d1fae5;color:#065f46' :
      t === 'ASPIRANT' ? 'background:#e0e7ff;color:#3730a3' :
      t === 'COMPAGNON' ? 'background:#fee2e2;color:#991b1b' :
      'background:#f1f5f9;color:#0f172a';
    return `<span class="badge" style="${tone}">${t}${lvl}</span>`;
  }

  function renderStats() {
    const st = TDF.get();
    const idx = TDF.buildAssignmentIndex();
    const nbJeunes = (st.jeunes || []).length;
    const nbSubmitted = (st.jeunes || []).filter((j) => (j.choices || []).length === 3).length;
    const nbValidated = (st.jeunes || []).filter((j) => j.validated).length;
    const totalCap = (st.cities || [])
      .map((c) => TDF.cityCapacity(c, idx).total)
      .reduce((a, b) => a + b, 0);
    const freeCap = (st.cities || [])
      .map((c) => TDF.cityCapacity(c, idx).free)
      .reduce((a, b) => a + b, 0);

    $('#stats').innerHTML = [
      stat('users', 'Jeunes inscrits', nbJeunes),
      stat('list-checks', 'Avec 3 choix', nbSubmitted),
      stat('check-circle-2', 'Affectations validées', nbValidated),
      stat('building-2', 'Capacité totale', totalCap),
      stat('map-pin', 'Places libres', freeCap),
    ].join('');
    if (window.lucide?.createIcons) lucide.createIcons();
  }

  function renderListe() {
    const st = TDF.get();
    const search = ($('#search')?.value || '').toLowerCase();
    const fil = $('#filtre')?.value || 'ALL';

    const rows = (st.jeunes || [])
      .filter((j) => j.name.toLowerCase().includes(search))
      .filter((j) => (fil === 'ALL' ? true : fil === 'SUB' ? (j.choices || []).length === 3 : (j.choices || []).length !== 3))
      .map((j) => {
        const choices = (j.choices || [])
          .map((cid, i) => {
            const c = (st.cities || []).find((x) => x.id === cid);
            return `<span class="badge">${i + 1}. ${c?.name || '?'}</span>`;
          })
          .join(' ');
        const just = j.justification ? j.justification.replace(/</g, '&lt;') : '<span class="text-slate-500">(pas de justification)</span>';
        return `
          <div class="row" data-id="${j.id}">
            <div class="row-head">
              <div>
                <div class="font-medium">${j.name}</div>
                <div class="text-sm text-slate-500 flex flex-wrap gap-2 items-center">
                  ${phaseBadge(j.phase)}
                  <span class="badge">${j.diploma || '—'}</span>
                  <span class="badge">${j.trainingDuration || '—'} ans</span>
                  ${(j.choices || []).length === 3 ? '<span class="badge">3 choix soumis</span>' : '<span class="badge">incomplet</span>'}
                  ${j.validated ? '<span class="badge">validé</span>' : ''}
                </div>
              </div>
              <div class="row-actions">
                <button class="btn btn-outline btn-small" data-action="code">Code</button>
                <button class="btn btn-outline btn-small" data-action="assign"><i data-lucide="list-checks"></i> Affecter</button>
              </div>
            </div>
            <div class="mt-2">
              <div class="text-xs text-slate-500 mb-1">Justification</div>
              <div class="text-sm bg-slate-50 p-2 rounded-lg border">${just}</div>
              <div class="mt-2 flex flex-wrap gap-1">${choices}</div>
            </div>
            <div class="mt-3 hidden" data-slot="assign"></div>
          </div>`;
      })
      .join('');

    $('#liste').innerHTML = rows || `<div class="text-slate-500">Aucun résultat.</div>`;
    if (window.lucide?.createIcons) lucide.createIcons();

    // actions
    $('#liste').querySelectorAll('[data-action="assign"]').forEach((btn) => btn.addEventListener('click', onAssignClick));
    $('#liste').querySelectorAll('[data-action="code"]').forEach((btn) => btn.addEventListener('click', onCodeClick));
  }

  function onCodeClick(ev) {
    const row = ev.currentTarget.closest('.row');
    const id = row.dataset.id;
    const st = TDF.get();
    const j = (st.jeunes || []).find((x) => x.id === id);
    if (!j) return;
    const regen = confirm(`Code actuel: ${j.accessCode || '—'}\n\nGénérer un nouveau code ?`);
    if (regen) {
      TDF.generateCode(id);
      renderListe();
    }
  }

  function onAssignClick(ev) {
    const row = ev.currentTarget.closest('.row');
    const slot = row.querySelector('[data-slot="assign"]');
    slot.classList.toggle('hidden');
    if (!slot.dataset.ready) {
      slot.innerHTML = buildAssignUI(row.dataset.id);
      wireAssign(slot, row.dataset.id);
      slot.dataset.ready = '1';
      if (window.lucide?.createIcons) lucide.createIcons();
    }
  }

  function buildAssignUI(jeuneId) {
    const st = TDF.get();
    const j = (st.jeunes || []).find((x) => x.id === jeuneId);
    const idx = TDF.buildAssignmentIndex();
    const optionsVille = (j.choices || [])
      .map((cid) => {
        const c = (st.cities || []).find((x) => x.id === cid);
        if (!c) return '';
        const cap = TDF.cityCapacity(c, idx).free;
        return `<option value="${cid}">${c.name} ${cap === 0 ? '— (complet)' : '— ' + cap + ' libre(s)'}</option>`;
      })
      .join('');
    return `
      <div class="grid md:grid-cols-3 gap-3 p-3 border rounded-xl">
        <div>
          <label class="label">Ville</label>
          <select class="input" data-field="city"><option value="">—</option>${optionsVille}</select>
          <div class="text-xs text-red-600 mt-1 hidden" data-warn="city">Doit appartenir aux 3 choix.</div>
        </div>
        <div>
          <label class="label">Entreprise</label>
          <select class="input" data-field="company" disabled><option value="">—</option></select>
        </div>
        <div>
          <label class="label">Poste</label>
          <select class="input" data-field="post" disabled><option value="">—</option></select>
        </div>
        <div class="md:col-span-3 flex justify-end gap-2">
          <button class="btn btn-outline btn-small" data-action="clear"><i data-lucide="x-circle"></i> Annuler</button>
          <button class="btn btn-small" data-action="validate"><i data-lucide="check-circle-2"></i> Valider</button>
        </div>
      </div>`;
  }

  function wireAssign(container, jeuneId) {
    const st = TDF.get();
    const j = (st.jeunes || []).find((x) => x.id === jeuneId);
    const selCity = container.querySelector('[data-field="city"]');
    const selCo = container.querySelector('[data-field="company"]');
    const selPost = container.querySelector('[data-field="post"]');

    function syncCompanies() {
      const idx = TDF.buildAssignmentIndex();
      const city = (st.cities || []).find((c) => c.id === selCity.value);
      const avail = city ? TDF.companiesWithFreePosts(city, idx) : [];
      const companies = Array.from(new Map(avail.map((o) => [o.company.id, o.company])).values());
      selCo.innerHTML = '<option value="">—</option>' + companies.map((co) => `<option value="${co.id}">${co.name}</option>`).join('');
      selCo.disabled = companies.length === 0;
      selPost.innerHTML = '<option value="">—</option>';
      selPost.disabled = true;
    }
    function syncPosts() {
      const idx = TDF.buildAssignmentIndex();
      const city = (st.cities || []).find((c) => c.id === selCity.value);
      const avail = city ? TDF.companiesWithFreePosts(city, idx) : [];
      const opts = avail
        .filter((o) => o.company.id === selCo.value)
        .map((o) => `<option value="${o.post.id}">${o.post.title} — ${o.freeCount} place(s)</option>`)
        .join('');
      selPost.innerHTML = '<option value="">—</option>' + opts;
      selPost.disabled = !opts;
    }

    selCity.addEventListener('change', () => {
      const warn = container.querySelector('[data-warn="city"]');
      if (!j.choices?.includes(selCity.value) && selCity.value) warn.classList.remove('hidden');
      else warn.classList.add('hidden');
      syncCompanies();
    });
    selCo.addEventListener('change', syncPosts);

    container.querySelector('[data-action="clear"]').addEventListener('click', () => {
      TDF.clearAssignment(jeuneId);
      renderAll();
    });
    container.querySelector('[data-action="validate"]').addEventListener('click', () => {
      if (!selCity.value || !selCo.value || !selPost.value) return alert('Sélections incomplètes');
      if (!j.choices?.includes(selCity.value)) return alert('Ville hors des 3 choix');
      TDF.validateAssignment(jeuneId, { cityId: selCity.value, companyId: selCo.value, postId: selPost.value });
      renderAll();
    });
  }

  function renderCapacites() {
    const st = TDF.get();
    const idx = TDF.buildAssignmentIndex();
    $('#capacites').innerHTML = (st.cities || [])
      .map((c) => {
        const cap = TDF.cityCapacity(c, idx);
        return `<div class="p-3 rounded-xl border flex items-center justify-between bg-white">
          <div class="font-medium flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4"></i> ${c.name}</div>
          <div class="text-sm">${cap.free}/${cap.total} libres</div>
          <button class="btn btn-outline btn-small" data-action="add-company" data-city="${c.id}">+ Entreprise</button>
        </div>`;
      })
      .join('');
    if (window.lucide?.createIcons) lucide.createIcons();

    // + Entreprise (schéma v3 : companies à plat)
    $('#capacites')
      .querySelectorAll('[data-action="add-company"]')
      .forEach((b) =>
        b.addEventListener('click', (ev) => {
          const cityId = ev.currentTarget.dataset.city;
          const name = prompt("Nom de l'entreprise ?");
          if (!name) return;
          const coId = `${cityId}-${Date.now().toString(36)}`;
          TDF.addCompany(cityId, name, coId);
          const title = prompt('Premier poste (ex: Soudeur)');
          if (title) {
            const slots = Math.max(1, Number(prompt('Nombre de places ?', '1') || 1));
            TDF.addPost(coId, title, slots);
          }
          renderAll();
        })
      );
  }

  function wireSideActions() {
    // ⚠️ v3: addCity(countryId, name, id?)
    $('#btn-add-ville').addEventListener('click', () => {
      const countryId = prompt('Pays (ex: FR, AU) ?', 'FR') || 'FR';
      const name = prompt('Nom de la ville ?');
      if (!name) return;
      const cityId = `${countryId.toLowerCase()}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      TDF.addCity(countryId, name, cityId);
      renderAll();
    });

    // Export / Import JSON (snapshot localStorage)
    $('#btn-export').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(TDF.get(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tdf-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    $('#btn-import').addEventListener('click', () => {
      const txt = $('#import-text').value.trim();
      if (!txt) return;
      try {
        const parsed = JSON.parse(txt);
        // sécurité minimale : attendre les clés majeures
        if (!parsed.cities || !parsed.jeunes || !parsed.companies || !parsed.posts) throw new Error('Format invalide (clés manquantes)');
        // Remplace tout l'état par le JSON importé
        TDF.set(parsed);
        renderAll();
      } catch (e) {
        alert('Import impossible: ' + e.message);
      }
    });
  }

  function renderAll() {
    renderStats();
    renderListe();
    renderCapacites();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.TDF) {
      alert('Erreur: store.js non chargé');
      return;
    }
    await TDF.ready(); // attendre db.json + snapshot local
    renderAll();
    $('#search')?.addEventListener('input', renderListe);
    $('#filtre')?.addEventListener('change', renderListe);
    wireSideActions();
  });
})();
