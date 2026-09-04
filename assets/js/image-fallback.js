const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#F5F0E8"/><rect x="40" y="40" width="1120" height="820" rx="16" fill="none" stroke="#C8832A" stroke-width="3" stroke-dasharray="10 10" opacity=".25"/><circle cx="600" cy="450" r="80" fill="#C8832A" opacity=".12"/></svg>`);

function revealImage(img) {
  if (!(img instanceof HTMLImageElement)) return;
  img.classList.add('loaded');
  const skeleton = img.previousElementSibling;
  if (skeleton?.classList.contains('img-skeleton')) {
    skeleton.style.transition = 'opacity 360ms ease';
    skeleton.style.opacity = '0';
    window.setTimeout(() => skeleton.remove(), 420);
  }
}

window.imageLoaded = revealImage;
window.imageFailed = (img) => {
  if (!(img instanceof HTMLImageElement)) return;
  if (img.dataset.fallbackApplied !== 'true') {
    img.dataset.fallbackApplied = 'true';
    img.src = FALLBACK_IMAGE;
  }
  revealImage(img);
};

if (typeof document !== 'undefined') {
  const initFallbackListeners = () => {
    document.querySelectorAll('img').forEach((img) => {
      if (img.loading === 'lazy') {
        img.loading = 'eager';
      }
      if (img.complete && img.naturalWidth > 0) {
        revealImage(img);
      } else {
        img.addEventListener('load', () => revealImage(img));
        img.addEventListener('error', () => window.imageFailed(img));
      }
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFallbackListeners);
  } else {
    initFallbackListeners();
  }
}
