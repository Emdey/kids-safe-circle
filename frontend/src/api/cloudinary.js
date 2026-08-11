// Photos and videos upload directly from the browser to Cloudinary (not
// through our own API - Render's free tier isn't sized for handling large
// file uploads), using an UNSIGNED upload preset you create in the
// Cloudinary console. See README.md for how to set that preset up with
// sensible restrictions (max size, allowed formats, max video length).
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export function mediaUploadConfigured() {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/**
 * @param {File} file
 * @param {'image'|'video'} resourceType
 * @returns {Promise<string>} the uploaded asset's secure URL
 */
export async function uploadMedia(file, resourceType) {
  if (!mediaUploadConfigured()) {
    throw new Error('Photo/video sharing is not set up yet - ask a grown-up to finish setup.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Upload failed.');
  }
  return data.secure_url;
}
