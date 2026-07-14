export { ValidationError } from './errors.js';
export type { ValidationCode } from './errors.js';

export {
  detectAndAssertType,
  IMAGE_MIMES,
  VIDEO_MIMES,
} from './magic-bytes.js';
export type { MediaKind, DetectedType } from './magic-bytes.js';

export { sniffImage, IMAGE_MAX_PIXELS } from './image-sniff.js';
export type { ImageProbe } from './image-sniff.js';

export {
  assertVideoAllowed,
  probeVideoBuffer,
  VIDEO_MAX_PIXELS,
  ALLOWED_VIDEO_CODECS,
  ALLOWED_CONTAINER_TOKENS,
} from './video-sniff.js';
export type { VideoProbe, VideoLimits } from './video-sniff.js';

export { scanBuffer, assertClean } from './antivirus.js';
export type { ClamdOptions, ScanResult, ScanFn } from './antivirus.js';

export { validateUpload } from './validate-upload.js';
export type {
  EventLimits,
  ValidateUploadInput,
  ValidateUploadDeps,
  ValidatedMedia,
  ValidatedImage,
  ValidatedVideo,
} from './validate-upload.js';
