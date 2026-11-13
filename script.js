const SEARCH_ENGINES = {
  duckduckgo: { label: 'DUCKDUCKGO', url: 'https://duckduckgo.com/?q=' },
  google: { label: 'GOOGLE', url: 'https://www.google.com/search?q=' },
  bing: { label: 'BING', url: 'https://www.bing.com/search?q=' }
};
const SEARCH_ENGINE_STORAGE_KEY = 'coreSearchEngine';
const BROWSER_PROFILE_STORAGE_KEY = 'coreSearchBrowserProfile';
const BOOKMARKS_STORAGE_KEY = 'coreSearchBookmarks';
const THEME_COLOR_STORAGE_KEY = 'coreSearchThemeColor';
const APPEARANCE_STORAGE_KEY = 'coreSearchAppearance';
const PANIC_KEY_STORAGE_KEY = 'coreSearchPanicKey';
const PANIC_URL_STORAGE_KEY = 'coreSearchPanicUrl';
const DEFAULT_THEME_COLOR = '#61f99b';
const BROWSER_PROFILES = {
  chrome: { requestTimeout: 8000, retryInterval: 2000, startupTimeout: 90000 },
  safari: { requestTimeout: 15000, retryInterval: 4000, startupTimeout: 90000 },
  firefox: { requestTimeout: 10000, retryInterval: 3000, startupTimeout: 75000 },
  edge: { requestTimeout: 8000, retryInterval: 2000, startupTimeout: 90000 },
  other: { requestTimeout: 10000, retryInterval: 3000, startupTimeout: 90000 }
};

function normalizePanicKey(key) {
  return key === ' ' ? 'space' : key.toLowerCase();
}

let isCapturingPanicKey = false;

function resolveAppearance(preference) {
  if (preference === 'light' || preference === 'dark') return preference;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(color, appearance) {
  const normalizedColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_THEME_COLOR;
  document.documentElement.style.setProperty('--theme-accent', normalizedColor);
  document.documentElement.dataset.appearance = resolveAppearance(appearance);
}

function getSavedThemeColor() {
  const savedColor = localStorage.getItem(THEME_COLOR_STORAGE_KEY);
  return savedColor && /^#[0-9a-fA-F]{6}$/.test(savedColor) ? savedColor : DEFAULT_THEME_COLOR;
}

function getSavedAppearance() {
  const appearance = localStorage.getItem(APPEARANCE_STORAGE_KEY);
  return ['dark', 'light', 'system'].includes(appearance) ? appearance : 'dark';
}

function updateThemeSwatches(color) {
  document.querySelectorAll('.theme-swatch').forEach((swatch) => {
    swatch.setAttribute('aria-pressed', String(swatch.dataset.color === color.toLowerCase()));
  });
}

async function updateRepositoryFooter() {
  const commitTime = document.querySelector('[data-repository-commit-time]');
  const commitLink = document.querySelector('[data-repository-commit]');
  if (!commitTime || !commitLink) return;

  try {
    const response = await fetch(
      'https://api.github.com/repos/four-4444z/four-4444z.github.io/commits?per_page=1',
      { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' }
    );
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
    const [latestCommit] = await response.json();
    const sha = latestCommit?.sha;
    const committedAt = latestCommit?.commit?.committer?.date;
    const commitUrl = latestCommit?.html_url;
    const timestamp = new Date(committedAt);
    if (
      typeof sha !== 'string' ||
      !/^[a-f0-9]{40}$/i.test(sha) ||
      !Number.isFinite(timestamp.getTime()) ||
      typeof commitUrl !== 'string' ||
      !commitUrl.startsWith('https://github.com/four-4444z/four-4444z.github.io/commit/')
    ) {
      throw new Error('GitHub returned invalid latest-commit data.');
    }

    commitTime.dateTime = timestamp.toISOString();
    commitTime.textContent = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(timestamp);
    commitLink.href = commitUrl;
    commitLink.textContent = sha.slice(0, 7);
    commitLink.title = `View commit ${sha}`;
  } catch (error) {
    commitTime.textContent = 'Commit status unavailable';
    commitLink.textContent = 'Retrying';
    commitLink.title = error.message;
  } finally {
    window.setTimeout(updateRepositoryFooter, 60000);
  }
}

void updateRepositoryFooter();

applyTheme(getSavedThemeColor(), getSavedAppearance());
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (getSavedAppearance() === 'system') applyTheme(getSavedThemeColor(), 'system');
});

const searchSettingsForm = document.getElementById('search-settings-form');
if (searchSettingsForm) {
  const engineSelect = document.getElementById('search-engine');
  const browserProfileSelect = document.getElementById('browser-profile');
  const hexInput = document.getElementById('theme-hex');
  const colorPicker = document.getElementById('theme-color-picker');
  const panicUrlInput = document.getElementById('panic-url');
  const panicKeyInput = document.getElementById('panic-key');
  const panicCaptureButton = document.getElementById('panic-capture');
  const panicClearButton = document.getElementById('panic-clear');
  const panicCaptureStatus = document.getElementById('panic-capture-status');
  const settingsFeedback = document.getElementById('settings-feedback');
  const savedColor = getSavedThemeColor();
  engineSelect.value = getSearchEngine();
  browserProfileSelect.value = getBrowserProfile();
  browserProfileSelect.addEventListener('change', () => {
    localStorage.setItem(BROWSER_PROFILE_STORAGE_KEY, browserProfileSelect.value);
    settingsFeedback.textContent = 'Browser preference saved.';
  });
  hexInput.value = savedColor;
  colorPicker.value = savedColor;
  panicUrlInput.value = localStorage.getItem(PANIC_URL_STORAGE_KEY) || '';
  panicKeyInput.value = localStorage.getItem(PANIC_KEY_STORAGE_KEY) || '';
  document.querySelector(`input[name="appearance"][value="${getSavedAppearance()}"]`).checked = true;
  updateThemeSwatches(savedColor);

  document.querySelectorAll('.theme-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      hexInput.value = swatch.dataset.color;
      colorPicker.value = swatch.dataset.color;
      updateThemeSwatches(swatch.dataset.color);
      hexInput.setCustomValidity('');
    });
  });

  colorPicker.addEventListener('input', () => {
    hexInput.value = colorPicker.value;
    updateThemeSwatches(colorPicker.value);
    hexInput.setCustomValidity('');
  });

  hexInput.addEventListener('input', () => {
    const color = hexInput.value.trim();
    hexInput.setCustomValidity(/^#[0-9a-fA-F]{6}$/.test(color) ? '' : 'Enter a hex color like #61f99b.');
    if (/^#[0-9a-fA-F]{6}$/.test(color)) {
      colorPicker.value = color;
      updateThemeSwatches(color);
    } else {
      updateThemeSwatches('');
    }
  });

  panicCaptureButton.addEventListener('click', () => {
    isCapturingPanicKey = !isCapturingPanicKey;
    panicCaptureButton.textContent = isCapturingPanicKey ? 'CANCEL' : 'SET KEY';
    panicCaptureStatus.textContent = isCapturingPanicKey
      ? 'Press one unmodified key to use as your shortcut.'
      : 'Key capture cancelled.';
  });

  panicClearButton.addEventListener('click', () => {
    panicKeyInput.value = '';
    isCapturingPanicKey = false;
    panicCaptureButton.textContent = 'SET KEY';
    panicCaptureStatus.textContent = 'Panic key cleared. Save settings to confirm.';
  });

  panicUrlInput.addEventListener('input', () => panicUrlInput.setCustomValidity(''));

  searchSettingsForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const color = hexInput.value.trim().toLowerCase();
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
      hexInput.setCustomValidity('Enter a hex color like #61f99b.');
      hexInput.reportValidity();
      return;
    }

    if (!Object.hasOwn(SEARCH_ENGINES, engineSelect.value)) {
      settingsFeedback.textContent = 'Choose a valid search engine.';
      return;
    }
    if (!Object.hasOwn(BROWSER_PROFILES, browserProfileSelect.value)) {
      settingsFeedback.textContent = 'Choose a valid browser profile.';
      return;
    }
    const appearance = searchSettingsForm.elements.appearance.value;
    if (!['dark', 'light', 'system'].includes(appearance)) {
      settingsFeedback.textContent = 'Choose a valid appearance.';
      return;
    }

    let panicUrl = panicUrlInput.value.trim();
    if (panicUrl) {
      try {
        const parsedUrl = new URL(panicUrl.includes('://') ? panicUrl : `https://${panicUrl}`);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error();
        panicUrl = parsedUrl.href;
      } catch {
        panicUrlInput.setCustomValidity('Enter a valid HTTP or HTTPS destination.');
        panicUrlInput.reportValidity();
        return;
      }
    }

    const panicKey = panicKeyInput.value;
    if (panicKey && panicKey.length !== 1 && !/^F(?:[1-9]|1[0-2])$/.test(panicKey)) {
      panicCaptureStatus.textContent = 'Choose a printable key or function key F1–F12.';
      return;
    }

    localStorage.setItem(SEARCH_ENGINE_STORAGE_KEY, engineSelect.value);
    localStorage.setItem(BROWSER_PROFILE_STORAGE_KEY, browserProfileSelect.value);
    localStorage.setItem(THEME_COLOR_STORAGE_KEY, color);
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
    localStorage.setItem(PANIC_KEY_STORAGE_KEY, panicKey);
    localStorage.setItem(PANIC_URL_STORAGE_KEY, panicUrl);
    applyTheme(color, appearance);
    updateThemeSwatches(color);
    panicUrlInput.value = panicUrl;
    settingsFeedback.textContent = 'SETTINGS SAVED.';
  });
}

window.addEventListener('keydown', (event) => {
  if (isCapturingPanicKey) {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      isCapturingPanicKey = false;
      const captureButton = document.getElementById('panic-capture');
      const captureStatus = document.getElementById('panic-capture-status');
      if (captureButton) captureButton.textContent = 'SET KEY';
      if (captureStatus) captureStatus.textContent = 'Key capture cancelled.';
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      const captureStatus = document.getElementById('panic-capture-status');
      if (captureStatus) captureStatus.textContent = 'Use a key without Ctrl, Alt, Shift, or Meta.';
      return;
    }
    const capturedKey = event.key === ' ' ? 'Space' : event.key;
    if (capturedKey.length !== 1 && !/^F(?:[1-9]|1[0-2])$/.test(capturedKey)) {
      const captureStatus = document.getElementById('panic-capture-status');
      if (captureStatus) captureStatus.textContent = 'Choose a printable key or function key F1–F12.';
      return;
    }
    const keyInput = document.getElementById('panic-key');
    const captureButton = document.getElementById('panic-capture');
    const captureStatus = document.getElementById('panic-capture-status');
    if (keyInput) keyInput.value = capturedKey;
    isCapturingPanicKey = false;
    if (captureButton) captureButton.textContent = 'SET KEY';
    if (captureStatus) captureStatus.textContent = `Shortcut key set to ${capturedKey}. Save settings to confirm.`;
    return;
  }

  const configuredKey = normalizePanicKey(localStorage.getItem(PANIC_KEY_STORAGE_KEY) || '');
  const eventTarget = event.target;
  const isFormControl = eventTarget instanceof Element && (
    Boolean(eventTarget.closest('input, textarea, select, button')) ||
    (eventTarget.isContentEditable ?? false)
  );
  if (
    !configuredKey ||
    normalizePanicKey(event.key) !== configuredKey ||
    event.repeat ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey ||
    event.shiftKey ||
    event.isComposing ||
    isFormControl
  ) {
    return;
  }

  const savedUrl = localStorage.getItem(PANIC_URL_STORAGE_KEY);
  if (!savedUrl) return;
  event.preventDefault();
  window.open(savedUrl, '_blank', 'noopener,noreferrer');
}, true);

function getSearchEngine() {
  const savedEngine = localStorage.getItem(SEARCH_ENGINE_STORAGE_KEY);
  return SEARCH_ENGINES[savedEngine] ? savedEngine : 'duckduckgo';
}

function getBrowserProfile() {
  const savedProfile = localStorage.getItem(BROWSER_PROFILE_STORAGE_KEY);
  return Object.hasOwn(BROWSER_PROFILES, savedProfile) ? savedProfile : 'other';
}

const searchForm = document.getElementById('search-form');
const activeSearchEngine = document.getElementById('active-search-engine');
if (activeSearchEngine) {
  const engine = SEARCH_ENGINES[getSearchEngine()];
  activeSearchEngine.textContent = engine.label;
}

function resolveSearchDestination(query) {
  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(query);
  const looksLikeAddress = hasScheme || (!/\s/.test(query) && query.includes('.'));
  if (looksLikeAddress) {
    const target = new URL(hasScheme ? query : `https://${query}`);
    if (!['http:', 'https:'].includes(target.protocol)) {
      throw new Error('Only HTTP and HTTPS addresses can be opened.');
    }
    return target.href;
  }

  const engine = SEARCH_ENGINES[getSearchEngine()];
  return `${engine.url}${encodeURIComponent(query)}`;
}

const browserChrome = document.getElementById('dashboard-browser-chrome');
const browserTabsContainer = document.getElementById('dashboard-browser-tabs');
const browserView = document.getElementById('dashboard-browser-view');
const browserAddressForm = document.getElementById('dashboard-browser-address-form');
const browserAddressInput = document.getElementById('dashboard-browser-address');
const browserStatus = document.getElementById('dashboard-browser-status');
const browserBackButton = document.getElementById('dashboard-browser-back');
const browserForwardButton = document.getElementById('dashboard-browser-forward');
const browserRefreshButton = document.getElementById('dashboard-browser-refresh');
const browserOpenTabButton = document.getElementById('dashboard-browser-open-tab');
const clearBrowserTabsButton = document.getElementById('dashboard-browser-clear-tabs');
const browserTabs = [];
let activeBrowserTabId = null;
let nextBrowserTabId = 0;
let scramjetBaseUrl = null;
let scramjetReady;
let scramjetHealthCheck = null;
let scramjetHealthCheckedAt = 0;
const systemCoreApiUrl = (window.SYSTEM_CORE_API_URL || '').replace(/\/+$/, '');
const systemCoreScramjetUrl = window.SYSTEM_CORE_SCRAMJET_URL || '';

function createScramjetEmbedUrl(destination) {
  if (!scramjetBaseUrl) throw new Error('The embedded browser service is unavailable.');
  if (systemCoreScramjetUrl) {
    const embedUrl = new URL('/scramjet-embed.html', window.location.origin);
    embedUrl.searchParams.set('v', '20261101-1');
    const wispUrl = new URL('/wisp/', systemCoreScramjetUrl);
    wispUrl.protocol = wispUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    embedUrl.searchParams.set('url', destination);
    embedUrl.searchParams.set('wisp', wispUrl.href);
    return embedUrl.href;
  }
  return `${scramjetBaseUrl}/embed.html?v=20261101-1&url=${encodeURIComponent(destination)}`;
}

function updateBrowserNavigationControls() {
  const tab = browserTabs.find(({ id }) => id === activeBrowserTabId);
  browserBackButton.disabled = !tab || tab.historyIndex <= 0;
  browserForwardButton.disabled = !tab || tab.historyIndex >= tab.history.length - 1;
  browserRefreshButton.disabled = !tab || tab.historyIndex < 0;
  browserOpenTabButton.disabled = !tab || !tab.url;
}

function setActiveBrowserTab(tab) {
  activeBrowserTabId = tab.id;
  browserTabsContainer.querySelectorAll('[role="tab"]').forEach((button) => {
    const selected = Number(button.dataset.tabId) === tab.id;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  browserAddressInput.value = tab.url || '';
  browserTabs.forEach((browserTab) => {
    if (browserTab.frame) {
      const hidden = browserTab.id !== tab.id || !browserTab.url;
      browserTab.frame.hidden = hidden;
      browserTab.frame.setAttribute('aria-hidden', String(hidden));
    }
  });
  document.body.classList.toggle('is-browsing', Boolean(tab.url));
  if (!tab.url) browserAddressInput.focus();
  updateBrowserNavigationControls();
}

function createBrowserFrame(tab) {
  const frame = document.createElement('iframe');
  frame.className = 'dashboard-browser-frame';
  frame.title = tab.label;
  frame.hidden = true;
  frame.setAttribute('aria-hidden', 'true');
  frame.setAttribute('sandbox', 'allow-downloads allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation');
  frame.referrerPolicy = 'no-referrer';
  tab.frame = frame;
  browserView.appendChild(frame);
  return frame;
}

function renderBrowserTabs() {
  browserTabsContainer.replaceChildren();
  browserTabs.forEach((tab) => {
    const item = document.createElement('div');
    item.className = 'dashboard-browser-tab-item';
    item.setAttribute('role', 'presentation');
    const button = document.createElement('button');
    button.className = 'dashboard-browser-tab';
    button.type = 'button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(tab.id === activeBrowserTabId));
    button.dataset.tabId = String(tab.id);
    button.textContent = tab.label;
    if (tab.id === activeBrowserTabId) button.classList.add('is-active');
    button.addEventListener('click', () => setActiveBrowserTab(tab));
    item.appendChild(button);

    const close = document.createElement('button');
    close.className = 'dashboard-browser-tab-close';
    close.type = 'button';
    close.setAttribute('aria-label', `Close ${tab.label}`);
    close.textContent = '×';
    close.addEventListener('click', () => {
      tab.frame?.remove();
      const index = browserTabs.indexOf(tab);
      if (index !== -1) browserTabs.splice(index, 1);
      if (activeBrowserTabId === tab.id) {
        if (browserTabs.length) setActiveBrowserTab(browserTabs[Math.max(0, index - 1)]);
        else {
          activeBrowserTabId = null;
          document.body.classList.remove('is-browsing');
          browserAddressInput.value = '';
        }
      }
      renderBrowserTabs();
      updateBrowserNavigationControls();
    });
    item.appendChild(close);
    browserTabsContainer.appendChild(item);
  });
}

function addBrowserTab(label = 'New Tab') {
  const tab = { id: nextBrowserTabId++, label, frame: null, url: '', history: [], historyIndex: -1 };
  browserTabs.push(tab);
  createBrowserFrame(tab);
  browserChrome.hidden = false;
  document.body.classList.add('has-browser-controls');
  renderBrowserTabs();
  setActiveBrowserTab(tab);
  return tab;
}

const initialBrowserTab = {
  id: nextBrowserTabId++,
  label: 'New Tab',
  frame: null,
  url: '',
  history: [],
  historyIndex: -1
};
if (browserChrome) {
  browserTabs.push(initialBrowserTab);
  createBrowserFrame(initialBrowserTab);
  activeBrowserTabId = initialBrowserTab.id;
  renderBrowserTabs();
  updateBrowserNavigationControls();
}

clearBrowserTabsButton?.addEventListener('click', () => {
  browserTabs.forEach((tab) => tab.frame?.remove());
  browserTabs.length = 0;
  activeBrowserTabId = null;
  document.body.classList.remove('is-browsing');
  browserAddressInput.value = '';
  browserStatus.textContent = 'All tabs cleared.';
  renderBrowserTabs();
  updateBrowserNavigationControls();
});

async function openWithScramjet(query, tab, historyIndex = null) {
  const destination = resolveSearchDestination(query);
  try {
    browserStatus.textContent = 'Connecting to the embedded browser service...';
    await scramjetReady;
    if (!scramjetBaseUrl) throw new Error('The embedded browser service is unavailable.');
    browserStatus.textContent = 'Waking the embedded browser service if needed...';
    await ensureScramjetServiceReady(scramjetBaseUrl);
    if (!browserTabs.includes(tab)) throw new Error('This browser tab was closed.');
    tab.label = new URL(destination).hostname;
    tab.url = destination;
    tab.sessionUrl = createScramjetEmbedUrl(destination);
    if (historyIndex === null) {
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(destination);
      tab.historyIndex = tab.history.length - 1;
    } else {
      tab.historyIndex = historyIndex;
    }
    tab.frame.title = tab.label;
    tab.frame.src = tab.sessionUrl;
    renderBrowserTabs();
    setActiveBrowserTab(tab);
    updateBrowserNavigationControls();
    browserStatus.textContent = `Opened ${destination} in an embedded browser tab.`;
  } catch (error) {
    browserStatus.textContent = error.message;
    throw error;
  }
}

const bookmarkList = document.getElementById('bookmark-list');
const bookmarkForm = document.getElementById('bookmark-form');
const bookmarkAddButton = document.getElementById('bookmark-add');
const bookmarkFeedback = document.getElementById('bookmark-feedback');

function normalizeBookmarkUrl(value) {
  const input = value.trim();
  const url = new URL(input.includes('://') ? input : `https://${input}`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Bookmarks must use a public HTTP or HTTPS address.');
  }
  return url.href;
}

function getSavedBookmarks() {
  const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
  if (!stored) return [];
  try {
    const bookmarks = JSON.parse(stored);
    if (!Array.isArray(bookmarks)) throw new Error('Saved bookmarks are not a list.');
    return bookmarks.filter((bookmark) =>
      bookmark &&
      typeof bookmark.name === 'string' &&
      bookmark.name.trim().length > 0 &&
      bookmark.name.length <= 32 &&
      typeof bookmark.url === 'string' &&
      bookmark.url.length <= 2048 &&
      (() => {
        try {
          return normalizeBookmarkUrl(bookmark.url) === bookmark.url;
        } catch {
          return false;
        }
      })()
    ).slice(0, 16);
  } catch {
    bookmarkFeedback.textContent = 'Saved bookmarks could not be read. Adding a new bookmark will replace the damaged list.';
    return [];
  }
}

let bookmarks = bookmarkList ? getSavedBookmarks() : [];

function saveBookmarks() {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
    return true;
  } catch {
    bookmarkFeedback.textContent = 'Bookmarks could not be saved in this browser.';
    return false;
  }
}

function renderBookmarks() {
  if (!bookmarkList) return;
  bookmarkList.replaceChildren();
  if (bookmarks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'bookmark-empty';
    empty.textContent = 'Your saved sites will appear here.';
    bookmarkList.appendChild(empty);
    return;
  }

  bookmarks.forEach((bookmark, index) => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';
    const openButton = document.createElement('button');
    openButton.className = 'bookmark-link';
    openButton.type = 'button';
    openButton.textContent = bookmark.name;
    openButton.title = bookmark.url;
    openButton.addEventListener('click', async () => {
      let tab = browserTabs.find(({ id }) => id === activeBrowserTabId);
      if (!tab) tab = addBrowserTab();
      try {
        await openWithScramjet(bookmark.url, tab);
      } catch (error) {
        bookmarkFeedback.textContent = error.message || 'Could not open this bookmark.';
      }
    });

    const removeButton = document.createElement('button');
    removeButton.className = 'bookmark-remove';
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Remove bookmark ${bookmark.name}`);
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => {
      bookmarks.splice(index, 1);
      if (!saveBookmarks()) {
        bookmarks.splice(index, 0, bookmark);
        return;
      }
      renderBookmarks();
      bookmarkFeedback.textContent = `${bookmark.name} removed.`;
    });
    item.append(openButton, removeButton);
    bookmarkList.appendChild(item);
  });
}

bookmarkAddButton?.addEventListener('click', () => {
  const isOpen = !bookmarkForm.hidden;
  bookmarkForm.hidden = isOpen;
  bookmarkAddButton.setAttribute('aria-expanded', String(!isOpen));
  bookmarkFeedback.textContent = '';
  if (!isOpen) document.getElementById('bookmark-name').focus();
});

document.getElementById('bookmark-cancel')?.addEventListener('click', () => {
  bookmarkForm.reset();
  bookmarkForm.hidden = true;
  bookmarkAddButton.setAttribute('aria-expanded', 'false');
  bookmarkFeedback.textContent = '';
});

bookmarkForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(bookmarkForm);
  const name = String(formData.get('name') || '').trim();
  let url;
  try {
    url = normalizeBookmarkUrl(String(formData.get('url') || ''));
  } catch {
    bookmarkFeedback.textContent = 'Enter a valid HTTP or HTTPS website address.';
    return;
  }
  if (!name || name.length > 32) {
    bookmarkFeedback.textContent = 'Enter a bookmark name with up to 32 characters.';
    return;
  }
  if (bookmarks.length >= 16) {
    bookmarkFeedback.textContent = 'You can save up to 16 bookmarks.';
    return;
  }
  if (bookmarks.some((bookmark) => bookmark.url === url)) {
    bookmarkFeedback.textContent = 'That website is already bookmarked.';
    return;
  }

  bookmarks.push({ name, url });
  if (!saveBookmarks()) {
    bookmarks.pop();
    return;
  }
  renderBookmarks();
  bookmarkForm.reset();
  bookmarkForm.hidden = true;
  bookmarkAddButton.setAttribute('aria-expanded', 'false');
  bookmarkFeedback.textContent = `${name} added to bookmarks.`;
});

renderBookmarks();

async function moveBrowserHistory(delta) {
  const tab = browserTabs.find(({ id }) => id === activeBrowserTabId);
  if (!tab) return;
  const nextIndex = tab.historyIndex + delta;
  if (nextIndex < 0 || nextIndex >= tab.history.length) return;
  try {
    await openWithScramjet(tab.history[nextIndex], tab, nextIndex);
  } catch (error) {
    browserStatus.textContent = error.message;
    browserAddressInput.focus();
  }
}

browserBackButton?.addEventListener('click', () => moveBrowserHistory(-1));
browserForwardButton?.addEventListener('click', () => moveBrowserHistory(1));
browserRefreshButton?.addEventListener('click', async () => {
  const tab = browserTabs.find(({ id }) => id === activeBrowserTabId);
  if (!tab || tab.historyIndex < 0) return;
  try {
    await openWithScramjet(tab.history[tab.historyIndex], tab, tab.historyIndex);
  } catch (error) {
    browserStatus.textContent = error.message;
    browserAddressInput.focus();
  }
});

browserOpenTabButton?.addEventListener('click', async () => {
  const tab = browserTabs.find(({ id }) => id === activeBrowserTabId);
  if (!tab?.url) return;
  const openedWindow = window.open('about:blank', '_blank');
  if (!openedWindow) {
    browserStatus.textContent = 'Allow pop-ups to open this page in a full browser tab.';
    return;
  }
  openedWindow.opener = null;
  try {
    browserStatus.textContent = 'Connecting to the embedded browser service...';
    await scramjetReady;
    if (!scramjetBaseUrl) throw new Error('The embedded browser service is unavailable.');
    await ensureScramjetServiceReady(scramjetBaseUrl);
    if (!openedWindow.closed) openedWindow.location.replace(createScramjetEmbedUrl(tab.url));
  } catch (error) {
    if (!openedWindow.closed) openedWindow.close();
    browserStatus.textContent = error.message;
  }
});

document.getElementById('dashboard-browser-home')?.addEventListener('click', () => {
  document.getElementById('search-query')?.focus();
  document.querySelector('.search-home')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('dashboard-browser-new-tab')?.addEventListener('click', () => {
  addBrowserTab();
});

browserAddressForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = browserAddressInput.value.trim();
  if (!query) return;
  let tab = browserTabs.find(({ id }) => id === activeBrowserTabId);
  if (!tab) tab = addBrowserTab();
  const submitButton = browserAddressForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await openWithScramjet(query, tab);
  } catch (error) {
    browserStatus.textContent = error.message;
    browserAddressInput.focus();
  } finally {
    submitButton.disabled = false;
  }
});

async function waitForScramjetService(serviceUrl) {
  const profile = BROWSER_PROFILES[getBrowserProfile()];
  const deadline = Date.now() + profile.startupTimeout;
  const healthUrl = new URL('/health', serviceUrl);
  let lastError = new Error('The service did not respond.');

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      Math.min(profile.requestTimeout, remaining)
    );
    try {
      const response = await fetch(healthUrl, {
        cache: 'no-store',
        signal: controller.signal
      });
      if (response.ok) return;
      lastError = new Error(`The service returned HTTP ${response.status}.`);
    } catch (error) {
      lastError = error.name === 'AbortError'
        ? new Error('The service health check timed out.')
        : error;
    } finally {
      window.clearTimeout(timeout);
    }

    const delay = Math.min(profile.retryInterval, deadline - Date.now());
    if (delay > 0) await new Promise((resolve) => window.setTimeout(resolve, delay));
  }

  throw new Error(
    `The embedded browser service did not become ready within ${profile.startupTimeout / 1000} seconds. ${lastError.message}`
  );
}

function ensureScramjetServiceReady(serviceUrl) {
  if (Date.now() - scramjetHealthCheckedAt < 30000) return Promise.resolve();
  if (!scramjetHealthCheck) {
    scramjetHealthCheck = waitForScramjetService(serviceUrl)
      .then(() => {
        scramjetHealthCheckedAt = Date.now();
      })
      .finally(() => {
        scramjetHealthCheck = null;
      });
  }
  return scramjetHealthCheck;
}

async function waitForScramjetConfiguration() {
  const profile = BROWSER_PROFILES[getBrowserProfile()];
  if (window.location.protocol === 'file:') {
    throw new Error('Open this page through the local server: run npm start, then visit http://localhost:5000.');
  }
  if (systemCoreScramjetUrl) {
    const serviceUrl = new URL(systemCoreScramjetUrl);
    if (!['http:', 'https:'].includes(serviceUrl.protocol)) {
      throw new Error('The embedded browser service URL is invalid.');
    }
    scramjetBaseUrl = serviceUrl.origin;
    return scramjetBaseUrl;
  }

  const deadline = Date.now() + profile.startupTimeout;
  const healthUrl = systemCoreApiUrl ? `${systemCoreApiUrl}/health` : '/health';
  let lastError = new Error('The service did not respond.');

  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      Math.min(profile.requestTimeout, remaining)
    );
    let response;
    try {
      response = await fetch(healthUrl, {
        cache: 'no-store',
        signal: controller.signal
      });
    } catch (error) {
      lastError = error.name === 'AbortError'
        ? new Error('The service health check timed out.')
        : error;
    } finally {
      window.clearTimeout(timeout);
    }

    if (response?.ok) {
      const { scramjetPort: port, scramjetUrl } = await response.json();
      if (typeof scramjetUrl === 'string') {
        const serviceUrl = new URL(scramjetUrl);
        if (!['http:', 'https:'].includes(serviceUrl.protocol)) {
          throw new Error('The embedded browser service URL is invalid.');
        }
        scramjetBaseUrl = serviceUrl.origin;
        return scramjetBaseUrl;
      }
      if (Number.isInteger(port) && port >= 1 && port <= 65535) {
        scramjetBaseUrl = `http://${window.location.hostname}:${port}`;
        return scramjetBaseUrl;
      }
      throw new Error('The browser service returned an invalid configuration.');
    }
    if (response) lastError = new Error(`The service returned HTTP ${response.status}.`);

    const delay = Math.min(profile.retryInterval, deadline - Date.now());
    if (delay > 0) await new Promise((resolve) => window.setTimeout(resolve, delay));
  }

  throw new Error(
    `The browser service did not provide configuration within ${profile.startupTimeout / 1000} seconds. ${lastError.message}`
  );
}

scramjetReady = waitForScramjetConfiguration();
void scramjetReady.catch((error) => {
  if (browserStatus) browserStatus.textContent = error.message;
});

if (searchForm) {
  const searchQuery = document.getElementById('search-query');
  const searchButton = searchForm.querySelector('button[type="submit"]');
  const searchStatus = document.getElementById('search-status');
  searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = searchQuery.value.trim();
    if (!query) return;

    let destination;
    try {
      destination = resolveSearchDestination(query);
    } catch (error) {
      searchStatus.textContent = error.message || 'Enter a valid website address or search term.';
      return;
    }

    searchButton.disabled = true;
    searchStatus.textContent = 'Opening the embedded browser...';
    const activeTab = browserTabs.find(({ id }) => id === activeBrowserTabId);
    const tab = activeTab && activeTab.historyIndex < 0
      ? activeTab
      : addBrowserTab(new URL(destination).hostname);
    try {
      await openWithScramjet(query, tab);
      searchStatus.textContent = 'Your site opened in an embedded browser tab.';
      searchButton.disabled = false;
    } catch (error) {
      searchStatus.textContent = error.message;
      searchButton.disabled = false;
    }
  });

  document.querySelectorAll('[data-search]').forEach((suggestion) => {
    suggestion.addEventListener('click', () => {
      searchQuery.value = suggestion.dataset.search;
      searchForm.requestSubmit();
    });
  });
}

// Matrix Rain Animation
function initMatrixRain() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
  const fontSize = 16;
  const columns = canvas.width / fontSize;
  const drops = Array(Math.floor(columns)).fill(1);

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Determine color based on page
    const isVault = window.location.pathname.includes('vault');
    const themeAccent = getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-accent')
      .trim() || '#33FF33';
    ctx.fillStyle = isVault ? '#FF3333' : themeAccent;
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const text = characters.charAt(Math.floor(Math.random() * characters.length));
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  setInterval(draw, 33);
}

// Password Visibility Toggle
function initPasswordToggles() {
  const toggles = document.querySelectorAll('.toggle-password');
  toggles.forEach(button => {
    button.addEventListener('click', function() {
      const input = this.parentElement.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        this.textContent = 'HIDE';
      } else {
        input.type = 'password';
        this.textContent = 'SHOW';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMatrixRain();
  initPasswordToggles();
});

// Mobile Menu Toggle
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

if (mobileMenu && navLinks) {
  mobileMenu.addEventListener('click', () => {
    const isExpanded = navLinks.classList.toggle('active');
    mobileMenu.classList.toggle('is-active');
    mobileMenu.setAttribute('aria-expanded', String(isExpanded));
  });
}

// Super-secret Vault access
const blinkingText = document.querySelector('.blink');
if (blinkingText) {
  let lastTap = 0;
  blinkingText.style.cursor = 'pointer';
  blinkingText.addEventListener('click', function() {
    const now = Date.now();
    if (now - lastTap < 300) {
      window.location.href = 'vault-login.html';
    }
    lastTap = now;
  });
}

// Vault Login logic
const vaultPassInput = document.getElementById('vault-pass');
const vaultAuthBtn = document.getElementById('vault-auth-btn');
const vaultFeedback = document.getElementById('vault-feedback');

if (vaultAuthBtn && vaultPassInput) {
  vaultAuthBtn.addEventListener('click', function() {
    if (vaultPassInput.value === 'S3CR3T_K3Y_99') {
      vaultFeedback.textContent = 'ACCESS GRANTED. DECRYPTING...';
      vaultFeedback.style.color = '#00ff00';
      setTimeout(() => {
        window.location.href = 'vault.html';
      }, 1000);
    } else {
      vaultFeedback.textContent = 'INVALID ENCRYPTION KEY';
      vaultPassInput.value = '';
    }
  });

  vaultPassInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      vaultAuthBtn.click();
    }
  });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
  const feedback = document.createElement('div');
  feedback.style.marginTop = '1rem';
  feedback.style.textAlign = 'center';
  feedback.style.fontSize = '0.9rem';
  loginForm.appendChild(feedback);

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.textContent = 'CHECKING CREDENTIALS...';
    feedback.style.color = '#00ff00';

    const submitButton = loginForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.elements.username.value,
          password: loginForm.elements.password.value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign-in failed.');

      feedback.textContent = 'ACCESS GRANTED';
      const requestedPath = new URLSearchParams(window.location.search).get('next');
      let destination = '/main.html';
      if (requestedPath && requestedPath.startsWith('/') && !requestedPath.startsWith('//')) {
        const candidate = new URL(requestedPath, window.location.origin);
        if (candidate.origin === window.location.origin) destination = candidate.href;
      }
      window.location.assign(destination);
    } catch (error) {
      feedback.textContent = error.message === 'Failed to fetch'
        ? 'LOGIN SERVER UNAVAILABLE. START THE LOCAL NODE SERVER.'
        : error.message;
      feedback.style.color = '#ff3333';
      submitButton.disabled = false;
    }
  });
}