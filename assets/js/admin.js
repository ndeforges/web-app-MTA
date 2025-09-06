// Admin – gestion globale + import/export Excel
(function(){
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const METIERS = ['ELECTROTECHNICIEN','MECANICIEN','MECANICIEN_OUTILLEUR','MARECHAL_FERRAND'];
  const PHASES = ['FI','PB','PTDF','ASPIRANT','COMPAGNON'];
  const GACHES = ['PREVOT','MAITRE_STAGE','ITINERANT'];

  function stat(icon,label,val){
    return `<div class="stat"><div class="icon"><i data-lucide="${icon}" class="w-5 h-5"></i></div><div><div class="label">${label}</div><div class="value">${val}</div></div></div>`;
  }

  function renderStats(){
    const st = TDF.get();
    const nA = (st.jeunes||[]).length;
    const nB = (st.jeunesAbandon||[]).length;
    const nS = (st.jeunesSedentaires||[]).length;
    $('#admin-stats').innerHTML = [
      stat('users','Actifs', nA),
      stat('user-x','Abandon', nB),
      stat('house','Sédentaires', nS),
      stat('map-pin','Villes', (st.cities||[]).length),
      stat('building-2','Entreprises', (st.companies||[]).length),
      stat('hammer','Postes', (st.posts||[]).length),
    ].join('');
    if (window.lucide?.createIcons) lucide.createIcons();
  }

  function phaseLabel(p){ if(!p) return '—'; const t=p.type; const L=p.level?` ${p.level}`:''; return `${t}${L}`; }
  function metierLabel(m){
    return ({ELECTROTECHNICIEN:'Électrotechnicien',MECANICIEN:'Mécanicien',MECANICIEN_OUTILLEUR:'Mécanicien‑Outilleur',MARECHAL_FERRAND:'Maréchal‑Ferrand'}[m]||'—');
  }

  function renderList(){
    const st = TDF.get();
    const pool = $('#f-pool').value; // active|abandon|sedentaire
    const list = pool==='abandon' ? (st.jeunesAbandon||[]) : pool==='sedentaire' ? (st.jeunesSedentaires||[]) : (st.jeunes||[]);
    const q = ($('#q').value||'').toLowerCase();
    const fMetier = $('#f-metier').value; const fPhase = $('#f-phase').value;

    const rows = list
      .filter(j => j.name.toLowerCase().includes(q))
      .filter(j => fMetier==='ALL' ? true : j.metier===fMetier)
      .filter(j => fPhase==='ALL' ? true : (j.phase?.type===fPhase))
      .map(j=> row(j, pool)).join('');

    $('#admin-list').innerHTML = rows || `<div class="text-slate-500">Aucun résultat.</div>`;
    if (window.lucide?.createIcons) lucide.createIcons();

    // wire inline
    $$('#admin-list select[data-change]').forEach(sel=> sel.addEventListener('change', onInlineChange));
    $$('#admin-list button[data-action]').forEach(b=> b.addEventListener('click', onAction));
  }

  function row(j, pool){
    const metierSel = `<select class="input" data-change="metier" data-id="${j.id}">`
      + `<option value="">— Métier —</option>`
      + METIERS.map(m=>`<option value="${m}" ${j.metier===m?'selected':''}>${metierLabel(m)}</option>`).join('')
      + `</select>`;

    const phaseSel = `<div class="flex gap-2">`
      + `<select class="input" data-change="phaseType" data-id="${j.id}">`
      + PHASES.map(p=>`<option value="${p}" ${j.phase?.type===p?'selected':''}>${p}</option>`).join('')
      + `</select>`
      + `<input class="input w-24" type="number" min="1" max="${j.phase?.type==='ASPIRANT'?5:3}" placeholder="niveau" value="${j.phase?.level||''}" data-change="phaseLevel" data-id="${j.id}" />`
      + `</div>`;

    const gacheSel = `<select class="input" data-change="gache" data-id="${j.id}" ${j.phase?.type==='COMPAGNON'? '' : 'disabled'}>`
      + `<option value="">— Gâche —</option>`
      + GACHES.map(g=>`<option value="${g}" ${j.gache===g?'selected':''}>${g.replace('_',' ')}</option>`).join('')
      + `</select>`;

    const actions = pool==='active' ? `
      <button class="btn btn-outline" data-action="abandon" data-id="${j.id}"><i data-lucide="user-x"></i> Abandon</button>
      <button class="btn btn-outline" data-action="sedentaire" data-id="${j.id}"><i data-lucide="house"></i> Sédentaire</button>
      <button class="btn btn-outline" data-action="city" data-id="${j.id}"><i data-lucide="map-pin"></i> Chgt ville</button>
    ` : `
      <button class="btn" data-action="restore" data-id="${j.id}"><i data-lucide="rotate-ccw"></i> Restaurer</button>
    `;

    return `<div class="row">
      <div class="row-head">
        <div>
          <div class="font-medium">${j.name}</div>
          <div class="text-xs text-slate-500">Code: ${j.accessCode||'—'} • Phase: ${phaseLabel(j.phase)} • Métier: ${metierLabel(j.metier)}</div>
        </div>
        <div class="row-actions">${actions}</div>
      </div>
      <div class="grid md:grid-cols-3 gap-3 mt-3">
        <div>${metierSel}</div>
        <div>${phaseSel}</div>
        <div>${gacheSel}</div>
      </div>
    </div>`;
  }

  function onInlineChange(ev){
    const sel = ev.currentTarget; const id = sel.dataset.id; const st = TDF.get();
    const j = (st.jeunes||[]).find(x=>x.id===id) || (st.jeunesAbandon||[]).find(x=>x.id===id) || (st.jeunesSedentaires||[]).find(x=>x.id===id);
    if(!j) return;
    if(sel.dataset.change==='metier'){ j.metier = sel.value || null; }
    if(sel.dataset.change==='phaseType'){ j.phase = { ...(j.phase||{}), type: sel.value||null }; if(j.phase?.type!=='COMPAGNON'){ j.gache=null; } }
    if(sel.dataset.change==='phaseLevel'){ const v = Number(sel.value||''); j.phase = { ...(j.phase||{}), level: v||null }; }
    if(sel.dataset.change==='gache'){ j.gache = sel.value || null; }
    TDF.save && TDF.save(); // si exposé; sinon via set
    TDF.set(st);
    renderList();
  }

  function onAction(ev){
    const b = ev.currentTarget; const id = b.dataset.id; const action = b.dataset.action;
    if(action==='abandon'){
      const reason = prompt('Raison d\'abandon ? (optionnel)')||'';
      TDF.moveToAbandon(id, reason); renderAll(); return;
    }
    if(action==='sedentaire'){
      const cityId = prompt('Ville de sédentarisation (id ville) ?');
      TDF.moveToSedentaire(id, cityId||null); renderAll(); return;
    }
    if(action==='restore'){
      // restaurer depuis abandon ou sédentaire
      const st = TDF.get();
      if((st.jeunesAbandon||[]).some(x=>x.id===id)) TDF.restoreFromAbandon(id);
      else TDF.restoreFromSedentaire(id);
      renderAll(); return;
    }
    if(action==='city'){
      const st = TDF.get(); const j = (st.jeunes||[]).find(x=>x.id===id); if(!j) return;
      const year = Number(prompt('Année ? (ex: 2025)', new Date().getFullYear()))||new Date().getFullYear();
      const cityId = prompt('Nouvelle ville (id) ?'); if(!cityId) return;
      j.cityHistory = Array.isArray(j.cityHistory)? j.cityHistory: [];
      j.cityHistory.push({ year, cityId });
      TDF.set(st); renderList();
    }
  }

  // ----- Export / Import Excel -----
  function exportXLSX(){
    const st = TDF.get();
    const mapRow = (j,pool) => ({
      ID: j.id, Nom: j.name, Metier: j.metier||'', PhaseType: j.phase?.type||'', PhaseLevel: j.phase?.level||'',
      Gache: j.gache||'', Diploma: j.diploma||'', TrainingDuration: j.trainingDuration||'', TrainingComplete: !!j.trainingComplete,
      AccessCode: j.accessCode||'', Choices: (j.choices||[]).join(','), Justification: j.justification||'', Validated: !!j.validated,
      AssignCity: j.assignment?.cityId||'', AssignCompany: j.assignment?.companyId||'', AssignPost: j.assignment?.postId||'',
      Pool: pool,
    });

    const wsAct = XLSX.utils.json_to_sheet((st.jeunes||[]).map(j=>mapRow(j,'active')));
    const wsAb  = XLSX.utils.json_to_sheet((st.jeunesAbandon||[]).map(j=>mapRow(j,'abandon')));
    const wsSed = XLSX.utils.json_to_sheet((st.jeunesSedentaires||[]).map(j=>mapRow(j,'sedentaire')));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsAct, 'Actifs');
    XLSX.utils.book_append_sheet(wb, wsAb,  'Abandon');
    XLSX.utils.book_append_sheet(wb, wsSed, 'Sedentaires');
    XLSX.writeFile(wb, `jeunes_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  async function importXLSX(file){
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const st = TDF.get();
    const ensure = (arr, row) => {
      const idx = arr.findIndex(x=>x.id===row.ID);
      const obj = {
        id: row.ID || `j-${Date.now().toString(36)}`,
        name: row.Nom || 'Sans Nom',
        metier: row.Metier || null,
        phase: { type: row.PhaseType||null, level: row.PhaseLevel? Number(row.PhaseLevel): null },
        gache: row.Gache || null,
        diploma: row.Diploma || '',
        trainingDuration: Number(row.TrainingDuration||0),
        trainingComplete: row.TrainingComplete===true || String(row.TrainingComplete).toLowerCase()==='true',
        accessCode: row.AccessCode || '',
        choices: String(row.Choices||'').split(',').map(s=>s.trim()).filter(Boolean),
        justification: row.Justification || '',
        validated: row.Validated===true || String(row.Validated).toLowerCase()==='true',
        assignment: (row.AssignCity||row.AssignCompany||row.AssignPost) ? { cityId: row.AssignCity||'', companyId: row.AssignCompany||'', postId: row.AssignPost||'' } : null,
        cityHistory: [],
        optsTour: true,
      };
      if(idx>=0) arr[idx]= { ...arr[idx], ...obj }; else arr.unshift(obj);
    };

    // vider pools et recharger depuis feuilles si présentes
    const act = wb.Sheets['Actifs'] ? XLSX.utils.sheet_to_json(wb.Sheets['Actifs']) : [];
    const ab  = wb.Sheets['Abandon'] ? XLSX.utils.sheet_to_json(wb.Sheets['Abandon']) : [];
    const se  = wb.Sheets['Sedentaires'] ? XLSX.utils.sheet_to_json(wb.Sheets['Sedentaires']) : [];

    if(act.length || ab.length || se.length){
      st.jeunes = []; st.jeunesAbandon = []; st.jeunesSedentaires = [];
      act.forEach(r=>ensure(st.jeunes, r));
      ab.forEach(r=>ensure(st.jeunesAbandon, r));
      se.forEach(r=>ensure(st.jeunesSedentaires, r));
      TDF.set(st); renderAll(); return;
    }

    // sinon, lire 1ère feuille générique
    const first = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[first]);
    rows.forEach(r=>{
      const pool = (String(r.Pool||'active').toLowerCase());
      if(pool==='abandon') ensure(st.jeunesAbandon, r);
      else if(pool==='sedentaire') ensure(st.jeunesSedentaires, r);
      else ensure(st.jeunes, r);
    });
    TDF.set(st); renderAll();
  }

  function wire(){
    $('#q').addEventListener('input', renderList);
    $('#f-pool').addEventListener('change', renderList);
    $('#f-metier').addEventListener('change', renderList);
    $('#f-phase').addEventListener('change', renderList);
    $('#btn-export-xlsx').addEventListener('click', exportXLSX);
    $('#file-xlsx').addEventListener('change', (e)=>{ const f=e.target.files?.[0]; if(!f) return; importXLSX(f); e.target.value=''; });
  }

  function renderAll(){ renderStats(); renderList(); }

  document.addEventListener('DOMContentLoaded', async ()=>{
    if(!window.TDF){ alert('Erreur: store.js non chargé'); return; }
    await TDF.ready();
    renderAll(); wire();
  });
})();