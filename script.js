document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreDisplay = document.getElementById('finalScore');
    const restartButton = document.getElementById('restartButton');
    const startScreen = document.getElementById('startScreen');
    const startButton = document.getElementById('startButton');

    const baseGridSize = 20; // The size of each snake segment and food item
    let gridSize = baseGridSize; // This will remain baseGridSize

    let tileCountX, tileCountY; // Number of grid cells horizontally and vertically

    function setupCanvas() {
        const container = document.querySelector('.game-container');
        const scoreBoard = document.querySelector('.score-board');

        // Get computed styles to account for padding, border, etc.
        const containerStyles = getComputedStyle(container);
        const scoreBoardStyles = getComputedStyle(scoreBoard);

        // Calculate the effective inner dimensions of the game-container where the canvas can be placed
        const containerInnerWidth = container.clientWidth - parseFloat(containerStyles.paddingLeft) - parseFloat(containerStyles.paddingRight);
        const containerInnerHeight = container.clientHeight - parseFloat(containerStyles.paddingTop) - parseFloat(containerStyles.paddingBottom);

        // Account for the height of the score board and its margins
        const scoreBoardHeightWithMargin = scoreBoard.offsetHeight + parseFloat(scoreBoardStyles.marginTop) + parseFloat(scoreBoardStyles.marginBottom);

        // This is the actual space available for the canvas element itself
        let availableWidthForCanvas = containerInnerWidth;
        let availableHeightForCanvas = containerInnerHeight - scoreBoardHeightWithMargin;

        // Ensure dimensions are positive
        availableWidthForCanvas = Math.max(0, availableWidthForCanvas);
        availableHeightForCanvas = Math.max(0, availableHeightForCanvas);
        
        // Calculate how many full grid cells can fit into the available space
        let numCols = Math.floor(availableWidthForCanvas / baseGridSize);
        let numRows = Math.floor(availableHeightForCanvas / baseGridSize);

        // Ensure a minimum number of cells for playability
        const minTilesHorizontal = 10;
        const minTilesVertical = 10; // Can be different if desired, e.g., 10x15
        numCols = Math.max(minTilesHorizontal, numCols);
        numRows = Math.max(minTilesVertical, numRows);

        // Update global tile counts
        tileCountX = numCols;
        tileCountY = numRows;

        // Set canvas dimensions based on the number of cells and grid size
        canvas.width = tileCountX * baseGridSize;
        canvas.height = tileCountY * baseGridSize;

        // Explicitly set canvas style width/height to match its internal resolution
        // This prevents CSS from trying to scale it in a way that might distort grid cells
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';

        gridSize = baseGridSize; // Keep gridSize consistent
    }


    let snake = [];
    let food = {};
    let dx = 1;
    let dy = 0;
    let score = 0;
    let changingDirection = false;
    let gameRunning = false;
    let animationFrameId;

    const baseGameSpeed = 150; // Milliseconds per logical snake move
    let currentGameSpeed = baseGameSpeed;
    let lastUpdateTime = 0;
    let accumulatedTime = 0;

    let touchStartX = 0;
    let touchStartY = 0;
    const minSwipeDistance = 30;

    const foodColor = 'red';
    const foodBorderColor = 'darkred';
    let foodPulseState = 0;
    let particles = [];

    class Particle { // (Particle class remains the same)
        constructor(x, y, color) {
            this.x = x; this.y = y;
            this.size = Math.random() * (gridSize * 0.25) + (gridSize * 0.1);
            this.speedX = (Math.random() * 3 - 1.5) * (gridSize / 20);
            this.speedY = (Math.random() * 3 - 1.5) * (gridSize / 20);
            this.color = color; this.life = 60; this.opacity = 1;
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            this.opacity -= 1 / this.life; this.life--;
        }
        draw() {
            ctx.save(); ctx.globalAlpha = Math.max(0, this.opacity);
            ctx.fillStyle = this.color; ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    function createParticles(x, y, color, count = 15) { // (Remains the same)
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x + gridSize / 2, y + gridSize / 2, color));
        }
    }

    function updateAndDrawParticles() { // (Remains the same)
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            if (particles[i].life <= 0 || particles[i].opacity <=0) particles.splice(i, 1);
            else particles[i].draw();
        }
    }

    function initializeGame() {
        setupCanvas(); // Crucial: sets canvas size, gridSize, tileCountX/Y

        // Snake starting position more generally centered
        const startX = Math.floor(tileCountX / 2) - 2; // Start slightly left of H-center
        const startY = Math.floor(tileCountY / 2) -1;   // Start slightly above V-center

        snake = [
            { x: startX, y: startY, renderX: startX * gridSize, renderY: startY * gridSize },
            { x: startX - 1, y: startY, renderX: (startX - 1) * gridSize, renderY: startY * gridSize },
            { x: startX - 2, y: startY, renderX: (startX - 2) * gridSize, renderY: startY * gridSize },
        ];
        dx = 1; dy = 0; // Initial direction: Right

        score = 0; scoreDisplay.textContent = score;
        currentGameSpeed = baseGameSpeed; changingDirection = false;
        gameOverScreen.style.display = 'none'; startScreen.style.display = 'none';
        canvas.style.filter = 'none'; particles = [];
        placeFood();

        gameRunning = true;
        lastUpdateTime = performance.now(); accumulatedTime = 0;

        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function gameLoop(currentTime) { // (Game loop logic mostly same)
        if (!gameRunning) return;
        animationFrameId = requestAnimationFrame(gameLoop);
        const deltaTime = currentTime - lastUpdateTime;
        lastUpdateTime = currentTime; accumulatedTime += deltaTime;

        if (accumulatedTime >= currentGameSpeed) {
            accumulatedTime -= currentGameSpeed;
            advanceGameState(); changingDirection = false;
        }
        updateSnakeRenderPositions(deltaTime);
        clearCanvas(); drawFood(); drawSnake(); updateAndDrawParticles();
    }

    function advanceGameState() { // (Advance game state logic mostly same)
        if (isGameOver()) { showGameOver(); return; }
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        head.renderX = snake[0].x * gridSize; head.renderY = snake[0].y * gridSize;
        snake.unshift(head);

        if (head.x === food.x && head.y === food.y) {
            score += 10; scoreDisplay.textContent = score;
            createParticles(food.x * gridSize, food.y * gridSize, 'gold');
            placeFood();
            if (currentGameSpeed > 60) currentGameSpeed = Math.max(60, currentGameSpeed - 2.5);
        } else {
            snake.pop();
        }
    }

    function updateSnakeRenderPositions(deltaTime) { // (Interpolation logic same)
        const interpolationFactor = Math.min(1, (deltaTime / currentGameSpeed) * 2.8);
        snake.forEach(segment => {
            const targetRenderX = segment.x * gridSize; const targetRenderY = segment.y * gridSize;
            if (segment.renderX !== targetRenderX) {
                segment.renderX += (targetRenderX - segment.renderX) * interpolationFactor;
                if (Math.abs(segment.renderX - targetRenderX) < 0.5) segment.renderX = targetRenderX;
            }
            if (segment.renderY !== targetRenderY) {
                segment.renderY += (targetRenderY - segment.renderY) * interpolationFactor;
                if (Math.abs(segment.renderY - targetRenderY) < 0.5) segment.renderY = targetRenderY;
            }
        });
    }

    function clearCanvas() { ctx.fillStyle = '#34495e'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

    function drawSnakePart(segment, index) { // (Snake drawing mostly same)
        const segX = segment.renderX; const segY = segment.renderY;
        if (index === 0) { // Head
            const headGradient = ctx.createRadialGradient(segX + gridSize / 2, segY + gridSize / 2, gridSize / 4, segX + gridSize / 2, segY + gridSize / 2, gridSize * 0.7);
            headGradient.addColorStop(0, '#58d68d'); headGradient.addColorStop(1, '#27ae60');
            ctx.fillStyle = headGradient; ctx.strokeStyle = '#1e8449';
            ctx.lineWidth = Math.max(1, gridSize * 0.05);
            ctx.beginPath(); ctx.roundRect(segX + ctx.lineWidth/2, segY + ctx.lineWidth/2, gridSize - ctx.lineWidth, gridSize - ctx.lineWidth, gridSize * 0.3); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'white'; ctx.strokeStyle = 'black'; ctx.lineWidth = Math.max(1, gridSize * 0.02);
            const eyeSize = gridSize * 0.18; const pupilSize = gridSize * 0.09;
            const eyeOffsetX = dx !== 0 ? (dx > 0 ? gridSize * 0.25 : -gridSize * 0.25) : 0;
            const eyeOffsetY = dy !== 0 ? (dy > 0 ? gridSize * 0.25 : -gridSize * 0.25) : 0;
            const baseEyeX = segX + gridSize / 2 - eyeSize / 2; const baseEyeY = segY + gridSize / 2 - eyeSize / 2;
            let eye1X, eye1Y, eye2X, eye2Y;
            if (dx === 1) { eye1X = baseEyeX + gridSize * 0.15; eye1Y = baseEyeY - gridSize * 0.15; eye2X = baseEyeX + gridSize * 0.15; eye2Y = baseEyeY + gridSize * 0.15; }
            else if (dx === -1) { eye1X = baseEyeX - gridSize * 0.15; eye1Y = baseEyeY - gridSize * 0.15; eye2X = baseEyeX - gridSize * 0.15; eye2Y = baseEyeY + gridSize * 0.15; }
            else if (dy === 1) { eye1X = baseEyeX - gridSize * 0.15; eye1Y = baseEyeY + gridSize * 0.15; eye2X = baseEyeX + gridSize * 0.15; eye2Y = baseEyeY + gridSize * 0.15; }
            else { eye1X = baseEyeX - gridSize * 0.15; eye1Y = baseEyeY - gridSize * 0.15; eye2X = baseEyeX + gridSize * 0.15; eye2Y = baseEyeY - gridSize * 0.15; }
            ctx.beginPath(); ctx.arc(eye1X + eyeSize/2 + eyeOffsetX, eye1Y + eyeSize/2 + eyeOffsetY, eyeSize/2, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(eye2X + eyeSize/2 + eyeOffsetX, eye2Y + eyeSize/2 + eyeOffsetY, eyeSize/2, 0, 2*Math.PI); ctx.fill(); ctx.stroke();
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(eye1X + eyeSize/2 + eyeOffsetX, eye1Y + eyeSize/2 + eyeOffsetY, pupilSize/2, 0, 2*Math.PI); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2X + eyeSize/2 + eyeOffsetX, eye2Y + eyeSize/2 + eyeOffsetY, pupilSize/2, 0, 2*Math.PI); ctx.fill();
        } else { // Body
            const bodyGradient = ctx.createLinearGradient(segX, segY, segX + gridSize, segY + gridSize);
            bodyGradient.addColorStop(0, '#2ecc71'); bodyGradient.addColorStop(1, '#27ae60');
            ctx.fillStyle = bodyGradient; ctx.strokeStyle = '#1e8449'; ctx.lineWidth = Math.max(1,gridSize * 0.05);
            ctx.beginPath(); ctx.roundRect(segX + ctx.lineWidth, segY + ctx.lineWidth, gridSize - ctx.lineWidth*2, gridSize - ctx.lineWidth*2, gridSize * 0.25); ctx.fill(); ctx.stroke();
        }
    }
    function drawSnake() { snake.forEach(drawSnakePart); }

    function placeFood() { // (Uses tileCountX/Y)
        food.x = Math.floor(Math.random() * tileCountX); food.y = Math.floor(Math.random() * tileCountY);
        snake.forEach(part => { if (part.x === food.x && part.y === food.y) placeFood(); });
    }
    function drawFood() { // (Food drawing mostly same)
        ctx.fillStyle = foodColor; ctx.strokeStyle = foodBorderColor; ctx.lineWidth = Math.max(1, gridSize * 0.08);
        foodPulseState += 0.1; const pulseOffset = Math.sin(foodPulseState) * (gridSize * 0.05);
        const foodRadius = (gridSize / 2) - (gridSize * 0.15) + pulseOffset;
        const foodRenderX = food.x * gridSize + gridSize / 2; const foodRenderY = food.y * gridSize + gridSize / 2;
        ctx.beginPath(); ctx.arc(foodRenderX, foodRenderY, foodRadius, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.beginPath();
        ctx.arc(foodRenderX - foodRadius * 0.25, foodRenderY - foodRadius * 0.25, foodRadius * 0.2, 0, 2 * Math.PI); ctx.fill();
    }

    function handleDirectionChange(newDx, newDy) { // (Direction change logic same)
        if (changingDirection) return;
        const goingUp = dy === -1, goingDown = dy === 1, goingRight = dx === 1, goingLeft = dx === -1;
        if ((newDx === -1 && goingRight) || (newDx === 1 && goingLeft) || (newDy === -1 && goingDown) || (newDy === 1 && goingUp)) return;
        dx = newDx; dy = newDy; changingDirection = true;
    }
    function onKeyDown(event) { // (Key handling same)
        if (!gameRunning && event.key !== 'Enter' && event.key !== ' ') return;
        switch (event.key) {
            case 'ArrowLeft': case 'a': case 'A': handleDirectionChange(-1, 0); break;
            case 'ArrowUp': case 'w': case 'W': handleDirectionChange(0, -1); break;
            case 'ArrowRight': case 'd': case 'D': handleDirectionChange(1, 0); break;
            case 'ArrowDown': case 's': case 'S': handleDirectionChange(0, 1); break;
            case 'Enter': case ' ':
                if (!gameRunning) {
                    if (startScreen.style.display !== 'none') startButton.click();
                    else if (gameOverScreen.style.display !== 'none') restartButton.click();
                } break;
        }
    }
    function onTouchStart(event) { // (Touch handling same)
        touchStartX = event.touches[0].clientX; touchStartY = event.touches[0].clientY; event.preventDefault();
    }
    function onTouchEnd(event) { // (Touch handling same)
        if (touchStartX === 0 && touchStartY === 0) return;
        const touchEndX = event.changedTouches[0].clientX; const touchEndY = event.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX; const diffY = touchEndY - touchStartY;
        if (Math.abs(diffX) < minSwipeDistance && Math.abs(diffY) < minSwipeDistance) { touchStartX = 0; touchStartY = 0; return; }
        if (Math.abs(diffX) > Math.abs(diffY)) { handleDirectionChange(diffX > 0 ? 1 : -1, 0); }
        else { handleDirectionChange(0, diffY > 0 ? 1 : -1); }
        touchStartX = 0; touchStartY = 0; event.preventDefault();
    }

    function isGameOver() { // (Uses tileCountX/Y)
        if (snake[0].x < 0 || snake[0].x >= tileCountX || snake[0].y < 0 || snake[0].y >= tileCountY) return true;
        for (let i = 1; i < snake.length; i++) { if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) return true; }
        return false;
    }
    function showGameOver() { // (Game Over display logic same)
        gameRunning = false; if (animationFrameId) cancelAnimationFrame(animationFrameId);
        finalScoreDisplay.textContent = score; gameOverScreen.style.display = 'flex';
        canvas.style.filter = 'blur(4px) grayscale(60%)';
        createParticles(snake[0].renderX, snake[0].renderY, 'lightcoral', 30);
    }
    function showStartScreen() {
        gameRunning = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId); // Ensure game loop is stopped
        startScreen.style.display = 'flex';
        gameOverScreen.style.display = 'none';
        // setupCanvas will determine the size, then we apply filter and clear
        setupCanvas();
        canvas.style.filter = 'blur(4px) grayscale(60%)';
        clearCanvas(); // Clear with new dimensions before showing start screen content
    }
    function handleResize() {
        // On resize, show the start screen which re-initializes canvas size
        showStartScreen();
    }

    document.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    restartButton.addEventListener('click', initializeGame);
    startButton.addEventListener('click', initializeGame);
    window.addEventListener('resize', handleResize);

    showStartScreen(); // Initial setup call
});