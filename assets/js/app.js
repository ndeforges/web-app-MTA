// Tour de France – Affectations (JS vanilla)
// State + rendu sans dépendances. Persistance via localStorage.

(() => {
  const uid = () => crypto.randomUUID();
  const KEY = 'tdf_app_v1_plain';

  const STATUTS = [
    { code: 'FI', label: 'Apprenti (FI)' },
    { code: 'PB', label: 'Post-Bac (PB)' },
    { code: 'PTDF', label: 'PTDF (déjà diplômé)' },
  ];

  const VILLES_INIT = [
    'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Lille', 'Toulouse', 'Nantes', 'Strasbourg', 'Rennes', 'Nice'
  ];

  function seedData() {
    const cities = VILLES_INIT.slice(0, 6).map((name) => ({
      id: uid(),
      name,
      companies: [
        { id: uid(), name: `${name} MétalWorks`, posts: [ { id: uid(), title: 'Tourneur', slots: 2 }, { id: uid(), title: 'Fraiseur', slots: 1 } ] },
        { id: uid(), name: `${name} Ateliers Réunis`, posts: [ { id: uid(), title: 'Soudeur', slots: 2 } ] },
      ],
    }));
    const entrants = [
      { id: uid(), name: 'Alice Martin',  statut: 'FI',   diploma: 'CAP',     trainingDuration: 2, trainingComplete: false, optsTour: false, choices: [], assignment: null, validated: false },
      { id: uid(), name: 'Benoît Leroy',  statut: 'PB',   diploma: 'BAC Pro', trainingDuration: 3, trainingComplete: true,  optsTour: true,  choices: [], assignment: null, validated: false },
      { id: uid(), name: 'Camille Dupont',statut: 'PTDF', diploma: 'BTS',     trainingDuration: 2, trainingComplete: true,  optsTour: true,  choices: [], assignment: null, validated: false },
    ];
    return { cities, entrants };
  }

  // --- State & persistence -------------------------------------------------
  let state = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch(e){}
    return seedData();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
  function setState(patch) { state = { ...state, ...patch }; save(); renderAll(); }

  // --- Helpers --------------------------------------------------------------
  const el = (sel) => document.querySelector(sel);
  const els = (sel) => Array.from(document.querySelectorAll(sel));

  function buildAssignmentIndex() {
    const map = new Map(); // postId -> used
    state.entrants.forEach(e => { if (e.validated && e.assignment?.postId) map.set(e.assignment.postId, (map.get(e.assignment.postId)||0)+1); });
    return map;
  }

  function cityCapacity(city, idx) {
    const total = city.companies.reduce((a,co)=> a + co.posts.reduce((s,p)=> s+p.slots,0), 0);
    const used = city.companies.reduce((a,co)=> a + co.posts.reduce((s,p)=> s + (idx.get(p.id)||0), 0), 0);
    return { total, used, free: Math.max(0, total - used) };
  }

  function companiesWithFreePosts(city, idx) {
    const items = [];
    city.companies.forEach(co => co.posts.forEach(p => {
      const used = idx.get(p.id)||0; const free = Math.max(0, p.slots - used); if (free>0) items.push({company:co, post:p, freeCount:free});
    }));
    return items;
  }

  function cityById(id) { return state.cities.find(c=>c.id===id); }
  function entrantById(id) { return state.entrants.find(e=>e.id===id); }
  function isEligibleForTour(e){ return e.trainingComplete && e.optsTour===true && e.choices.length===3 && !e.validated; }

  // --- UI: onglets ---------------------------------------------------------
  function initTabs(){
    const buttons = els('[data-tab-btn]');
    buttons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tabBtn)));
    switchTab('candidats');
  }
  function switchTab(name){
    els('.tab-btn').forEach(b=>b.classList.remove('active'));
    els('.tab').forEach(t=>t.classList.remove('active'));
    const btn = el(`[data-tab-btn="${name}"]`); const tab = el(`#tab-${name}`);
    if(btn) btn.classList.add('active'); if(tab) tab.classList.add('active');
    lucide.createIcons();
  }

  // --- Rendu: stats --------------------------------------------------------
  function renderStats(){
    const idx = buildAssignmentIndex();
    const nbEntrants = state.entrants.length;
    const nbEligibles = state.entrants.filter(isEligibleForTour).length;
    const nbValides = state.entrants.filter(e=>e.validated).length;
    const caps = state.cities.map(c=>cityCapacity(c, idx));
    const totalCap = caps.reduce((a,b)=>a+b.total,0);
    const freeCap = caps.reduce((a,b)=>a+b.free,0);

    const tpl = (icon,label,val)=>`
      <div class="stat">
        <div class="icon"><i data-lucide="${icon}" class="w-5 h-5"></i></div>
        <div>
          <div class="label">${label}</div>
          <div class="value">${val}</div>
        </div>
      </div>`;

    el('#stats').innerHTML = [
      tpl('users', 'Primo-entrants', nbEntrants),
      tpl('list-checks', 'Éligibles Tour', nbEligibles),
      tpl('check-circle-2', 'Affectations validées', nbValides),
      tpl('building-2', 'Capacité totale', totalCap),
      tpl('map-pin', 'Places libres', freeCap),
    ].join('');
    lucide.createIcons();
  }

  // --- Candidats -----------------------------------------------------------
  function onAddEntrant(){
    const name = el('#in-nom').value.trim();
    const statut = el('#in-statut').value;
    const diploma = el('#in-diplome').value.trim();
    const trainingDuration = Number(el('#in-duree').value||2);
    if(!name) return alert('Nom requis');
    const payload = { id: uid(), name, statut, diploma, trainingDuration, trainingComplete:false, optsTour:false, choices:[], assignment:null, validated:false };
    setState({ entrants: [payload, ...state.entrants] });
    el('#in-nom').value=''; el('#in-diplome').value='';
  }

  function renderCandidats(){
    el('#nb-candidats').textContent = state.entrants.length;
    const search = el('#search').value.toLowerCase();
    const fstat = el('#filtre-statut').value;

    const rows = state.entrants
      .filter(e => fstat==='ALL' ? true : e.statut===fstat)
      .filter(e => e.name.toLowerCase().includes(search))
      .map(e => {
        const choices = e.choices.map((cid,i)=>{ const c = cityById(cid); return `<span class="badge">${i+1}. ${c?.name||'?'}</span>`; }).join(' ');
        const training = e.trainingComplete? '<span class="badge">Terminée</span>':'<span class="badge">En cours</span>';
        const tour = e.optsTour? '<span class="badge">Partant</span>':'<span class="badge">Non</span>';
        const tag = (code)=>({FI:'bg-blue-100 text-blue-800', PB:'bg-amber-100 text-amber-800', PTDF:'bg-emerald-100 text-emerald-800'})[code]||'';
        const statutBadge = `<span class="badge ${tag(e.statut)}">${(STATUTS.find(s=>s.code===e.statut)||{}).label||e.statut}</span>`;
        return `
          <div class="p-4 rounded-2xl border shadow-sm grid md:grid-cols-12 gap-3 items-center bg-white">
            <div class="md:col-span-3">
              <div class="font-medium">${e.name}</div>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                ${statutBadge}
                <span class="badge">${e.diploma || '—'}</span>
                <span class="badge">${e.trainingDuration} ans</span>
              </div>
            </div>
            <div class="md:col-span-3 text-sm">
              <div class="flex items-center gap-2"><i data-lucide="calendar-clock" class="w-4 h-4"></i> Formation ${training}</div>
              <div class="mt-2 flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4"></i> Tour de France ${tour}</div>
            </div>
            <div class="md:col-span-3">
              <div class="text-xs text-slate-500 mb-1">Choix de villes</div>
              ${e.choices?.length? `<div class="flex flex-wrap gap-1">${choices}</div>` : '<span class="text-sm opacity-70">Aucun choix</span>'}
            </div>
            <div class="md:col-span-3 flex justify-end gap-2">
              <button class="btn btn-outline btn-small" data-action="toggle-training" data-id="${e.id}">Basculer formation</button>
              <button class="btn btn-outline btn-small" data-action="toggle-tour" data-id="${e.id}">Basculer Tour</button>
              <button class="btn btn-small" data-action="edit-choices" data-id="${e.id}"><i data-lucide="map-pin"></i> Choix villes</button>
              <button class="btn btn-outline btn-small" data-action="remove-entrant" data-id="${e.id}"><i data-lucide="trash-2"></i></button>
            </div>
          </div>`;
      }).join('');

    el('#liste-candidats').innerHTML = rows || empty('Aucun candidat', "Ajoutez un primo‑entrant via le formulaire ci‑dessus.");
    lucide.createIcons();

    // actions
    el('#liste-candidats').querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', onCandidatAction));
  }

  function onCandidatAction(ev){
    const btn = ev.currentTarget; const id = btn.dataset.id; const e = entrantById(id); if(!e) return;
    const action = btn.dataset.action;
    if(action==='toggle-training') { e.trainingComplete = !e.trainingComplete; save(); renderAll(); }
    else if(action==='toggle-tour') { e.optsTour = !e.optsTour; save(); renderAll(); }
    else if(action==='edit-choices') { editChoices(e); }
    else if(action==='remove-entrant') { if(confirm('Supprimer ce candidat ?')) { state.entrants = state.entrants.filter(x=>x.id!==id); save(); renderAll(); } }
  }

  function editChoices(e){
    const options = state.cities.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const [c1, c2, c3] = e.choices;
    const html = `
      <div class="card">
        <div class="card-title"><i data-lucide="map-pin"></i> Choix de 3 villes pour ${e.name}</div>
        <div class="grid gap-3">
          ${['Choix 1','Choix 2','Choix 3'].map((lab,idx)=>`
            <div class="grid grid-cols-4 items-center gap-3">
              <label class="label col-span-1">${lab}</label>
              <select class="input col-span-3" data-choice-index="${idx}">
                <option value="">— Sélectionnez —</option>
                ${options}
              </select>
            </div>`).join('')}
          <div class="flex justify-end gap-2">
            <button class="btn btn-outline" id="btn-cancel-choices">Annuler</button>
            <button class="btn" id="btn-save-choices"><i data-lucide="save"></i> Enregistrer</button>
          </div>
        </div>
      </div>`;
    // Affiche temporairement en haut de l'onglet
    const container = el('#liste-candidats');
    const box = document.createElement('div'); box.innerHTML = html; container.prepend(box);
    lucide.createIcons();

    // pré-sélection
    box.querySelectorAll('select[data-choice-index]').forEach((sel,idx)=>{ sel.value = e.choices[idx]||''; });

    const cleanup = ()=> box.remove();

    box.querySelector('#btn-cancel-choices').addEventListener('click', cleanup);
    box.querySelector('#btn-save-choices').addEventListener('click', ()=>{
      const values = Array.from(box.querySelectorAll('select[data-choice-index]')).map(sel=>sel.value).filter(Boolean);
      // unicité et 3 choix
      if(values.length!==3) return alert('Sélectionnez exactement 3 villes.');
      if(new Set(values).size!==3) return alert('Les 3 villes doivent être distinctes.');
      e.choices = values; save(); renderAll();
    });
  }

  // --- Villes & entreprises ------------------------------------------------
  function onAddVille(){
    const name = el('#in-ville').value.trim(); if(!name) return;
    state.cities = [{ id: uid(), name, companies: [] }, ...state.cities]; save(); renderAll(); el('#in-ville').value='';
  }

  function renderVilles(){
    const idx = buildAssignmentIndex();
    const cards = state.cities.map(city => {
      const cap = cityCapacity(city, idx);
      const companies = city.companies.map(co => {
        const posts = co.posts.map(p => {
          const used = idx.get(p.id)||0; const free = Math.max(0, p.slots-used);
          return `<span class="card-post ${free? '':'opacity-60'}">${p.title} <span class="text-xs">(${free}/${p.slots})</span> <button class="ml-1 text-xs" data-action="remove-post" data-city="${city.id}" data-company="${co.id}" data-post="${p.id}" title="Supprimer">✕</button></span>`;
        }).join(' ');
        return `
          <div class="p-3 rounded-xl border">
            <div class="flex items-center justify-between">
              <div class="font-medium flex items-center gap-2"><i data-lucide="factory" class="w-4 h-4"></i> ${co.name}</div>
              <div class="flex gap-2">
                <button class="btn btn-outline btn-small" data-action="add-post" data-city="${city.id}" data-company="${co.id}">+ Poste</button>
                <button class="btn btn-outline btn-small" data-action="remove-company" data-city="${city.id}" data-company="${co.id}"><i data-lucide="trash-2"></i></button>
              </div>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">${posts || '<span class="text-sm text-slate-500">Aucun poste</span>'}</div>
          </div>`;
      }).join('');

      return `
        <div class="p-4 rounded-2xl border shadow-sm bg-white">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="font-semibold text-lg">${city.name}</div>
              <div class="text-sm text-slate-500">Capacité: ${cap.free}/${cap.total} libres</div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-outline btn-small" data-action="add-company" data-city="${city.id}"><i data-lucide="building-2"></i> Entreprise</button>
              <button class="btn btn-outline btn-small" data-action="remove-city" data-city="${city.id}"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
          <div class="my-3 border-t"></div>
          <div class="grid gap-3">${companies || empty('', 'Ajoutez une entreprise pour créer des postes.', true)}</div>
        </div>`;
    }).join('');

    el('#liste-villes').innerHTML = cards || empty('Aucune ville', 'Ajoutez une ville avec des entreprises/postes.');
    lucide.createIcons();

    // actions villes/entreprises
    el('#liste-villes').querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', onVilleAction));
  }

  function onVilleAction(ev){
    const btn = ev.currentTarget; const action = btn.dataset.action; const cityId = btn.dataset.city; const city = cityById(cityId);
    if(!city) return;
    if(action==='remove-city'){
      // bloquer si des affectations validées pointent sur des posts de cette ville
      const used = city.companies.some(co => co.posts.some(p => state.entrants.some(e => e.validated && e.assignment?.postId===p.id)));
      if(used) return alert('Impossible: des affectations validées utilisent cette ville.');
      if(confirm('Supprimer la ville ?')){ state.cities = state.cities.filter(c=>c.id!==cityId); save(); renderAll(); }
    }
    if(action==='add-company'){
      const name = prompt('Nom de l\'entreprise ?'); if(!name) return;
      city.companies.unshift({ id: uid(), name, posts: [] }); save(); renderAll();
    }
    if(action==='remove-company'){
      const coId = btn.dataset.company; const co = city.companies.find(x=>x.id===coId); if(!co) return;
      const used = co.posts.some(p => state.entrants.some(e => e.validated && e.assignment?.postId===p.id));
      if(used) return alert('Impossible: des affectations validées utilisent un poste de cette entreprise.');
      if(confirm('Supprimer cette entreprise ?')){ city.companies = city.companies.filter(x=>x.id!==coId); save(); renderAll(); }
    }
    if(action==='add-post'){
      const coId = btn.dataset.company; const co = city.companies.find(x=>x.id===coId); if(!co) return;
      const title = prompt('Intitulé du poste ? (ex: Soudeur)'); if(!title) return;
      const slots = Math.max(1, Number(prompt('Nombre de places ?', '1')||1));
      co.posts.unshift({ id: uid(), title, slots }); save(); renderAll();
    }
    if(action==='remove-post'){
      const coId = btn.dataset.company; const postId = btn.dataset.post; const co = city.companies.find(x=>x.id===coId); if(!co) return;
      const used = state.entrants.some(e => e.validated && e.assignment?.postId===postId);
      if(used) return alert('Impossible: ce poste a une affectation validée.');
      co.posts = co.posts.filter(p=>p.id!==postId); save(); renderAll();
    }
  }

  // --- Affectations --------------------------------------------------------
  function renderAffectations(){
    const idx = buildAssignmentIndex();
    const eligibles = state.entrants.filter(isEligibleForTour);

    const cards = eligibles.map(e => {
      const choices = e.choices.map((cid,i)=>{ const c = cityById(cid); return `<span class="badge ${cid===e.assignment?.cityId?'bg-slate-900 text-white':'bg-slate-100'}">${i+1}. ${c?.name||'?'}</span>`; }).join(' ');
      const optionsVille = e.choices.map(cid=>{ const c = cityById(cid); const cap = c? cityCapacity(c, idx).free : 0; return `<option value="${cid}">${c?.name} ${cap===0? '— (complet)': `— ${cap} libre(s)`}</option>`; }).join('');
      const city = cityById(e.assignment?.cityId || e.choices[0]);
      const avail = city? companiesWithFreePosts(city, idx) : [];
      const companies = Array.from(new Map(avail.map(o=>[o.company.id,o.company])).values());
      const optionsCo = companies.map(co=>`<option value="${co.id}">${co.name}</option>`).join('');
      const postOptions = (coId)=> avail.filter(o=>o.company.id===coId).map(o=>`<option value="${o.post.id}">${o.post.title} — ${o.freeCount} place(s)</option>`).join('');

      const firstCo = companies[0]?.id || '';
      const firstPostOptions = postOptions(firstCo);

      return `
        <div class="p-4 rounded-2xl border shadow-sm bg-white" data-entrant="${e.id}">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div class="font-semibold">${e.name}</div>
              <div class="text-sm text-slate-500">Formation: ${e.trainingDuration} ans</div>
            </div>
            <div class="flex flex-wrap gap-2 items-center">${choices}</div>
          </div>
          <div class="grid md:grid-cols-3 gap-3 mt-4">
            <div>
              <label class="label">Ville (doit être un choix)</label>
              <select class="input" data-field="cityId"><option value="">—</option>${optionsVille}</select>
              <div class="text-xs text-red-600 mt-1 hidden" data-warning="city">Ville non présente dans ses choix !</div>
            </div>
            <div>
              <label class="label">Entreprise</label>
              <select class="input" data-field="companyId" ${!city?'disabled':''}><option value="">—</option>${optionsCo}</select>
            </div>
            <div>
              <label class="label">Poste</label>
              <select class="input" data-field="postId" ${!firstCo?'disabled':''}><option value="">—</option>${firstPostOptions}</select>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button class="btn btn-outline btn-small" data-action="clear"><i data-lucide="x-circle"></i> Annuler</button>
            <button class="btn btn-small" data-action="validate"><i data-lucide="check-circle-2"></i> Valider l\'affectation</button>
          </div>
        </div>`;
    }).join('');

    el('#liste-eligibles').innerHTML = cards || empty('Aucun candidat éligible', "Un candidat est éligible s'il a terminé sa formation, a choisi de partir et a 3 villes.");
    lucide.createIcons();

    // Behavior for selects & buttons inside each card
    el('#liste-eligibles').querySelectorAll('[data-entrant]').forEach(card => {
      const entrantId = card.dataset.entrant; const e = entrantById(entrantId);
      const selCity = card.querySelector('[data-field="cityId"]');
      const selCompany = card.querySelector('[data-field="companyId"]');
      const selPost = card.querySelector('[data-field="postId"]');

      // default selections
      if(e.choices.length) selCity.value = e.choices[0];

      function syncCompanyAndPost(){
        const idx = buildAssignmentIndex();
        const city = cityById(selCity.value);
        const avail = city? companiesWithFreePosts(city, idx) : [];
        const companies = Array.from(new Map(avail.map(o=>[o.company.id,o.company])).values());
        selCompany.innerHTML = '<option value="">—</option>' + companies.map(co=>`<option value="${co.id}">${co.name}</option>`).join('');
        selCompany.disabled = companies.length===0;
        selPost.innerHTML = '<option value="">—</option>';
        selPost.disabled = true;
      }
      function syncPosts(){
        const idx = buildAssignmentIndex();
        const city = cityById(selCity.value);
        const avail = city? companiesWithFreePosts(city, idx) : [];
        const opts = avail.filter(o=>o.company.id===selCompany.value).map(o=>`<option value="${o.post.id}">${o.post.title} — ${o.freeCount} place(s)</option>`).join('');
        selPost.innerHTML = '<option value="">—</option>' + opts;
        selPost.disabled = !opts;
      }

      selCity.addEventListener('change', ()=>{ syncCompanyAndPost(); checkCityAllowed(); });
      selCompany.addEventListener('change', ()=>{ syncPosts(); });

      function checkCityAllowed(){
        const warn = card.querySelector('[data-warning="city"]');
        if(!e.choices.includes(selCity.value) && selCity.value) warn.classList.remove('hidden'); else warn.classList.add('hidden');
      }

      card.querySelector('[data-action="clear"]').addEventListener('click', ()=>{ e.assignment=null; e.validated=false; save(); renderAll(); });
      card.querySelector('[data-action="validate"]').addEventListener('click', ()=>{
        if(!selCity.value || !selCompany.value || !selPost.value) return alert('Sélections incomplètes');
        if(!e.choices.includes(selCity.value)) return alert('La ville doit être dans ses 3 choix.');
        e.assignment = { cityId: selCity.value, companyId: selCompany.value, postId: selPost.value };
        e.validated = true; save(); renderAll();
      });
    });

    // recap capacités
    const recap = state.cities.map(c=>{ const cap=cityCapacity(c, idx); return `<div class="p-3 rounded-xl border flex items-center justify-between bg-white"><div class="font-medium flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4"></i> ${c.name}</div><div class="text-sm">${cap.free}/${cap.total} libres</div></div>`; }).join('');
    el('#recap-capacites').innerHTML = recap;
    lucide.createIcons();
  }

  // --- Export / Import -----------------------------------------------------
  function renderDump(){ el('#dump').textContent = JSON.stringify(state, null, 2); }
  function onExport(){ const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`tdf-donnees-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); }
  function onImportOpen(){ el('#in-import').value = ''; alert('Collez un JSON exporté dans la zone, puis cliquez sur "Importer".'); }
  function onImportDo(){ try { const parsed = JSON.parse(el('#in-import').value); if(!parsed.cities||!parsed.entrants) throw new Error('Format invalide'); setState(parsed); } catch(e){ alert('Import impossible: '+e.message); } }

  // --- Utils ---------------------------------------------------------------
  function empty(title='Aucun élément', hint='', raw=false){
    const html = `<div class="empty">${title? `<div class="empty-title">${title}</div>`:''}${hint? `<div class="empty-hint">${hint}</div>`:''}</div>`;
    return raw? html : html;
  }

  // --- Wireup global -------------------------------------------------------
  function wireup(){
    el('#btn-add-entrant').addEventListener('click', onAddEntrant);
    el('#btn-add-ville').addEventListener('click', onAddVille);
    el('#search').addEventListener('input', renderCandidats);
    el('#filtre-statut').addEventListener('change', renderCandidats);

    el('#btn-export').addEventListener('click', onExport);
    el('#btn-import').addEventListener('click', onImportOpen);
    el('#btn-do-import').addEventListener('click', onImportDo);
    el('#btn-reset-import').addEventListener('click', ()=> el('#in-import').value='');
  }

  function renderAll(){ renderStats(); renderCandidats(); renderVilles(); renderAffectations(); renderDump(); }

  // init
  document.addEventListener('DOMContentLoaded', () => { initTabs(); wireup(); renderAll(); });
})();
