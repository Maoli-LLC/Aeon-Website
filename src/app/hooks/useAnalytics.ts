import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_BASE = isDev ? 'http://localhost:3001' : '';

const getVisitorId = (): string => {
  let visitorId = localStorage.getItem('ta_visitor_id');
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem('ta_visitor_id', visitorId);
  }
  return visitorId;
};

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('ta_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('ta_session_id', sessionId);
  }
  return sessionId;
};

const getUTMParams = (): Record<string, string> => {
  const urlParams = new URLSearchParams(window.location.search);
  const storedParams = JSON.parse(sessionStorage.getItem('ta_utm_params') || '{}');
  
  const utmSource = urlParams.get('utm_source') || storedParams.utmSource;
  const utmMedium = urlParams.get('utm_medium') || storedParams.utmMedium;
  const utmCampaign = urlParams.get('utm_campaign') || storedParams.utmCampaign;
  const utmTerm = urlParams.get('utm_term') || storedParams.utmTerm;
  const utmContent = urlParams.get('utm_content') || storedParams.utmContent;
  
  if (utmSource || utmMedium || utmCampaign) {
    sessionStorage.setItem('ta_utm_params', JSON.stringify({
      utmSource, utmMedium, utmCampaign, utmTerm, utmContent
    }));
  }
  
  return { utmSource, utmMedium, utmCampaign, utmTerm, utmContent };
};

export const trackEvent = async (
  eventType: string,
  conversionType?: string,
  additionalData?: Record<string, string>
) => {
  try {
    const utm = getUTMParams();
    
    await fetch(`${API_BASE}/api/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
        eventType,
        pageUrl: window.location.pathname,
        pageTitle: document.title,
        referrer: document.referrer,
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
        utmTerm: utm.utmTerm,
        utmContent: utm.utmContent,
        conversionType,
        ...additionalData,
      }),
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

export const useAnalytics = () => {
  const location = useLocation();
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    if (location.pathname !== lastTrackedPath.current) {
      lastTrackedPath.current = location.pathname;
      trackEvent('page_view');
    }
  }, [location.pathname]);

  const trackConversion = useCallback((conversionType: string) => {
    trackEvent('conversion', conversionType);
  }, []);

  return { trackConversion };
};
