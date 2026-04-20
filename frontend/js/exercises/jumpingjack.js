// ─────────────────────────────────────────
// JUMPING JACK DETECTION
// Tracks wrists going wide then close
// ─────────────────────────────────────────

function getJumpingJackConfig() {

    let jackState = 'closed';
    let framesSinceLastRep = 0;

    return {
        name: 'JUMPING JACKS',

        detect: function(landmarks, ctx, canvas) {

            // Wrists are 15 (left) and 16 (right)
            const leftWrist  = landmarks[15];
            const rightWrist = landmarks[16];

            // How far apart are the wrists horizontally
            const wristDistance = Math.abs(leftWrist.x - rightWrist.x);

            // Threshold based on sensitivity
            const openThreshold  = 0.3 + (sensitivity / 10) * 0.2;
            const closeThreshold = 0.15;

            framesSinceLastRep++;

            if (wristDistance > openThreshold && jackState === 'closed' && framesSinceLastRep >= 8) {
                jackState = 'open';
                setStatus('active', 'arms out!');
            } else if (wristDistance < closeThreshold && jackState === 'open') {
                jackState = 'closed';
                framesSinceLastRep = 0;
                countRep();
                setStatus('detected', 'tracking...');
            }

            // Draw dots on wrists
            const lx = (1 - leftWrist.x) * canvas.width;
            const ly = leftWrist.y * canvas.height;
            const rx = (1 - rightWrist.x) * canvas.width;
            const ry = rightWrist.y * canvas.height;

            ctx.beginPath();
            ctx.arc(lx, ly, 8, 0, Math.PI * 2);
            ctx.fillStyle = jackState === 'open' ? '#ff4757' : '#e8ff47';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(rx, ry, 8, 0, Math.PI * 2);
            ctx.fillStyle = jackState === 'open' ? '#ff4757' : '#e8ff47';
            ctx.fill();

            // Line between wrists
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(rx, ry);
            ctx.strokeStyle = 'rgba(232, 255, 71, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        },

        reset: function() {
            jackState = 'closed';
            framesSinceLastRep = 0;
        }
    };
}