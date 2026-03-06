/* ============================================================
   COMPARADOR DE COLEGIOS — app.js
   Fuente de datos: Google Sheets CSV público
   ============================================================ */

'use strict';

// ── CONFIG ───────────────────────────────────────────────────
// Para cambiar la fuente de datos edita solo esta constante:
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJosiLnm0APWQZr7J8tPGgEns-pR81bkW1VJd4FzNknVOuUUneJExUZ4v7Ri0hlVobjckTZZbNzMCr/pub?gid=0&single=true&output=csv';

// ── CRITERIOS DE PESO ────────────────────────────────────────
const WEIGHT_CRITERIA = [
  { key: 'score_cercania',     label: 'Cercanía',        icon: '📍' },
  { key: 'score_ingles',       label: 'Inglés',          icon: '🇬🇧' },
  { key: 'score_limpieza',     label: 'Limpieza',        icon: '✨' },
  { key: 'score_ratio',        label: 'Ratio',           icon: '👥' },
  { key: 'score_continuidad',  label: 'Continuidad',     icon: '🎓' },
  { key: 'score_conciliacion', label: 'Conciliación',    icon: '⏰' },
  { key: 'score_ambiente',     label: 'Ambiente',        icon: '🌟' },
  { key: 'score_coste',        label: 'Coste',           icon: '💶' },
];

const weights = Object.fromEntries(WEIGHT_CRITERIA.map(c => [c.key, 3]));

// ── ESTADO GLOBAL ────────────────────────────────────────────
let allSchools   = [];
let filtered     = [];
let currentView  = 'table';
let currentSort  = { field: 'score', asc: false };
let activeFilter = 'all';
let searchQuery  = '';

// ── FALLBACK MOCK ────────────────────────────────────────────
const MOCK_DATA = [
  {
    id:'1', activo:'1', colegio:'Colegio Ejemplo A', tipo:'Concertado',
    barrio_zona:'Centro', distancia_casa:'1.2 km', etapas:'Infantil, Primaria, ESO, Bach',
    linea_educativa:'Bilingüe', nivel_ingles:'5', otros_idiomas:'Francés',
    metodologia:'ABN + Proyectos', apoyo_refuerzo:'Sí', continuidad_educativa:'Completa',
    ambiente_general:'Muy bueno', limpieza_instalaciones:'5', comportamiento_ninos:'4',
    trato_direccion:'Excelente', impresion_profesorado:'Muy buena',
    ratio:'22', patio_exteriores:'Amplio', comedor:'Sí', banos:'Buenos',
    horario_lectivo:'9:00-14:00', horario_ampliado:'7:30-17:30', extraescolares:'Sí',
    campamentos:'Sí', entrada_salida:'Fácil', compatibilidad_familiar:'Alta',
    coste_comedor:'120', coste_horario_ampliado:'80', coste_extraescolares:'50', coste_mensual_aprox:'500',
    lo_mejor:'Gran proyecto educativo y equipo docente implicado',
    lo_peor:'Ratio algo elevado en Primaria',
    dudas_pendientes:'Confirmar plazas', encaje_familiar:'Alto', prioridad:'1',
    nota_manual:'8.5', destacado:'1',
    tags:'bilingüe,continuidad,buen ambiente',
    score_cercania:'4', score_ingles:'5', score_limpieza:'5', score_ratio:'3',
    score_continuidad:'5', score_conciliacion:'4', score_ambiente:'5', score_coste:'3',
  },
  {
    id:'2', activo:'1', colegio:'Colegio Ejemplo B', tipo:'Privado',
    barrio_zona:'Norte', distancia_casa:'3.5 km', etapas:'Infantil, Primaria, ESO',
    linea_educativa:'Internacional', nivel_ingles:'5', otros_idiomas:'Alemán, Francés',
    metodologia:'IB + STEAM', apoyo_refuerzo:'Sí', continuidad_educativa:'Hasta ESO',
    ambiente_general:'Excelente', limpieza_instalaciones:'5', comportamiento_ninos:'5',
    trato_direccion:'Muy buena', impresion_profesorado:'Excelente',
    ratio:'18', patio_exteriores:'Muy amplio', comedor:'Sí', banos:'Excelentes',
    horario_lectivo:'8:30-14:30', horario_ampliado:'7:30-18:00', extraescolares:'Sí',
    campamentos:'Sí', entrada_salida:'Cómoda', compatibilidad_familiar:'Alta',
    coste_comedor:'150', coste_horario_ampliado:'100', coste_extraescolares:'80', coste_mensual_aprox:'950',
    lo_mejor:'Instalaciones top y proyecto internacional',
    lo_peor:'Coste elevado y algo lejos',
    dudas_pendientes:'Proceso de admisión complejo', encaje_familiar:'Medio', prioridad:'2',
    nota_manual:'9.0', destacado:'1',
    tags:'internacional,bilingüe,instalaciones top,ratio bajo',
    score_cercania:'2', score_ingles:'5', score_limpieza:'5', score_ratio:'5',
    score_continuidad:'4', score_conciliacion:'5', score_ambiente:'5', score_coste:'1',
  },
  {
    id:'3', activo:'1', colegio:'Colegio Ejemplo C', tipo:'Concertado',
    barrio_zona:'Sur', distancia_casa:'0.8 km', etapas:'Infantil, Primaria',
    linea_educativa:'Tradicional', nivel_ingles:'3', otros_idiomas:'',
    metodologia:'Tradicional', apoyo_refuerzo:'Sí', continuidad_educativa:'Hasta Primaria',
    ambiente_general:'Bueno', limpieza_instalaciones:'4', comportamiento_ninos:'4',
    trato_direccion:'Correcta', impresion_profesorado:'Buena',
    ratio:'25', patio_exteriores:'Pequeño', comedor:'Sí', banos:'Correctos',
    horario_lectivo:'9:00-14:00', horario_ampliado:'8:00-17:00', extraescolares:'Sí',
    campamentos:'No', entrada_salida:'Muy fácil', compatibilidad_familiar:'Media',
    coste_comedor:'100', coste_horario_ampliado:'60', coste_extraescolares:'30', coste_mensual_aprox:'300',
    lo_mejor:'Muy cerca de casa y precio asequible',
    lo_peor:'Sin continuidad tras Primaria y ratio alto',
    dudas_pendientes:'Nivel de inglés flojo', encaje_familiar:'Medio', prioridad:'3',
    nota_manual:'6.5', destacado:'0',
    tags:'cercano,económico,sencillo',
    score_cercania:'5', score_ingles:'3', score_limpieza:'4', score_ratio:'2',
    score_continuidad:'2', score_conciliacion:'3', score_ambiente:'4', score_coste:'5',
  },
];

// ═══════════════════════════════════════════════════════════
// 1. CSV FETCH & PARSE
// ═══════════════════════════════════════════════════════════

async function fetchCSV(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

// ═══════════════════════════════════════════════════════════
// 2. NORMALIZE
// ═══════════════════════════════════════════════════════════

function toNum(val, fallback = 0) {
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function normalizeSchool(raw) {
  const s = { ...raw };

  ['nivel_ingles','ratio','coste_comedor','coste_horario_ampliado',
   'coste_extraescolares','coste_mensual_aprox','nota_manual','prioridad',
   'score_cercania','score_ingles','score_limpieza','score_ratio',
   'score_continuidad','score_conciliacion','score_ambiente','score_coste',
   'limpieza_instalaciones','comportamiento_ninos',
  ].forEach(f => { s[f] = toNum(s[f], s[f] === '' ? null : 0); });

  s.tags_arr = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  const tipo = (s.tipo || '').toLowerCase();
  if (tipo.includes('concertado'))       s.tipo_key = 'concertado';
  else if (tipo.includes('privado'))     s.tipo_key = 'privado';
  else if (tipo.includes('público') || tipo.includes('publico')) s.tipo_key = 'publico';
  else s.tipo_key = 'otro';

  s.activo_bool = !s.activo || s.activo === '1' ||
    s.activo.toLowerCase() === 'si' || s.activo.toLowerCase() === 'true';

  return s;
}

// ═══════════════════════════════════════════════════════════
// 3. WEIGHTED SCORE
// ═══════════════════════════════════════════════════════════

function calcScore(school) {
  let totalW = 0, totalVal = 0;
  WEIGHT_CRITERIA.forEach(c => {
    const w = weights[c.key] ?? 1;
    const v = school[c.key];
    if (v != null && !isNaN(v) && v > 0) {
      totalVal += v * w;
      totalW   += w * 5;
    }
  });
  if (totalW === 0) return school.nota_manual ?? 0;
  return Math.round((totalVal / totalW) * 100) / 10;
}

function applyScores(schools) {
  return schools.map(s => ({ ...s, score: calcScore(s) }));
}

// ═══════════════════════════════════════════════════════════
// 4. FILTER & SORT
// ═══════════════════════════════════════════════════════════

function applyFiltersAndSort() {
  let list = [...allSchools];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(s =>
      (s.colegio || '').toLowerCase().includes(q) ||
      (s.barrio_zona || '').toLowerCase().includes(q) ||
      (s.tags || '').toLowerCase().includes(q)
    );
  }

  switch (activeFilter) {
    case 'concertado':  list = list.filter(s => s.tipo_key === 'concertado'); break;
    case 'privado':     list = list.filter(s => s.tipo_key === 'privado');    break;
    case 'publico':     list = list.filter(s => s.tipo_key === 'publico');    break;
    case 'ingles':      list = list.filter(s => toNum(s.score_ingles) >= 4);  break;
    case 'cercano':     list = list.filter(s => toNum(s.score_cercania) >= 4); break;
    case 'continuidad': list = list.filter(s => toNum(s.score_continuidad) >= 4); break;
  }

  list.sort((a, b) => {
    let va = a[currentSort.field] ?? 0;
    let vb = b[currentSort.field] ?? 0;
    const na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) { va = na; vb = nb; }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return currentSort.asc ? -1 : 1;
    if (va > vb) return currentSort.asc ?  1 : -1;
    return 0;
  });

  filtered = list;
}

// ═══════════════════════════════════════════════════════════
// 5. DASHBOARD INSIGHTS
// ═══════════════════════════════════════════════════════════

function renderInsights() {
  if (!allSchools.length) return;

  const schools = allSchools;
  const sorted  = [...schools].sort((a, b) => b.score - a.score);
  const best    = sorted[0];

  const bestBy = (field, high = true) => {
    const valid = schools.filter(s => s[field] != null && toNum(s[field]) > 0);
    if (!valid.length) return null;
    return valid.reduce((acc, s) =>
      (high ? toNum(s[field]) > toNum(acc[field]) : toNum(s[field]) < toNum(acc[field])) ? s : acc
    );
  };

  const bestIngles      = bestBy('score_ingles');
  const bestRatio       = bestBy('score_ratio');
  const bestConciliacion= bestBy('score_conciliacion');
  const mostContinuity  = bestBy('score_continuidad');
  const closest         = bestBy('score_cercania');

  const costs   = schools.map(s => toNum(s.coste_mensual_aprox)).filter(n => n > 0);
  const avgCost = costs.length ? Math.round(costs.reduce((a, b) => a + b) / costs.length) : null;

  // Grid 1 — datos objetivos
  const g1 = document.getElementById('insightGrid1');
  g1.innerHTML = '';

  [
    { icon:'🏆', label:'Mejor valorado',      value: best?.colegio ?? '—',
      micro: `Score ponderado: ${best?.score?.toFixed(1) ?? '—'} / 10`, cls: 'insight-card--gold' },
    { icon:'📍', label:'Más cercano',          value: closest?.colegio ?? '—',
      micro: closest?.distancia_casa || 'Score cercanía máximo', cls: '' },
    { icon:'🇬🇧', label:'Mejor inglés',        value: bestIngles?.colegio ?? '—',
      micro: `Score inglés: ${bestIngles?.score_ingles ?? '—'} / 5`, cls: '' },
    { icon:'👥', label:'Menor ratio',          value: bestRatio?.colegio ?? '—',
      micro: bestRatio?.ratio ? `${bestRatio.ratio} alumnos/aula` : `Score: ${bestRatio?.score_ratio ?? '—'} / 5`, cls: '' },
    { icon:'⏰', label:'Mejor conciliación',   value: bestConciliacion?.colegio ?? '—',
      micro: `Score: ${bestConciliacion?.score_conciliacion ?? '—'} / 5`, cls: '' },
    { icon:'💶', label:'Coste medio',          value: avgCost ? `${avgCost} €/mes` : '—',
      micro: `Sobre ${costs.length} colegio${costs.length !== 1 ? 's' : ''} con datos`, cls: '' },
    { icon:'🏫', label:'Total comparados',     value: schools.length,
      micro: `${filtered.length} visible${filtered.length !== 1 ? 's' : ''} con filtros`, cls: '' },
    { icon:'🎓', label:'Mayor continuidad',    value: mostContinuity?.colegio ?? '—',
      micro: `Score: ${mostContinuity?.score_continuidad ?? '—'} / 5`, cls: 'insight-card--green' },
  ].forEach(c => g1.appendChild(makeInsightCard(c)));

  // Grid 2 — interpretativos
  const g2 = document.getElementById('insightGrid2');
  g2.innerHTML = '';

  const scoreKeys = WEIGHT_CRITERIA.map(c => c.key);

  const mostBalanced = schools.map(s => {
    const vals = scoreKeys.map(k => toNum(s[k])).filter(v => v > 0);
    if (!vals.length) return { ...s, _sd: 99 };
    const mean = vals.reduce((a, b) => a + b) / vals.length;
    return { ...s, _sd: Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) };
  }).sort((a, b) => a._sd - b._sd)[0];

  const bestLang = [...schools].sort((a, b) =>
    (toNum(b.score_ingles) + (b.otros_idiomas ? 2 : 0)) -
    (toNum(a.score_ingles) + (a.otros_idiomas ? 2 : 0))
  )[0];

  const bestLogistic = [...schools].sort((a, b) =>
    (toNum(b.score_conciliacion) + toNum(b.score_cercania)) -
    (toNum(a.score_conciliacion) + toNum(a.score_cercania))
  )[0];

  const withDudas = schools.filter(s => (s.dudas_pendientes || '').trim().length > 5);

  [
    { icon:'⚖️', label:'Más equilibrado',        value: mostBalanced?.colegio ?? '—',
      micro: 'Menor variación entre todos los criterios', cls: '' },
    { icon:'🌍', label:'Más fuerte en idiomas',   value: bestLang?.colegio ?? '—',
      micro: bestLang?.otros_idiomas ? `+ ${bestLang.otros_idiomas}` : 'Mayor puntuación de inglés', cls: '' },
    { icon:'🏠', label:'Mejor logística familiar', value: bestLogistic?.colegio ?? '—',
      micro: 'Cercanía + conciliación combinadas', cls: '' },
    { icon:'📚', label:'Más completo en etapas',  value: mostContinuity?.colegio ?? '—',
      micro: mostContinuity?.etapas?.substring(0, 40) ?? 'Mayor continuidad educativa', cls: '' },
    { icon:'❓', label:'Genera más dudas',         value: withDudas[0]?.colegio ?? 'Ninguno',
      micro: withDudas[0]?.dudas_pendientes?.substring(0, 55) ?? 'Sin dudas registradas', cls: '' },
    { icon:'🎯', label:'Mejor según tus pesos',   value: best?.colegio ?? '—',
      micro: `Score actual: ${best?.score?.toFixed(1) ?? '—'} / 10`, cls: 'insight-card--gold' },
  ].forEach(c => g2.appendChild(makeInsightCard(c)));
}

function makeInsightCard({ icon, label, value, micro, cls = '' }) {
  const div = document.createElement('div');
  div.className = `insight-card ${cls}`;
  div.innerHTML = `
    <div class="insight-icon">${icon}</div>
    <div class="insight-label">${label}</div>
    <div class="insight-value" title="${value}">${value}</div>
    <div class="insight-micro">${micro}</div>
  `;
  return div;
}

// ═══════════════════════════════════════════════════════════
// 6. WEIGHTS PANEL
// ═══════════════════════════════════════════════════════════

function renderWeightsPanel() {
  const grid = document.getElementById('weightsGrid');
  grid.innerHTML = '';

  WEIGHT_CRITERIA.forEach(c => {
    const item = document.createElement('div');
    item.className = 'weight-item';
    item.innerHTML = `
      <div class="weight-label">
        <span>${c.icon} ${c.label}</span>
        <span class="weight-badge" id="badge-${c.key}">${weights[c.key]}</span>
      </div>
      <input type="range" class="weight-range" id="range-${c.key}"
        min="1" max="5" step="1" value="${weights[c.key]}" aria-label="${c.label}" />
    `;
    grid.appendChild(item);

    const range = item.querySelector('.weight-range');
    const badge = item.querySelector('.weight-badge');

    range.addEventListener('input', () => {
      const v = parseInt(range.value);
      weights[c.key] = v;
      badge.textContent = v;
      const hue = 35 - ((v - 1) / 4) * 35; // amber→orange
      badge.style.background = `hsl(${hue + 20}, 80%, ${40 + (v - 1) * 4}%)`;
      recalcAndRender();
    });
  });
}

function recalcAndRender() {
  allSchools = applyScores(allSchools);
  applyFiltersAndSort();
  renderInsights();
  renderCurrentView();
  renderRanking();
}

// ═══════════════════════════════════════════════════════════
// 7. TABLE VIEW
// ═══════════════════════════════════════════════════════════

function renderTable() {
  const thead = document.getElementById('compTableHead');
  const tbody = document.getElementById('compTableBody');

  thead.innerHTML = `<tr>
    <th>#</th><th>Colegio</th><th>Tipo</th><th>Distancia</th>
    <th>Etapas</th><th>Inglés</th><th>Ratio</th><th>Coste/mes</th>
    <th>Conciliación</th><th>Lo mejor</th><th>Lo peor</th><th>Score</th>
  </tr>`;

  const countEl = document.getElementById('tableCount');
  if (countEl) countEl.textContent = `${filtered.length} colegio${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="no-data">Sin resultados con los filtros actuales.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  const medals = ['🥇','🥈','🥉'];

  filtered.forEach((s, idx) => {
    const tr = document.createElement('tr');
    if (idx === 0) tr.classList.add('top-row');

    const scoreCls = s.score >= 7.5 ? 'score-high' : s.score >= 5 ? 'score-mid' : 'score-low';
    const tipoCls  = { concertado:'tipo-concertado', privado:'tipo-privado', publico:'tipo-publico' }[s.tipo_key] ?? 'tipo-default';
    const tagsHtml = (s.tags_arr || []).slice(0, 2).map(t => `<span class="tag">${t}</span>`).join('');

    tr.innerHTML = `
      <td style="font-size:1rem">${medals[idx] || `<span style="color:var(--text-3);font-size:.8rem">${idx + 1}</span>`}</td>
      <td class="col-name">
        ${s.colegio ?? '—'}
        <small>${s.barrio_zona ?? ''}</small>
        <div style="margin-top:3px;display:flex;gap:3px;flex-wrap:wrap">${tagsHtml}</div>
      </td>
      <td><span class="tipo-badge ${tipoCls}">${s.tipo ?? '—'}</span></td>
      <td style="white-space:nowrap;font-size:.78rem">${s.distancia_casa ?? '—'}</td>
      <td style="font-size:.75rem;max-width:120px;white-space:normal;color:var(--text-2)">${s.etapas ?? '—'}</td>
      <td>${miniBar(toNum(s.score_ingles), 5)}</td>
      <td>${miniBar(toNum(s.score_ratio), 5)}</td>
      <td style="white-space:nowrap;font-weight:600">${s.coste_mensual_aprox ? `${s.coste_mensual_aprox} €` : '—'}</td>
      <td>${miniBar(toNum(s.score_conciliacion), 5)}</td>
      <td style="font-size:.75rem;max-width:150px;white-space:normal;color:var(--text-2)">${s.lo_mejor ?? '—'}</td>
      <td style="font-size:.75rem;max-width:150px;white-space:normal;color:var(--text-2)">${s.lo_peor ?? '—'}</td>
      <td><span class="score-badge ${scoreCls}">${s.score?.toFixed(1) ?? '—'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function miniBar(val, max = 5) {
  const pct = val > 0 ? Math.min(100, Math.round((val / max) * 100)) : 0;
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--red)';
  return `<div class="mini-bar-wrap">
    <div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%;background:${color}"></div></div>
    <span class="mini-bar-val">${val > 0 ? val : '—'}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// 8. CARDS VIEW
// ═══════════════════════════════════════════════════════════

function renderCards() {
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = '';

  const countEl = document.getElementById('cardsCount');
  if (countEl) countEl.textContent = `${filtered.length} colegio${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-data">Sin resultados con los filtros actuales.</div>';
    return;
  }

  filtered.forEach((s, idx) => grid.appendChild(buildSchoolCard(s, idx)));
}

function buildSchoolCard(s, idx) {
  const el  = document.createElement('div');
  const scoreVal = s.score ?? 0;
  const scoreCls = scoreVal >= 7.5 ? 'high' : scoreVal >= 5 ? 'mid' : 'low';
  const tipoCls  = { concertado:'tipo-concertado', privado:'tipo-privado', publico:'tipo-publico' }[s.tipo_key] ?? 'tipo-default';
  const medals   = ['🥇','🥈','🥉'];
  const rankCls  = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';

  el.className = `school-card ${rankCls}`;

  const tagsHtml = (s.tags_arr || []).map(t => `<span class="tag">${t}</span>`).join('');

  el.innerHTML = `
    <div class="card-header">
      <div style="flex:1;min-width:0">
        <div class="card-name">${medals[idx] ? medals[idx] + ' ' : ''}${s.colegio ?? '—'}</div>
        <div class="card-meta">
          <span class="tipo-badge ${tipoCls}">${s.tipo ?? '—'}</span>
          ${s.distancia_casa ? `<span class="tag">📍 ${s.distancia_casa}</span>` : ''}
        </div>
      </div>
      <div class="card-score-circle ${scoreCls}">
        ${scoreVal.toFixed(1)}<small>/ 10</small>
      </div>
    </div>

    <div class="card-summary">
      <div class="card-stat">
        <span class="card-stat-label">Etapas</span>
        <span class="card-stat-val" style="font-size:.75rem;line-height:1.3">${s.etapas ?? '—'}</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-label">Inglés</span>
        <span class="card-stat-val">${scoreStars(toNum(s.score_ingles))}</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-label">Ratio</span>
        <span class="card-stat-val">${s.ratio ? `${s.ratio} al.` : '—'}</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-label">Coste aprox.</span>
        <span class="card-stat-val">${s.coste_mensual_aprox ? `${s.coste_mensual_aprox} €` : '—'}</span>
      </div>
    </div>

    <div class="card-pros-cons">
      <div class="card-pro">
        <span class="card-pro-label">✓ Lo mejor</span>
        ${s.lo_mejor ?? '—'}
      </div>
      <div class="card-con">
        <span class="card-con-label">✗ Lo peor</span>
        ${s.lo_peor ?? '—'}
      </div>
    </div>

    ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}

    <button class="card-expand-btn" aria-expanded="false">
      <span class="expand-label">Ver detalles</span>
      <svg class="expand-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <div class="card-detail">
      <div class="card-detail-inner">${buildDetailBlocks(s)}</div>
    </div>
  `;

  const btn    = el.querySelector('.card-expand-btn');
  const detail = el.querySelector('.card-detail');
  const arrow  = el.querySelector('.expand-arrow');
  const label  = el.querySelector('.expand-label');

  btn.addEventListener('click', () => {
    const open = detail.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.classList.toggle('open', open);
    arrow.style.transform = open ? 'rotate(180deg)' : '';
    label.textContent = open ? 'Ocultar detalles' : 'Ver detalles';
  });

  return el;
}

function scoreStars(val) {
  const v = Math.round(val);
  return `<span style="color:var(--accent);letter-spacing:1px">${'★'.repeat(v)}</span><span style="color:var(--border-2)">${'★'.repeat(Math.max(0, 5 - v))}</span>`;
}

function scoreColor(val) {
  if (val >= 4) return 'var(--green)';
  if (val >= 2.5) return 'var(--accent)';
  return 'var(--red)';
}

function buildDetailBlocks(s) {
  const block = (title, rows) => {
    const rowsHtml = rows.filter(r => r.val != null && r.val !== '' && r.val !== 'null').map(r =>
      `<div class="detail-row">
        <span class="detail-row-label">${r.label}</span>
        <span class="detail-row-val">${r.val}</span>
      </div>`
    ).join('');
    return rowsHtml ? `<div class="detail-block"><div class="detail-block-title">${title}</div>${rowsHtml}</div>` : '';
  };

  const scoreBlock = () => {
    const rows = WEIGHT_CRITERIA.map(c => {
      const v = toNum(s[c.key]);
      if (!v) return '';
      const pct = (v / 5) * 100;
      return `<div class="score-bar-row">
        <span class="score-bar-label">${c.icon} ${c.label}</span>
        <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%;background:${scoreColor(v)}"></div></div>
        <span class="score-bar-num">${v}</span>
      </div>`;
    }).join('');
    return rows ? `<div class="detail-block"><div class="detail-block-title">📊 Puntuaciones por criterio</div>${rows}</div>` : '';
  };

  return [
    block('📋 Proyecto educativo', [
      { label:'Línea educativa',  val: s.linea_educativa },
      { label:'Metodología',      val: s.metodologia },
      { label:'Apoyo / refuerzo', val: s.apoyo_refuerzo },
      { label:'Otros idiomas',    val: s.otros_idiomas },
      { label:'Libros/Editorial', val: s.libros_editorial },
    ]),
    block('🏫 Entorno y clima', [
      { label:'Ambiente general',      val: s.ambiente_general },
      { label:'Limpieza',              val: s.limpieza_instalaciones > 0 ? `${s.limpieza_instalaciones}/5` : null },
      { label:'Comportamiento alumnos',val: s.comportamiento_ninos > 0 ? `${s.comportamiento_ninos}/5` : null },
      { label:'Trato dirección',       val: s.trato_direccion },
      { label:'Profesorado',           val: s.impresion_profesorado },
      { label:'Patio/exteriores',      val: s.patio_exteriores },
      { label:'Baños',                 val: s.banos },
    ]),
    block('🚌 Logística familiar', [
      { label:'Horario lectivo',    val: s.horario_lectivo },
      { label:'Horario ampliado',   val: s.horario_ampliado },
      { label:'Comedor',            val: s.comedor },
      { label:'Extraescolares',     val: s.extraescolares },
      { label:'Campamentos',        val: s.campamentos },
      { label:'Entrada / Salida',   val: s.entrada_salida },
      { label:'Encaje familiar',    val: s.compatibilidad_familiar },
    ]),
    block('💶 Costes', [
      { label:'Comedor',            val: s.coste_comedor > 0 ? `${s.coste_comedor} €/mes` : null },
      { label:'Horario ampliado',   val: s.coste_horario_ampliado > 0 ? `${s.coste_horario_ampliado} €/mes` : null },
      { label:'Extraescolares',     val: s.coste_extraescolares > 0 ? `${s.coste_extraescolares} €/mes` : null },
      { label:'Total estimado',     val: s.coste_mensual_aprox > 0 ? `${s.coste_mensual_aprox} €/mes` : null },
    ]),
    block('💬 Valoración subjetiva', [
      { label:'Lo mejor',           val: s.lo_mejor },
      { label:'Lo peor',            val: s.lo_peor },
      { label:'Dudas pendientes',   val: s.dudas_pendientes },
      { label:'Encaje familiar',    val: s.encaje_familiar },
      { label:'Nota manual',        val: s.nota_manual > 0 ? `${s.nota_manual}/10` : null },
    ]),
    scoreBlock(),
  ].join('');
}

// ═══════════════════════════════════════════════════════════
// 9. RANKING FINAL
// ═══════════════════════════════════════════════════════════

function renderRanking() {
  const top3 = [...allSchools].sort((a, b) => b.score - a.score).slice(0, 3);
  const grid  = document.getElementById('top3Grid');
  const comp  = document.getElementById('top2Compare');

  const medals   = ['🥇','🥈','🥉'];
  const rankCls  = ['rank-1','rank-2','rank-3'];

  grid.innerHTML = '';
  top3.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = `top3-card ${rankCls[i]}`;

    const strengths = WEIGHT_CRITERIA
      .filter(c => toNum(s[c.key]) >= 4)
      .map(c => `<span class="tag tag--${i===0?'orange':i===1?'blue':'green'}">${c.icon} ${c.label}</span>`)
      .join('');

    card.innerHTML = `
      <div class="top3-rank">${medals[i]}</div>
      <div class="top3-name">${s.colegio ?? '—'}</div>
      <div class="top3-score">
        <span class="top3-score-num">${s.score?.toFixed(1) ?? '—'}</span>
        <span class="top3-score-den">/ 10</span>
      </div>
      <div class="top3-reason">${buildRankReason(s, i)}</div>
      <div class="top3-strengths">${strengths || '<span class="tag">Sin datos suficientes</span>'}</div>
    `;
    grid.appendChild(card);
  });

  if (top3.length >= 2) renderTop2Compare(top3[0], top3[1], comp);
  else comp.innerHTML = '';
}

function buildRankReason(s, rank) {
  const strengths = WEIGHT_CRITERIA
    .filter(c => toNum(s[c.key]) >= 4)
    .map(c => c.label.toLowerCase());

  if (!strengths.length) return rank === 0
    ? 'Mejor puntuación ponderada con los criterios actuales.'
    : `Score: ${s.score?.toFixed(1) ?? '—'}`;

  return rank === 0
    ? `Destaca especialmente en <strong>${strengths.slice(0, 2).join('</strong> y <strong>')}</strong>.`
    : `Fuerte en <strong>${strengths.slice(0, 2).join('</strong> y <strong>')}</strong>.`;
}

function renderTop2Compare(a, b, container) {
  const rows = WEIGHT_CRITERIA.map(c => {
    const va = toNum(a[c.key]);
    const vb = toNum(b[c.key]);
    if (!va && !vb) return '';
    const pctA = Math.round((va / 5) * 100);
    const pctB = Math.round((vb / 5) * 100);
    const winA = va > vb, winB = vb > va;
    return `
      <div class="compare-row">
        <div class="cbar-left">
          <div class="fill" style="width:${pctA}%;${!winA ? 'opacity:.35' : ''}"></div>
        </div>
        <div class="compare-center-label" title="${c.label}">${c.icon}</div>
        <div class="cbar-right">
          <div class="fill" style="width:${pctB}%;${!winB ? 'opacity:.35' : ''}"></div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="top2-compare-wrap">
      <div class="compare-names">
        <div class="compare-name-a">${a.colegio ?? '—'}</div>
        <div class="compare-vs">vs</div>
        <div class="compare-name-b">${b.colegio ?? '—'}</div>
      </div>
      <div class="compare-grid">${rows}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// 10. RENDER DISPATCHER
// ═══════════════════════════════════════════════════════════

function renderCurrentView() {
  if (currentView === 'table') renderTable();
  else renderCards();
  updateSortUI();
  updateActiveFiltersBar();
}

function updateSortUI() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === currentSort.field);
  });
  const label = document.getElementById('sortDirLabel');
  const icon  = document.getElementById('sortDirIcon');
  if (label) label.textContent = currentSort.asc ? 'Menor a mayor' : 'Mayor a menor';
  if (icon)  icon.style.transform = currentSort.asc ? 'rotate(180deg)' : '';
}

function updateActiveFiltersBar() {
  const bar  = document.getElementById('activeFiltersBar');
  const tags = document.getElementById('activeFilterTags');
  const active = [];
  if (activeFilter !== 'all') active.push(activeFilter);
  if (searchQuery) active.push(`"${searchQuery}"`);

  if (active.length) {
    bar.classList.remove('hidden');
    tags.innerHTML = active.map(a => `<span class="filter-tag">${a}</span>`).join('');
  } else {
    bar.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════════
// 11. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

function bindListeners() {
  // View toggle
  document.getElementById('btnTable')?.addEventListener('click', () => {
    currentView = 'table';
    document.getElementById('btnTable').classList.add('active');
    document.getElementById('btnCards').classList.remove('active');
    document.getElementById('tableView').classList.remove('hidden');
    document.getElementById('cardsView').classList.add('hidden');
    renderTable();
  });

  document.getElementById('btnCards')?.addEventListener('click', () => {
    currentView = 'cards';
    document.getElementById('btnCards').classList.add('active');
    document.getElementById('btnTable').classList.remove('active');
    document.getElementById('cardsView').classList.remove('hidden');
    document.getElementById('tableView').classList.add('hidden');
    renderCards();
  });

  // Search
  let searchTimer;
  document.getElementById('searchInput')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = e.target.value.trim();
      applyFiltersAndSort();
      renderCurrentView();
    }, 220);
  });

  // Chips
  document.getElementById('filterChips')?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    applyFiltersAndSort();
    renderCurrentView();
  });

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.sort;
      if (currentSort.field === field) { currentSort.asc = !currentSort.asc; }
      else { currentSort.field = field; currentSort.asc = field !== 'score'; }
      applyFiltersAndSort();
      renderCurrentView();
    });
  });

  // Sort direction
  document.getElementById('sortDir')?.addEventListener('click', () => {
    currentSort.asc = !currentSort.asc;
    applyFiltersAndSort();
    renderCurrentView();
  });

  // Reset
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    activeFilter = 'all';
    searchQuery  = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.chip[data-filter="all"]')?.classList.add('active');
    applyFiltersAndSort();
    renderCurrentView();
  });

  // Weights collapse
  document.getElementById('weightsToggleBtn')?.addEventListener('click', () => {
    document.getElementById('weightsSection').classList.toggle('weights-collapsed');
  });
}

// ═══════════════════════════════════════════════════════════
// 12. SHOW APP
// ═══════════════════════════════════════════════════════════

function showApp() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('appLayout').classList.remove('hidden');
  document.getElementById('sortBar').classList.remove('hidden');
  document.getElementById('rankingSection').classList.remove('hidden');
  document.getElementById('dashboardSection').classList.remove('hidden');

  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    currentView = 'cards';
    document.getElementById('cardsView').classList.remove('hidden');
  } else {
    currentView = 'table';
    document.getElementById('tableView').classList.remove('hidden');
  }
}

// ═══════════════════════════════════════════════════════════
// 13. BOOT
// ═══════════════════════════════════════════════════════════

async function init() {
  document.getElementById('lastUpdate').textContent =
    `Actualizado: ${new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}`;

  let rawData;

  try {
    const csv = await fetchCSV(CSV_URL);
    rawData = parseCSV(csv);
    if (!rawData.length) throw new Error('CSV vacío');
  } catch (err) {
    console.warn('Error cargando CSV, usando fallback:', err);
    rawData = MOCK_DATA;
    document.getElementById('errorState').classList.remove('hidden');
  }

  const normalized = rawData.map(normalizeSchool).filter(s => s.activo_bool);

  if (!normalized.length) {
    document.getElementById('loadingState').innerHTML =
      '<div class="loading-inner"><p style="color:var(--text-3)">No hay colegios activos para mostrar.</p></div>';
    return;
  }

  allSchools = applyScores(normalized);
  applyFiltersAndSort();

  renderWeightsPanel();
  showApp();
  renderInsights();
  renderCurrentView();
  renderRanking();
  bindListeners();
}

document.addEventListener('DOMContentLoaded', init);
