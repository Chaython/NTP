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
  const bookmarksCount = parseInt(localStorage.getItem('bookmarksCount'));
  const bookmarksList = document.getElementById('bookmarks-list');
  const bookmarksSection = document.querySelector('.bookmarks');
  
  // Clear existing content and exit if needed
  bookmarksList.innerHTML = '';
  
  if (bookmarksCount === 0) {
    bookmarksSection.style.display = 'none';
    return;
  }
  
  bookmarksSection.style.display = 'block';
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
    favicon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iMiIgeTE9IjEyIiB4Mj0iMjIiIHkyPSIxMiI+PC9saW5lPjxwYXRoIGQ9Ik0xMiAyYTE1LjMgMTUuMyAwIDAgMSA0IDEwIDE1LjMgMTUuMyAwIDAgMS00IDEwIDE1LjMgMTUuMyAwIDAgMSA0LTEweiI+PC9wYXRoPjwvc3ZnPg==';
  } else {
    favicon.src = `https://www.google.com/s2/favicons?domain=${bookmark.url}`;
  }
  favicon.alt = `${bookmark.title} favicon`;
  
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
  
  // Clear any existing display style
  historySection.style.removeProperty('display');
  
  // Hide section and return if count is explicitly 0
  if (historyCount === 0) {
    historySection.style.display = 'none';
    return;
  }
  
  // Use a default of 16 if no count is set
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
          favicon.src = `https://www.google.com/s2/favicons?domain=${item.url}`;
          favicon.alt = 'favicon';
          
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