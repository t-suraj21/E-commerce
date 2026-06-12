/**
 * Optimizes Cloudinary URLs by inserting auto-format and auto-quality parameters.
 * If the URL is not a Cloudinary image, it returns it unchanged.
 * 
 * @param {string} url - The original image URL
 * @param {number} [width] - Optional width parameter to scale the image
 * @returns {string} The optimized image URL
 */
const optimizeImageUrl = (url, width) => {
  if (!url || typeof url !== 'string') return url;
  
  // Only process Cloudinary URLs
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    const transformation = width 
      ? `q_auto,f_auto,w_${width},c_limit` 
      : 'q_auto,f_auto';
      
    return url.replace('/upload/', `/upload/${transformation}/`);
  }
  
  return url;
};

module.exports = { optimizeImageUrl };
