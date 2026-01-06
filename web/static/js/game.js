/**
 * Make it Meme - Web Edition
 * Client-side game logic
 */

// Socket connection
const socket = io();

// Game state
let gameState = {
    roomCode: null,
    playerId: null,
    isHost: false,
    mode: 'normal',
    imageType: 'custom',
    numRounds: 5,
    currentRound: 0,
    players: []
};

// Image type labels
const IMAGE_TYPE_LABELS = {
    'custom': '🖼️ Personalizzate',
    'classic': '🎭 Meme Classici'
};

// Mode labels
const MODE_LABELS = {
    'normal': '🎲 Normale',
    'themes': '🎯 Temi',
    'same_meme': '🎨 Stesso Meme',
    'relaxed': '😌 Rilassata'
};

// ===================================
// UI Helper Functions
// ===================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function selectMode(btn) {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function selectImageType(btn) {
    document.querySelectorAll('.image-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function changeRounds(delta) {
    const display = document.getElementById('num-rounds');
    let rounds = parseInt(display.textContent) + delta;
    rounds = Math.max(3, Math.min(10, rounds));
    display.textContent = rounds;
}

function copyRoomCode() {
    const code = document.getElementById('display-room-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Codice copiato!', 'success');
    });
}

function updateCharCount() {
    const input = document.getElementById('caption-input');
    const count = document.getElementById('char-count');
    if (input && count) {
        count.textContent = input.value.length;
    }
}

function updatePreview() {
    const text1 = document.getElementById('text-input-1');
    const text2 = document.getElementById('text-input-2');
    const preview1 = document.getElementById('preview-text-1');
    const preview2 = document.getElementById('preview-text-2');
    
    if (text1 && preview1) {
        preview1.textContent = text1.value || 'Testo 1';
    }
    if (text2 && preview2) {
        preview2.textContent = text2.value || 'Testo 2';
    }
}

// Meme changes counter
let memeChangesLeft = 5;

function requestNewMeme() {
    if (memeChangesLeft <= 0) {
        showToast('Hai esaurito i cambi meme!', 'error');
        return;
    }
    
    socket.emit('request_new_meme', {
        room_code: gameState.roomCode
    });
}

function updateMemeChangesCounter() {
    const counter = document.getElementById('meme-changes-left');
    if (counter) {
        counter.textContent = memeChangesLeft;
    }
    
    const btn = document.querySelector('.change-meme-btn');
    if (btn && memeChangesLeft <= 0) {
        btn.disabled = true;
    }
}

// ===================================
// Players List
// ===================================

function updatePlayersList(players) {
    gameState.players = players;
    const list = document.getElementById('players-list');
    const count = document.getElementById('players-count');
    
    count.textContent = `(${players.length}/8)`;
    
    list.innerHTML = players.map(player => `
        <div class="player-item">
            <div class="player-avatar">${player.name.charAt(0).toUpperCase()}</div>
            <span class="player-name">${player.name}</span>
            ${player.is_host ? '<span class="player-badge">Host</span>' : ''}
            ${player.score > 0 ? `<span class="player-score">${player.score} pts</span>` : ''}
        </div>
    `).join('');
    
    // Update host controls visibility
    const startBtn = document.getElementById('start-game-btn');
    const waitingMsg = document.getElementById('waiting-message');
    
    if (gameState.isHost) {
        startBtn.style.display = players.length >= 2 ? 'flex' : 'none';
        waitingMsg.style.display = players.length >= 2 ? 'none' : 'block';
        waitingMsg.textContent = 'Servono almeno 2 giocatori per iniziare...';
    } else {
        startBtn.style.display = 'none';
        waitingMsg.style.display = 'block';
        waitingMsg.textContent = "In attesa che l'host avvii la partita...";
    }
}

// ===================================
// Game Actions
// ===================================

function createGame() {
    const name = document.getElementById('create-name').value.trim();
    if (!name) {
        showToast('Inserisci il tuo nome!', 'error');
        return;
    }
    
    const modeBtn = document.querySelector('.mode-btn.active');
    const mode = modeBtn ? modeBtn.dataset.mode : 'normal';
    const imageTypeBtn = document.querySelector('.image-type-btn.active');
    const imageType = imageTypeBtn ? imageTypeBtn.dataset.imageType : 'custom';
    const numRounds = parseInt(document.getElementById('num-rounds').textContent);
    
    socket.emit('create_game', {
        player_name: name,
        mode: mode,
        image_type: imageType,
        num_rounds: numRounds
    });
}

function joinGame() {
    const name = document.getElementById('join-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    
    if (!name) {
        showToast('Inserisci il tuo nome!', 'error');
        return;
    }
    
    if (!roomCode || roomCode.length !== 4) {
        showToast('Inserisci un codice stanza valido!', 'error');
        return;
    }
    
    socket.emit('join_game', {
        player_name: name,
        room_code: roomCode
    });
}

function startGame() {
    socket.emit('start_game', {
        room_code: gameState.roomCode
    });
}

function submitMeme() {
    const text1 = document.getElementById('text-input-1').value.trim();
    const text2 = document.getElementById('text-input-2').value.trim();
    
    if (!text1 && !text2) {
        showToast('Scrivi almeno un testo!', 'error');
        return;
    }
    
    // Combina i due testi per la caption
    const caption = text2 ? `${text1} / ${text2}` : text1;
    
    socket.emit('submit_meme', {
        room_code: gameState.roomCode,
        caption: caption,
        text1: text1,
        text2: text2
    });
    
    // Show waiting state
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) submitBtn.style.display = 'none';
    document.getElementById('text-input-1').disabled = true;
    document.getElementById('text-input-2').disabled = true;
    document.getElementById('waiting-others').style.display = 'flex';
}

// submitVote replaced by submitVoteValue in voting_start handler

function nextRound() {
    socket.emit('next_round', {
        room_code: gameState.roomCode
    });
}

// ===================================
// Socket Event Handlers
// ===================================

socket.on('connect', () => {
    console.log('Connected to server');
    
    // Check if there's a pending room code to join
    const pendingCode = sessionStorage.getItem('pendingRoomCode');
    if (pendingCode) {
        sessionStorage.removeItem('pendingRoomCode');
        document.getElementById('room-code').value = pendingCode;
        showScreen('join-screen');
    }
});

socket.on('error', (data) => {
    showToast(data.message, 'error');
});

socket.on('game_created', (data) => {
    gameState.roomCode = data.room_code;
    gameState.playerId = data.player_id;
    gameState.isHost = data.is_host;
    gameState.mode = data.mode;
    gameState.imageType = data.image_type;
    gameState.numRounds = data.num_rounds;
    
    document.getElementById('display-room-code').textContent = data.room_code;
    document.getElementById('mode-badge').textContent = MODE_LABELS[data.mode];
    document.getElementById('image-type-badge').textContent = IMAGE_TYPE_LABELS[data.image_type];
    document.getElementById('rounds-badge').textContent = `${data.num_rounds} Round`;
    
    updatePlayersList(data.players);
    showScreen('lobby-screen');
    showToast('Stanza creata!', 'success');
});

socket.on('game_joined', (data) => {
    gameState.roomCode = data.room_code;
    gameState.playerId = data.player_id;
    gameState.isHost = data.is_host;
    gameState.mode = data.mode;
    gameState.imageType = data.image_type;
    gameState.numRounds = data.num_rounds;
    
    document.getElementById('display-room-code').textContent = data.room_code;
    document.getElementById('mode-badge').textContent = MODE_LABELS[data.mode];
    document.getElementById('image-type-badge').textContent = IMAGE_TYPE_LABELS[data.image_type];
    document.getElementById('rounds-badge').textContent = `${data.num_rounds} Round`;
    
    updatePlayersList(data.players);
    showScreen('lobby-screen');
    showToast('Ti sei unito alla stanza!', 'success');
});

socket.on('player_joined', (data) => {
    updatePlayersList(data.players);
    showToast(`${data.player_name} si è unito!`, 'info');
});

socket.on('player_left', (data) => {
    updatePlayersList(data.players);
    showToast(`${data.player_name} ha lasciato la partita`, 'info');
});

socket.on('new_host', (data) => {
    gameState.isHost = (data.host_id === gameState.playerId);
    if (gameState.isHost) {
        showToast('Sei diventato l\'host!', 'success');
    }
    updatePlayersList(gameState.players);
});

socket.on('round_start', (data) => {
    gameState.currentRound = data.round;
    
    // Update round indicator
    document.getElementById('round-number').textContent = data.round;
    document.getElementById('round-total').textContent = data.total_rounds;
    
    // Update progress bar
    const progress = (data.round / data.total_rounds) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    
    // Set template name
    document.getElementById('template-name').textContent = data.template.name;
    
    // Set template image
    const templateImage = document.getElementById('template-image');
    const imagePlaceholder = document.getElementById('image-placeholder');
    
    if (data.template.image) {
        templateImage.src = `/static/images/memes/${data.template.image}`;
        templateImage.style.display = 'block';
        templateImage.classList.remove('no-image');
        if (imagePlaceholder) imagePlaceholder.style.display = 'none';
    } else {
        templateImage.src = '';
        templateImage.style.display = 'none';
        if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
    }
    
    // Show topic if in theme mode
    const topicDisplay = document.getElementById('topic-display');
    if (data.theme) {
        topicDisplay.style.display = 'flex';
        document.getElementById('topic-text').textContent = data.theme;
    } else {
        topicDisplay.style.display = 'none';
    }
    
    // Reset inputs
    document.getElementById('text-input-1').value = '';
    document.getElementById('text-input-2').value = '';
    document.getElementById('text-input-1').disabled = false;
    document.getElementById('text-input-2').disabled = false;
    document.getElementById('preview-text-1').textContent = 'Testo 1';
    document.getElementById('preview-text-2').textContent = 'Testo 2';
    
    // Reset meme changes counter for new round
    memeChangesLeft = 5;
    updateMemeChangesCounter();
    
    // Show submit button
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) submitBtn.style.display = 'flex';
    document.getElementById('waiting-others').style.display = 'none';
    
    // Show creating phase
    showGamePhase('creating-phase');
    showScreen('game-screen');
});

socket.on('player_ready', (data) => {
    document.getElementById('ready-count').textContent = `${data.ready_count}/${data.total_players}`;
});

socket.on('new_meme', (data) => {
    // Update template with new meme
    document.getElementById('template-name').textContent = data.template.name;
    
    const templateImage = document.getElementById('template-image');
    const imagePlaceholder = document.getElementById('image-placeholder');
    
    if (data.template.image) {
        templateImage.src = `/static/images/memes/${data.template.image}`;
        templateImage.style.display = 'block';
        templateImage.classList.remove('no-image');
        if (imagePlaceholder) imagePlaceholder.style.display = 'none';
    } else {
        templateImage.src = '';
        templateImage.style.display = 'none';
        if (imagePlaceholder) imagePlaceholder.style.display = 'flex';
    }
    
    // Update counter
    memeChangesLeft = data.changes_left;
    updateMemeChangesCounter();
    
    showToast('Nuovo meme!', 'success');
});

// Current meme being voted
let currentVotingMeme = null;

socket.on('voting_start', (data) => {
    currentVotingMeme = data.current_meme;
    displayMemeToVote(data.current_meme);
    showGamePhase('voting-phase');
});

socket.on('next_meme_to_vote', (data) => {
    currentVotingMeme = data.current_meme;
    displayMemeToVote(data.current_meme);
});

function displayMemeToVote(meme) {
    // Update counter
    document.getElementById('current-meme-index').textContent = meme.index;
    document.getElementById('total-memes').textContent = meme.total;
    
    // Update progress bar
    const progress = (meme.index / meme.total) * 100;
    document.getElementById('voting-progress-bar').style.width = `${progress}%`;
    
    // Update meme display
    document.getElementById('voting-text-1').textContent = meme.text1 || meme.caption || '';
    document.getElementById('voting-text-2').textContent = meme.text2 || '';
    
    // Update image
    const memeImage = document.getElementById('voting-meme-image');
    if (meme.template && meme.template.image) {
        memeImage.src = `/static/images/memes/${meme.template.image}`;
        memeImage.style.display = 'block';
    } else {
        memeImage.src = '';
        memeImage.style.display = 'none';
    }
    
    // Check if this is the player's own meme
    const isOwnMeme = meme.creator_id === gameState.playerId;
    const voteButtons = document.getElementById('vote-buttons');
    const yourMemeBadge = document.getElementById('your-meme-badge');
    
    if (isOwnMeme) {
        // Auto-skip own meme after a delay
        voteButtons.style.display = 'none';
        yourMemeBadge.style.display = 'block';
        
        // Auto submit a "skip" vote after 2 seconds
        setTimeout(() => {
            submitVoteValue(0, true);
        }, 2000);
    } else {
        voteButtons.style.display = 'flex';
        yourMemeBadge.style.display = 'none';
    }
    
    // Hide waiting indicator
    document.getElementById('voting-waiting').style.display = 'none';
}

function submitVoteValue(value, isSkip = false) {
    socket.emit('submit_vote', {
        room_code: gameState.roomCode,
        vote_value: value
    });
    
    // Show waiting state
    const voteButtons = document.getElementById('vote-buttons');
    const yourMemeBadge = document.getElementById('your-meme-badge');
    
    voteButtons.style.display = 'none';
    yourMemeBadge.style.display = 'none';
    document.getElementById('voting-waiting').style.display = 'flex';
}

socket.on('player_voted', (data) => {
    document.getElementById('vote-count').textContent = `${data.vote_count}/${data.total_players}`;
});

socket.on('round_results', (data) => {
    if (data.is_final) {
        // Show final results
        showFinalResults(data);
    } else {
        // Show round results
        showRoundResults(data);
    }
});

socket.on('back_to_lobby', (data) => {
    updatePlayersList(data.players);
    showScreen('lobby-screen');
    showToast('Torna alla lobby per una nuova partita!', 'info');
});

// ===================================
// Display Results
// ===================================

function showGamePhase(phaseId) {
    document.querySelectorAll('.game-phase').forEach(phase => {
        phase.style.display = 'none';
    });
    document.getElementById(phaseId).style.display = 'flex';
}

function showRoundResults(data) {
    const container = document.getElementById('round-results');
    
    container.innerHTML = data.results.map((result, index) => `
        <div class="result-item" style="animation-delay: ${index * 0.1}s">
            <div class="result-header">
                <span class="result-player">${result.player_name}</span>
                <span class="result-votes">+${result.round_score} punti</span>
            </div>
            <div class="result-template">🖼️ ${result.template.name}</div>
            <div class="result-caption">"${result.text1 || result.caption}${result.text2 ? ' / ' + result.text2 : ''}"</div>
        </div>
    `).join('');
    
    // Update leaderboard
    updateLeaderboard('leaderboard', data.leaderboard);
    
    // Host controls
    const nextBtn = document.getElementById('next-round-btn');
    const waitingMsg = document.getElementById('results-waiting');
    
    if (gameState.isHost) {
        nextBtn.style.display = 'flex';
        waitingMsg.style.display = 'none';
    } else {
        nextBtn.style.display = 'none';
        waitingMsg.style.display = 'block';
    }
    
    document.getElementById('results-title').textContent = '📊 Risultati del Round';
    showGamePhase('results-phase');
}

function showFinalResults(data) {
    const winner = data.winner;
    
    // Set winner info
    document.getElementById('winner-name').textContent = winner.name;
    document.getElementById('winner-score').textContent = `${winner.score} punti`;
    
    // Update final leaderboard
    updateLeaderboard('final-leaderboard', data.leaderboard);
    
    // Host controls
    const playAgainBtn = document.getElementById('play-again-btn');
    const waitingMsg = document.getElementById('final-waiting');
    
    if (gameState.isHost) {
        playAgainBtn.style.display = 'flex';
        waitingMsg.style.display = 'none';
    } else {
        playAgainBtn.style.display = 'none';
        waitingMsg.style.display = 'block';
    }
    
    showGamePhase('final-phase');
}

function updateLeaderboard(elementId, leaderboard) {
    const container = document.getElementById(elementId);
    
    const medals = ['🥇', '🥈', '🥉'];
    
    container.innerHTML = leaderboard.map((player, index) => `
        <div class="leaderboard-item">
            <span class="leaderboard-rank">${medals[index] || (index + 1)}</span>
            <span class="leaderboard-name">${player.name}</span>
            <span class="leaderboard-score">${player.score} pts</span>
        </div>
    `).join('');
}

// ===================================
// Event Listeners
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Caption input character counter
    const captionInput = document.getElementById('caption-input');
    if (captionInput) {
        captionInput.addEventListener('input', updateCharCount);
    }
    
    // Room code input - auto uppercase
    const roomCodeInput = document.getElementById('room-code');
    if (roomCodeInput) {
        roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
    
    // Enter key handling for inputs
    document.getElementById('create-name')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createGame();
    });
    
    document.getElementById('join-name')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('room-code').focus();
    });
    
    document.getElementById('room-code')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });
});

