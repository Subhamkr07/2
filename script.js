// Elements
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-btn');
const gameContainer = document.getElementById('game-container');
const restartButton = document.getElementById('restart-btn');
const scoreDisplay = document.getElementById('score');
const gameBoard = document.getElementById('game-board');
const modal = document.getElementById('game-over-modal');

// On-screen control buttons
const upButton = document.getElementById('up-btn');
const downButton = document.getElementById('down-btn');
const leftButton = document.getElementById('left-btn');
const rightButton = document.getElementById('right-btn');

// Game Settings
const boardSize = 20; // Size of each cell in pixels
const rows = 20; // Number of rows
const cols = 20; // Number of columns
const ctx = gameBoard.getContext('2d');
gameBoard.width = cols * boardSize;
gameBoard.height = rows * boardSize;

// Game Variables
let snake = [{ x: 10, y: 10 }]; // Initial snake position
let food = { x: 5, y: 5 }; // Initial food position
let direction = { x: 1, y: 0 }; // Initial direction (moving right)
let nextDirection = { x: 1, y: 0 };
let score = 0;
let gameInterval;
let isPaused = false;

// Start Game
startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    resetGame();
    startGame();
});

// Restart Game
restartButton.addEventListener('click', () => {
    modal.classList.add('hidden');
    resetGame();
    startGame();
});

// Reset Game
function resetGame() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    generateFood();
    drawGame();
}

// Start the game loop
function startGame() {
    gameInterval = setInterval(updateGame, 200); // Game speed
}

// Pause/Resume Game on Touch
gameBoard.addEventListener('click', togglePause);

function togglePause() {
    if (isPaused) {
        startGame();
    } else {
        clearInterval(gameInterval);
    }
    isPaused = !isPaused;
}

// Generate Random Food
function generateFood() {
    food.x = Math.floor(Math.random() * cols);
    food.y = Math.floor(Math.random() * rows);
}

// Update Game Logic
function updateGame() {
    // Update the direction
    direction = nextDirection;

    // Calculate the next head position
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y,
    };

    // Check Game Over
    if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= cols ||
        head.y >= rows ||
        snake.some(segment => segment.x === head.x && segment.y === head.y)
    ) {
        clearInterval(gameInterval);
        modal.classList.remove('hidden');
        return;
    }

    snake.unshift(head);

    // Check if Snake Eats Food
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreDisplay.textContent = `Score: ${score}`;
        generateFood();
        // Add food animation
        const foodAnimation = document.createElement('div');
        foodAnimation.className = 'food-animation';
        foodAnimation.style.left = `${food.x * boardSize}px`;
        foodAnimation.style.top = `${food.y * boardSize}px`;
        gameBoard.appendChild(foodAnimation);
        setTimeout(() => foodAnimation.remove(), 500); // Remove animation element after 0.5s
    } else {
        snake.pop();
    }

    drawGame();
}

// Draw Game Board
function drawGame() {
    ctx.clearRect(0, 0, gameBoard.width, gameBoard.height);

    // Draw Snake
    snake.forEach(segment => {
        ctx.fillStyle = 'green';
        ctx.fillRect(segment.x * boardSize, segment.y * boardSize, boardSize, boardSize);
    });

    // Draw Food (as a sphere)
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(
        food.x * boardSize + boardSize / 2,
        food.y * boardSize + boardSize / 2,
        boardSize / 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

// Handle Key Press and Button Press
document.addEventListener('keydown', e => {
    changeDirection(e.key);
});

upButton.addEventListener('click', () => changeDirection('ArrowUp'));
downButton.addEventListener('click', () => changeDirection('ArrowDown'));
leftButton.addEventListener('click', () => changeDirection('ArrowLeft'));
rightButton.addEventListener('click', () => changeDirection('ArrowRight'));

// Change Snake Direction
function changeDirection(key) {
    switch (key) {
        case 'ArrowUp':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };
            break;
    }
}
