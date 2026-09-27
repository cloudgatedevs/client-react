const DEFAULT_OUTPUT = 512;
const MAX_BYTES = 4 * 1024 * 1024;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (e) => reject(e));
    if (/^https?:\/\//i.test(url)) {
      image.crossOrigin = 'anonymous';
    }
    image.src = url;
  });
}

/**
 * @param {string} imageSrc Object URL or remote URL
 * @param {{ x: number; y: number; width: number; height: number }} pixelCrop from react-easy-crop
 * @param {number} [outputSize]
 * @param {number} [maxBytes]
 * @returns {Promise<Blob>}
 */
export async function getCroppedJpegBlob(imageSrc, pixelCrop, outputSize = DEFAULT_OUTPUT, maxBytes = MAX_BYTES) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is not available');
  }
  // JPEG has no alpha channel; flatten transparent pixels onto white before export.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const toBlob = (q) =>
    new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', q);
    });

  let quality = 0.92;
  let blob = await toBlob(quality);
  while (blob && blob.size > maxBytes && quality > 0.42) {
    quality -= 0.07;
    blob = await toBlob(quality);
  }

  if (blob && blob.size > maxBytes && outputSize > 256) {
    return getCroppedJpegBlob(imageSrc, pixelCrop, Math.floor(outputSize * 0.75), maxBytes);
  }

  if (!blob || blob.size > maxBytes) {
    throw new Error('Could not compress image under the size limit. Try a different photo.');
  }

  return blob;
}
