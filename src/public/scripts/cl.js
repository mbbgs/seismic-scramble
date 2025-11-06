export class GameManager {
  constructor() {
    this.startTime = null;
    this.score = 0;
    this.isGameActive = false;
    this.maxGameTime = 300000; // 5 min
    this.timer = null;
  }
  
  async startGame() {
    try {
      const response = await API.startGame();
      
      if (response.success) {
        const hashId = response.data.hash_id;
        localStorage.setItem('game_hash', hashId);
        
        this.startTime = Date.now();
        this.score = 0;
        this.isGameActive = true;
        
        this.startTimer();
        
        return {
          success: true,
          hash_id: hashId,
          message: 'Game started successfully'
        };
      }
      
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Error starting game:', error);
      return {
        success: false,
        message: error.message || 'Failed to start game'
      };
    }
  }
  
  startTimer() {
    this.timer = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      
      if (elapsed >= this.maxGameTime) {
        this.endGame(true);
      }
      
      if (this.onTimerUpdate) {
        this.onTimerUpdate(Math.floor(elapsed / 1000));
      }
    }, 1000);
  }
  
  async submitScore(finalScore) {
    const hashId = localStorage.getItem('game_hash');
    
    if (!this.isGameActive || !hashId) {
      return {
        success: false,
        message: 'No active game session'
      };
    }
    
    try {
      const response = await API.submitScore(hashId, finalScore);
      
      if (response.success) {
        this.endGame(false);
        localStorage.removeItem('game_hash');
        
        return {
          success: true,
          data: response.data,
          message: 'Score submitted successfully'
        };
      }
      
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Error submitting score:', error);
      return {
        success: false,
        message: error.message || 'Failed to submit score'
      };
    }
  }
  
  endGame(isTimeout = false) {
    this.isGameActive = false;
    this.startTime = null;
    
    localStorage.removeItem('game_hash');
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    if (isTimeout && this.onTimeout) {
      this.onTimeout();
    }
  }
  
  getElapsedTime() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
  
  getRemainingTime() {
    if (!this.startTime) return 0;
    const elapsed = Date.now() - this.startTime;
    const remaining = this.maxGameTime - elapsed;
    return Math.max(0, Math.floor(remaining / 1000));
  }
}