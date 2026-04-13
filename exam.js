// exam.js

const STORAGE_KEY = 'mathExam2023';

function getState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
}

function setState(data) {
    const state = getState();
    Object.assign(state, data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getTaskState(taskId) {
    const state = getState();
    return state[taskId] || {};
}

function setTaskState(taskId, data) {
    const state = getState();
    if (!state[taskId]) state[taskId] = {};
    Object.assign(state[taskId], data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Points per task (max)
const MAX_POINTS = {
    'A1a': 1, 'A1b': 1, 'A1c': 1, 'A1d': 3,
    'A1e': 1, 'A1f': 1, 'A1g': 1, 'A1h': 1, 'A1i': 1,
    'A2a': 2, 'A2b': 2, 'A2c': 3,
    'A3a': 1, 'A3b': 2, 'A3c': 2,
    'A4a': 1, 'A4b': 2, 'A4c': 3, 'A4d': 2,
    'A5a': 3, 'A5b': 3,
    'A6a': 2, 'A6b': 2, 'A6c': 2,
    'A7a': 1, 'A7b': 3, 'A7c': 2, 'A7d': 2
};

const TASK_NAMES = {
    'A1': 'Basisaufgaben',
    'A2': 'Elektroautos',
    'A3': 'Quader',
    'A4': 'Grundstück',
    'A5': 'Online-Bestellung',
    'A6': 'Berliner Strom',
    'A7': 'Kuchen'
};

function getEarnedPoints(subId) {
    const ts = getTaskState(subId);
    return ts.points || 0;
}

function getTotalPoints() {
    let total = 0;
    for (const key of Object.keys(MAX_POINTS)) {
        total += getEarnedPoints(key);
    }
    return total;
}

function getTaskPoints(taskPrefix) {
    let earned = 0, max = 0;
    for (const [key, val] of Object.entries(MAX_POINTS)) {
        if (key.startsWith(taskPrefix)) {
            max += val;
            earned += getEarnedPoints(key);
        }
    }
    return { earned, max };
}

function saveStudentInfo() {
    const name = document.getElementById('studentName')?.value || '';
    const cls = document.getElementById('studentClass')?.value || '';
    setState({ studentName: name, studentClass: cls });
    showToast('Gespeichert!');
}

function loadStudentInfo() {
    const state = getState();
    if (document.getElementById('studentName')) {
        document.getElementById('studentName').value = state.studentName || '';
    }
    if (document.getElementById('studentClass')) {
        document.getElementById('studentClass').value = state.studentClass || '';
    }
}

function updateScoreOverview() {
    const grid = document.getElementById('scoreGrid');
    const totalEl = document.getElementById('totalScore');
    if (!grid) return;
    grid.innerHTML = '';
    const tasks = ['A1','A2','A3','A4','A5','A6','A7'];
    for (const t of tasks) {
        const { earned, max } = getTaskPoints(t);
        const div = document.createElement('div');
        div.className = 'score-item';
        div.innerHTML = `<div>${TASK_NAMES[t]}</div><div class="pts">${earned} / ${max}</div>`;
        grid.appendChild(div);
    }
    if (totalEl) totalEl.textContent = getTotalPoints();
}

// Generic feedback renderer
function showFeedback(elId, correct, message, points) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.className = 'feedback ' + (correct ? 'correct' : 'incorrect');
    el.innerHTML = (correct ? '✓ ' : '✗ ') + message;
    if (correct && points > 0) {
        el.innerHTML += ` <span class="points-earned">+${points} Punkt${points !== 1 ? 'e' : ''}</span>`;
    }
    el.style.display = 'block';
}

function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#333;color:white;padding:10px 20px;border-radius:6px;z-index:9999;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

// Number comparison helpers
function approxEqual(a, b, tol = 0.5) {
    return Math.abs(a - b) <= tol;
}

function parseGerman(str) {
    // accept comma or dot as decimal
    return parseFloat(str.replace(',', '.').replace(/\s/g, ''));
}

// Restore subtask visual state on page load
function restoreSubtaskState(subId, feedbackId, submitBtnId) {
    const ts = getTaskState(subId);
    if (!ts.submitted) return;
    const fb = document.getElementById(feedbackId);
    const btn = document.getElementById(submitBtnId);
    if (fb) {
        fb.className = 'feedback ' + (ts.correct ? 'correct' : 'incorrect');
        fb.innerHTML = ts.feedbackText || '';
        fb.style.display = 'block';
    }
    if (btn && ts.correct) btn.disabled = true;
}