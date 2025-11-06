export const API = {
  
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        credentials: 'include',
        ...options
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },
  
  async startGame() {
    return this.request('/game/start', {
      method: 'POST'
    });
  },
  
  async submitScore(hash_id, score) {
    return this.request('/game/submit', {
      method: 'POST',
      body: JSON.stringify({ hash_id, score })
    });
  },
  
  async getGameStatus() {
    return this.request('/game/status', {
      method: 'GET'
    });
  },
  
  async getUserProfile() {
    return this.request('/user/profile', {
      method: 'GET'
    });
  },
  
  async updateScore(score) {
    return this.request('/user/update-score', {
      method: 'POST',
      body: JSON.stringify({ score })
    });
  },
  
  async getLeaderboard(limit = 50, page = 1) {
    return this.request(`/leaderboard?limit=${limit}&page=${page}`, {
      method: 'GET'
    });
  },
  
  async getPublicProfile(username) {
    return this.request(`/profile/${username}`, {
      method: 'GET'
    });
  },
  
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  
  async signup(username, password) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  
  async logout() {
    return this.request('/user/logout', {
      method: 'POST'
    });
  }
};


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

export class LeaderboardManager {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentPage = 1;
    this.limit = 50;
    this.isLoading = false;
  }
  
  async loadLeaderboard(page = 1) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading();
    
    try {
      const response = await API.getLeaderboard(this.limit, page);
      
      if (response.success) {
        this.currentPage = page;
        this.renderLeaderboard(response.data.leaderboard);
        this.renderPagination(response.data.pagination);
      } else {
        this.showError(response.message);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      this.showError('Failed to load leaderboard');
    } finally {
      this.isLoading = false;
    }
  }
  
  renderLeaderboard(players) {
    if (!this.container) return;
    
    const tbody = this.container.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    players.forEach(player => {
      const row = this.createLeaderboardRow(player);
      tbody.appendChild(row);
    });
  }
  
  createLeaderboardRow(player) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 transition';
    
    // Rank with special styling for top 3
    let rankClass = 'text-gray-900';
    if (player.rank === 1) rankClass = 'text-gray-900 font-extrabold';
    else if (player.rank === 2) rankClass = 'text-gray-800 font-bold';
    else if (player.rank === 3) rankClass = 'text-gray-700 font-bold';
    
    tr.innerHTML = `
      <td class="py-3 px-6 font-semibold ${rankClass}">${player.rank}</td>
      <td class="py-3 px-6">
        <div class="flex items-center gap-3">
          <img src="${player.avatar || '/default-avatar.jpg'}" 
               class="w-10 h-10 rounded-full border border-gray-200 shadow-sm grayscale" 
               alt="${player.username}">
          <span>${this.escapeHtml(player.username)}</span>
        </div>
      </td>
      <td class="py-3 px-6 font-semibold">${player.score}</td>
      <td class="py-3 px-6 text-gray-500">${player.radar || 'green'}</td>
    `;
    
    return tr;
  }
  
  renderPagination(pagination) {
    if (!pagination) return;
    
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = `
      <div class="flex justify-center items-center gap-4 mt-6">
        <button 
          id="prevPage" 
          class="px-4 py-2 border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          ${pagination.current_page === 1 ? 'disabled' : ''}
        >
          Previous
        </button>
        
        <span class="text-gray-700">
          Page ${pagination.current_page} of ${pagination.total_pages}
        </span>
        
        <button 
          id="nextPage" 
          class="px-4 py-2 border border-gray-900 text-gray-900 rounded-lg hover:bg-gray-900 hover:text-white transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          ${pagination.current_page === pagination.total_pages ? 'disabled' : ''}
        >
          Next
        </button>
      </div>
    `;
    
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if (prevBtn && pagination.current_page > 1) {
      prevBtn.addEventListener('click', () => {
        this.loadLeaderboard(pagination.current_page - 1);
      });
    }
    
    if (nextBtn && pagination.current_page < pagination.total_pages) {
      nextBtn.addEventListener('click', () => {
        this.loadLeaderboard(pagination.current_page + 1);
      });
    }
  }
  
  showLoading() {
    if (!this.container) return;
    const tbody = this.container.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-gray-500">Loading...</td></tr>';
    }
  }
  
  showError(message) {
    if (!this.container) return;
    const tbody = this.container.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-red-600">${this.escapeHtml(message)}</td></tr>`;
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}