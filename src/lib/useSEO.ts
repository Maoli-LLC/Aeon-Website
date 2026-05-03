import { useEffect } from 'react';

interface SEOOptions {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: string;
  jsonLd?: object | null;
}

const DEFAULT_IMAGE = 'https://www.iamsahlien.com/team-aeon-logo.png';
const SITE_NAME = 'Team Aeon';

function setMeta(selector: string, attr: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    const [a, v] = selector.replace('meta[', '').replace(']', '').split('=');
    el.setAttribute(a, v.replace(/"/g, ''));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const PAGE_JSONLD_ID = 'page-jsonld';

export function useSEO({ title, description, canonical, image, type = 'website', jsonLd }: SEOOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Sahlien - Music, Dreams & Digital Creation`;
    const desc = description || 'Free dream interpretations, custom music creation, and website & app development by Sahlien.';
    const url = canonical || `https://www.iamsahlien.com${window.location.pathname}`;
    const img = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta('meta[name="description"]', 'content', desc);
    setLink('canonical', url);

    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[property="og:type"]', 'content', type);
    setMeta('meta[property="og:image"]', 'content', img);

    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', desc);
    setMeta('meta[name="twitter:image"]', 'content', img);

    const existing = document.getElementById(PAGE_JSONLD_ID);
    if (existing) existing.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = PAGE_JSONLD_ID;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const el = document.getElementById(PAGE_JSONLD_ID);
      if (el) el.remove();
    };
  }, [title, description, canonical, image, type, JSON.stringify(jsonLd)]);
}
