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
  { key: 'score_cercania',    label: 'Cercanía a casa',           icon: '📍' },
  { key: 'score_ingles',      label: 'Nivel de inglés',           icon: '🇬🇧' },
  { key: 'score_limpieza',    label: 'Limpieza / cuidado',        icon: '✨' },
  { key: 'score_ratio',       label: 'Ratio',                     icon: '👥' },
  { key: 'score_continuidad', label: 'Continuidad educativa',     icon: '🎓' },
  { key: 'score_conciliacion',label: 'Extraescolares / conciliación', icon: '⏰' },
  { key: 'score_ambiente',    label: 'Ambiente general',          icon: '🌟' },
  { key: 'score_coste',       label: 'Coste',                     icon: '💶' },
];

// Pesos actuales (1–5), empiezan iguales
const weights = Object.fromEntries(WEIGHT_CRITERIA.map(c => [c.key, 3]));

// ── ESTADO GLOBAL ────────────────────────────────────────────
let allSchools   = [];   // todos los colegios activos
let filtered     = [];   // resultado tras filtros
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
    tags:'bilingüe,amplia continuidad,buen ambiente',
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
    dudas_pendientes:'Inglés flojo', encaje_familiar:'Medio', prioridad:'3',
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
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] ?? '').trim();
    });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ═══════════════════════════════════════════════════════════
// 2. NORMALIZE RECORD
// ═══════════════════════════════════════════════════════════

function toNum(val, fallback = 0) {
  const n = parseFloat(String(val).replace(',', '.'));
  return isNaN(n) ? fallback : n;
}

function normalizeSchool(raw) {
  const s = { ...raw };

  // Numeric conversions
  const numFields = [
    'nivel_ingles','ratio','coste_comedor','coste_horario_ampliado',
    'coste_extraescolares','coste_mensual_aprox','nota_manual','prioridad',
    'score_cercania','score_ingles','score_limpieza','score_ratio',
    'score_continuidad','score_conciliacion','score_ambiente','score_coste',
    'limpieza_instalaciones','comportamiento_ninos',
  ];
  numFields.forEach(f => { s[f] = toNum(s[f], s[f] === '' ? null : undefined); });

  // Tags array
  s.tags_arr = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  // Tipo normalizado
  const tipoRaw = (s.tipo || '').toLowerCase();
  if (tipoRaw.includes('concertado')) s.tipo_key = 'concertado';
  else if (tipoRaw.includes('privado')) s.tipo_key = 'privado';
  else if (tipoRaw.includes('público') || tipoRaw.includes('publico')) s.tipo_key = 'publico';
  else s.tipo_key = 'otro';

  // Activo flag
  s.activo_bool = !s.activo || s.activo === '1' || s.activo.toLowerCase() === 'si' || s.activo.toLowerCase() === 'true';

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
    if (v != null && !isNaN(v)) {
      totalVal += v * w;
      totalW   += w * 5; // max score per criterion = 5
    }
  });
  if (totalW === 0) return school.nota_manual ?? 0;
  return Math.round((totalVal / totalW) * 100) / 10; // 0–10
}

function applyScores(schools) {
  return schools.map(s => ({ ...s, score: calcScore(s) }));
}

// ═══════════════════════════════════════════════════════════
// 4. FILTER & SORT
// ═══════════════════════════════════════════════════════════

function applyFiltersAndSort() {
  let list = [...allSchools];

  // Search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(s =>
      (s.colegio || '').toLowerCase().includes(q) ||
      (s.barrio_zona || '').toLowerCase().includes(q) ||
      (s.tags || '').toLowerCase().includes(q)
    );
  }

  // Chip filter
  switch (activeFilter) {
    case 'concertado':   list = list.filter(s => s.tipo_key === 'concertado'); break;
    case 'privado':      list = list.filter(s => s.tipo_key === 'privado'); break;
    case 'publico':      list = list.filter(s => s.tipo_key === 'publico'); break;
    case 'ingles':       list = list.filter(s => toNum(s.score_ingles) >= 4); break;
    case 'cercano':      list = list.filter(s => toNum(s.score_cercania) >= 4); break;
    case 'continuidad':  list = list.filter(s => toNum(s.score_continuidad) >= 4); break;
    default: break;
  }

  // Sort
  list.sort((a, b) => {
    let va = a[currentSort.field] ?? 0;
    let vb = b[currentSort.field] ?? 0;

    // Numeric sort where applicable
    const na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb)) { va = na; vb = nb; }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }

    if (va < vb) return currentSort.asc ? -1 : 1;
    if (va > vb) return currentSort.asc ? 1 : -1;
    return 0;
  });

  filtered = list;
}

// ═══════════════════════════════════════════════════════════
// 5. DASHBOARD INSIGHTS
// ═══════════════════════════════════════════════════════════

function renderInsights() {
  if (!allSchools.length) return;

  const schools = allSchools; // use full set for insights
  const sorted  = [...schools].sort((a, b) => b.score - a.score);
  const best    = sorted[0];

  // Helper: best by numeric field (higher = better)
  const bestBy = (field, high = true) => {
    const valid = schools.filter(s => s[field] != null && !isNaN(toNum(s[field])));
    if (!valid.length) return null;
    return valid.reduce((acc, s) =>
      (high ? toNum(s[field]) > toNum(acc[field]) : toNum(s[field]) < toNum(acc[field])) ? s : acc
    );
  };

  const bestIngles     = bestBy('score_ingles');
  const bestRatio      = bestBy('score_ratio');
  const bestConciliacion = bestBy('score_conciliacion');
  const cheapest       = bestBy('coste_mensual_aprox', false);
  const mostContinuity = bestBy('score_continuidad');
  const closest        = bestBy('score_cercania');

  const costs = schools.map(s => toNum(s.coste_mensual_aprox)).filter(n => n > 0);
  const avgCost = costs.length ? Math.round(costs.reduce((a, b) => a + b) / costs.length) : null;

  // ── Fila 1: datos objetivos ──
  const grid1 = document.getElementById('insightGrid1');
  grid1.innerHTML = '';

  const cards1 = [
    { icon:'🏆', label:'Mejor valorado', value: best?.colegio ?? '—',
      micro: `Score: ${best?.score?.toFixed(1) ?? '—'}`, cls: 'insight-card--highlight' },
    { icon:'📍', label:'Más cercano', value: closest?.colegio ?? '—',
      micro: closest?.distancia_casa ? `${closest.distancia_casa}` : 'Score cercania máximo', cls: '' },
    { icon:'🇬🇧', label:'Mejor inglés', value: bestIngles?.colegio ?? '—',
      micro: `Score inglés: ${bestIngles?.score_ingles ?? '—'}/5`, cls: '' },
    { icon:'👥', label:'Menor ratio', value: bestRatio?.colegio ?? '—',
      micro: bestRatio?.ratio ? `${bestRatio.ratio} alumnos/aula` : `Score ratio: ${bestRatio?.score_ratio ?? '—'}`, cls: '' },
    { icon:'⏰', label:'Mejor conciliación', value: bestConciliacion?.colegio ?? '—',
      micro: `Score: ${bestConciliacion?.score_conciliacion ?? '—'}/5`, cls: '' },
    { icon:'💶', label:'Coste medio', value: avgCost ? `${avgCost} €/mes` : '—',
      micro: `${schools.length} colegio${schools.length !== 1 ? 's' : ''} comparados`, cls: '' },
    { icon:'🏫', label:'Colegios comparados', value: schools.length,
      micro: `${filtered.length} con filtros activos`, cls: '' },
    { icon:'🎓', label:'Mayor continuidad', value: mostContinuity?.colegio ?? '—',
      micro: `Score: ${mostContinuity?.score_continuidad ?? '—'}/5`, cls: 'insight-card--success' },
  ];

  cards1.forEach(c => grid1.appendChild(makeInsightCard(c)));

  // ── Fila 2: interpretativos ──
  const grid2 = document.getElementById('insightGrid2');
  grid2.innerHTML = '';

  // "Más equilibrado": menor desviación estándar de scores
  const scoreKeys = WEIGHT_CRITERIA.map(c => c.key);
  const withStdDev = schools.map(s => {
    const vals = scoreKeys.map(k => toNum(s[k])).filter(v => v > 0);
    if (!vals.length) return { ...s, stddev: 99 };
    const mean = vals.reduce((a, b) => a + b) / vals.length;
    const sd   = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
    return { ...s, stddev: sd };
  });
  const mostBalanced = withStdDev.sort((a, b) => a.stddev - b.stddev)[0];

  // "Más fuerte en idiomas": ingles + otros_idiomas length
  const bestLang = [...schools].sort((a, b) => {
    const sa = toNum(a.score_ingles) + (a.otros_idiomas ? 2 : 0);
    const sb = toNum(b.score_ingles) + (b.otros_idiomas ? 2 : 0);
    return sb - sa;
  })[0];

  // "Mejor para logística": conciliacion + cercania
  const bestLogistic = [...schools].sort((a, b) => {
    return (toNum(b.score_conciliacion) + toNum(b.score_cercania)) -
           (toNum(a.score_conciliacion) + toNum(a.score_cercania));
  })[0];

  // "Más completo en etapas": score_continuidad
  const mostComplete = mostContinuity;

  // "El que genera más dudas": tiene dudas_pendientes no vacías
  const withDudas = schools.filter(s => s.dudas_pendientes && s.dudas_pendientes.trim().length > 5);
  const mostDoubts = withDudas.length ? withDudas[0] : null;

  // "Mejor según pesos": sorted[0] ya lo tenemos
  const cards2 = [
    { icon:'⚖️', label:'Más equilibrado', value: mostBalanced?.colegio ?? '—',
      micro: 'Menor variación entre criterios', cls: '' },
    { icon:'🌍', label:'Más fuerte en idiomas', value: bestLang?.colegio ?? '—',
      micro: bestLang?.otros_idiomas ? `+ ${bestLang.otros_idiomas}` : 'Mejor puntuación global de idiomas', cls: '' },
    { icon:'🏠', label:'Mejor logística familiar', value: bestLogistic?.colegio ?? '—',
      micro: 'Cercanía + conciliación combinadas', cls: '' },
    { icon:'📚', label:'Más completo en etapas', value: mostComplete?.colegio ?? '—',
      micro: mostComplete?.etapas ? mostComplete.etapas : 'Mayor continuidad educativa', cls: '' },
    { icon:'❓', label:'Genera más dudas', value: mostDoubts?.colegio ?? 'Ninguno',
      micro: mostDoubts?.dudas_pendientes?.substring(0, 60) ?? 'Sin dudas registradas', cls: '' },
    { icon:'🎯', label:'Mejor según tus pesos', value: best?.colegio ?? '—',
      micro: `Score ponderado: ${best?.score?.toFixed(1) ?? '—'}/10`, cls: 'insight-card--accent' },
  ];

  cards2.forEach(c => grid2.appendChild(makeInsightCard(c)));
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
      <input
        type="range"
        class="weight-range"
        id="range-${c.key}"
        min="1" max="5" step="1"
        value="${weights[c.key]}"
        aria-label="${c.label}"
      />
    `;
    grid.appendChild(item);

    const range = item.querySelector('.weight-range');
    const badge = item.querySelector('.weight-badge');

    range.addEventListener('input', () => {
      const v = parseInt(range.value);
      weights[c.key] = v;
      badge.textContent = v;
      // Ramp color
      const pct = (v - 1) / 4;
      badge.style.background = `hsl(${220 + pct * -100}, 70%, ${35 + pct * 15}%)`;
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

  thead.innerHTML = `
    <tr>
      <th>#</th>
      <th>Colegio</th>
      <th>Tipo</th>
      <th>Distancia</th>
      <th>Etapas</th>
      <th>Inglés</th>
      <th>Ratio</th>
      <th>Coste/mes</th>
      <th>Conciliación</th>
      <th>Lo mejor</th>
      <th>Lo peor</th>
      <th>Score</th>
    </tr>
  `;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="no-data">No hay colegios que coincidan con los filtros actuales.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  filtered.forEach((s, idx) => {
    const tr = document.createElement('tr');
    if (idx === 0) tr.classList.add('top-row');

    const scoreCls = s.score >= 7.5 ? 'score-high' : s.score >= 5 ? 'score-mid' : 'score-low';
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';

    const tipoCls = { concertado:'tipo-concertado', privado:'tipo-privado', publico:'tipo-publico' }[s.tipo_key] ?? 'tipo-default';

    const inglesBar = miniBar(toNum(s.score_ingles), 5);
    const ratioBar  = miniBar(toNum(s.score_ratio), 5);

    const tagsHtml = (s.tags_arr || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('');

    tr.innerHTML = `
      <td>${medal || (idx + 1)}</td>
      <td class="col-name">
        ${s.colegio ?? '—'}
        <small>${s.barrio_zona ?? ''}</small>
        ${tagsHtml}
      </td>
      <td><span class="tipo-badge ${tipoCls}">${s.tipo ?? '—'}</span></td>
      <td>${s.distancia_casa ?? '—'}</td>
      <td style="font-size:.78rem;max-width:130px;white-space:normal">${s.etapas ?? '—'}</td>
      <td>${inglesBar}</td>
      <td>${ratioBar}</td>
      <td>${s.coste_mensual_aprox ? `${s.coste_mensual_aprox} €` : '—'}</td>
      <td>${miniBar(toNum(s.score_conciliacion), 5)}</td>
      <td style="font-size:.78rem;max-width:160px;white-space:normal;color:var(--clr-text-2)">${s.lo_mejor ?? '—'}</td>
      <td style="font-size:.78rem;max-width:160px;white-space:normal;color:var(--clr-text-2)">${s.lo_peor ?? '—'}</td>
      <td><span class="score-badge ${scoreCls}">${s.score?.toFixed(1) ?? '—'}</span></td>
    `;

    tbody.appendChild(tr);
  });
}

function miniBar(val, max = 5) {
  const pct = Math.min(100, Math.round((val / max) * 100));
  return `<div class="mini-bar-wrap">
    <div class="mini-bar"><div class="mini-bar-fill" style="width:${pct}%"></div></div>
    <span class="mini-bar-val">${val > 0 ? val : '—'}</span>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// 8. CARDS VIEW
// ═══════════════════════════════════════════════════════════

function renderCards() {
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = '';

  if (!filtered.length) {
    grid.innerHTML = '<div class="no-data">No hay colegios con los filtros actuales.</div>';
    return;
  }

  filtered.forEach((s, idx) => {
    const card = buildSchoolCard(s, idx);
    grid.appendChild(card);
  });
}

function buildSchoolCard(s, idx) {
  const el = document.createElement('div');
  el.className = 'school-card';

  const scoreVal = s.score ?? 0;
  const scoreCls = scoreVal >= 7.5 ? 'high' : scoreVal >= 5 ? 'mid' : 'low';
  const tipoCls  = { concertado:'tipo-concertado', privado:'tipo-privado', publico:'tipo-publico' }[s.tipo_key] ?? 'tipo-default';
  const medal    = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '';

  const tagsHtml = (s.tags_arr || []).map(t => `<span class="tag">${t}</span>`).join('');

  const detailBlocks = buildDetailBlocks(s);

  el.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-name">${medal}${s.colegio ?? '—'}</div>
        <div class="card-meta">
          <span class="tipo-badge ${tipoCls}">${s.tipo ?? '—'}</span>
          ${s.distancia_casa ? `<span class="tag tag--gray">📍 ${s.distancia_casa}</span>` : ''}
        </div>
      </div>
      <div class="card-score-circle ${scoreCls}">
        ${scoreVal.toFixed(1)}
        <small>/ 10</small>
      </div>
    </div>

    <div class="card-summary">
      <div class="card-stat">
        <span class="card-stat-label">Etapas</span>
        <span class="card-stat-val">${s.etapas ?? '—'}</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-label">Inglés</span>
        <span class="card-stat-val">${scoreStars(toNum(s.score_ingles))}</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-label">Ratio</span>
        <span class="card-stat-val">${s.ratio ? `${s.ratio} alum.` : '—'}</span>
      </div>
      <div class="card-stat">
        <span class="card-stat-label">Coste aprox.</span>
        <span class="card-stat-val">${s.coste_mensual_aprox ? `${s.coste_mensual_aprox} €/mes` : '—'}</span>
      </div>
    </div>

    <div class="card-pros-cons">
      <div class="card-pro">${s.lo_mejor ?? 'Sin datos'}</div>
      <div class="card-con">${s.lo_peor ?? 'Sin datos'}</div>
    </div>

    ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}

    <button class="card-expand-btn" aria-expanded="false">
      <span class="expand-label">Ver más</span>
      <svg class="expand-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transition:transform .25s"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <div class="card-detail">
      <div class="card-detail-inner">${detailBlocks}</div>
    </div>
  `;

  // Expand / collapse
  const btn    = el.querySelector('.card-expand-btn');
  const detail = el.querySelector('.card-detail');
  const arrow  = el.querySelector('.expand-arrow');
  const label  = el.querySelector('.expand-label');

  btn.addEventListener('click', () => {
    const open = detail.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    arrow.style.transform = open ? 'rotate(180deg)' : '';
    label.textContent     = open ? 'Ver menos' : 'Ver más';
  });

  return el;
}

function scoreStars(val) {
  const v = Math.round(val);
  return '★'.repeat(v) + '☆'.repeat(Math.max(0, 5 - v));
}

function scoreColor(val) {
  const pct = (val / 5) * 100;
  if (pct >= 70) return 'var(--clr-success)';
  if (pct >= 40) return 'var(--clr-accent)';
  return 'var(--clr-danger)';
}

function buildDetailBlocks(s) {
  const block = (title, rows) => {
    const rowsHtml = rows.filter(r => r.val).map(r =>
      `<div class="detail-row"><span class="detail-row-label">${r.label}</span><span class="detail-row-val">${r.val}</span></div>`
    ).join('');
    if (!rowsHtml) return '';
    return `<div class="detail-block"><div class="detail-block-title">${title}</div>${rowsHtml}</div>`;
  };

  const scoreBlock = () => {
    const rows = WEIGHT_CRITERIA.map(c => {
      const v = toNum(s[c.key]);
      if (!v) return '';
      const pct = (v / 5) * 100;
      return `
        <div class="score-bar-row">
          <span class="score-bar-label">${c.icon} ${c.label}</span>
          <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%;background:${scoreColor(v)}"></div></div>
          <span class="score-bar-num">${v}</span>
        </div>`;
    }).join('');
    return `<div class="detail-block"><div class="detail-block-title">📊 Puntuaciones por criterio</div>${rows}</div>`;
  };

  return [
    block('📋 Datos básicos', [
      { label: 'Línea educativa', val: s.linea_educativa },
      { label: 'Metodología',     val: s.metodologia },
      { label: 'Apoyo/Refuerzo',  val: s.apoyo_refuerzo },
      { label: 'Otros idiomas',   val: s.otros_idiomas },
      { label: 'Libros/Editorial',val: s.libros_editorial },
    ]),
    block('🏫 Entorno y clima', [
      { label: 'Ambiente general',   val: s.ambiente_general },
      { label: 'Limpieza',           val: s.limpieza_instalaciones != null ? `${s.limpieza_instalaciones}/5` : null },
      { label: 'Comportamiento alumnos', val: s.comportamiento_ninos != null ? `${s.comportamiento_ninos}/5` : null },
      { label: 'Trato dirección',    val: s.trato_direccion },
      { label: 'Profesorado',        val: s.impresion_profesorado },
      { label: 'Patio/exteriores',   val: s.patio_exteriores },
      { label: 'Baños',              val: s.banos },
    ]),
    block('🚌 Logística familiar', [
      { label: 'Horario lectivo',    val: s.horario_lectivo },
      { label: 'Horario ampliado',   val: s.horario_ampliado },
      { label: 'Comedor',            val: s.comedor },
      { label: 'Extraescolares',     val: s.extraescolares },
      { label: 'Campamentos',        val: s.campamentos },
      { label: 'Entrada/Salida',     val: s.entrada_salida },
      { label: 'Compatib. familiar', val: s.compatibilidad_familiar },
    ]),
    block('💶 Costes', [
      { label: 'Coste comedor',      val: s.coste_comedor ? `${s.coste_comedor} €/mes` : null },
      { label: 'Horario ampliado',   val: s.coste_horario_ampliado ? `${s.coste_horario_ampliado} €/mes` : null },
      { label: 'Extraescolares',     val: s.coste_extraescolares ? `${s.coste_extraescolares} €/mes` : null },
      { label: 'Total aprox.',       val: s.coste_mensual_aprox ? `${s.coste_mensual_aprox} €/mes` : null },
    ]),
    block('💬 Valoración', [
      { label: 'Lo mejor',           val: s.lo_mejor },
      { label: 'Lo peor',            val: s.lo_peor },
      { label: 'Dudas pendientes',   val: s.dudas_pendientes },
      { label: 'Encaje familiar',    val: s.encaje_familiar },
      { label: 'Nota manual',        val: s.nota_manual != null ? `${s.nota_manual}/10` : null },
    ]),
    scoreBlock(),
  ].join('');
}

// ═══════════════════════════════════════════════════════════
// 9. RANKING FINAL
// ═══════════════════════════════════════════════════════════

function renderRanking() {
  const top3Container = document.getElementById('top3Grid');
  const top2Container = document.getElementById('top2Compare');

  const top3 = [...allSchools].sort((a, b) => b.score - a.score).slice(0, 3);

  top3Container.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];
  const rankCls = ['rank-1', 'rank-2', 'rank-3'];

  top3.forEach((s, i) => {
    const card = document.createElement('div');
    card.className = `top3-card ${rankCls[i]}`;

    const strengths = WEIGHT_CRITERIA
      .filter(c => toNum(s[c.key]) >= 4)
      .map(c => `<span class="tag tag--green">${c.icon} ${c.label}</span>`)
      .join('');

    card.innerHTML = `
      <div class="top3-rank">${medals[i]}</div>
      <div class="top3-name">${s.colegio ?? '—'}</div>
      <div class="top3-score">${s.score?.toFixed(1) ?? '—'}<small style="font-size:.7rem;font-weight:400;color:var(--clr-text-2)"> / 10</small></div>
      <div class="top3-reason">${buildRankReason(s, i)}</div>
      <div class="top3-strengths">${strengths || '<span class="tag tag--gray">Sin datos suficientes</span>'}</div>
    `;
    top3Container.appendChild(card);
  });

  // Compare top 2
  if (top3.length >= 2) {
    renderTop2Compare(top3[0], top3[1], top2Container);
  } else {
    top2Container.innerHTML = '';
  }
}

function buildRankReason(s, rank) {
  const strengths = WEIGHT_CRITERIA
    .filter(c => toNum(s[c.key]) >= 4)
    .map(c => c.label.toLowerCase());

  if (rank === 0) {
    return strengths.length
      ? `Destaca en <strong>${strengths.slice(0, 2).join('</strong> y <strong>')}</strong> según tus pesos actuales.`
      : 'Mejor puntuación ponderada con los criterios actuales.';
  }
  return strengths.length
    ? `Fuerte en <strong>${strengths.slice(0, 2).join('</strong> y <strong>')}</strong>.`
    : `Score: ${s.score?.toFixed(1) ?? '—'}`;
}

function renderTop2Compare(a, b, container) {
  const rows = WEIGHT_CRITERIA.map(c => {
    const va = toNum(a[c.key]);
    const vb = toNum(b[c.key]);
    if (!va && !vb) return '';
    const maxV = 5;
    const pctA = Math.round((va / maxV) * 100);
    const pctB = Math.round((vb / maxV) * 100);
    const winner = va > vb ? 'left' : vb > va ? 'right' : 'tie';
    return `
      <div class="compare-row">
        <div class="compare-bar-left">
          <div class="fill" style="width:${pctA}%;${winner==='left'?'background:var(--clr-primary)':'background:var(--clr-border)'}"></div>
        </div>
        <div class="compare-center" title="${c.label}">${c.icon}<br><small>${c.label.split(' ')[0]}</small></div>
        <div class="compare-bar-right">
          <div class="fill" style="width:${pctB}%;${winner==='right'?'background:#f0a500':'background:var(--clr-border)'}"></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="top2-compare">
      <div class="compare-title" style="display:grid;grid-template-columns:1fr 80px 1fr;gap:8px;text-align:center;margin-bottom:12px">
        <strong style="color:var(--clr-primary)">${a.colegio ?? '—'}</strong>
        <span style="font-size:.75rem;color:var(--clr-text-3)">vs</span>
        <strong style="color:#b45309">${b.colegio ?? '—'}</strong>
      </div>
      <div class="compare-grid">${rows}</div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// 10. RENDER DISPATCHER
// ═══════════════════════════════════════════════════════════

function renderCurrentView() {
  if (currentView === 'table') {
    renderTable();
  } else {
    renderCards();
  }
  updateSortBar();
  updateActiveFiltersBar();
}

function updateSortBar() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.sort === currentSort.field);
  });
  const dir = document.getElementById('sortDir');
  if (dir) {
    dir.textContent = currentSort.asc ? '↑' : '↓';
    dir.dataset.asc = currentSort.asc;
  }
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
  document.getElementById('btnTable').addEventListener('click', () => {
    currentView = 'table';
    document.getElementById('btnTable').classList.add('active');
    document.getElementById('btnCards').classList.remove('active');
    document.getElementById('tableView').classList.remove('hidden');
    document.getElementById('cardsView').classList.add('hidden');
    renderTable();
  });

  document.getElementById('btnCards').addEventListener('click', () => {
    currentView = 'cards';
    document.getElementById('btnCards').classList.add('active');
    document.getElementById('btnTable').classList.remove('active');
    document.getElementById('cardsView').classList.remove('hidden');
    document.getElementById('tableView').classList.add('hidden');
    renderCards();
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      applyFiltersAndSort();
      renderCurrentView();
    }, 250);
  });

  // Chip filters
  document.getElementById('filterChips').addEventListener('click', e => {
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
      if (currentSort.field === field) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.field = field;
        currentSort.asc   = field !== 'score'; // score defaults desc
      }
      applyFiltersAndSort();
      renderCurrentView();
    });
  });

  // Sort direction toggle
  document.getElementById('sortDir')?.addEventListener('click', () => {
    currentSort.asc = !currentSort.asc;
    applyFiltersAndSort();
    renderCurrentView();
  });

  // Reset filters
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    activeFilter = 'all';
    searchQuery  = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.chip[data-filter="all"]')?.classList.add('active');
    applyFiltersAndSort();
    renderCurrentView();
  });

  // Weights panel toggle
  document.getElementById('weightsToggleBtn')?.addEventListener('click', () => {
    document.getElementById('weightsSection').classList.toggle('collapsed');
  });
}

// ═══════════════════════════════════════════════════════════
// 12. SHOW UI SECTIONS
// ═══════════════════════════════════════════════════════════

function showApp() {
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('dashboardSection').classList.remove('hidden');
  document.getElementById('weightsSection').classList.remove('hidden');
  document.getElementById('sortBar').classList.remove('hidden');
  document.getElementById('rankingSection').classList.remove('hidden');

  // Default view: table on desktop, cards on mobile
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    currentView = 'cards';
    document.getElementById('cardsView').classList.remove('hidden');
  } else {
    currentView = 'table';
    document.getElementById('tableView').classList.remove('hidden');
    document.getElementById('btnTable').classList.add('active');
    document.getElementById('btnCards').classList.remove('active');
  }
}

// ═══════════════════════════════════════════════════════════
// 13. BOOT
// ═══════════════════════════════════════════════════════════

async function init() {
  // Timestamp
  document.getElementById('lastUpdate').textContent =
    `Actualizado: ${new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}`;

  let rawData;
  let usedFallback = false;

  try {
    const csv = await fetchCSV(CSV_URL);
    rawData = parseCSV(csv);
    if (!rawData.length) throw new Error('CSV vacío');
  } catch (err) {
    console.warn('Error cargando CSV, usando fallback:', err);
    rawData    = MOCK_DATA;
    usedFallback = true;
    document.getElementById('errorState').classList.remove('hidden');
  }

  // Normalize & filter inactive
  const normalized = rawData
    .map(normalizeSchool)
    .filter(s => s.activo_bool);

  if (!normalized.length) {
    document.getElementById('loadingState').innerHTML =
      '<p style="color:var(--clr-text-2);padding:40px">No hay colegios activos para mostrar.</p>';
    return;
  }

  // Apply initial scores
  allSchools = applyScores(normalized);
  applyFiltersAndSort();

  // Render
  renderWeightsPanel();
  showApp();
  renderInsights();
  renderCurrentView();
  renderRanking();
  bindListeners();
}

// Start
document.addEventListener('DOMContentLoaded', init);
