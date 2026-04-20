// ─────────────────────────────────────────
// SQUAT DETECTION
// Tracks hip Y going down then up
// ─────────────────────────────────────────

function getSquatConfig() {

    let smoothedY = null;
    let baselineY = null;
    let squatState = 'up';
    let framesSinceLastRep = 0;

    return {
        name: 'SQUATS',

        detect: function(landmarks, ctx, canvas) {

            // Hips are landmarks 23 (left) and 24 (right)
            const leftHip  = landmarks[23];
            const rightHip = landmarks[24];
            const trackY = (leftHip.y + rightHip.y) / 2;

            if (smoothedY === null) {
                smoothedY = trackY;
                baselineY = trackY;
            } else {
                smoothedY = smoothedY * 0.7 + trackY * 0.3;
            }

            baselineY = baselineY * 0.99 + smoothedY * 0.01;

            const threshold = 0.03 + (sensitivity / 10) * 0.07;

            framesSinceLastRep++;

            // Hips go DOWN then come back UP
            const diff = smoothedY - baselineY;

            if (diff > threshold && squatState === 'up' && framesSinceLastRep >= 10) {
                squatState = 'down';
                setStatus('active', 'squat down...');
            } else if (diff < threshold * 0.3 && squatState === 'down') {
                squatState = 'up';
                framesSinceLastRep = 0;
                countRep();
                setStatus('detected', 'tracking...');
            }

            // Draw dot on hips
            const px = (1 - (leftHip.x + rightHip.x) / 2) * canvas.width;
            const py = trackY * canvas.height;
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fillStyle = squatState === 'down' ? '#ff4757' : '#e8ff47';
            ctx.fill();
        },

        reset: function() {
            smoothedY = null;
            baselineY = null;
            squatState = 'up';
            framesSinceLastRep = 0;
        }
    };
}