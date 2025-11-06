  (() => {
    
    const WORDS = [
      { answer: 'PRIVACY', fact: 'Seismic gives users full transaction privacy without hiding integrity — your actions stay yours.' },
      { answer: 'ENCRYPTION', fact: 'Transactions are sealed end-to-end using advanced encryption to protect sensitive data.' },
      { answer: 'COMPLIANCE', fact: 'Seismic balances privacy with compliance, enabling optional proof disclosure to regulators.' },
      { answer: 'AUDIT', fact: 'Encrypted records remain auditable through cryptographic attestations — no data leaks required.' },
      { answer: 'ZEROKNOWLEDGE', fact: 'Zero-knowledge proofs allow verification of truth without revealing underlying details.' },
      { answer: 'SECURITY', fact: 'Every transaction is shielded by modern cryptography and multi-layered defense protocols.' },
      { answer: 'MEVPROTECTION', fact: 'Encrypted transaction ordering defends users against front-running and MEV attacks.' },
      { answer: 'IDENTITY', fact: 'Seismic enables identity verification that protects users from profiling and data misuse.' },
      { answer: 'BLOCKCHAIN', fact: 'Seismic interoperates across multiple blockchains, ensuring private yet verifiable settlement.' },
      { answer: 'TRANSPARENCY', fact: 'Seismic merges transparency and confidentiality through cryptographic attestations.' },
      { answer: 'AUTOLOAN', fact: 'Private DeFi lending rails let institutions issue loans without exposing customer data.' },
      { answer: 'FINTECH', fact: 'Fintechs can embed Seismic privacy into their apps to offer compliant confidential finance.' },
      { answer: 'SETTLEMENT', fact: 'Instant private settlement ensures speed and confidentiality across ledgers.' },
      { answer: 'TOKENIZATION', fact: 'Assets can be tokenized privately with selective visibility for issuers and auditors.' },
      { answer: 'VERIFIABILITY', fact: 'Every private transaction can still be verified cryptographically for accuracy.' },
      { answer: 'CONSENT', fact: 'Seismic puts users in control — data access happens only through explicit consent.' },
      { answer: 'INSTITUTIONS', fact: 'Banks and enterprises use Seismic rails to offer privacy-preserving digital assets.' },
      { answer: 'AUDITTRAIL', fact: 'Encrypted audit trails preserve accountability without leaking sensitive details.' },
      { answer: 'SCALABILITY', fact: 'Layered cryptography ensures Seismic scales while maintaining privacy and speed.' },
      { answer: 'CUSTODY', fact: 'Private custody flows enable secure key management and confidential asset tracking.' }
    ];
    // shuffle rounds order for replayability
    function shuffledWords() {
      const arr = [...WORDS];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    
    // DOM
    const scrambledEl = document.getElementById('scrambledWord');
    const hintEl = document.getElementById('levelHint');
    const guessInput = document.getElementById('guessInput');
    const submitBtn = document.getElementById('btnSubmit');
    const startBtn = document.getElementById('btnStart');
    const skipBtn = document.getElementById('btnSkip');
    const hintBtn = document.getElementById('btnHint');
    const restartBtn = document.getElementById('btnRestart');
    const rulesBtn = document.getElementById('btnRules');
    const factBox = document.getElementById('factBox');
    const progressBar = document.getElementById('progressBar');
    const roundInfo = document.getElementById('roundInfo');
    const correctCountEl = document.getElementById('correctCount');
    const attemptCountEl = document.getElementById('attemptCount');
    const historyList = document.getElementById('historyList');
    const miniScore = document.getElementById('miniScore');
    const resultArea = document.getElementById('resultArea');
    const confettiCanvas = document.getElementById('confetti');
    
    let rounds = [];
    let idx = 0;
    let correct = 0;
    let attempts = 0;
    let started = false;
    
    function normalize(s) { return s.replace(/\s+/g, '').toUpperCase(); }
    
    function scramble(word) {
      // keep characters but shuffle, for multiword remove spaces before shuffle display with spaces as small gaps
      const letters = word.split('');
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
      }
      // if accidentally equals original, do another shuffle
      if (letters.join('') === word) return scramble(word);
      // show with small spaces for readability
      return letters.join(' ');
    }
    
    function startGame() {
      rounds = shuffledWords();
      idx = 0;
      correct = 0;
      attempts = 0;
      started = true;
      factBox.style.display = 'none';
      resultArea.style.display = 'none';
      guessInput.disabled = false;
      submitBtn.disabled = false;
      guessInput.value = '';
      guessInput.focus();
      updateUI();
      renderRound();
    }
    
    function updateUI() {
      roundInfo.textContent = `${Math.min(idx+1, rounds.length)} / ${rounds.length}`;
      correctCountEl.textContent = correct;
      attemptCountEl.textContent = attempts;
      miniScore.textContent = `${correct}`;
      const pct = Math.round((correct / rounds.length) * 100);
      progressBar.style.width = pct + '%';
    }
    
    function renderRound() {
      if (idx >= rounds.length) { endGame(); return; }
      const wordObj = rounds[idx];
      const display = scramble(wordObj.answer);
      scrambledEl.textContent = display;
      hintEl.textContent = `Round ${idx+1} — Unscramble to learn`;
      factBox.style.display = 'none';
      guessInput.value = '';
      guessInput.focus();
      updateUI();
      logHistory(`Round ${idx+1} started`);
    }
    
    function showFact(text) {
      factBox.style.display = 'block';
      factBox.textContent = text;
    }
    
    function showFeedback(ok, correctWord) {
      if (ok) {
        logHistory(`✅ ${correctWord}`);
        showFact(rounds[idx].fact);
        correct++;
      } else {
        logHistory(`❌ ${guessInput.value || '(blank)'} — correct: ${correctWord}`);
        showFact('Not quite — keep going!');
      }
      attempts++;
      idx++;
      updateUI();
      setTimeout(() => {
        if (idx < rounds.length) renderRound();
        else endGame();
      }, 900);
    }
    
    function submitGuess() {
      if (!started) return;
      const guess = normalize(guessInput.value || '');
      const current = rounds[idx].answer;
      const normalizedAnswer = normalize(current);
      if (!guess) return;
      if (guess === normalizedAnswer) {
        showFeedback(true, current);
      } else {
        showFeedback(false, current);
      }
    }
    
    function skipRound() {
      if (!started) return;
      const current = rounds[idx].answer;
      showFeedback(false, current);
    }
    
    function revealHint() {
      if (!started) return;
      const cur = rounds[idx].answer;
      const norm = cur.replace(/\s+/g, '');
      const first = norm[0];
      const last = norm[norm.length - 1];
      const hint = `Hint: starts with "${first}" and ends with "${last}" (length ${norm.length})`;
      hintEl.textContent = hint;
      logHistory(`Hint shown for round ${idx+1}`);
    }
    
    function logHistory(text) {
      const node = document.createElement('div');
      node.className = 'item';
      node.textContent = text;
      historyList.prepend(node);
      
      while (historyList.children.length > 30) historyList.removeChild(historyList.lastChild);
    }
    
    function endGame() {
      started = false;
      guessInput.disabled = true;
      submitBtn.disabled = true;
      hintEl.textContent = 'Game complete';
      
      const percent = Math.round((correct / rounds.length) * 100);
      showResultScreen(percent);
    }
    
    
    /**  function showResultScreen(percent) {
        resultArea.innerHTML = '';
        resultArea.style.display = 'block';
        
        const wrapper = document.createElement('div')
        if (percent >= 50) {
          
          wrapper.innerHTML = `  
          <p>You scored ${percent}% — nice work. You’ve unlocked core Seismic concepts.</p>   
           <div style="margin-top:8px">
            <button class="btn primary" id="btnReplay">Play again </button>
          </div>
          `;
          resultArea.appendChild(wrapper);
          launchConfetti();
          
          document.getElementById('btnReplay').onclick = () => startGame();
          
        } else {
          
          wrapper.innerHTML = `
          <div style="margin-top:8px">
            <button class="btn primary" id="btnRetry">Try Again</button>
          </div>
        `;
          resultArea.appendChild(wrapper);
          document.getElementById('btnRetry').onclick = () => startGame();
        }
        
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }**/
    
    function showResultScreen(percent) {
      resultArea.innerHTML = '';
      resultArea.style.display = 'block';
      
      const wrapper = document.createElement('div');
      wrapper.className = 'result-wrapper';
      
      const success = percent >= 50;
      const emoji = success ? '🏆' : '📘';
      const title = success ? 'Seismic Certified (v1)' : 'Keep Learning';
      const subtitle = success ?
        `You scored <b>${percent}%</b> — strong grasp of Seismic concepts!` :
        `You scored <b>${percent}%</b>. You’re close — review and try again.`;
      
      wrapper.innerHTML = `
    <div class="result-card ${success ? 'success' : 'fail'}">
      <div class="result-header">${emoji}</div>
      <h2>${title}</h2>
      <p>${subtitle}</p>
      <div class="result-actions">
        ${success 
          ? `
            <button class="btn primary" id="btnReplay">Play Again</button>
            <button class="btn outline disabled" id="btnCert" disabled>
              Generate Certificate
              <span class="comingsoon">v2</span>
            </button>
          `
          : `
            <button class="btn primary" id="btnRetry">Try Again</button>
            <a class="btn outline" href="https://docs.seismic.systems/" target="_blank">Learn More</a>
          `}
      </div>
    </div>
  `;
      resultArea.appendChild(wrapper);
      
      resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Confetti if successful
      if (success) launchConfetti();
      
      const replayBtn = document.getElementById('btnReplay');
      const retryBtn = document.getElementById('btnRetry');
      
      if (replayBtn) replayBtn.onclick = () => startGame();
      if (retryBtn) retryBtn.onclick = () => startGame();
    }
    
    function launchConfetti() {
      const c = confettiCanvas;
      const ctx = c.getContext('2d');
      const DPR = window.devicePixelRatio || 1;
      c.width = c.clientWidth * DPR;
      c.height = c.clientHeight * DPR;
      ctx.scale(DPR, DPR);
      const W = c.clientWidth;
      const H = c.clientHeight;
      const pieces = [];
      const colors = [
        '#00ff88',
        '#b8ffde',
        '#00e58c',
        '#8affd1',
        '#ff6b6b',
        '#ffd93d',
        '#6c63ff',
        '#ff9f43',
        '#f368e0',
        '#48dbfb'
      ];
      for (let i = 0; i < 300; i++) {
        pieces.push({
          x: Math.random() * W,
          y: -Math.random() * H,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 4 + 2,
          r: Math.random() * 6 + 2,
          c: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * 360,
          dr: (Math.random() - 0.5) * 8
        });
      }
      
      let t = 0;
      
      function frame() {
        ctx.clearRect(0, 0, c.width, c.height);
        for (const p of pieces) {
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.dr;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.c;
          ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
          ctx.restore();
        }
        t++;
        if (t < 150) requestAnimationFrame(frame);
        else ctx.clearRect(0, 0, c.width, c.height);
      }
      frame();
    }
    
    
    submitBtn.addEventListener('click', submitGuess);
    guessInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitGuess(); });
    startBtn.addEventListener('click', () => startGame());
    skipBtn.addEventListener('click', skipRound);
    hintBtn.addEventListener('click', revealHint);
    restartBtn.addEventListener('click', () => {
      startGame();
      historyList.innerHTML = '<div class="item">Restarted</div>';
    });
    
    rulesBtn.addEventListener('click', () => {
      alert('Unscramble the letters to type the correct Seismic concept. 10 rounds. If you score 50% or above you are Seismic Certified. Below 50% shows links to learn more.');
    });
    
    
    updateUI();
    
    
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 's' && !started) startGame();
    });
  })();