/**
 * Image Optimizer Utility for CalibraCine
 * Resizes and compresses uploaded photos client-side to ensure:
 * - Instant uploads even on mobile networks
 * - Ultra-fast HTML2Canvas PDF generation (<200ms)
 * - Safe localStorage & Firestore storage without quota limits
 * - Fast e-mail dispatch with lightweight PDF attachments
 */

export async function compressImageFile(
  file: File,
  maxDimension: number = 800,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    // Safety timeout to prevent hanging on corrupted files
    const safetyTimeout = setTimeout(() => {
      // Fallback: try raw read
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve('');
      r.readAsDataURL(file);
    }, 2500);

    if (!file.type.startsWith('image/')) {
      clearTimeout(safetyTimeout);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      clearTimeout(safetyTimeout);
      resolve('');
    };

    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        clearTimeout(safetyTimeout);
        resolve('');
        return;
      }

      const img = new Image();
      img.onerror = () => {
        clearTimeout(safetyTimeout);
        resolve(rawDataUrl);
      };

      img.onload = () => {
        clearTimeout(safetyTimeout);
        try {
          let { width, height } = img;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const optimized = canvas.toDataURL('image/jpeg', quality);
          resolve(optimized);
        } catch (err) {
          console.warn('Image file compression error, fallback to raw:', err);
          resolve(rawDataUrl);
        }
      };

      img.src = rawDataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes a base64 Data URI with guaranteed safety timeout
 */
export async function compressBase64Image(
  dataUrl: string,
  maxDimension: number = 700,
  quality: number = 0.72
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return '';
  }

  // If already small or svg, skip
  if (dataUrl.length < 35000 || dataUrl.startsWith('data:image/svg')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    // 1500ms safety timeout per image to completely prevent hanging
    const timeout = setTimeout(() => {
      resolve(dataUrl);
    }, 1500);

    const img = new Image();
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(dataUrl);
    };

    img.onload = () => {
      clearTimeout(timeout);
      try {
        let { width, height } = img;

        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 90000) {
          resolve(dataUrl);
          return;
        }

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const optimized = canvas.toDataURL('image/jpeg', quality);
        resolve(optimized);
      } catch (e) {
        resolve(dataUrl);
      }
    };

    img.src = dataUrl;
  });
}
