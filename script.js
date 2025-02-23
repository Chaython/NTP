// Weather cache functions
function getWeatherCache() {
  const cache = localStorage.getItem('weatherCache');
  if (!cache) return null;
  
  const { data, timestamp } = JSON.parse(cache);
  const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
  
  if (Date.now() - timestamp > thirtyMinutes) {
    localStorage.removeItem('weatherCache');
    return null;
  }
  
  return data;
}

function setWeatherCache(data) {
  const cache = {
    data,
    timestamp: Date.now()
  };
  localStorage.setItem('weatherCache', JSON.stringify(cache));
}

// Weather API
async function getWeather() {
  const cachedData = getWeatherCache();
  const textView = document.getElementById('weather-info');
  const iconView = document.getElementById('weather-icon-view');
  const iconImg = document.getElementById('weather-icon');
  const tempSpan = document.getElementById('weather-temp');
  
  function updateWeatherDisplay(data) {
    // Text view
    textView.innerHTML = `
      ${data.name || "Location"}: ${data.main?.temp ?? "N/A"}°C, 
      ${data.weather?.[0]?.description || "No data"}
    `;
    
    // Icon view
    if (data.weather?.[0]?.icon) {
      iconImg.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
      tempSpan.textContent = `${Math.round(data.main?.temp ?? 0)}°C`;
    }
  }

  if (cachedData) {
    updateWeatherDisplay(cachedData);
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    try {
      const { latitude, longitude } = position.coords;
      const apiKey = '1794b88c0a05da01813be549e6707c28';
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      
      setWeatherCache(data);
      updateWeatherDisplay(data);
    } catch (error) {
      console.error('Weather fetch failed:', error);
      textView.textContent = "Failed to load weather data.";
      iconView.classList.add('hidden');
    }
  }, (error) => {
    console.log('Geolocation error:', error);
    textView.textContent = "Enable location access to see weather.";
    iconView.classList.add('hidden');
  });
}

// Search Functionality
const defaultSearchProviders = [
  { name: 'Google', url: 'https://www.google.com/search?q=%s', icon: 'https://www.google.com/favicon.ico' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=%s', icon: 'https://www.bing.com/sa/simg/favicon-2x.ico' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s', icon: 'https://duckduckgo.com/favicon.ico' }
];

function getSearchProviders() {
  const saved = localStorage.getItem('searchProviders');
  const providers = saved ? JSON.parse(saved) : defaultSearchProviders;
  // Ensure at least one provider exists
  if (providers.length === 0) {
    providers.push(defaultSearchProviders[0]);
  }
  return providers;
}

function saveSearchProviders(providers) {
  localStorage.setItem('searchProviders', JSON.stringify(providers));
}

function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return null;
  }
}

function formatProviderName(domain) {
  return domain
    .split('.')[0]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getFaviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}`;
}

function normalizeSearchUrl(url) {
  // Ensure URL has protocol
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }
  
  try {
    const urlObj = new URL(url);
    // If URL doesn't have a path or just has '/', add '/search' as default
    if (urlObj.pathname === '' || urlObj.pathname === '/') {
      urlObj.pathname = '/search';
    }
    // If no query parameter is present, add '?q='
    if (!urlObj.search && !url.includes('%s')) {
      return urlObj.toString() + '?q=%s';
    }
    // If no %s placeholder, append it to existing query
    if (!url.includes('%s')) {
      return urlObj.toString() + (urlObj.search ? '&' : '?') + 'q=%s';
    }
    return url;
  } catch (e) {
    console.error('Invalid URL:', url);
    return 'https://www.google.com/search?q=%s';
  }
}

function initializeSearchProviderManager() {
  const providersList = document.getElementById('search-providers-list');
  const addButton = document.getElementById('add-provider');
  const urlInput = document.getElementById('provider-url');
  const nameInput = document.getElementById('provider-name');
  const iconInput = document.getElementById('provider-icon');
  let providers = getSearchProviders();

  // Add URL input handler for auto-fill
  urlInput.addEventListener('blur', () => {
    const url = urlInput.value.trim();
    const domain = getDomainFromUrl(url);
    
    if (domain && !nameInput.value.trim()) {
      nameInput.value = formatProviderName(domain);
    }
    
    if (domain && !iconInput.value.trim()) {
      iconInput.value = getFaviconUrl(domain);
    }
  });

  function updateProvidersList() {
    providersList.innerHTML = '';
    providers.forEach((provider, index) => {
      const item = document.createElement('div');
      item.className = 'provider-item';
      
      const icon = document.createElement('img');
      icon.src = provider.icon || 'default-icon.png';
      icon.alt = provider.name;
      
      const name = document.createElement('span');
      name.className = 'provider-name';
      name.textContent = provider.name;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-provider';
      removeBtn.textContent = '×';
      // Disable remove button if this is the last provider
      removeBtn.disabled = providers.length === 1;
      removeBtn.title = providers.length === 1 ? 'Cannot remove last search provider' : 'Remove provider';
      
      removeBtn.onclick = () => {
        if (providers.length > 1) {
          providers = providers.filter((_, i) => i !== index);
          saveSearchProviders(providers);
          updateProvidersList();
          initializeSearchProvider();
        } else {
          alert('Cannot remove the last search provider. At least one provider is required.');
        }
      };
      
      item.appendChild(icon);
      item.appendChild(name);
      item.appendChild(removeBtn);
      providersList.appendChild(item);
    });
  }
  
  addButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const icon = iconInput.value.trim();
    
    if (url) {
      const domain = getDomainFromUrl(url);
      const searchUrl = normalizeSearchUrl(url);
      providers.push({ 
        name: name || formatProviderName(domain),
        url: searchUrl,
        icon: icon || getFaviconUrl(domain)
      });
      saveSearchProviders(providers);
      updateProvidersList();
      initializeSearchProvider();
      
      // Clear inputs
      nameInput.value = '';
      urlInput.value = '';
      iconInput.value = '';
    }
  });
  
  updateProvidersList();
}

function initializeSearchProvider() {
  const providers = getSearchProviders();
  let currentProviderIndex = parseInt(localStorage.getItem('searchProviderIndex'), 10) || 0;
  if (currentProviderIndex >= providers.length) currentProviderIndex = 0;
  
  const searchBar = document.getElementById('search-bar');
  const searchProviderIcon = document.getElementById('search-provider');
  
  function updateSearchProvider() {
    const provider = providers[currentProviderIndex];
    searchProviderIcon.src = provider.icon || 'default-icon.png';
    localStorage.setItem('searchProviderIndex', currentProviderIndex);
  }
  
  searchBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value;
      const provider = providers[currentProviderIndex];
      const searchUrl = provider.url.replace('%s', encodeURIComponent(query));
      window.location.href = searchUrl;
    }
  });
  
  searchProviderIcon.addEventListener('click', () => {
    currentProviderIndex = (currentProviderIndex + 1) % providers.length;
    updateSearchProvider();
  });
  
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
  const historyCount = parseInt(localStorage.getItem('historyCount'));
  const historySection = document.querySelector('.history');
  
  // Clear any existing display style
  historySection.style.removeProperty('display');
  
  // Hide section and return if count is explicitly 0
  if (historyCount === 0) {
    historySection.style.display = 'none';
    return;
  }
  
  // Use a default of 16 if no count is set
  const maxResults = historyCount || 16;
  
  chrome.history.search({ text: '', maxResults }, (historyItems) => {
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

function initializeHistoryCount() {
  const countSelect = document.getElementById('history-count');
  const storedCount = localStorage.getItem('historyCount');
  // Changed this line to properly handle zero value
  let historyCount = storedCount !== null ? parseInt(storedCount) : 16;
  
  // Set initial value
  countSelect.value = historyCount.toString();
  loadHistory();
  
  countSelect.addEventListener('change', () => {
    historyCount = parseInt(countSelect.value);
    localStorage.setItem('historyCount', historyCount);
    loadHistory();
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

  // Remove presetBackgrounds array and initialization code
  
  // Modal controls
  document.getElementById('settings-btn').addEventListener('click', () => {
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

// Add weather toggle functionality
function initializeWeatherToggle() {
  const displaySelect = document.getElementById('weather-display');
  const textView = document.getElementById('weather-info');
  const iconView = document.getElementById('weather-icon-view');
  const weatherSection = document.querySelector('.weather');
  
  let displayMode = localStorage.getItem('weatherDisplayMode') || 'text';
  displaySelect.value = displayMode;
  
  function updateWeatherView() {
    // Hide entire section if hidden is selected
    if (displayMode === 'hidden') {
      weatherSection.style.display = 'none';
      return;
    }
    
    // Show section if it was hidden
    weatherSection.style.display = 'block';
    
    // Toggle between text and icon view
    const showIcon = displayMode === 'icon';
    textView.classList.toggle('hidden', showIcon);
    iconView.classList.toggle('hidden', !showIcon);
  }
  
  displaySelect.addEventListener('change', () => {
    displayMode = displaySelect.value;
    localStorage.setItem('weatherDisplayMode', displayMode);
    updateWeatherView();
  });
  
  updateWeatherView();
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
  initializeWeatherToggle();
  initializeHistoryCount();
  initializeSearchProviderManager();
});