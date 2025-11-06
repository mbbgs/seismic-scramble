const leaderboardTable = document.getElementById('leaderboardBody')?.closest('table');
const leaderboardManager = new LeaderboardManager(leaderboardTable);


const searchInput = document.getElementById('searchUser');
const searchBtn = document.getElementById('searchBtn');


const filterRadar = document.getElementById('filterRadar');
const filterBtn = document.getElementById('filterBtn');
const resetFilterBtn = document.getElementById('resetFilter');


const refreshBtn = document.getElementById('refreshLeaderboard');

let currentFilters = {
  radar: null,
  search: null
};


window.addEventListener('DOMContentLoaded', () => {
  loadLeaderboard();
  initializeEventListeners();
  startAutoRefresh();
});


async function loadLeaderboard(page = 1) {
  await leaderboardManager.loadLeaderboard(page);
  
  if (currentFilters.radar || currentFilters.search) {
    applyFilters();
  }
}


async function searchUser() {
  const username = searchInput?.value?.trim();
  
  if (!username) {
    window.showAlert('Please enter a username to search', 'error');
    return;
  }
  
  try {
    showSearchLoading();
    const response = await API.getPublicProfile(username);
    
    if (response.success) {
      displayUserResult(response.data);
    } else {
      window.showAlert('User not found', 'error');
    }
  } catch (error) {
    console.error('Search error:', error);
    window.showAlert('Failed to search user: ' + error.message, 'error');
  } finally {
    hideSearchLoading();
  }
}

function displayUserResult(user) {
  const modalHTML = `
    <div id="userModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-200 shadow-glow">
        <div class="flex justify-between items-start mb-6">
          <h2 class="text-2xl font-bold text-gray-900">User Profile</h2>
          <button onclick="closeUserModal()" class="text-gray-400 hover:text-gray-900 text-2xl">&times;</button>
        </div>
        
        <div class="flex flex-col items-center text-center">
          <img src="${user.avatar || '/default-avatar.jpg'}" 
               class="w-24 h-24 rounded-full border-2 border-gray-900 mb-4 grayscale" 
               alt="${user.username}">
          
          <h3 class="text-xl font-bold text-gray-900 mb-2">${escapeHtml(user.username)}</h3>
          
          <div class="grid grid-cols-2 gap-4 w-full mt-6">
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-sm text-gray-600 mb-1">Rank</p>
              <p class="text-2xl font-bold text-gray-900">#${user.rank}</p>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <p class="text-sm text-gray-600 mb-1">Score</p>
              <p class="text-2xl font-bold text-gray-900">${user.score}</p>
            </div>
          </div>
          
          <div class="mt-4 w-full">
            <p class="text-sm text-gray-600">Radar Status</p>
            <p class="text-lg font-semibold text-gray-700 mt-1">${user.radar || 'green'}</p>
          </div>
          
          <div class="mt-4 w-full text-xs text-gray-500">
            Joined: ${new Date(user.joinedOn).toLocaleDateString()}
          </div>
        </div>
        
        <button onclick="closeUserModal()" 
                class="mt-6 w-full px-4 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:scale-105 transition-transform">
          Close
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.closeUserModal = function() {
  const modal = document.getElementById('userModal');
  if (modal) modal.remove();
};

function applyFilters() {
  const tbody = leaderboardTable?.querySelector('tbody');
  if (!tbody) return;
  
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  rows.forEach(row => {
    let shouldShow = true;
    
    if (currentFilters.radar) {
      const radarCell = row.cells[3]?.textContent?.toLowerCase();
      if (radarCell !== currentFilters.radar) {
        shouldShow = false;
      }
    }
    
    if (currentFilters.search) {
      const username = row.cells[1]?.textContent?.toLowerCase();
      if (!username?.includes(currentFilters.search.toLowerCase())) {
        shouldShow = false;
      }
    }
    
    row.style.display = shouldShow ? '' : 'none';
  });
}

function setRadarFilter() {
  const radar = filterRadar?.value;
  currentFilters.radar = radar !== 'all' ? radar : null;
  applyFilters();
}

function resetFilters() {
  currentFilters = { radar: null, search: null };
  
  if (searchInput) searchInput.value = '';
  if (filterRadar) filterRadar.value = 'all';
  
  // Show all rows
  const tbody = leaderboardTable?.querySelector('tbody');
  if (tbody) {
    Array.from(tbody.querySelectorAll('tr')).forEach(row => {
      row.style.display = '';
    });
  }
}


let refreshInterval = null;

function startAutoRefresh(intervalMs = 60000) { // Refresh every 60 seconds
  if (refreshInterval) clearInterval(refreshInterval);
  
  refreshInterval = setInterval(() => {
    loadLeaderboard(leaderboardManager.currentPage);
  }, intervalMs);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}


function initializeEventListeners() {
  
  if (searchBtn) {
    searchBtn.addEventListener('click', searchUser);
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') searchUser();
    });
  }
  
  if (filterBtn) {
    filterBtn.addEventListener('click', setRadarFilter);
  }
  
  if (filterRadar) {
    filterRadar.addEventListener('change', setRadarFilter);
  }
  
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', resetFilters);
  }
  
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadLeaderboard(leaderboardManager.currentPage);
    });
  }
}



function showSearchLoading() {
  if (searchBtn) {
    searchBtn.disabled = true;
    searchBtn.textContent = 'Searching...';
  }
}

function hideSearchLoading() {
  if (searchBtn) {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});