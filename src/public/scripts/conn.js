(async function connectGameAPI() {
  const startBtn = document.getElementById('btnStart');
  const resultArea = document.getElementById('resultArea');
  
  let currentHash = null;
  
  async function postJSON(url, data = {}) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error('Network error:', err);
      return { success: false, message: 'Network Error' };
    }
  }
  
  async function startGameSession() {
    const res = await postJSON('/api/start');
    
    if (res.success) {
      currentHash = res.data.hash_id;
      console.log('Game started:', currentHash);
    } else {
      alert('Failed to start game: ' + res.message);
      return false;
    }
    return true;
  }
  
  
  async function submitGameScore(finalScore) {
    if (!currentHash) return alert('Invalid session hash.');
    const res = await postJSON('/api/submit', { hash_id: currentHash, score: finalScore });
    if (res.success) {
      localStorage.clear()
    } else {
      alert(`❌ Error: ${res.message}`);
    }
  }
  
  const originalStart = window.startGame;
  const originalShowResult = window.showResultScreen;
  
  window.startGame = async function() {
    const ok = await startGameSession();
    if (ok) originalStart();
  };
  
  window.showResultScreen = async function(percent) {
    const finalScore = Math.round(percent * 10);
    await submitGameScore(finalScore);
    originalShowResult(percent);
  };
  
})();