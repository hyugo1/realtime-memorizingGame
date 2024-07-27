//web.js
// Description: This file contains the client-side code for the multiplayer memory card game.
// const socket = new WebSocket('ws://localhost:8080');
const socket = new WebSocket('ws://localhost:6060');
// require('dotenv').config();
// const socket = new WebSocket(process.env.WEBSOCKET_URL);

let playerNumber = 0;
// gameState object
let gameState = {
    cards: [],
    currentPlayer: 1,
    scores: { player1: 0, player2: 0 },
    totalFlippedCards: 0
};

// Array to store flipped cards
let flippedCards = [];

// DOM elements
const memoryGame = document.querySelector('.memory-game');
const player1ScoreElement = document.getElementById('player1-score');
const player2ScoreElement = document.getElementById('player2-score');
const turnCounterElement = document.getElementById('turn-counter');
const turnMessageElement = document.getElementById('turn-message');

// WebSocket event listeners
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);

    // Handle when the game is full, 2 players max
    if (data.type === 'full') {
        alert(data.message);
        window.location.href = 'webMenu.html';
        return;
    }

    // Handle different types of states of the game
    switch (data.type) {
        case 'start':
            playerNumber = data.player;
            setupGame(data.gameState);
            displayPlayerInfo(playerNumber); // Update player info on the client
            break;
        case 'update':
            updateGame(data.gameState);
            break;
        case 'restart':
            resetGame(data.gameState);
            break;
    }
});

// Function to setup the game. first thing that is called when joining the game. It should create the cards and display them, as well as the scores and the current player
function setupGame(state) {
    console.log('Setting up game with state:', state); // Added logging
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

// Function to update the game state. This function should update the game state based on the data received from the server, and update the UI accordingly. It should also check if the game is over
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

// Function to reset the game. Called when the restart button is clicked. It should reset the game state and update the UI accordingly
function resetGame(state) {
    console.log('Resetting game with state:', state); // Added logging
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

// hide the game over message
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

// Function to check if the game is over. It should display the game over message and the winner message if the game is over
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

// Function to create a card element. It should create a card element with the given image and id, and add event listeners to handle card flipping
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

// Function to check for a match. It should check if the two flipped cards are a match, and update the game state accordingly
function checkForMatch() {
    const [card1, card2] = flippedCards;
    // check if the images match
    if (card1.querySelector('.cardBack img').src === card2.querySelector('.cardBack img').src) {
        // if they match, add the cardMatch class to both cards
        card1.classList.add('cardMatch');
        card2.classList.add('cardMatch');
        gameState.scores[`player${gameState.currentPlayer}`]++;
    } else {
        setTimeout(() => {
            // if they don't match, remove the cardOpen class from both cards
            card1.classList.remove('cardOpen');
            card2.classList.remove('cardOpen');
        }, 500);
    }
    // reset the flippedCards array
    flippedCards = [];
    // update the game state
    gameState.totalFlippedCards++;
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    updateScores();
    highlightTheCurrentPlayer();
    // send the updated game state to the server
    socket.send(JSON.stringify({ type: 'update', gameState }));
}

// Function to update the scores and the current player. It should update the scores and the current player based on the game state
function updateScores() {
    if (player1ScoreElement && player2ScoreElement && turnCounterElement) {
        if (player1ScoreElement.textContent !== gameState.scores.player1.toString()) {
            player1ScoreElement.textContent = gameState.scores.player1;
            player1ScoreElement.classList.add('score-animation');
            setTimeout(() => {
                player1ScoreElement.classList.remove('score-animation'); 
            }, 800);
        }
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

// Function to highlight the current player. It should highlight the current player based on the game state
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

// Function to restart the game. It should send a restart event to the server
function restartGame() {
    socket.send(JSON.stringify({ type: 'restart' }));
}

// Restart button event listener
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

// Function to display the player number. It should display the player number based on the playerNumber variable
function displayPlayerInfo(playerNumber) {
    // const playerNumberElement = document.getElementById('player-number');
    // const playerInfoMessageElement = document.getElementById('player-info-message');
    // if (playerNumberElement && playerInfoMessageElement) {
    //     playerNumberElement.textContent = playerNumber;
    //     if (playerNumber === 1) {
    //         playerInfoMessageElement.innerHTML = "You are: <span style='color: blue;'>Player 1</span>";
    //     } else {
    //         playerInfoMessageElement.innerHTML = "You are: <span style='color: red;'>Player 2</span>";
    //     }
    // }
    const playerNumberElement = document.getElementById('player-number');
    if (playerNumberElement) {
        playerNumberElement.textContent = playerNumber;
    }
}

// WebSocket event listeners
socket.addEventListener('close', function () {
    console.log('WebSocket connection closed.');
});
