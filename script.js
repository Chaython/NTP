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
  
  // Clear existing content
  bookmarksList.innerHTML = '';
  
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
  const maxResults = bookmarksCount || 8;
  
  if (chrome?.bookmarks?.getRecent) {
    chrome.bookmarks.getRecent(maxResults, (recentBookmarks) => {
      const bookmarksToShow = recentBookmarks.slice(0, maxResults);
      
      if (bookmarksToShow.length > 0) {
        bookmarksToShow.forEach(bookmark => addBookmarkElement(bookmark, bookmarksList));
      } else {
        bookmarksList.innerHTML = '<p>No bookmarks found</p>';
      }
    });
  } else {
    bookmarksList.innerHTML = '<div class="no-bookmarks">Please enable bookmarks permission in extension settings</div>';
  }
}

function addBookmarkElement(bookmark, container) {
  const button = document.createElement('a');
  button.href = bookmark.url;
  button.className = 'app-btn';
  
  const favicon = document.createElement('img');
  // Handle browser-specific URLs
  const isInternalUrl = /^(chrome|brave|edge|firefox):/.test(bookmark.url);
  if (isInternalUrl) {
    // Use a generic icon for internal browser pages
    favicon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9lLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiPjwvY2lyY2xlPjxsaW5lIHgxPSIyIiB5MT0iMTIiIHgyPSIyMiIgeTI9IjEyIj48L2xpbmU+PHBhdGggZD0iTTEyIDJhMTUuMyAxNS4zIDAgMCAxIDQgMTAgMTUuMyAxNS4zIDAgMCAxLTQtMTAgMTUuMyAxNS4zIDAgMCAxIDQtMTB6Ij48L3BhdGg+PC9zdmc+';
  } else {
    setupIconWithFallbacks(favicon, bookmark.url, `${bookmark.title} icon`);
  }
  
  const name = document.createElement('span');
  name.textContent = bookmark.title;
  
  button.appendChild(favicon);
  button.appendChild(name);
  
  // For internal URLs, prevent default and use chrome.tabs.create
  if (isInternalUrl) {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome?.tabs?.create) {
        chrome.tabs.create({ url: bookmark.url });
      }
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
  const maxResults = historyCount || 16;
  
  // Check if Chrome API is available
  if (typeof chrome !== 'undefined' && chrome.history) {
    chrome.history.search({ text: '', maxResults }, (historyItems) => {
      historyList.innerHTML = '';
      historyItems.forEach(item => {
        if (item.url) {
          const button = document.createElement('a');
          button.href = item.url;
          button.className = 'history-btn';
          
          const favicon = document.createElement('img');
          setupIconWithFallbacks(favicon, item.url);
          
          const name = document.createElement('span');
          name.textContent = item.title || item.url.split('/')[2] || item.url;
          
          button.appendChild(favicon);
          button.appendChild(name);
          historyList.appendChild(button);
        }
      });
    });
  } else {
    // Fallback for when Chrome API isn't available
    historyList.innerHTML = '<p>History not available</p>';
  }
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

  // Load saved background
  const savedBg = localStorage.getItem('backgroundImage');
  if (savedBg) {
    setBackgroundImage(savedBg, false);
  }
}

// Add weather toggle functionality
function initializeWeatherToggle() {
  const displaySelect = document.getElementById('weather');
  const textView = document.getElementById('weather-info');
  const iconView = document.getElementById('weather-icon-view');
  
  let displayMode = localStorage.getItem('weatherDisplayMode') || 'text';
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

    // Load saved state
    const isVisible = localStorage.getItem(config.key) !== 'false';
    config.toggle.checked = isVisible;
    
    // Set initial visibility
    config.section.style.display = isVisible ? '' : 'none';
    config.section.classList.toggle('section-hidden', !isVisible);
    
    // Add toggle listener
    config.toggle.addEventListener('change', (e) => {
      const isVisible = e.target.checked;
      config.section.style.display = isVisible ? '' : 'none';
      config.section.classList.toggle('section-hidden', !isVisible);
      localStorage.setItem(config.key, isVisible);
      
      // Call visibility callbacks if defined
      if (!isVisible && config.onHide) {
        config.onHide();
      } else if (isVisible && config.onShow) {
        config.onShow();
      }
      
      // Update order after visibility change
      normalizeOrders();
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
    // Get all visible sections and their current order values
    const visibleSections = Object.entries(sections)
      .filter(([_, section]) => !section.classList.contains('section-hidden'))
      .map(([key, section]) => ({
        key,
        order: parseInt(section.style.order || 1)
      }))
      .sort((a, b) => a.order - b.order);

    // Update input values to match actual position
    visibleSections.forEach((section, index) => {
      const newOrder = index + 1;
      orderInputs[section.key].value = newOrder;
      sections[section.key].style.order = newOrder;
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

  // Handle order changes
  function handleOrderChange(key, newOrder) {
    const section = sections[key];
    if (section.classList.contains('section-hidden')) return;

    const currentOrder = parseInt(section.style.order || 1);
    const swapKey = getSectionAtOrder(newOrder);

    if (swapKey && swapKey !== key) {
      // Swap orders
      sections[swapKey].style.order = currentOrder;
      section.style.order = newOrder;
    } else {
      section.style.order = newOrder;
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
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  initializeSearchProvider();
  getWeather();
  loadApps();
  loadHistory();
  initializeBackgroundImage();
  initializeWeatherToggle();
  initializeHistoryCount();
  initializeSearchProviderManager();
  initializeBookmarksCount(); // This will call loadFavorites
  initializeHeaderVisibility();
  initializeAppsManager();
  initializeSectionToggles();
  initializeSectionOrder();
});

function initializeBookmarksCount() {
  const countSelect = document.getElementById('bookmarks-count');
  const storedCount = localStorage.getItem('bookmarksCount');
  // Changed to properly handle zero value, similar to history count
  let bookmarksCount = storedCount !== null ? parseInt(storedCount) : 8;
  
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
const buttonStyle = localStorage.getItem('buttonStyle') || 'squircle';
document.getElementById('button-style').value = buttonStyle;
if (buttonStyle !== 'squircle') {
  document.documentElement.classList.add(`${buttonStyle}-buttons`);
}