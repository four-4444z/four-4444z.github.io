const isPublicSite = window.location.hostname === 'four-4444z.github.io';
window.SYSTEM_CORE_API_URL = isPublicSite
  ? 'https://core-search-4444z-api.onrender.com'
  : '';
window.SYSTEM_CORE_SCRAMJET_URL = isPublicSite
  ? 'https://core-search-4444z-scramjet.onrender.com'
  : '';
const isLocalSite = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
window.SYSTEM_CORE_RAMMERHEAD_URL = isPublicSite
  ? 'https://core-search-4444z-rammerhead.onrender.com'
  : isLocalSite
    ? `${window.location.protocol}//${window.location.hostname}:8082`
    : '';
