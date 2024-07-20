const socket = new WebSocket('ws://localhost:8080');

let playerNumber = 0;
let gameState = {
    cards: [],
    currentPlayer: 1,
    scores: { player1: 0, player2: 0 },
    totalFlippedCards: 0
};

let flippedCards = [];

const memoryGame = document.querySelector('.memory-game');
const player1ScoreElement = document.getElementById('player1-score');
const player2ScoreElement = document.getElementById('player2-score');
const turnCounterElement = document.getElementById('turn-counter');
const turnMessageElement = document.getElementById('turn-message');

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);

    switch (data.type) {
        case 'start':
            playerNumber = data.player;
            setupGame(data.gameState);
            break;
        case 'update':
            updateGame(data.gameState);
            break;
        case 'restart':
            resetGame(data.gameState);
            // setupGame(data.gameState);
            break;
    }
});

function resetGame(state) {
    console.log('Resetting game with state:', state);
    if (!state) return;
    gameState = state;
    memoryGame.innerHTML = '';
    gameState.cards.forEach(card => {
        const cardElement = createCard(card.image, card.id);
        if (card.matched) {
            cardElement.classList.add('cardMatch');
        }
        if (card.flipped) {
            cardElement.classList.add('cardOpen');
        }
        memoryGame.appendChild(cardElement);
    });
    updateScores();
    highlightTheCurrentPlayer();
    displayPlayerInfo(playerNumber);
}

function setupGame(state) {
    console.log('Setting up game with state:', state);
    if (!state) return;
    gameState = state;
    memoryGame.innerHTML = '';
    gameState.cards.forEach(card => {
        const cardElement = createCard(card.image, card.id);
        if (card.matched) {
            cardElement.classList.add('cardMatch');
        }
        if (card.flipped) {
            cardElement.classList.add('cardOpen');
        }
        memoryGame.appendChild(cardElement);
    });
    updateScores();
    highlightTheCurrentPlayer();
    displayPlayerInfo(playerNumber);
}

function updateGame(state) {
    gameState = state;
    const cards = document.querySelectorAll('.card');
    cards.forEach(cardElement => {
        const cardId = parseInt(cardElement.dataset.id);
        const card = gameState.cards.find(c => c.id === cardId);
        if (card.matched) {
            cardElement.classList.add('cardMatch');
        } else {
            cardElement.classList.remove('cardMatch');
        }
        if (card.flipped) {
            cardElement.classList.add('cardOpen');
        } else {
            cardElement.classList.remove('cardOpen');
        }
    });
    updateScores();
    highlightTheCurrentPlayer();
    checkIfGameOver();
}

function hideGameOverMessage() {
    const gameOverMessage = document.querySelector('.game-over-message');
    const winnerMessage = document.getElementById('winner-message');
    if (gameOverMessage) gameOverMessage.style.display = 'none';
    if (winnerMessage) winnerMessage.style.display = 'none';
}

socket.addEventListener('open', function () {
    console.log('WebSocket connection established.');
    hideGameOverMessage();
});

function checkIfGameOver() {
    const allCardsMatched = gameState.cards.every(card => card.matched);
    const gameOverMessage = document.querySelector('.game-over-message');
    const winnerMessage = document.getElementById('winner-message');
    if (allCardsMatched) {
        if (gameOverMessage) gameOverMessage.style.display = 'block';
        if (winnerMessage) {
            winnerMessage.style.display = 'block';
            if (gameState.scores.player1 > gameState.scores.player2) {
                winnerMessage.textContent = 'Player 1 Wins!';
            } else if (gameState.scores.player1 < gameState.scores.player2) {
                winnerMessage.textContent = 'Player 2 Wins!';
            } else {
                winnerMessage.textContent = 'It\'s a Tie!';
            }
        }
    } else {
        if (gameOverMessage) gameOverMessage.style.display = 'none';
        if (winnerMessage) winnerMessage.style.display = 'none';
    }
}

function createCard(image, id) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = id;
    card.innerHTML = `<div class="cardInner">
                        <div class="cardFront"><img src="images/card.png" alt="Card Front"></div>
                        <div class="cardBack"><img src="images/${image}" alt="Card Back"></div>
                    </div>`;
    card.addEventListener('click', function () {
        if (gameState.currentPlayer === playerNumber && !card.classList.contains('cardOpen') && flippedCards.length < 2) {
            this.classList.add('cardOpen');
            flippedCards.push(card);
            socket.send(JSON.stringify({ type: 'flip', cardId: id }));
            if (flippedCards.length === 2) {
                setTimeout(() => {
                    checkForMatch();
                }, 500);
            }
        }
    });
    return card;
}

function checkForMatch() {
    const [card1, card2] = flippedCards;

    if (card1.querySelector('.cardBack img').src === card2.querySelector('.cardBack img').src) {
        card1.classList.add('cardMatch');
        card2.classList.add('cardMatch');
        gameState.scores[`player${gameState.currentPlayer}`]++;
    } else {
        setTimeout(() => {
            card1.classList.remove('cardOpen');
            card2.classList.remove('cardOpen');
        }, 500);
    }
    flippedCards = [];
    gameState.totalFlippedCards++;
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    updateScores();
    highlightTheCurrentPlayer();
    socket.send(JSON.stringify({ type: 'update', gameState }));
}

function updateScores() {
    if (player1ScoreElement && player2ScoreElement && turnCounterElement) {
        // Update player 1 score
        if (player1ScoreElement.textContent !== gameState.scores.player1.toString()) {
            player1ScoreElement.textContent = gameState.scores.player1;
            player1ScoreElement.classList.add('score-animation');
            setTimeout(() => {
                player1ScoreElement.classList.remove('score-animation'); 
            }, 800);
        }

        // Update player 2 score
        if (player2ScoreElement.textContent !== gameState.scores.player2.toString()) {
            player2ScoreElement.textContent = gameState.scores.player2;
            player2ScoreElement.classList.add('score-animation'); 
            setTimeout(() => {
                player2ScoreElement.classList.remove('score-animation'); 
            }, 800);
        }

        turnCounterElement.textContent = `Total Turns: ${gameState.totalFlippedCards}`;
    }
}

function highlightTheCurrentPlayer() {
    const player1 = document.getElementById('player1');
    const player2 = document.getElementById('player2');

    if (player1 && player2 && turnMessageElement) {
        if (gameState.currentPlayer === 1) {
            player1.classList.add('current');
            player2.classList.remove('current');
            turnMessageElement.innerHTML = "Current Turn: <span style='color: #000000; font-family: Pixelify Sans; background-color: #80eef4; border-radius: 10px; border: #333333 2px solid; padding: 10px;'>Player 1</span>";
        } else {
            player1.classList.remove('current');
            player2.classList.add('current');
            turnMessageElement.innerHTML = "Current Turn: <span style='color: #000000; font-family: Pixelify Sans; background-color: #80eef4; border-radius: 10px; border: #333333 2px solid; padding: 10px;'>Player 2</span>";
        }
    }
}

function restartGame() {
    socket.send(JSON.stringify({ type: 'restart' }));
}

const restartButton = document.getElementById('restart-button');
if (restartButton) {
    restartButton.addEventListener('click', function () {
        const gameOverMessage = document.querySelector('.game-over-message');
        if (gameOverMessage) {
            gameOverMessage.style.display = 'none';
        }
        restartGame();
    });
}

function displayPlayerInfo(playerNumber) {
    const playerNumberElement = document.getElementById('player-number');
    if (playerNumberElement) {
        playerNumberElement.textContent = playerNumber;
    }
}

socket.addEventListener('open', function () {
    console.log('WebSocket connection established.');
});

socket.addEventListener('close', function () {
    console.log('WebSocket connection closed.');
});
