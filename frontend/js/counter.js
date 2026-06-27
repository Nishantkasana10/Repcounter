// ─────────────────────────────────────────
// COUNTER.JS
// Handles: camera, pose detection,
//          counting, timer, modes
// ─────────────────────────────────────────

// ── Get exercise from URL ─────────────────
const urlParams    = new URLSearchParams(window.location.search);
const exerciseName = urlParams.get('exercise');
let exerciseConfig = null;

window.onload = function() {
    if (exerciseName === 'jumprope')    exerciseConfig = getJumpRopeConfig();
    if (exerciseName === 'pushup')      exerciseConfig = getPushUpConfig();
    if (exerciseName === 'squat')       exerciseConfig = getSquatConfig();
    if (exerciseName === 'jumpingjack') exerciseConfig = getJumpingJackConfig();

    document.getElementById('exercise-title').textContent = exerciseConfig.name;
}

// ── Mode ──────────────────────────────────
let mode = 'free'; // 'free' or 'timed'

function setMode(m) {
    // Don't switch mode while session is running
    if (cameraStarted && counting) return;

    mode = m;

    document.getElementById('btn-free').classList.toggle('active', m === 'free');
    document.getElementById('btn-timed').classList.toggle('active', m === 'timed');
    document.getElementById('timer-card').style.display   = m === 'timed' ? '' : 'none';
    document.getElementById('elapsed-card').style.display = m === 'free'  ? '' : 'none';
    document.getElementById('best-card').style.display    = m === 'timed' ? '' : 'none';

    resetSession();
}

// ── Camera + Pose ─────────────────────────
let camera        = null;
let pose          = null;
let cameraStarted = false;

const video  = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

async function initCamera() {
    document.getElementById('cam-overlay').style.display = 'none';

    pose = new Pose({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });

    pose.onResults(onPoseResults);

    camera = new Camera(video, {
        onFrame: async () => { if (pose) await pose.send({ image: video }); },
        width: 640,
        height: 480
    });

    await camera.start();
    cameraStarted = true;
    setStatus('detected', 'pose loading...');
}

function onPoseResults(results) {
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks) {
        setStatus('', 'no pose detected');
        return;
    }

    setStatus('detected', counting ? 'tracking...' : 'pose found — press begin!');

    if (counting && exerciseConfig) {
        exerciseConfig.detect(results.poseLandmarks, ctx, canvas);
    }
}

// ── State ─────────────────────────────────
let repCount       = 0;
let counting       = false;
let elapsedSeconds = 0;
let timerLeft      = 60;
let elapsedInterval = null;
let timerInterval   = null;
let personalBest    = 0;

// ── Count a rep (called from exercise files) ──
function countRep() {
    repCount++;
    const el = document.getElementById('count-display');
    el.textContent = repCount;
    el.classList.remove('bump');
    void el.offsetWidth; // force reflow so animation replays
    el.classList.add('bump');
}

// ── Main button handler ───────────────────
async function handleMainButton() {
    const btn = document.getElementById('main-btn');

    // Step 1 — first click starts camera
    if (!cameraStarted) {
        btn.textContent = 'STARTING...';
        btn.disabled    = true;
        try {
            await initCamera();
        } catch(e) {
            alert('Could not access camera. Please allow camera permission.');
            btn.textContent = 'START CAMERA';
            btn.disabled    = false;
            return;
        }
        btn.textContent = 'BEGIN';
        btn.disabled    = false;
        document.getElementById('reset-btn').disabled = false;
        return;
    }

    // Step 2 — toggle start/stop
    if (!counting) {
        startCounting();
    } else {
        stopCounting();
    }
}

function startCounting() {
    // Reset numbers
    repCount       = 0;
    elapsedSeconds = 0;
    timerLeft      = 60;

    document.getElementById('count-display').textContent  = '0';
    document.getElementById('elapsed-display').textContent = '0:00';
    document.getElementById('timer-display').textContent  = '1:00';

    // Reset exercise state
    if (exerciseConfig) exerciseConfig.reset();

    counting = true;
    document.getElementById('main-btn').textContent = 'STOP';
    document.getElementById('main-btn').style.background = '#ff4757';
    document.getElementById('main-btn').style.borderColor = '#ff4757';
    document.getElementById('reset-btn').disabled = false;

    // Start elapsed timer (both modes show elapsed)
    elapsedInterval = setInterval(() => {
        elapsedSeconds++;
        const m = Math.floor(elapsedSeconds / 60);
        const s = elapsedSeconds % 60;
        document.getElementById('elapsed-display').textContent =
            `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);

    // Timed mode — countdown
    if (mode === 'timed') {
        timerInterval = setInterval(() => {
            timerLeft--;
            const m = Math.floor(timerLeft / 60);
            const s = timerLeft % 60;
            document.getElementById('timer-display').textContent =
                `${m}:${s.toString().padStart(2, '0')}`;

            if (timerLeft <= 0) {
                finishTimedSession();
            }
        }, 1000);
    }
}

function stopCounting() {
    counting = false;
    clearInterval(elapsedInterval);
    clearInterval(timerInterval);

    document.getElementById('main-btn').textContent   = 'BEGIN';
    document.getElementById('main-btn').style.background  = '';
    document.getElementById('main-btn').style.borderColor = '';
}

function finishTimedSession() {
    stopCounting();

    // Check personal best
    const isNewBest = repCount > personalBest;
    if (isNewBest) personalBest = repCount;

    document.getElementById('best-display').textContent = personalBest;

    // Show finish overlay
    document.getElementById('finish-score').textContent = repCount;
    document.getElementById('finish-sub').textContent   = 'reps in 60 seconds';
    document.getElementById('finish-best').textContent  =
        isNewBest ? '🏆 NEW PERSONAL BEST!' : `Personal best: ${personalBest}`;

    document.getElementById('finish-overlay').classList.add('show');

    // Save to backend
    saveWorkout();
}

function tryAgain() {
    closeOverlay();
    setTimeout(() => startCounting(), 100);
}

function closeOverlay() {
    document.getElementById('finish-overlay').classList.remove('show');
}

// ── Reset ─────────────────────────────────
function resetSession() {
    stopCounting();

    repCount       = 0;
    elapsedSeconds = 0;
    timerLeft      = 60;

    document.getElementById('count-display').textContent   = '0';
    document.getElementById('elapsed-display').textContent = '0:00';
    document.getElementById('timer-display').textContent   = '1:00';
    document.getElementById('finish-overlay').classList.remove('show');

    if (exerciseConfig) exerciseConfig.reset();

    const btn = document.getElementById('main-btn');
    btn.textContent   = cameraStarted ? 'BEGIN' : 'START CAMERA';
    btn.style.background  = '';
    btn.style.borderColor = '';

    document.getElementById('reset-btn').disabled = !cameraStarted;
}

// ── Save workout to Python backend ────────
async function saveWorkout() {
    try {
        const response = await fetch('http://localhost:5000/save-workout', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({
                exercise: exerciseName,
                reps    : repCount,
                duration: elapsedSeconds
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('Workout saved!', result.summary);
        }
    } catch(err) {
        // Backend not running — that's okay, JS still works
        console.log('Backend not available, workout not saved');
    }
}

// ── Sensitivity + Status ──────────────────
let sensitivity = 5;

function updateSensitivity(v) {
    sensitivity = parseInt(v);
    document.getElementById('sens-val').textContent = v;
}

function setStatus(state, text) {
    const dot = document.getElementById('status-dot');
    dot.className = 'status-dot' + (state ? ' ' + state : '');
    document.getElementById('status-text').textContent = text;
}