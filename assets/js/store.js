// Store partagé pour les deux interfaces (jeune & valideur)
(() => {
  'use strict';

  const KEY = 'tdf_two_ui_v1';

  // UUID avec repli si crypto.randomUUID n'est pas dispo
  const uid = () =>
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  const STATUTS = [
    { code: 'FI', label: 'Apprenti (FI)' },
    { code: 'PB', label: 'Post-Bac (PB)' },
    { code: 'PTDF', label: 'PTDF (déjà diplômé)' },
  ];

  const VILLES_INIT = ['Paris','Lyon','Marseille','Bordeaux','Lille','Toulouse','Nantes','Strasbourg'];

  function randCode() {
    const n = () => Math.floor(100 + Math.random() * 900); // 100–999
    return `${n()}-${n()}`;
  }

  function seedData() {
    const cities = VILLES_INIT.slice(0, 6).map(name => ({
      id: uid(),
      name,
      companies: [
        {
          id: uid(),
          name: `${name} MétalWorks`,
          posts: [
            { id: uid(), title: 'Tourneur', slots: 2 },
            { id: uid(), title: 'Fraiseur', slots: 1 },
          ],
        },
        {
          id: uid(),
          name: `${name} Ateliers Réunis`,
          posts: [{ id: uid(), title: 'Soudeur', slots: 2 }],
        },
      ],
    }));

    const entrants = [
      {
        id: uid(),
        name: 'Alice Martin',
        statut: 'FI',
        diploma: 'CAP',
        trainingDuration: 2,
        trainingComplete: false,
        optsTour: false,
        choices: [],
        justification: '',
        accessCode: randCode(),
        assignment: null,
        validated: false,
        dateSubmitted: null,
      },
      {
        id: uid(),
        name: 'Benoît Leroy',
        statut: 'PB',
        diploma: 'BAC Pro',
        trainingDuration: 3,
        trainingComplete: true,
        optsTour: true,
        choices: [],
        justification: '',
        accessCode: randCode(),
        assignment: null,
        validated: false,
        dateSubmitted: null,
      },
      {
        id: uid(),
        name: 'Camille Dupont',
        statut: 'PTDF',
        diploma: 'BTS',
        trainingDuration: 2,
        trainingComplete: true,
        optsTour: true,
        choices: [],
        justification: '',
        accessCode: randCode(),
        assignment: null,
        validated: false,
        dateSubmitted: null,
      },
    ];

    return { cities, entrants };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return seedData();
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function buildAssignmentIndex() {
    const map = new Map();
    state.entrants.forEach(e => {
      if (e.validated && e.assignment?.postId) {
        map.set(e.assignment.postId, (map.get(e.assignment.postId) || 0) + 1);
      }
    });
    return map;
  }

  function cityCapacity(city, idx) {
    const total = city.companies.reduce(
      (a, co) => a + co.posts.reduce((s, p) => s + p.slots, 0),
      0
    );
    const used = city.companies.reduce(
      (a, co) => a + co.posts.reduce((s, p) => s + (idx.get(p.id) || 0), 0),
      0
    );
    return { total, used, free: Math.max(0, total - used) };
  }

  function companiesWithFreePosts(city, idx) {
    const items = [];
    city.companies.forEach(co =>
      co.posts.forEach(p => {
        const used = idx.get(p.id) || 0;
        const free = Math.max(0, p.slots - used);
        if (free > 0) items.push({ company: co, post: p, freeCount: free });
      })
    );
    return items;
  }

  window.TDF = {
    get() { return state; },

    set(patch) {
      state = { ...state, ...patch };
      save();
    },

    save,

    addCity(name) {
      state.cities.unshift({
        id: uid(),
        name: String(name ?? '').trim(),
        companies: [],
      });
      save();
    },

    addCompany(cityId, name) {
      const c = state.cities.find(x => x.id === cityId);
      if (!c) return;
      c.companies.unshift({
        id: uid(),
        name: String(name ?? '').trim(),
        posts: [],
      });
      save();
    },

    addPost(cityId, companyId, title, slots) {
      const c = state.cities.find(x => x.id === cityId);
      if (!c) return;
      const co = c.companies.find(x => x.id === companyId);
      if (!co) return;

      const qtyRaw = Number(slots);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.floor(qtyRaw)) : 1;

      co.posts.unshift({
        id: uid(),
        title: String(title ?? '').trim() || 'Poste',
        slots: qty,
      });
      save();
    },

    findEntrantByCode(code) {
      const k = String(code ?? '').trim();
      return state.entrants.find(e => e.accessCode === k) || null;
    },

    submitChoices(entrantId, cityIds, justification) {
      const e = state.entrants.find(x => x.id === entrantId);
      if (!e) return false;
      e.choices = Array.isArray(cityIds) ? cityIds.slice(0, 3) : [];
      e.justification = String(justification ?? '');
      e.optsTour = true;
      e.dateSubmitted = new Date().toISOString();
      save();
      return true;
    },

    toggleTraining(id) {
      const e = state.entrants.find(x => x.id === id);
      if (!e) return;
      e.trainingComplete = !e.trainingComplete;
      save();
    },

    generateCode(id) {
      const e = state.entrants.find(x => x.id === id);
      if (!e) return;
      e.accessCode = randCode();
      save();
    },

    validateAssignment(entrantId, payload) {
      const e = state.entrants.find(x => x.id === entrantId);
      if (!e) return false;
      e.assignment = payload;
      e.validated = true;
      save();
      return true;
    },

    clearAssignment(entrantId) {
      const e = state.entrants.find(x => x.id === entrantId);
      if (!e) return;
      e.assignment = null;
      e.validated = false;
      save();
    },

    buildAssignmentIndex,
    cityCapacity,
    companiesWithFreePosts,

    listCodes() {
      return state.entrants.map(e => ({ name: e.name, code: e.accessCode }));
    },
  };
})();
