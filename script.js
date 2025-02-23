// Weather API
async function getWeather() {
  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const { latitude, longitude } = position.coords;
      const apiKey = '1794b88c0a05da01813be549e6707c28';
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      
      document.getElementById('weather-info').innerHTML = `
        ${data.name || "Location"}: ${data.main?.temp ?? "N/A"}°C, 
        ${data.weather?.[0]?.description || "No data"}
      `;
    } catch (error) {
      console.error('Weather fetch failed:', error);
      document.getElementById('weather-info').textContent = 
        "Failed to load weather data.";
    }
  }, (error) => {
    console.log('Geolocation error:', error);
    document.getElementById('weather-info').textContent = 
      "Enable location access to see weather.";
  });
}

// Search Functionality
const searchProviders = [
  { name: 'Google', url: 'https://www.google.com/search?q=', icon: 'https://www.google.com/favicon.ico' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=', icon: 'https://www.bing.com/sa/simg/favicon-2x.ico' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: 'https://duckduckgo.com/favicon.ico' }
];

function initializeSearchProvider() {
  let currentProviderIndex = parseInt(localStorage.getItem('searchProviderIndex'), 10);
  if (isNaN(currentProviderIndex)) {
    currentProviderIndex = 0;
  }

  const searchBar = document.getElementById('search-bar');
  const searchProviderIcon = document.getElementById('search-provider');

  function updateSearchProvider() {
    const provider = searchProviders[currentProviderIndex];
    searchProviderIcon.src = provider.icon;
    localStorage.setItem('searchProviderIndex', currentProviderIndex);
  }

  searchBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value;
      const provider = searchProviders[currentProviderIndex];
      window.location.href = `${provider.url}${encodeURIComponent(query)}`;
    }
  });

  searchProviderIcon.addEventListener('click', () => {
    currentProviderIndex = (currentProviderIndex + 1) % searchProviders.length;
    updateSearchProvider();
    console.log('Search provider changed to:', searchProviders[currentProviderIndex].name);
  });

  // Initial setup
  updateSearchProvider();
}

// Apps
const apps = [
  { name: 'Gmail', url: 'https://mail.google.com' },
  { name: 'YouTube', url: 'https://youtube.com' }
];
function loadApps() {
  const appsList = document.getElementById('apps-list');
  appsList.innerHTML = '';
  apps.forEach(app => {
    const button = document.createElement('a');
    button.href = app.url;
    button.className = 'app-btn';
    
    const favicon = document.createElement('img');
    favicon.src = `https://www.google.com/s2/favicons?domain=${app.url}`;
    favicon.alt = `${app.name} favicon`;
    
    const name = document.createElement('span');
    name.textContent = app.name;
    
    button.appendChild(favicon);
    button.appendChild(name);
    appsList.appendChild(button);
  });
}

// Favorites
function loadFavorites() {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  const favoritesList = document.getElementById('favorites-list');
  favoritesList.innerHTML = '';
  favorites.forEach(fav => {
    const link = document.createElement('a');
    link.href = fav;
    link.textContent = fav;
    favoritesList.appendChild(link);
  });
}

document.getElementById('add-favorite').addEventListener('click', () => {
  const input = document.getElementById('favorite-input');
  const url = input.value.trim();
  if (url) {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    favorites.push(url);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
    input.value = '';
  }
});

// Browsing History
function loadHistory() {
  chrome.history.search({ text: '', maxResults: 10 }, (historyItems) => {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    historyItems.forEach(item => {
      const button = document.createElement('a');
      button.href = item.url;
      button.className = 'history-btn';
      
      const favicon = document.createElement('img');
      favicon.src = `https://www.google.com/s2/favicons?domain=${item.url}`;
      favicon.alt = 'favicon';
      
      const name = document.createElement('span');
      name.textContent = item.title || item.url.split('/')[2] || item.url;
      
      button.appendChild(favicon);
      button.appendChild(name);
      historyList.appendChild(button);
    });
  });
}

// Theme Management
function applyTheme(theme) {
  const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
  console.log('Theme applied:', theme, 'Is dark:', isDark);
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'auto';
  const themeSelect = document.getElementById('theme-select');
  
  if (!themeSelect) {
    console.error('Theme select element not found');
    return;
  }
  
  themeSelect.value = savedTheme; // Sync dropdown
  applyTheme(savedTheme); // Ensure theme matches inline script

  // Theme selector listener
  themeSelect.addEventListener('change', (e) => {
    const newTheme = e.target.value;
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    console.log('Theme changed to:', newTheme);
  });

  // Listen for system theme changes in auto mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentTheme = localStorage.getItem('theme') || 'auto';
    if (currentTheme === 'auto') {
      applyTheme('auto');
      console.log('System theme changed, auto mode updated:', e.matches ? 'dark' : 'light');
    }
  });
}

// Background Image Management
const presetBackgrounds = [
  { url: 'https://source.unsplash.com/random/1920x1080/?nature', name: 'Nature' },
  { url: 'https://source.unsplash.com/random/1920x1080/?city', name: 'City' },
  { url: 'https://source.unsplash.com/random/1920x1080/?space', name: 'Space' },
  { url: 'https://source.unsplash.com/random/1920x1080/?ocean', name: 'Ocean' }
];

function initializeBackgroundImage() {
  const modal = document.getElementById('bg-modal');
  const preview = document.getElementById('bg-preview');
  let currentPreview = localStorage.getItem('backgroundImage');
  
  function setBackgroundImage(url, save = true) {
    document.body.style.backgroundImage = `url(${url})`;
    document.body.classList.add('has-bg');
    if (save) {
      localStorage.setItem('backgroundImage', url);
    }
  }

  function updatePreview(url) {
    preview.style.backgroundImage = `url(${url})`;
    currentPreview = url;
  }

  // Initialize presets
  const presetGrid = document.getElementById('preset-backgrounds');
  presetBackgrounds.forEach(bg => {
    const thumb = document.createElement('div');
    thumb.className = 'preset-thumb';
    thumb.style.backgroundImage = `url(${bg.url})`;
    thumb.title = bg.name;
    thumb.addEventListener('click', () => updatePreview(bg.url));
    presetGrid.appendChild(thumb);
  });

  // Modal controls
  document.getElementById('bg-settings-btn').addEventListener('click', () => {
    modal.style.display = 'block';
    if (currentPreview) {
      updatePreview(currentPreview);
    }
  });

  document.getElementById('close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Drag and drop
  const dropzone = document.getElementById('dropzone');
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => updatePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  });

  // File input
  document.getElementById('bg-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => updatePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  });

  // URL input
  document.getElementById('set-bg-url').addEventListener('click', () => {
    const url = document.getElementById('bg-url').value.trim();
    if (url) {
      updatePreview(url);
      document.getElementById('bg-url').value = '';
    }
  });

  // Apply button
  document.getElementById('apply-bg').addEventListener('click', () => {
    if (currentPreview) {
      setBackgroundImage(currentPreview);
    }
    modal.style.display = 'none';
  });

  // Remove background
  document.getElementById('remove-bg').addEventListener('click', () => {
    localStorage.removeItem('backgroundImage');
    document.body.style.backgroundImage = '';
    document.body.classList.remove('has-bg');
    currentPreview = null;
    preview.style.backgroundImage = '';
    modal.style.display = 'none';
  });

  // Load saved background
  const savedBg = localStorage.getItem('backgroundImage');
  if (savedBg) {
    setBackgroundImage(savedBg, false);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  initializeSearchProvider();
  getWeather();
  loadApps();
  loadFavorites();
  loadHistory();
  initializeBackgroundImage();
});