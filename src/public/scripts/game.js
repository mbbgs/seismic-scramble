import { GameManager } from './cl.js';



const gameManager = new GameManager();

const btnStart = document.getElementById('btnStart');
const btnSubmit = document.getElementById('btnSubmit');
const btnHint = document.getElementById('btnHint');
const btnSkip = document.getElementById('btnSkip');
const btnRestart = document.getElementById('btnRestart');
const guessInput = document.getElementById('guessInput');
const scrambledWord = document.getElementById('scrambledWord');
const levelHint = document.getElementById('levelHint');
const miniScore = document.getElementById('miniScore');
const progressBar = document.getElementById('progressBar');
const correctCount = document.getElementById('correctCount');
const attemptCount = document.getElementById('attemptCount');
const roundInfo = document.getElementById('roundInfo');
const historyList = document.getElementById('historyList');
const feedback = document.getElementById('feedback');

// Game state
let currentRound = 0;
let totalRounds = 20;
let correctAnswers = 0;
let attempts = 0;
let gameScore = 0;


const wordBank = [
	{ word: 'BLOCKCHAIN', hint: 'Distributed ledger technology' },
	{ word: 'ENCRYPTION', hint: 'Process of encoding information' },
	{ word: 'PRIVACY', hint: 'Freedom from unauthorized access' },
	{ word: 'SEISMIC', hint: 'Our network name' },
	{ word: 'SCRAMBLE', hint: 'Mix up letters' },
	{ word: 'CIPHER', hint: 'Secret code' },
	{ word: 'PROTOCOL', hint: 'Set of rules' },
	{ word: 'CRYPTOGRAPHY', hint: 'Art of secure communication' },
	{ word: 'DECENTRALIZED', hint: 'Not controlled by single entity' },
	{ word: 'CONSENSUS', hint: 'General agreement' },
	{ word: 'VALIDATION', hint: 'Checking authenticity' },
	{ word: 'IMMUTABLE', hint: 'Cannot be changed' },
	{ word: 'TRANSPARENCY', hint: 'Openness and visibility' },
	{ word: 'ANONYMITY', hint: 'State of being anonymous' },
	{ word: 'SECURITY', hint: 'Protection from threats' },
	{ word: 'NETWORK', hint: 'Interconnected system' },
	{ word: 'TOKEN', hint: 'Digital asset' },
	{ word: 'WALLET', hint: 'Digital storage for crypto' },
	{ word: 'VERIFICATION', hint: 'Proof of authenticity' },
	{ word: 'ALGORITHM', hint: 'Step-by-step procedure' }
];

let currentWord = null;
let usedWords = [];

// Helper Functions
function scrambleWord(word) {
	const arr = word.split('');
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr.join('');
}

function getRandomWord() {
	const availableWords = wordBank.filter(w => !usedWords.includes(w.word));
	if (availableWords.length === 0) {
		usedWords = [];
		return wordBank[Math.floor(Math.random() * wordBank.length)];
	}
	return availableWords[Math.floor(Math.random() * availableWords.length)];
}

function updateUI() {
	miniScore.textContent = gameScore;
	correctCount.textContent = correctAnswers;
	attemptCount.textContent = attempts;
	roundInfo.textContent = `${currentRound} / ${totalRounds}`;
	progressBar.style.width = `${(currentRound / totalRounds) * 100}%`;
}

function addHistory(message, isCorrect = null) {
	const div = document.createElement('div');
	div.className = isCorrect === true ? 'text-gray-900' : isCorrect === false ? 'text-gray-600' : 'text-gray-700';
	div.textContent = message;
	historyList.insertBefore(div, historyList.firstChild);
}

function loadNextWord() {
	if (currentRound >= totalRounds) {
		endGame();
		return;
	}
	
	currentRound++;
	currentWord = getRandomWord();
	usedWords.push(currentWord.word);
	
	let scrambled = scrambleWord(currentWord.word);
	// Ensure it's actually scrambled
	while (scrambled === currentWord.word && currentWord.word.length > 3) {
		scrambled = scrambleWord(currentWord.word);
	}
	
	scrambledWord.textContent = scrambled.split('').join(' ');
	levelHint.textContent = `Round ${currentRound} - Decrypt the word`;
	guessInput.value = '';
	guessInput.focus();
	
	updateUI();
}

function checkAnswer() {
	if (!currentWord || !guessInput.value.trim()) return;
	
	attempts++;
	const guess = guessInput.value.trim().toUpperCase();
	
	if (guess === currentWord.word) {
		correctAnswers++;
		gameScore += 100;
		feedback.textContent = `✓ Correct! Score: ${gameScore}`;
		addHistory(`✓ ${currentWord.word} - Correct!`, true);
		
		setTimeout(() => {
			loadNextWord();
		}, 1000);
	} else {
		feedback.textContent = `✗ Wrong! Try again`;
		addHistory(`✗ ${guess} - Incorrect`, false);
	}
	
	updateUI();
}

function showHint() {
	if (!currentWord) return;
	levelHint.textContent = `Hint: ${currentWord.hint}`;
	gameScore = Math.max(0, gameScore - 25); // Penalty for hint
	addHistory('Used hint (-25 points)', null);
	updateUI();
}

function skipWord() {
	if (!currentWord) return;
	addHistory(`⊘ Skipped: ${currentWord.word}`, false);
	loadNextWord();
}

async function startGame() {
	const result = await gameManager.startGame();
	
	if (!result.success) {
		window.showAlert(result.message || 'Failed to start game', 'error');
		return;
	}
	
	
	
	currentRound = 0;
	correctAnswers = 0;
	attempts = 0;
	gameScore = 0;
	usedWords = [];
	
	// Enable controls
	btnStart.disabled = true;
	btnSubmit.disabled = false;
	btnHint.disabled = false;
	btnSkip.disabled = false;
	guessInput.disabled = false;
	
	historyList.innerHTML = '<div class="text-gray-700">Game started! Good luck!</div>';
	
	loadNextWord();
}

async function endGame() {
	const game_hash = localStorage.getItem('game_hash');
	const result = await gameManager.submitScore(gameScore, game_hash);
	
	if (result.success) {
		const data = result.data;
		window.location.href = `/score/${encodeURI(game_hash)}`;
	} else {
		window.showAlert('Failed to submit score: ' + result.message, 'error');
	}
	
	// Disable controls
	btnStart.disabled = false;
	btnSubmit.disabled = true;
	btnHint.disabled = true;
	btnSkip.disabled = true;
	guessInput.disabled = true;
	
	scrambledWord.textContent = '— — — — —';
	levelHint.textContent = 'Press START to play again';
}


function restartGame() {
	if (gameManager.isGameActive) {
		if (!confirm('End current game and start a new one?')) return;
		gameManager.endGame();
	}
	startGame();
}

// Timer callback
gameManager.onTimerUpdate = (seconds) => {
	const remaining = gameManager.getRemainingTime();
	if (remaining <= 60) {
		feedback.classList.add('text-gray-900');
	}
};

gameManager.onTimeout = () => {
	window.showAlert('Time expired! Submitting your score...', 'error');
	endGame();
};

// Event Listeners
btnStart.addEventListener('click', startGame);
btnSubmit.addEventListener('click', checkAnswer);
btnHint.addEventListener('click', showHint);
btnSkip.addEventListener('click', skipWord);
btnRestart.addEventListener('click', restartGame);

guessInput.addEventListener('keypress', (e) => {
	if (e.key === 'Enter') {
		checkAnswer();
	}
});