const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let players = [];
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

const cardImagesPairs = [...cardImages, ...cardImages];

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

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
let totalPlayers = 0;

wss.on('connection', (ws) => {
    totalPlayers++;
    console.log('A new player connected. Total players: ' + totalPlayers);
    
    players.push(ws);
    ws.send(JSON.stringify({ type: 'start', player: players.length, gameState }));

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
        totalPlayers--;
        gameState.totalFlippedCards = 0;
        console.log('A player disconnected. Total players: ' + totalPlayers);
        players = players.filter(player => player !== ws);
    });
});

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

function broadcastGameState(type = 'update') {
    players.forEach(player => {
        player.send(JSON.stringify({ type, gameState }));
    });
}

console.log('Server running on ws://localhost:8080');