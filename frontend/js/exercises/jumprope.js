// ─────────────────────────────────────────
// JUMP ROPE DETECTION
// Tracks shoulder midpoint going up and down
// ─────────────────────────────────────────

function getJumpRopeConfig() {

    // These variables track the jump state
    let smoothedY = null;
    let baselineY = null;
    let jumpState = 'down';
    let framesSinceLastJump = 0;

    return {
        name: 'JUMP ROPE',

        // Called every frame with pose landmarks
        detect: function(landmarks, ctx, canvas) {

            // Get left and right shoulder Y position
            const leftShoulder  = landmarks[11];
            const rightShoulder = landmarks[12];

            // Average Y of both shoulders
            const trackY = (leftShoulder.y + rightShoulder.y) / 2;

            // Smooth it so small wobbles don't count
            if (smoothedY === null) {
                smoothedY = trackY;
                baselineY = trackY;
            } else {
                smoothedY = smoothedY * 0.7 + trackY * 0.3;
            }

            // Slowly update baseline (handles if you move closer/further)
            baselineY = baselineY * 0.995 + smoothedY * 0.005;

            // Threshold changes with sensitivity slider
            const threshold = 0.008 + (sensitivity / 10) * 0.032;

            framesSinceLastJump++;

            // How much did body move UP from baseline
            const diff = baselineY - smoothedY;

            if (diff > threshold && jumpState === 'down' && framesSinceLastJump >= 8) {
                jumpState = 'up';
                setStatus('active', 'jump!');
            } else if (diff < threshold * 0.3 && jumpState === 'up') {
                jumpState = 'down';
                framesSinceLastJump = 0;
                countRep(); // ← this adds 1 to counter
            }

            // Draw dot on screen
            const px = (1 - (leftShoulder.x + rightShoulder.x) / 2) * canvas.width;
            const py = trackY * canvas.height;
            ctx.beginPath();
            ctx.arc(px, py, 8, 0, Math.PI * 2);
            ctx.fillStyle = jumpState === 'up' ? '#ff4757' : '#e8ff47';
            ctx.fill();
        },

        reset: function() {
            smoothedY = null;
            baselineY = null;
            jumpState = 'down';
            framesSinceLastJump = 0;
        }
    };
}