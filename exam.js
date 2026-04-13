// ── exam.js  –  shared state & utility functions ────────────────────────────

const STORAGE_KEY = 'mathExam2023_v2';

// ── persistence ──────────────────────────────────────────────────────────────

function getState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
}

function setState(patch) {
    const state = getState();
    Object.assign(state, patch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Read the persisted object for one sub-task id, e.g. 'A1a'. */
function getTaskState(subId) {
    return getState()[subId] || {};
}

/** Merge data into the persisted object for one sub-task id. */
function setTaskState(subId, data) {
    const state = getState();
    state[subId] = Object.assign(state[subId] || {}, data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── points catalogue ─────────────────────────────────────────────────────────

const MAX_POINTS = {
    A1a: 1, A1b: 1, A1c: 1, A1d: 3,
    A1e: 1, A1f: 1, A1g: 1, A1h: 1, A1i: 1,
    A2a: 2, A2b: 2, A2c: 3,
    A3a: 1, A3b: 2, A3c: 2,
    A4a: 1, A4b: 2, A4c: 3, A4d: 2,
    A5a: 3, A5b: 3,
    A6a: 2, A6b: 2, A6c: 2,
    A7a: 1, A7b: 3, A7c: 2, A7d: 2,
};

const MAX_TOTAL = Object.values(MAX_POINTS).reduce((a, b) => a + b, 0); // 51

const TASK_NAMES = {
    A1: 'Basisaufgaben',
    A2: 'Elektroautos',
    A3: 'Quader',
    A4: 'Grundstück',
    A5: 'Online-Bestellung',
    A6: 'Berliner Strom',
    A7: 'Kuchen',
};

function getTaskPoints(prefix) {
    let earned = 0, max = 0;
    for (const [key, val] of Object.entries(MAX_POINTS)) {
        if (key.startsWith(prefix)) {
            max    += val;
            earned += (getTaskState(key).points || 0);
        }
    }
    return { earned, max };
}

function getTotalPoints() {
    return Object.keys(MAX_POINTS)
        .reduce((sum, k) => sum + (getTaskState(k).points || 0), 0);
}

// ── score overview (index.html) ───────────────────────────────────────────────

function updateScoreOverview() {
    const grid    = document.getElementById('scoreGrid');
    const totalEl = document.getElementById('totalScore');
    if (!grid) return;

    grid.innerHTML = '';
    ['A1','A2','A3','A4','A5','A6','A7'].forEach(t => {
        const { earned, max } = getTaskPoints(t);
        const div = document.createElement('div');
        div.className = 'score-item';
        div.innerHTML =
            `<div style="font-size:0.85rem;">${TASK_NAMES[t]}</div>` +
            `<div class="pts">${earned}&thinsp;/&thinsp;${max}</div>`;
        grid.appendChild(div);
    });
    if (totalEl) totalEl.textContent = getTotalPoints();
}

// ── student info (index.html) ─────────────────────────────────────────────────

function saveStudentInfo() {
    const name = (document.getElementById('studentName')  || {}).value || '';
    const cls  = (document.getElementById('studentClass') || {}).value || '';
    setState({ studentName: name, studentClass: cls });
    showToast('Gespeichert!');
}

function loadStudentInfo() {
    const s = getState();
    const nameEl = document.getElementById('studentName');
    const clsEl  = document.getElementById('studentClass');
    if (nameEl) nameEl.value = s.studentName || '';
    if (clsEl)  clsEl.value  = s.studentClass || '';
}

// ── number helpers ────────────────────────────────────────────────────────────

/** Parse a number that may use comma as decimal separator. */
function parseGerman(str) {
    if (str === undefined || str === null) return NaN;
    return parseFloat(String(str).replace(',', '.').replace(/\s/g, ''));
}

/** True when |a – b| ≤ tol. */
function approxEqual(a, b, tol = 0.5) {
    return Math.abs(a - b) <= tol;
}

// ── feedback helpers ──────────────────────────────────────────────────────────

/** Build the points badge HTML string. */
function pointsBadge(pts) {
    if (pts <= 0) return '';
    return ` <span class="points-earned">+${pts}&thinsp;Punkt${pts !== 1 ? 'e' : ''}</span>`;
}

// ── toast ─────────────────────────────────────────────────────────────────────

function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText =
        'position:fixed;bottom:70px;right:24px;background:#333;color:#fff;' +
        'padding:10px 20px;border-radius:6px;z-index:9999;font-size:0.95rem;' +
        'box-shadow:0 2px 8px rgba(0,0,0,.3);';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
}

// ── persistent floating score bar ────────────────────────────────────────────
// Injected into every page automatically on DOMContentLoaded.

function createScoreBar() {
    const bar = document.createElement('div');
    bar.id = 'globalScoreBar';

    // Inner layout: left = task breakdown (hidden by default, toggle),
    // right = total always visible.
    bar.innerHTML = `
        <div id="gsb-inner">
            <button id="gsb-toggle" title="Aufgaben anzeigen">▲ Aufgaben</button>
            <div id="gsb-breakdown" hidden></div>
            <div id="gsb-total">
                <span id="gsb-label">Punkte gesamt:</span>
                <span id="gsb-fraction">
                    <span id="gsb-earned">0</span>
                    <span id="gsb-sep">&thinsp;/&thinsp;</span>
                    <span id="gsb-max">51</span>
                </span>
                <div id="gsb-bar-track">
                    <div id="gsb-bar-fill"></div>
                </div>
                <span id="gsb-pct">0&thinsp;%</span>
            </div>
        </div>`;

    document.body.appendChild(bar);

    document.getElementById('gsb-toggle').addEventListener('click', toggleBreakdown);
    refreshScoreBar();
}

function refreshScoreBar() {
    const earned = getTotalPoints();
    const pct    = Math.round((earned / MAX_TOTAL) * 100);

    const earnedEl = document.getElementById('gsb-earned');
    const fillEl   = document.getElementById('gsb-bar-fill');
    const pctEl    = document.getElementById('gsb-pct');
    if (!earnedEl) return;

    earnedEl.textContent    = earned;
    fillEl.style.width      = pct + '%';
    pctEl.textContent       = pct + '\u202f%';

    // colour the bar: red → amber → green
    fillEl.style.background =
        pct < 40 ? '#e53935' :
        pct < 70 ? '#fb8c00' : '#43a047';

    // refresh breakdown if visible
    const bd = document.getElementById('gsb-breakdown');
    if (bd && !bd.hidden) renderBreakdown(bd);
}

function renderBreakdown(container) {
    container.innerHTML = '';
    ['A1','A2','A3','A4','A5','A6','A7'].forEach(t => {
        const { earned, max } = getTaskPoints(t);
        const row = document.createElement('div');
        row.className = 'gsb-row';
        const bPct = max > 0 ? Math.round((earned / max) * 100) : 0;
        row.innerHTML =
            `<span class="gsb-name">${t.replace('A','Aufg. ')}&nbsp;<small>${TASK_NAMES[t]}</small></span>` +
            `<span class="gsb-pts">${earned}&thinsp;/&thinsp;${max}</span>` +
            `<span class="gsb-mini-track"><span class="gsb-mini-fill" style="width:${bPct}%;background:${bPct<40?'#e53935':bPct<70?'#fb8c00':'#43a047'}"></span></span>`;
        container.appendChild(row);
    });
}

function toggleBreakdown() {
    const bd  = document.getElementById('gsb-breakdown');
    const btn = document.getElementById('gsb-toggle');
    const bar = document.getElementById('globalScoreBar');
    if (bd.hidden) {
        renderBreakdown(bd);
        bd.hidden = false;
        btn.textContent = '▼ Aufgaben';
        bar.classList.add('expanded');
    } else {
        bd.hidden = true;
        btn.textContent = '▲ Aufgaben';
        bar.classList.remove('expanded');
    }
}

// Patch setTaskState so the bar refreshes automatically after every answer.
const _origSetTaskState = setTaskState;
// We redefine it here as a wrapper:
// (setTaskState is already defined above; we monkey-patch after definition)
(function patchSetTaskState() {
    const original = setTaskState;
    window.setTaskState = function(subId, data) {
        original(subId, data);
        refreshScoreBar();
        // also refresh index overview if present
        updateScoreOverview();
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    createScoreBar();
});