// server.js
// Description: This file contains the server-side code for the multiplayer memory card game.
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 6060 });

let players = [null, null]; // Two player slots, initialized to null
// Game state object
let gameState = {
    cards: [],
    currentPlayer: 1,
    scores: { player1: 0, player2: 0 },
    totalFlippedCards: 0
};

const cardImages = [
    '8ball.png', 'baseball.png', 'basketball.png', 'football.png',
    'world.png', 'tennisball.png', 'volleyball.png', 'orange.png',
    'apple.png', 'clock.png', 'coin.png', 'cookie.png',
    'pizza.png', 'donut.png', 'sun.png', 'star.png'
];

// Duplicate the card images to create pairs
const cardImagesPairs = [...cardImages, ...cardImages];

// Shuffle an array in place, using the Fisher-Yates algorithm
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Initialize the game state with shuffled cards
function initializeGameState() {
    shuffleArray(cardImagesPairs);
    gameState.cards = cardImagesPairs.map((image, index) => ({
        id: index,
        image,
        flipped: false,
        matched: false
    }));
    gameState.currentPlayer = 1;
    gameState.scores = { player1: 0, player2: 0 };
    gameState.totalFlippedCards = 0;
    console.log('Game state initialized:', gameState.cards.map(card => card.image)); // Log shuffled cards
}

initializeGameState();
let flippedCards = [];
let lastDisconnectedPlayer = null;

// Handle new player connections
wss.on('connection', (ws) => {
    let playerNumber = null;
    console.log('A new player has joined.');

    // Find the first available slot for the new player
    if (lastDisconnectedPlayer !== null) {
        playerNumber = lastDisconnectedPlayer;
        players[playerNumber - 1] = ws;
        lastDisconnectedPlayer = null;
    } else {
        for (let i = 0; i < players.length; i++) {
            if (players[i] === null) {
                players[i] = ws;
                playerNumber = i + 1; // Player numbers are 1 and 2
                break;
            }
        }
    }

    if (playerNumber === null) {
        // No available slot, disconnect the new player
        ws.send(JSON.stringify({ type: 'full', message: 'The game is full. Please wait until the game is over.' }));
        ws.close();
        return;
    }

    console.log(`Player ${playerNumber} connected. Total players: ${players.filter(Boolean).length}`);

    // Reset game state when a new player joins
    initializeGameState();
    broadcastGameState('restart');

    ws.send(JSON.stringify({ type: 'start', player: playerNumber, gameState }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'flip') {
            handleCardFlip(data.cardId);
        } else if (data.type === 'restart') {
            initializeGameState();
            broadcastGameState('restart');
        }
    });

    ws.on('close', () => {
        console.log(`Player ${playerNumber} disconnected. Total players: ${players.filter(Boolean).length}`);
        players[playerNumber - 1] = null;
        lastDisconnectedPlayer = playerNumber; // Track the slot of the disconnected player
    });
});

// Handle card flip action. If two cards are flipped, check for a match
function handleCardFlip(cardId) {
    const card = gameState.cards.find(card => card.id === cardId);

    if (card && !card.flipped && flippedCards.length < 2) {
        card.flipped = true;
        flippedCards.push(card);

        if (flippedCards.length === 2) {
            setTimeout(checkForMatch, 500);
        }

        gameState.totalFlippedCards++;
        broadcastGameState();
    }
}

// Check if the flipped cards match
function checkForMatch() {
    const [card1, card2] = flippedCards;

    if (card1.image === card2.image) {
        card1.matched = true;
        card2.matched = true;
        flippedCards = [];

        gameState.scores[`player${gameState.currentPlayer}`]++;
    } else {
        setTimeout(() => {
            card1.flipped = false;
            card2.flipped = false;
            flippedCards = [];
            gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            broadcastGameState();
        }, 500);
    }

    broadcastGameState();
}

// Broadcast the game state to all players
function broadcastGameState(type = 'update') {
    players.forEach(player => {
        if (player) {
            player.send(JSON.stringify({ type, gameState }));
        }
    });
}

console.log('Server running on ws://localhost:8080');