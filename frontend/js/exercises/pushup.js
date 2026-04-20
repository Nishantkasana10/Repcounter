// ─────────────────────────────────────────
// PUSH UP DETECTION
// Tracks nose Y going down then up
// ─────────────────────────────────────────

function getPushUpConfig() {

    let smoothedY = null;
    let baselineY = null;
    let pushState = 'up';
    let framesSinceLastRep = 0;

    return {
        name: 'PUSH UPS',

        detect: function(landmarks, ctx, canvas) {

            // Track nose position (index 0)
            const nose = landmarks[0];
            const trackY = nose.y;

            if (smoothedY === null) {
                smoothedY = trackY;
                baselineY = trackY;
            } else {
                smoothedY = smoothedY * 0.7 + trackY * 0.3;
            }

            baselineY = baselineY * 0.99 + smoothedY * 0.01;

            const threshold = 0.02 + (sensitivity / 10) * 0.06;

            framesSinceLastRep++;

            // For push up - nose goes DOWN then comes back UP
            const diff = smoothedY - baselineY; // positive = moved down

            if (diff > threshold && pushState === 'up' && framesSinceLastRep >= 10) {
                pushState = 'down';
                setStatus('active', 'going down...');
            } else if (diff < threshold * 0.3 && pushState === 'down') {
                pushState = 'up';
                framesSinceLastRep = 0;
                countRep();
                setStatus('detected', 'tracking...');
            }

            // Draw dot on nose
            const px = (1 - nose.x) * canvas.width;
            const py = nose.y * canvas.height;
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fillStyle = pushState === 'down' ? '#ff4757' : '#e8ff47';
            ctx.fill();
        },

        reset: function() {
            smoothedY = null;
            baselineY = null;
            pushState = 'up';
            framesSinceLastRep = 0;
        }
    };
}