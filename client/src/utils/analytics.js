// Thin event layer. GA / Meta Pixel load only after consent and only when an ID is configured in Settings.
let consent = false;
export const setConsent = (v) => { consent = v; try { localStorage.setItem('gs-consent', v ? 'yes' : 'no'); } catch { /* ignore */ } };
export const getConsent = () => { try { return localStorage.getItem('gs-consent'); } catch { return null; } };

export const initAnalytics = ({ gaId, pixelId }) => {
  if (getConsent() !== 'yes') return;
  consent = true;
  if (gaId && !window.gtag) {
    const s = document.createElement('script'); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`; document.head.appendChild(s);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', gaId);
  }
  if (pixelId && !window.fbq) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', pixelId); window.fbq('track', 'PageView');
  }
};

const MAP = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', purchase: 'Purchase', search: 'Search' };
export const track = (event, params = {}) => {
  if (!consent) return;
  try {
    window.gtag?.('event', event, params);
    if (MAP[event]) window.fbq?.('track', MAP[event], params.value ? { value: params.value, currency: 'NGN' } : {});
    else window.fbq?.('trackCustom', event, params);
  } catch { /* analytics must never break the app */ }
};
