(function() {
'use strict';

class FitGirlDomHelpers {
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);

      const hashName = decodeURIComponent((urlObj.hash || '').replace(/^#/, '')).trim();
      if (hashName) {
        return hashName;
      }

      const pathname = decodeURIComponent(urlObj.pathname || '');
      const segments = pathname.split('/').filter((s) => s);
      return segments[segments.length - 1] || 'unknown';
    } catch (error) {
      const hashMatch = url.match(/#([^#]+)$/);
      if (hashMatch && hashMatch[1]) {
        return decodeURIComponent(hashMatch[1]).trim();
      }

      const match = url.match(/([^\/#?]+)(?:\?|$)/);
      return match ? match[1] : 'unknown';
    }
  }

  generateFilename(url) {
    const timestamp = Date.now();
    const baseName = this.getFilenameFromUrl(url);
    return `fitgirl_${baseName}_${timestamp}`;
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  debounce(func, wait) {
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

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

if (typeof self !== 'undefined') {
  self.FitGirlDomHelpers = FitGirlDomHelpers;
}

if (typeof window !== 'undefined') {
  window.FitGirlDomHelpers = FitGirlDomHelpers;
}

})();
