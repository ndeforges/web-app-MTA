// Interface JEUNE – choix de 3 villes + justification
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  let current = null; // entrant

  function renderLogin() {
    $('#login')?.classList.remove('hidden');
    $('#form')?.classList.add('hidden');
    $('#done')?.classList.add('hidden');
  }

  function renderForm() {
    if (!current) return;
    const state = TDF.get();
    const cities = state.cities || [];
    const e = current;

    $('#login')?.classList.add('hidden');
    $('#form')?.classList.remove('hidden');
    $('#done')?.classList.add('hidden');

    const options = cities.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');

    $('#jeune-form').innerHTML = `
      <div class="text-sm text-slate-600">Connecté comme <span class="font-medium">${e.name}</span> — Statut: ${e.statut}</div>
      <div class="grid gap-3">
        ${['Choix 1', 'Choix 2', 'Choix 3']
          .map(
            (lab, idx) => `
          <div class="grid grid-cols-4 items-center gap-3">
            <label class="label col-span-1">${lab}</label>
            <select class="input col-span-3" data-choice-index="${idx}">
              <option value="">— Sélectionnez —</option>${options}
            </select>
          </div>`
          )
          .join('')}
        <div>
          <label class="label">Justification (motivations, contraintes, entreprise souhaitée, etc.)</label>
          <textarea id="justif" class="input min-h-[120px]" placeholder="Explique ton choix pour aider les bénévoles à te placer au mieux…"></textarea>
          <div class="note mt-1">Ton choix est modifiable tant qu'il n'a pas été validé.</div>
        </div>
        <div class="flex justify-end gap-2">
          <button id="btn-save" class="btn"><i data-lucide="save"></i> Enregistrer / Mettre à jour</button>
        </div>
      </div>`;

    $$('#jeune-form select[data-choice-index]').forEach((sel, idx) => {
      sel.value = e.choices[idx] || '';
    });
    const justif = $('#justif');
    if (justif) justif.value = e.justification || '';

    if (window.lucide?.createIcons) lucide.createIcons();

    $('#btn-save')?.addEventListener('click', () => {
      const values = $$('#jeune-form select[data-choice-index]')
        .map((sel) => sel.value)
        .filter(Boolean);
      if (values.length !== 3) return alert('Merci de sélectionner exactement 3 villes.');
      if (new Set(values).size !== 3) return alert('Les 3 villes doivent être différentes.');
      const ok = TDF.submitChoices(e.id, values, $('#justif')?.value.trim() || '');
      if (ok) {
        renderDone();
      }
    });
  }

  function renderDone() {
    $('#login')?.classList.add('hidden');
    $('#form')?.classList.add('hidden');
    $('#done')?.classList.remove('hidden');
    if (window.lucide?.createIcons) lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.TDF) {
      alert(
        `Erreur : store.js n'est pas chargé. Vérifiez le chemin ./assets/js/store.js.\n\nAstuce : servez les pages via http://localhost pour que le localStorage soit partagé.`
      );
      return;
    }

    renderLogin();

    const submit = () => {
      const code = $('#code')?.value?.trim() || '';
      const e = TDF.findEntrantByCode(code);
      if (!e) return alert("Code invalide. Vérifiez auprès de l'organisation.");
      if (e.validated)
        return alert("Votre affectation est déjà validée, les choix ne sont plus modifiables.");
      current = e;
      renderForm();
    };

    $('#btn-login')?.addEventListener('click', submit);
    $('#code')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') submit();
    });
  });
})();