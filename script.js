// Constants
const CONFIG = {
  WEATHER: {
    API_KEY: '1794b88c0a05da01813be549e6707c28',
    CACHE_TIME: 30 * 60 * 1000, // 30 minutes
    DEFAULT_MODE: 'text'
  },
  DEFAULTS: {
    THEME: 'auto',
    BUTTON_STYLE: 'squircle',
    BOOKMARKS_COUNT: 8,
    HISTORY_COUNT: 16
  }
};

// Add these helper functions at the top of the file
function sanitizeHTML(str) {
  return str.replace(/[&<>"']/g, (match) => {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escape[match];
  });
}

function createSafeElement(tag, attributes = {}, textContent = '') {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith('on')) continue; // Skip event handlers
    element.setAttribute(key, value);
  }
  if (textContent) {
    element.textContent = textContent;
  }
  return element;
}

function renderSafeHTML(container, elements) {
  container.innerHTML = ''; // Safe because we're just clearing
  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      container.appendChild(element);
    }
  });
}

// Weather cache functions
function getWeatherCache() {
  const cache = localStorage.getItem('weatherCache');
  if (!cache) return null;
  
  const { data, timestamp } = JSON.parse(cache);
  const thirtyMinutes = CONFIG.WEATHER.CACHE_TIME;
  
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
    const textView = document.getElementById('weather-info');
    const elements = [];
    
    const location = createSafeElement('span', {}, data.name || "Location");
    const temp = createSafeElement('span', {}, `${data.main?.temp ?? "N/A"}°C`);
    const desc = createSafeElement('span', {}, data.weather?.[0]?.description || "No data");
    
    elements.push(location, createSafeElement('span', {}, ': '), temp, createSafeElement('span', {}, ', '), desc);
    renderSafeHTML(textView, elements);
    
    // Update icon view (already safe as it uses src attribute)
    const iconImg = document.getElementById('weather-icon');
    const tempSpan = document.getElementById('weather-temp');
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
      const apiKey = CONFIG.WEATHER.API_KEY;
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

// Generic helper functions
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

function getHighQualityIcon(url) {
  const domain = getDomainFromUrl(url);
  if (!domain) return null;
  
  const cleanDomain = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return [
    // Clearbit's logo API (high quality)
    `https://logo.clearbit.com/${domain}`,
    // Brand icons - great for popular sites
    `https://cdn.jsdelivr.net/gh/edent/SuperTinyIcons/images/svg/${cleanDomain}.svg`,
    // Simple Icons (SVG icons for popular brands)
    `https://cdn.simpleicons.org/${cleanDomain}`,
    // Direct favicon attempt
    `https://${domain}/favicon.ico`,
    // Google's high-quality fallback
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    // Google's standard fallback
    `https://www.google.com/s2/favicons?domain=${domain}`
  ];
}

function setupIconWithFallbacks(imgElement, url, altText = 'icon') {
  const icons = getHighQualityIcon(url);
  let currentIconIndex = 0;

  imgElement.alt = altText;
  imgElement.onerror = function() {
    currentIconIndex++;
    if (currentIconIndex < icons.length) {
      this.src = icons[currentIconIndex];
    }
  };
  imgElement.src = icons[currentIconIndex];
}

function formatProviderName(domain) {
  return domain
    .split('.')[0]
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getFaviconUrl(domain) {
  return getHighQualityIcon(`https://${domain}`)[0];
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
function getApps() {
  const defaultApps = [
    { name: 'Gmail', url: 'https://mail.google.com' },
    { name: 'YouTube', url: 'https://youtube.com' }
  ];
  const saved = localStorage.getItem('apps');
  return saved ? JSON.parse(saved) : defaultApps;
}

function saveApps(apps) {
  localStorage.setItem('apps', JSON.stringify(apps));
}

function initializeAppsManager() {
  const appsList = document.getElementById('apps-list-settings');
  const addButton = document.getElementById('add-app');
  const urlInput = document.getElementById('app-url');
  const nameInput = document.getElementById('app-name');
  const iconInput = document.getElementById('app-icon');
  let apps = getApps();

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

  function updateAppsList() {
    appsList.innerHTML = '';
    apps.forEach((app, index) => {
      const item = document.createElement('div');
      item.className = 'provider-item';
      
      const icon = document.createElement('img');
      setupIconWithFallbacks(icon, app.url, app.name);
      
      const name = document.createElement('span');
      name.className = 'provider-name';
      name.textContent = app.name;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-provider';
      removeBtn.textContent = '×';
      removeBtn.onclick = () => {
        apps = apps.filter((_, i) => i !== index);
        saveApps(apps);
        updateAppsList();
        loadApps();
      };
      
      item.appendChild(icon);
      item.appendChild(name);
      item.appendChild(removeBtn);
      appsList.appendChild(item);
    });
  }
  
  addButton.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const icon = iconInput.value.trim();
    
    if (url) {
      const domain = getDomainFromUrl(url);
      apps.push({ 
        name: name || formatProviderName(domain),
        url: url,
        icon: icon || getFaviconUrl(domain)
      });
      saveApps(apps);
      updateAppsList();
      loadApps();
      
      // Clear inputs
      nameInput.value = '';
      urlInput.value = '';
      iconInput.value = '';
    }
  });
  
  updateAppsList();
}

function loadApps() {
  const appsList = document.getElementById('apps-list');
  const apps = getApps();
  appsList.innerHTML = '';
  apps.forEach(app => {
    const button = document.createElement('a');
    button.href = app.url;
    button.className = 'app-btn';
    
    const icon = document.createElement('img');
    if (app.icon) {
      setupIconWithFallbacks(icon, app.url, `${app.name} icon`, [app.icon]);
    } else {
      setupIconWithFallbacks(icon, app.url, `${app.name} icon`);
    }
    
    const name = document.createElement('span');
    name.textContent = app.name;
    
    button.appendChild(icon);
    button.appendChild(name);
    appsList.appendChild(button);
  });
}

// Favorites
function loadFavorites() {
  const bookmarksCount = parseInt(localStorage.getItem('bookmarksCount'));
  const bookmarksList = document.getElementById('bookmarks-list');
  const bookmarksSection = document.querySelector('.bookmarks');
  const isVisible = localStorage.getItem('bookmarks-visible') !== 'false';
  
  // Clear existing content safely
  renderSafeHTML(bookmarksList, []);
  
  // Keep section hidden if toggle is off, regardless of count
  if (!isVisible) {
    bookmarksSection.style.display = 'none';
    return;
  }
  
  // Handle count = 0 case
  if (bookmarksCount === 0) {
    bookmarksSection.style.display = 'none';
    return;
  }
  
  bookmarksSection.style.display = '';
  const maxResults = bookmarksCount || CONFIG.DEFAULTS.BOOKMARKS_COUNT;
  
  getRecentBookmarks(maxResults).then(recentBookmarks => {
    const bookmarksToShow = recentBookmarks.slice(0, maxResults);
    
    if (bookmarksToShow.length > 0) {
      const bookmarkElements = bookmarksToShow.map(bookmark => {
        const button = createSafeElement('a', {
          href: bookmark.url,
          class: 'app-btn'
        });
        
        const favicon = createSafeElement('img');
        // Handle browser-specific URLs
        const isInternalUrl = /^(chrome|brave|edge|firefox):/.test(bookmark.url);
        if (isInternalUrl) {
          // Use a generic icon for internal browser pages
          favicon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9lLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsaW5lIHgxPSIyIiB5MT0iMTIiIHgyPSIyMiIgeTI9IjEyIj48L2xpbmU+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTAgMTUuMyAxNS4zIDAgMCAxIDQtMTB6Ij48L3BhdGg+PC9zdmc+';
        } else {
          setupIconWithFallbacks(favicon, bookmark.url, `${bookmark.title} icon`);
        }
        
        const name = createSafeElement('span', {}, bookmark.title);
        
        button.appendChild(favicon);
        button.appendChild(name);
        
        // For internal URLs, prevent default and use createTab
        if (isInternalUrl) {
          button.addEventListener('click', (e) => {
            e.preventDefault();
            createTab(bookmark.url);
          });
        }
        
        return button;
      });
      renderSafeHTML(bookmarksList, bookmarkElements);
    } else {
      bookmarksList.innerHTML = '<p>No bookmarks found</p>';
    }
  }).catch(() => {
    bookmarksList.innerHTML = '<div class="no-bookmarks">Please enable bookmarks permission in extension settings</div>';
  });
}

function addBookmarkElement(bookmark, container) {
  const button = createSafeElement('a', {
    href: bookmark.url,
    class: 'app-btn'
  });
  
  const favicon = createSafeElement('img');
  // Handle browser-specific URLs
  const isInternalUrl = /^(chrome|brave|edge|firefox):/.test(bookmark.url);
  if (isInternalUrl) {
    // Use a generic icon for internal browser pages
    favicon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9lLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsaW5lIHgxPSIyIiB5MT0iMTIiIHgyPSIyMiIgeTI9IjEyIj48L2xpbmU+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTAgMTUuMyAxNS4zIDAgMCAxIDQtMTB6Ij48L3BhdGg+PC9zdmc+';
  } else {
    setupIconWithFallbacks(favicon, bookmark.url, `${bookmark.title} icon`);
  }
  
  const name = createSafeElement('span', {}, bookmark.title);
  
  button.appendChild(favicon);
  button.appendChild(name);
  
  // For internal URLs, prevent default and use createTab
  if (isInternalUrl) {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      createTab(bookmark.url);
    });
  }
  
  container.appendChild(button);
}

// Browsing History
function loadHistory() {
  const historyCount = parseInt(localStorage.getItem('historyCount'));
  const historySection = document.querySelector('.history');
  const historyList = document.getElementById('history-list');
  const isVisible = localStorage.getItem('history-visible') !== 'false';
  
  // Keep section hidden if toggle is off, regardless of count
  if (!isVisible) {
    historySection.style.display = 'none';
    return;
  }
  
  // Hide section and return if count is explicitly 0
  if (historyCount === 0) {
    historySection.style.display = 'none';
    return;
  }
  
  historySection.style.display = '';
  const maxResults = historyCount || CONFIG.DEFAULTS.HISTORY_COUNT;
  
  getRecentHistory('', maxResults).then(historyItems => {
    const historyElements = historyItems.map(item => {
      if (!item.url) return null;
      
      const button = createSafeElement('a', {
        href: item.url,
        class: 'history-btn'
      });
      
      const favicon = createSafeElement('img');
      setupIconWithFallbacks(favicon, item.url);
      
      const name = createSafeElement('span', {}, 
        item.title || item.url.split('/')[2] || item.url
      );
      
      button.appendChild(favicon);
      button.appendChild(name);
      return button;
    }).filter(Boolean);
    
    renderSafeHTML(historyList, historyElements);
  }).catch(() => {
    const errorMessage = createSafeElement('p', {}, 'History not available');
    renderSafeHTML(historyList, [errorMessage]);
  });
}

function initializeHistoryCount() {
  const countSelect = document.getElementById('history-count');
  const storedCount = localStorage.getItem('historyCount');
  // Changed this line to properly handle zero value
  let historyCount = storedCount !== null ? parseInt(storedCount) : CONFIG.DEFAULTS.HISTORY_COUNT;
  
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
  const savedTheme = localStorage.getItem('theme') || CONFIG.DEFAULTS.THEME;
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
    const currentTheme = localStorage.getItem('theme') || CONFIG.DEFAULTS.THEME;
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
  let currentPreview = null;
  let savedBackground = localStorage.getItem('backgroundImage');
  
  function setBackgroundImage(url, save = true) {
    document.body.style.backgroundImage = url ? `url(${url})` : '';
    document.body.classList.toggle('has-bg', !!url);
    if (save) {
      if (url) {
        localStorage.setItem('backgroundImage', url);
      } else {
        localStorage.removeItem('backgroundImage');
      }
      savedBackground = url;
    }
  }

  function updatePreview(url) {
    preview.style.backgroundImage = url ? `url(${url})` : '';
    currentPreview = url;
  }

  // Settings button click - store current background
  document.getElementById('settings-btn').addEventListener('click', () => {
    modal.style.display = 'block';
    updatePreview(savedBackground);
  });

  // Cancel button handler
  document.getElementById('cancel-bg').addEventListener('click', () => {
    updatePreview(savedBackground);
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
  document.getElementById('bg-url').addEventListener('input', debounce((e) => {
    const url = e.target.value.trim();
    if (url) {
      // Create a temporary image to verify the URL works
      const img = new Image();
      img.onload = () => updatePreview(url);
      img.onerror = () => console.log('Invalid image URL');
      img.src = url;
    }
  }, 500)); // Debounce by 500ms to avoid too many preview attempts

  // Apply button
  document.getElementById('apply').addEventListener('click', () => {
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

  // Close button handler
  document.getElementById('close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  // Load saved background
  if (savedBackground) {
    setBackgroundImage(savedBackground, false);
    updatePreview(savedBackground);
  }
}

// Add weather toggle functionality
function initializeWeatherToggle() {
  const displaySelect = document.getElementById('weather');
  const textView = document.getElementById('weather-info');
  const iconView = document.getElementById('weather-icon-view');
  
  let displayMode = localStorage.getItem('weatherDisplayMode') || CONFIG.WEATHER.DEFAULT_MODE;
  displaySelect.value = displayMode;
  
  function updateWeatherView() {
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

// Add debounce function at the top of your file
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add function to manage header visibility
function initializeHeaderVisibility() {
  const visibilitySelect = document.getElementById('headers-visibility');
  const container = document.querySelector('.container');
  
  function updateHeaderVisibility(shouldHide) {
    container.classList.toggle('hide-headers', shouldHide);
    localStorage.setItem('hideHeaders', shouldHide);
  }
  
  // Load saved preference
  const hideHeaders = localStorage.getItem('hideHeaders') === 'true';
  visibilitySelect.value = hideHeaders ? 'hide' : 'show';
  updateHeaderVisibility(hideHeaders);
  
  // Handle changes
  visibilitySelect.addEventListener('change', () => {
    const shouldHide = visibilitySelect.value === 'hide';
    updateHeaderVisibility(shouldHide);
  });
}

// Add function to manage section toggles
function initializeSectionToggles() {
  const sections = {
    'weather': {
      section: document.querySelector('.weather'),
      toggle: document.getElementById('weather-toggle'),
      key: 'weather-visible',
      onHide: () => {
        document.getElementById('weather').value = 'hidden';
      },
      onShow: () => {
        const select = document.getElementById('weather');
        if (select.value === 'hidden') {
          select.value = 'text';
        }
      }
    },
    'bookmarks': {
      section: document.querySelector('.bookmarks'),
      toggle: document.getElementById('bookmarks-toggle'),
      key: 'bookmarks-visible',
      countSelect: document.getElementById('bookmarks-count'),
      onHide: () => loadFavorites(),
      onShow: () => loadFavorites()
    },
    'search': {
      section: document.getElementById('search-container'),
      toggle: document.getElementById('search-toggle'),
      key: 'search-visible'
    },
    'apps': {
      section: document.querySelector('.apps'),
      toggle: document.getElementById('apps-toggle'),
      key: 'apps-visible'
    },
    'history': {
      section: document.querySelector('.history'),
      toggle: document.getElementById('history-toggle'),
      key: 'history-visible',
      countSelect: document.getElementById('history-count'),
      onHide: () => loadHistory(),
      onShow: () => loadHistory()
    }
  };

  // Initialize each section
  Object.entries(sections).forEach(([name, config]) => {
    if (!config.toggle || !config.section) return;

    const panelElement = document.querySelector(`.bg-section[data-order="${config.toggle.closest('.bg-section').getAttribute('data-order')}"]`);
    
    // Load saved state
    const isVisible = localStorage.getItem(config.key) !== 'false';
    config.toggle.checked = isVisible;
    
    // Set initial visibility
    config.section.style.display = isVisible ? '' : 'none';
    config.section.classList.toggle('section-hidden', !isVisible);
    if (panelElement) {
      panelElement.classList.toggle('section-hidden', !isVisible);
    }
    
    // Add toggle listener
    config.toggle.addEventListener('change', (e) => {
      const isVisible = e.target.checked;
      config.section.style.display = isVisible ? '' : 'none';
      config.section.classList.toggle('section-hidden', !isVisible);
      if (panelElement) {
        panelElement.classList.toggle('section-hidden', !isVisible);
      }
      localStorage.setItem(config.key, isVisible);
      
      if (isVisible) {
        // When showing, assign the next available order number
        const visibleCount = Object.values(sections)
          .filter(section => !section.classList.contains('section-hidden')).length;
        sections[name].style.order = visibleCount;
      }
      
      // Call visibility callbacks if defined
      if (!isVisible && config.onHide) {
        config.onHide();
      } else if (isVisible && config.onShow) {
        config.onShow();
      }
      
      // Update order after visibility change
      updateInputsToMatchOrder();
    });
  });
}

// Add function to manage section order
function initializeSectionOrder() {
  const sections = {
    'weather': document.querySelector('.weather'),
    'bookmarks': document.querySelector('.bookmarks'),
    'search': document.getElementById('search-container'),
    'apps': document.querySelector('.apps'),
    'history': document.querySelector('.history')
  };
  
  const orderInputs = {
    'weather': document.getElementById('weather-order'),
    'bookmarks': document.getElementById('bookmarks-order'),
    'search': document.getElementById('search-order'),
    'apps': document.getElementById('apps-order'),
    'history': document.getElementById('history-order')
  };

  function updateInputsToMatchOrder() {
    // Get all visible sections and sort by current order
    const visibleSections = Object.entries(sections)
      .filter(([_, section]) => !section.classList.contains('section-hidden'))
      .map(([key, section]) => ({
        key,
        order: parseInt(section.style.order || 1)
      }))
      .sort((a, b) => a.order - b.order);

    // Store current orders before reassignment
    const previousOrders = {};
    visibleSections.forEach(section => {
      previousOrders[section.key] = parseInt(sections[section.key].style.order || 1);
    });

    // Assign consecutive numbers starting from 1
    visibleSections.forEach((section, index) => {
      const newOrder = index + 1;
      sections[section.key].style.order = newOrder;
      orderInputs[section.key].value = newOrder;
      document.documentElement.style.setProperty(`--${section.key}-order`, newOrder);
      
      // Update panel data-order if order changed
      if (previousOrders[section.key] !== newOrder) {
        const panel = document.querySelector(`.right-panels .bg-section[data-order="${previousOrders[section.key]}"]`);
        if (panel) {
          panel.setAttribute('data-order', newOrder);
        }
      }
      
      localStorage.setItem(`${section.key}-order`, newOrder);
    });
  }

  // Helper to find section by order
  function getSectionAtOrder(targetOrder) {
    return Object.entries(sections).find(([key, section]) => {
      if (section.classList.contains('section-hidden')) return false;
      return parseInt(section.style.order || 1) === targetOrder;
    })?.[0];
  }

  function handleOrderChange(key, newOrder) {
    const section = sections[key];
    if (section.classList.contains('section-hidden')) return;
  
    const currentOrder = parseInt(section.style.order || 1);
    const swapKey = getSectionAtOrder(newOrder);
  
    // Update main section order
    if (swapKey && swapKey !== key) {
      sections[swapKey].style.order = currentOrder;
      document.documentElement.style.setProperty(`--${swapKey}-order`, currentOrder);
      section.style.order = newOrder;
      document.documentElement.style.setProperty(`--${key}-order`, newOrder);
      
      // Update settings panel order
      const swapPanel = document.querySelector(`.right-panels .bg-section[data-order="${newOrder}"]`);
      const currentPanel = document.querySelector(`.right-panels .bg-section[data-order="${currentOrder}"]`);
      if (swapPanel && currentPanel) {
        swapPanel.setAttribute('data-order', currentOrder);
        currentPanel.setAttribute('data-order', newOrder);
      }
    } else {
      section.style.order = newOrder;
      document.documentElement.style.setProperty(`--${key}-order`, newOrder);
    }
  
    // Save the orders
    localStorage.setItem(`${key}-order`, newOrder);
    if (swapKey) {
      localStorage.setItem(`${swapKey}-order`, currentOrder);
    }
  
    // Update all input values to match new order
    updateInputsToMatchOrder();
  }

  // Load saved orders
  Object.keys(sections).forEach(key => {
    const savedOrder = localStorage.getItem(`${key}-order`);
    if (savedOrder) {
      sections[key].style.order = savedOrder;
    }
  });

  // Initialize order numbers
  updateInputsToMatchOrder();

  // Add change listeners
  Object.keys(orderInputs).forEach(key => {
    orderInputs[key].addEventListener('change', (e) => {
      const newOrder = parseInt(e.target.value);
      if (newOrder > 0 && newOrder <= Object.keys(sections).length) {
        handleOrderChange(key, newOrder);
      } else {
        // Reset to current actual position if invalid number
        updateInputsToMatchOrder();
      }
    });
  });

  // Listen for section visibility changes
  const observer = new MutationObserver((mutations) => {
    if (mutations.some(m => m.attributeName === 'class')) {
      updateInputsToMatchOrder();
    }
  });

  // Start observing each section
  Object.values(sections).forEach(section => {
    observer.observe(section, { attributes: true });
  });
}

// Initialize
function initialize() {
  const features = [
    { fn: initializeTheme, id: 'theme' },
    { fn: initializeSearchProvider, id: 'search' },
    { fn: getWeather, id: 'weather' },
    { fn: loadApps, id: 'apps' },
    { fn: loadHistory, id: 'history' },
    { fn: initializeBackgroundImage, id: 'background' },
    { fn: initializeWeatherToggle, id: 'weather-toggle' },
    { fn: initializeHistoryCount, id: 'history-count' },
    { fn: initializeSearchProviderManager, id: 'search-manager' },
    { fn: initializeBookmarksCount, id: 'bookmarks' },
    { fn: initializeHeaderVisibility, id: 'headers' },
    { fn: initializeAppsManager, id: 'apps-manager' },
    { fn: initializeSectionToggles, id: 'sections' },
    { fn: initializeSectionOrder, id: 'order' },
    { fn: initializeColorPickers, id: 'colors' },
    { fn: loadSavedOrders, id: 'saved-orders' },
    { fn: initializeSpacing, id: 'spacing' }
  ];

  features.forEach(({ fn, id }) => {
    try {
      fn();
      console.log(`Initialized ${id}`);
    } catch (error) {
      console.error(`Failed to initialize ${id}:`, error);
    }
  });
}

document.addEventListener('DOMContentLoaded', initialize);

function initializeBookmarksCount() {
  const countSelect = document.getElementById('bookmarks-count');
  const storedCount = localStorage.getItem('bookmarksCount');
  // Changed to properly handle zero value, similar to history count
  let bookmarksCount = storedCount !== null ? parseInt(storedCount) : CONFIG.DEFAULTS.BOOKMARKS_COUNT;
  
  // Set initial value
  countSelect.value = bookmarksCount.toString();
  loadFavorites();
  
  countSelect.addEventListener('change', () => {
    bookmarksCount = parseInt(countSelect.value);
    localStorage.setItem('bookmarksCount', bookmarksCount);
    loadFavorites();
  });
}

// Add button style handling
document.getElementById('button-style').addEventListener('change', (e) => {
  const style = e.target.value;
  localStorage.setItem('buttonStyle', style);
  document.documentElement.classList.remove('square-buttons', 'nobox-buttons');
  if (style !== 'squircle') {
    document.documentElement.classList.add(`${style}-buttons`);
  }
});

// Update initialization code
const buttonStyle = localStorage.getItem('buttonStyle') || CONFIG.DEFAULTS.BUTTON_STYLE;
document.getElementById('button-style').value = buttonStyle;
if (buttonStyle !== 'squircle') {
  document.documentElement.classList.add(`${buttonStyle}-buttons`);
}

// Add color picker functionality
function initializeColorPickers() {
  const boxColorPicker = document.getElementById('box-color');
  const fontColorPicker = document.getElementById('font-color');
  const resetBoxColor = document.getElementById('reset-box-color');
  const resetFontColor = document.getElementById('reset-font-color');

  // Load saved colors or use defaults
  const savedBoxColor = localStorage.getItem('customBoxColor');
  const savedFontColor = localStorage.getItem('customFontColor');

  if (savedBoxColor) {
    document.documentElement.style.setProperty('--custom-box-color', savedBoxColor);
    boxColorPicker.value = savedBoxColor;
  }

  if (savedFontColor) {
    document.documentElement.style.setProperty('--custom-font-color', savedFontColor);
    fontColorPicker.value = savedFontColor;
  }

  // Box color picker
  boxColorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    document.documentElement.style.setProperty('--custom-box-color', color);
    localStorage.setItem('customBoxColor', color);
  });

  // Font color picker
  fontColorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    document.documentElement.style.setProperty('--custom-font-color', color);
    localStorage.setItem('customFontColor', color);
  });

  // Reset buttons
  resetBoxColor.addEventListener('click', () => {
    localStorage.removeItem('customBoxColor');
    document.documentElement.style.removeProperty('--custom-box-color');
    boxColorPicker.value = getComputedStyle(document.documentElement).getPropertyValue('--button-bg');
  });

  resetFontColor.addEventListener('click', () => {
    localStorage.removeItem('customFontColor');
    document.documentElement.style.removeProperty('--custom-font-color');
    fontColorPicker.value = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
  });
}

function loadSavedOrders() {
  Object.keys(sections).forEach(key => {
    const savedOrder = localStorage.getItem(`${key}-order`);
    if (savedOrder) {
      const order = parseInt(savedOrder);
      sections[key].style.order = order;
      document.documentElement.style.setProperty(`--${key}-order`, order);
    }
  });
}

function initializeSpacing() {
  const spacingSelect = document.getElementById('section-spacing');
  const savedSpacing = localStorage.getItem('section-spacing') || '1vh';
  
  spacingSelect.value = savedSpacing;
  document.documentElement.style.setProperty('--section-spacing', savedSpacing);
  
  spacingSelect.addEventListener('change', (e) => {
    const spacing = e.target.value;
    document.documentElement.style.setProperty('--section-spacing', spacing);
    localStorage.setItem('section-spacing', spacing);
  });
}

// Safely create and append elements
function createSafeElement(tag, attributes = {}, textContent = '') {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key.startsWith('on')) continue; // Skip event handlers
    element.setAttribute(key, value);
  }
  if (textContent) {
    element.textContent = textContent;
  }
  return element;
}

// Cross-browser bookmarks function
async function getRecentBookmarks(count = 8) {
  try {
    if (chrome.bookmarks && chrome.bookmarks.getRecent) {
      return await chrome.bookmarks.getRecent(count);
    } else if (browser && browser.bookmarks && browser.bookmarks.getRecent) {
      return await browser.bookmarks.getRecent(count);
    } else {
      console.warn('Bookmarks API not available');
      return [];
    }
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }
}

// Cross-browser history function
async function getRecentHistory(query = '', maxResults = 8) {
  try {
    if (chrome.history && chrome.history.search) {
      return await chrome.history.search({
        text: query,
        maxResults: maxResults,
        startTime: 0
      });
    } else if (browser && browser.history && browser.history.search) {
      return await browser.history.search({
        text: query,
        maxResults: maxResults,
        startTime: 0
      });
    } else {
      console.warn('History API not available');
      return [];
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

// Cross-browser tabs function
async function createTab(url) {
  try {
    if (chrome.tabs && chrome.tabs.create) {
      return await chrome.tabs.create({ url });
    } else if (browser && browser.tabs && browser.tabs.create) {
      return await browser.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('Error creating tab:', error);
    window.open(url, '_blank');
  }
}

// Safe HTML rendering function
function renderSafeHTML(container, elements) {
  container.innerHTML = ''; // Clear existing content
  elements.forEach(element => {
    if (element instanceof HTMLElement) {
      container.appendChild(element);
    }
  });
}