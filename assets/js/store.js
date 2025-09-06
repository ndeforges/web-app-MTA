// Store (lecture db.json, écriture localStorage) — v3 (Admin ready)
// Placez ce fichier dans: assets/js/store.js
(function () {
  const KEY = 'tdf_two_ui_v3';        // nouvelle clé (évite les conflits)
  const DB_PATH = './assets/js/db.json';

  const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  let state = null; // { countries, cities, companies, posts, jeunes, jeunesAbandon, jeunesSedentaires, meta }

  // ---------- Calculs capacités / index ----------
  function buildAssignmentIndex() {
    const map = new Map(); // postId -> used count
    (state.jeunes || []).forEach(j => {
      if (j.validated && j.assignment?.postId) {
        map.set(j.assignment.postId, (map.get(j.assignment.postId) || 0) + 1);
      }
    });
    return map;
  }

  function cityCapacity(city, idx) {
    const companies = (state.companies || []).filter(co => co.cityId === city.id);
    const posts = (state.posts || []).filter(p => companies.some(co => co.id === p.companyId));
    const total = posts.reduce((a, p) => a + (p.slots || 0), 0);
    const used  = posts.reduce((a, p) => a + (idx.get(p.id) || 0), 0);
    return { total, used, free: Math.max(0, total - used) };
  }

  function companiesWithFreePosts(city, idx) {
    const companies = (state.companies || []).filter(co => co.cityId === city.id);
    const items = [];
    companies.forEach(co => {
      (state.posts || [])
        .filter(p => p.companyId === co.id)
        .forEach(p => {
          const free = Math.max(0, (p.slots || 0) - (idx.get(p.id) || 0));
          if (free > 0) items.push({ company: co, post: p, freeCount: free });
        });
    });
    return items;
  }

  // ---------- Persistance ----------
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }

  async function load() {
    // 1) Snapshot localStorage prioritaire
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { state = JSON.parse(raw); return state; }
    } catch (_) {}

    // 2) Sinon, lecture de db.json
    try {
      const res = await fetch(DB_PATH, { cache: 'no-store' });
      if (!res.ok) throw new Error('db.json introuvable');
      const db = await res.json();
      state = normalizeFromDB(db);
      save();
      return state;
    } catch (e) {
      console.warn('Fallback seed (db.json non chargé):', e);
      state = {
        countries: [{ id: 'FR', name: 'France' }],
        cities: [{ id: 'paris', name: 'Paris', countryId: 'FR' }],
        companies: [{ id: 'co-paris-mw', name: 'Paris MétalWorks', cityId: 'paris' }],
        posts: [{ id: 'p-paris-1', companyId: 'co-paris-mw', title: 'Tourneur', slots: 1 }],
        jeunes: [
          { id: 'j-demo', name: 'Jeune Démo', metier: 'MECANICIEN', phase: { type:'FI' },
            diploma: 'CAP', trainingDuration: 2, trainingComplete: true, optsTour: true,
            choices: ['paris','paris','paris'], justification: '', accessCode: '111-222',
            assignment: null, validated: false, dateSubmitted: null, cityHistory: [] }
        ],
        jeunesAbandon: [],
        jeunesSedentaires: [],
        meta: { version: 3 }
      };
      save();
      return state;
    }
  }

  function normalizeFromDB(db) {
    const shape = { countries: [], cities: [], companies: [], posts: [], jeunes: [], jeunesAbandon: [], jeunesSedentaires: [], meta: {} };
    const merged = { ...shape, ...db };

    merged.countries = (merged.countries || []).map(c => ({ id: String(c.id), name: String(c.name) }));
    merged.cities    = (merged.cities || []).map(c => ({ ...c, id: String(c.id), countryId: String(c.countryId) }));
    merged.companies = (merged.companies || []).map(co => ({ ...co, id: String(co.id), cityId: String(co.cityId) }));
    merged.posts     = (merged.posts || []).map(p => ({ ...p, id: String(p.id), companyId: String(p.companyId), slots: Math.max(1, Number(p.slots || 1)) }));

    const normJeune = (j) => ({
      id: String(j.id),
      name: String(j.name||''),
      metier: j.metier || null, // ELECTROTECHNICIEN | MECANICIEN | MECANICIEN_OUTILLEUR | MARECHAL_FERRAND
      phase: j.phase || { type: j.statut || 'FI', level: j.level || null }, // compat ancien
      gache: j.gache || null, // PREVOT | MAITRE_STAGE | ITINERANT
      diploma: j.diploma || '',
      trainingDuration: Number(j.trainingDuration||0),
      trainingComplete: Boolean(j.trainingComplete),
      optsTour: Boolean(j.optsTour),
      choices: Array.isArray(j.choices) ? j.choices.map(String) : [],
      justification: j.justification || '',
      accessCode: String(j.accessCode || ''),
      assignment: j.assignment ? { cityId: String(j.assignment.cityId), companyId: String(j.assignment.companyId), postId: String(j.assignment.postId) } : null,
      validated: Boolean(j.validated),
      dateSubmitted: j.dateSubmitted || null,
      cityHistory: Array.isArray(j.cityHistory) ? j.cityHistory.map(h=>({ year: Number(h.year), cityId: String(h.cityId) })) : [],
    });

    merged.jeunes = (merged.jeunes || []).map(normJeune);
    merged.jeunesAbandon = (merged.jeunesAbandon || []).map(normJeune);
    merged.jeunesSedentaires = (merged.jeunesSedentaires || []).map(normJeune);

    return merged;
  }

  // ---------- API publique ----------
  const api = {
    // init/ready
    ready: () => initPromise,
    get: () => state,
    set: (patch) => { state = { ...state, ...patch }; save(); },

    // catalogues (écriture locale)
    addCountry(name) { state.countries.unshift({ id: (name||'').toUpperCase().slice(0,2) || uid(), name }); save(); },
    addCity(countryId, name, id) { state.cities.unshift({ id: id || slug(name), name, countryId: String(countryId) }); save(); },
    addCompany(cityId, name, id) { state.companies.unshift({ id: id || slugId(cityId, name), name, cityId: String(cityId) }); save(); },
    addPost(companyId, title, slots = 1, id) { state.posts.unshift({ id: id || slugId(companyId, title), companyId: String(companyId), title, slots: Math.max(1, Number(slots || 1)) }); save(); },

    // jeunes (pool actif)
    findEntrantByCode(code) { return (state.jeunes || []).find(j => j.accessCode === (code || '').trim()); },
    submitChoices(entrantId, cityIds, justification) {
      const j = (state.jeunes || []).find(x => x.id === entrantId); if (!j) return false;
      j.choices = cityIds.map(String);
      j.justification = justification || '';
      j.optsTour = true;
      j.dateSubmitted = new Date().toISOString();
      save();
      return true;
    },
    generateCode(id) { const j = (state.jeunes || []).find(x => x.id === id); if (!j) return; j.accessCode = randCode(); save(); },
    toggleTraining(id) { const j = (state.jeunes || []).find(x => x.id === id); if (!j) return; j.trainingComplete = !j.trainingComplete; save(); },

    // affectations (pool actif)
    validateAssignment(entrantId, payload) {
      const j = (state.jeunes || []).find(x => x.id === entrantId); if (!j) return false;
      j.assignment = { cityId: String(payload.cityId), companyId: String(payload.companyId), postId: String(payload.postId) };
      j.validated = true;
      save();
      return true;
    },
    clearAssignment(entrantId) { const j = (state.jeunes || []).find(x => x.id === entrantId); if (!j) return; j.assignment = null; j.validated = false; save(); },

    // transitions de pool
    moveToAbandon(id, reason) {
      const idx = (state.jeunes || []).findIndex(x=>x.id===id); if (idx<0) return false;
      const j = state.jeunes.splice(idx,1)[0];
      j.reason = reason||j.reason||''; j.pool='abandon';
      state.jeunesAbandon.unshift(j); save(); return true;
    },
    moveToSedentaire(id, cityId) {
      const idx = (state.jeunes || []).findIndex(x=>x.id===id); if (idx<0) return false;
      const j = state.jeunes.splice(idx,1)[0];
      if (cityId) j.assignment = { ...(j.assignment||{}), cityId };
      j.pool='sedentaire';
      state.jeunesSedentaires.unshift(j); save(); return true;
    },
    restoreFromAbandon(id) {
      const idx = (state.jeunesAbandon || []).findIndex(x=>x.id===id); if (idx<0) return false;
      const j = state.jeunesAbandon.splice(idx,1)[0];
      delete j.pool; state.jeunes.unshift(j); save(); return true;
    },
    restoreFromSedentaire(id) {
      const idx = (state.jeunesSedentaires || []).findIndex(x=>x.id===id); if (idx<0) return false;
      const j = state.jeunesSedentaires.splice(idx,1)[0];
      delete j.pool; state.jeunes.unshift(j); save(); return true;
    },

    // capacités
    buildAssignmentIndex,
    cityCapacity,
    companiesWithFreePosts,

    // util
    listCodes() { return (state.jeunes || []).map(j => ({ name: j.name, code: j.accessCode })); },
    reloadFromDB: async () => { localStorage.removeItem(KEY); await load(); },
  };

  // ---------- Utils ----------
  function randCode() { const n = () => Math.floor(100 + Math.random() * 900); return `${n()}-${n()}`; }
  function slug(t) { return String(t||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || uid(); }
  function slugId(prefix, t) { return `${String(prefix)}-${slug(t)}`.replace(/--+/g,'-'); }

  // ---------- Init ----------
  const initPromise = (async () => { await load(); })();
  window.TDF = api;
})();
