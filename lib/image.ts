/**
 * Client-side image compression to a JPEG data URL.
 *
 * Firebase Storage would be the right home for uploads, but the project has no
 * billing account and Storage requires one, so photos are stored inline in
 * Firestore documents. That makes the encoded size a real cost rather than a
 * detail: the about photo reached 173KB, which every page then carried because
 * the site-content document is read on every render.
 *
 * So this does not just resize — it keeps stepping quality down, and finally
 * dimensions, until the result fits a byte budget. An oversized upload comes out
 * smaller and slightly softer instead of quietly inflating a document.
 */

/** Quality ladder, tried in order until the encoded result fits */
const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42]

/** Roughly 90KB of base64 — about 66KB of actual image */
export const DEFAULT_MAX_BYTES = 92_000

function drawToCanvas(img: HTMLImageElement, maxSize: number): HTMLCanvasElement {
  let w = img.width
  let h = img.height
  if (w > maxSize || h > maxSize) {
    if (w > h) {
      h = Math.round((h * maxSize) / w)
      w = maxSize
    } else {
      w = Math.round((w * maxSize) / h)
      h = maxSize
    }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, w)
  canvas.height = Math.max(1, h)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser')
  // A white base stops transparent PNGs turning black once flattened to JPEG
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

export interface CompressResult {
  dataUrl: string
  /** Length of the data URL string, which is what Firestore actually stores */
  bytes: number
  width: number
  height: number
  quality: number
  /** True when the budget could not be met even at the lowest setting */
  overBudget: boolean
}

/** Resizes, then trades quality and finally dimensions for size */
export function compressImageDetailed(
  file: File,
  maxSize: number,
  maxBytes: number = DEFAULT_MAX_BYTES
): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      try {
        // Two passes: the requested size, then a smaller one if quality alone
        // could not get under budget
        for (const size of [maxSize, Math.round(maxSize * 0.7)]) {
          const canvas = drawToCanvas(img, size)
          for (const quality of QUALITY_STEPS) {
            const dataUrl = canvas.toDataURL('image/jpeg', quality)
            if (dataUrl.length <= maxBytes) {
              resolve({
                dataUrl,
                bytes: dataUrl.length,
                width: canvas.width,
                height: canvas.height,
                quality,
                overBudget: false,
              })
              return
            }
          }
        }
        // Nothing fit. Return the smallest attempt rather than failing, and say
        // so, letting the caller decide whether to warn or refuse.
        const canvas = drawToCanvas(img, Math.round(maxSize * 0.7))
        const lowest = QUALITY_STEPS[QUALITY_STEPS.length - 1]
        const dataUrl = canvas.toDataURL('image/jpeg', lowest)
        resolve({
          dataUrl,
          bytes: dataUrl.length,
          width: canvas.width,
          height: canvas.height,
          quality: lowest,
          overBudget: dataUrl.length > maxBytes,
        })
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to compress image'))
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}
