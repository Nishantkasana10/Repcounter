// ─────────────────────────────────────────
// COUNTER.JS - the brain of the whole app
// ─────────────────────────────────────────

// Step 1 - figure out which exercise was clicked
// When user clicks "Push Up" on home page, URL becomes:
// counter.html?exercise=pushup
// We read that "pushup" from the URL here
const urlParams = new URLSearchParams(window.location.search);
const exerciseName = urlParams.get('exercise');

// Step 2 - each exercise has its own config
// We'll define these in each exercise JS file
// For now set a default
let exerciseConfig = null;

// Step 3 - load the right exercise config
window.onload = function() {
    if (exerciseName === 'jumprope')    exerciseConfig = getJumpRopeConfig();
    if (exerciseName === 'pushup')      exerciseConfig = getPushUpConfig();
    if (exerciseName === 'squat')       exerciseConfig = getSquatConfig();
    if (exerciseName === 'jumpingjack') exerciseConfig = getJumpingJackConfig();

    // Show exercise name in top bar
    document.getElementById('exercise-title').textContent = exerciseConfig.name;
}

// ─────────────────────────────────────────
// CAMERA + MEDIAPIPE SETUP
// ─────────────────────────────────────────
let camera = null;
let pose = null;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

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

    // Every frame mediapipe detects pose → calls onPoseResults
    pose.onResults(onPoseResults);

    camera = new Camera(video, {
        onFrame: async () => {
            if (pose) await pose.send({ image: video });
        },
        width: 640,
        height: 480
    });

    await camera.start();
    setStatus('detected', 'pose loading...');
}

// ─────────────────────────────────────────
// EVERY FRAME THIS RUNS
// ─────────────────────────────────────────
function onPoseResults(results) {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks) {
        setStatus('', 'no pose detected');
        return;
    }

    setStatus('detected', counting ? 'tracking...' : 'pose found — press begin!');

    // Pass landmarks to the current exercise
    // Each exercise knows what to do with them
    if (counting && exerciseConfig) {
        exerciseConfig.detect(results.poseLandmarks, ctx, canvas);
    }
}

// ─────────────────────────────────────────
// COUNTING
// ─────────────────────────────────────────
let skipCount = 0;
let counting = false;
let timerInterval = null;
let secondsElapsed = 0;

function countRep() {
    skipCount++;
    const el = document.getElementById('count-display');
    el.textContent = skipCount;
}

// ─────────────────────────────────────────
// SESSION CONTROL
// ─────────────────────────────────────────
async function startSession() {
    const btn = document.getElementById('start-btn');

    if (!camera) {
        btn.textContent = 'STARTING...';
        btn.disabled = true;
        await initCamera();
        btn.textContent = 'BEGIN';
        btn.disabled = false;
        document.getElementById('reset-btn').disabled = false;
        return;
    }

    // Reset count
    skipCount = 0;
    secondsElapsed = 0;
    document.getElementById('count-display').textContent = '0';
    document.getElementById('timer-display').textContent = '0:00';

    // Reset exercise state
    if (exerciseConfig) exerciseConfig.reset();

    counting = true;
    btn.textContent = 'COUNTING...';
    btn.disabled = true;

    // Start timer
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const m = Math.floor(secondsElapsed / 60);
        const s = secondsElapsed % 60;
        document.getElementById('timer-display').textContent =
            `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

function resetSession() {
    counting = false;
    clearInterval(timerInterval);
    skipCount = 0;
    secondsElapsed = 0;
    document.getElementById('count-display').textContent = '0';
    document.getElementById('timer-display').textContent = '0:00';
    document.getElementById('start-btn').textContent = camera ? 'BEGIN' : 'START CAMERA';
    document.getElementById('start-btn').disabled = false;
    if (exerciseConfig) exerciseConfig.reset();
}

// ─────────────────────────────────────────
// SENSITIVITY + STATUS
// ─────────────────────────────────────────
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