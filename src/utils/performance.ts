import React from 'react';

export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  if (import.meta.env.DEV) console.log(`${name} took ${(end - start).toFixed(2)}ms`);
};

export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
};

export const throttle = <T extends (...args: any[]) => any>(func: T, limit: number) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => { if (!inThrottle) { func(...args); inThrottle = true; setTimeout(() => (inThrottle = false), limit); } };
};

export const lazyLoad = (importFunc: () => Promise<{ default: React.ComponentType<any> }>) => {
  return React.lazy(importFunc);
};

export const optimizeImage = (file: File, maxWidth = 800, quality = 0.8): Promise<Blob> =>
  new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => resolve(b!), 'image/jpeg', quality);
    };
    img.src = URL.createObjectURL(file);
  });
