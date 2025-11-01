/**
 * File Upload Helper Utilities
 * Centralized functions for handling file uploads to reduce code duplication
 *
 * Usage:
 *   import { uploadMultipleFiles, uploadSingleFile } from "#utils/fileUploadHelper.js";
 *
 *   const images = await uploadMultipleFiles(req.files, "accidents");
 *   const image = await uploadSingleFile(req.file, "profiles");
 */

import { uploadToLocal } from "#utils/fileUpload.js";
import logger from "#utils/logService.js";

/**
 * Upload multiple files to local storage
 * Replaces the common pattern of looping through req.files
 *
 * @param {Array} files - Array of files from multer (req.files)
 * @param {string} folder - Folder name for uploads (e.g., "accidents", "profiles")
 * @param {Object} options - Optional upload configuration
 * @returns {Promise<Array<string>>} Array of secure URLs
 *
 * @example
 * // Before (7 lines):
 * let uploadedImages = [];
 * if (req.files && req.files.length > 0) {
 *   for (const file of req.files) {
 *     const result = await uploadToLocal(file.path, { folder: "accidents" });
 *     uploadedImages.push(result.secure_url);
 *   }
 * }
 *
 * // After (1 line):
 * const uploadedImages = await uploadMultipleFiles(req.files, "accidents");
 */
export const uploadMultipleFiles = async (files, folder, options = {}) => {
  // Return empty array if no files provided
  if (!files || !Array.isArray(files) || files.length === 0) {
    return [];
  }

  try {
    // Upload all files in parallel for better performance
    const uploadPromises = files.map(file =>
      uploadToLocal(file.path, { folder, ...options })
    );

    const results = await Promise.all(uploadPromises);

    // Extract secure URLs from results
    const urls = results.map(result => result.secure_url);

    logger.info(`Uploaded ${urls.length} files to folder: ${folder}`);

    return urls;
  } catch (error) {
    logger.error('Failed to upload multiple files', {
      folder,
      fileCount: files.length,
      error: error.message
    });
    throw error;
  }
};

/**
 * Upload a single file to local storage
 *
 * @param {Object} file - Single file from multer (req.file)
 * @param {string} folder - Folder name for upload
 * @param {Object} options - Optional upload configuration
 * @returns {Promise<string|null>} Secure URL or null if no file
 *
 * @example
 * // Before (4 lines):
 * let imageUrl = null;
 * if (req.file) {
 *   const { secure_url } = await uploadToLocal(req.file.path, { folder: "profiles" });
 *   imageUrl = secure_url;
 * }
 *
 * // After (1 line):
 * const imageUrl = await uploadSingleFile(req.file, "profiles");
 */
export const uploadSingleFile = async (file, folder, options = {}) => {
  // Return null if no file provided
  if (!file) {
    return null;
  }

  try {
    const result = await uploadToLocal(file.path, { folder, ...options });

    logger.info(`Uploaded file to folder: ${folder}`, {
      url: result.secure_url
    });

    return result.secure_url;
  } catch (error) {
    logger.error('Failed to upload single file', {
      folder,
      error: error.message
    });
    throw error;
  }
};

/**
 * Upload a single file with a default/fallback URL if no file provided
 *
 * @param {Object} file - Single file from multer (req.file)
 * @param {string} folder - Folder name for upload
 * @param {string} defaultUrl - Default URL to use if no file provided
 * @param {Object} options - Optional upload configuration
 * @returns {Promise<string>} Secure URL or default URL
 *
 * @example
 * const imageUrl = await uploadSingleFileWithDefault(
 *   req.file,
 *   "profiles",
 *   "https://default-avatar.com/image.png"
 * );
 */
export const uploadSingleFileWithDefault = async (file, folder, defaultUrl, options = {}) => {
  if (!file) {
    return defaultUrl;
  }

  try {
    const result = await uploadToLocal(file.path, { folder, ...options });
    return result.secure_url;
  } catch (error) {
    logger.error('Failed to upload file, using default URL', {
      folder,
      defaultUrl,
      error: error.message
    });
    // Return default URL if upload fails
    return defaultUrl;
  }
};

/**
 * Upload files with metadata extraction
 * Useful for tracking file information
 *
 * @param {Array} files - Array of files from multer
 * @param {string} folder - Folder name for uploads
 * @param {Object} options - Optional upload configuration
 * @returns {Promise<Array<Object>>} Array of objects with url and metadata
 *
 * @example
 * const filesWithMetadata = await uploadFilesWithMetadata(req.files, "documents");
 * // Returns: [{ url: "...", filename: "doc.pdf", size: 1024, mimetype: "application/pdf" }, ...]
 */
export const uploadFilesWithMetadata = async (files, folder, options = {}) => {
  if (!files || !Array.isArray(files) || files.length === 0) {
    return [];
  }

  try {
    const uploadPromises = files.map(async (file) => {
      const result = await uploadToLocal(file.path, { folder, ...options });

      return {
        url: result.secure_url,
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date()
      };
    });

    const results = await Promise.all(uploadPromises);

    logger.info(`Uploaded ${results.length} files with metadata to folder: ${folder}`);

    return results;
  } catch (error) {
    logger.error('Failed to upload files with metadata', {
      folder,
      fileCount: files.length,
      error: error.message
    });
    throw error;
  }
};

export default {
  uploadMultipleFiles,
  uploadSingleFile,
  uploadSingleFileWithDefault,
  uploadFilesWithMetadata
};
