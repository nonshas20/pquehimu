/**
 * Client-side Image Processing & Compression Utilities
 * Parañaque Health Information Management Unit (HIMU)
 */

/**
 * Compresses an image file client-side using HTML5 canvas into an optimized WebP / JPEG data URL.
 * 
 * @param file The uploaded image File
 * @param maxWidth Max output width in pixels
 * @param maxHeight Max output height in pixels
 * @param quality Compression quality from 0.1 to 1.0 (default: 0.8)
 * @returns Promise<string> Base64 data URL
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.8
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image.');
  }

  // Reject files over 15MB to protect browser memory
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image exceeds 15MB limit. Please choose a smaller file.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file.'));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to decode image data.'));

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original read result if canvas context cannot be initialized
          resolve(event.target?.result as string);
          return;
        }

        // Draw image with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer modern WebP, gracefully fallback to JPEG
        try {
          const webpData = canvas.toDataURL('image/webp', quality);
          // If browser doesn't support WebP export it returns image/png which can be huge
          if (webpData.startsWith('data:image/webp')) {
            resolve(webpData);
            return;
          }
        } catch {
          // ignore and fallback
        }

        try {
          const jpegData = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegData);
        } catch (err) {
          reject(err);
        }
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
