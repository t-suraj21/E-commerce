import { getBaseUrl } from '../api/client';

export const getImageUrl = (url) => {
  if (!url) return 'https://placehold.co/150x150/e2e8f0/64748b?text=No+Image';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) {
    const baseUrl = getBaseUrl().replace(/\/api\/?$/, '');
    return `${baseUrl}${url}`;
  }
  return url;
};
