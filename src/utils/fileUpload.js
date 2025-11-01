import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base uploads directory
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// Ensure uploads directory exists
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info(`Created directory: ${dirPath}`);
  }
};

// Initialize uploads directory structure
export const initializeUploadsDirectory = () => {
  const folders = [
    "accidents",
    "accident_comments",
    "cheques",
    "document-settings/logos",
    "insured",
    "vehicles",
    "insurance",
  ];

  ensureDirectoryExists(UPLOADS_DIR);

  folders.forEach((folder) => {
    const folderPath = path.join(UPLOADS_DIR, folder);
    ensureDirectoryExists(folderPath);
  });

  logger.info("Uploads directory structure initialized");
};

/**
 * Save uploaded file to local storage
 * @param {string} filePath - Temporary file path from multer
 * @param {Object} options - Upload options
 * @param {string} options.folder - Subfolder within uploads directory
 * @returns {Object} - { url: string, filename: string, path: string }
 */
export const uploadToLocal = async (filePath, options = {}) => {
  try {
    const folder = options.folder || "misc";
    const targetDir = path.join(UPLOADS_DIR, folder);

    // Ensure target directory exists
    ensureDirectoryExists(targetDir);

    // Generate unique filename
    const fileExt = path.extname(filePath);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
    const targetPath = path.join(targetDir, fileName);

    // Copy file to target location
    fs.copyFileSync(filePath, targetPath);

    // Delete the temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Generate URL path (relative to server root)
    const url = `/uploads/${folder}/${fileName}`;

    logger.info(`File uploaded successfully: ${url}`);

    return {
      url,
      secure_url: url, // For compatibility with Cloudinary's response
      filename: fileName,
      path: targetPath,
    };
  } catch (error) {
    // Delete the temporary file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    logger.error("Error uploading file to local storage:", error);
    throw error;
  }
};

/**
 * Delete file from local storage
 * @param {string} fileUrl - URL or path of the file to delete
 * @returns {Object} - { result: string }
 */
export const deleteFromLocal = async (fileUrl) => {
  try {
    // Extract relative path from URL (e.g., "/uploads/folder/file.jpg" -> "folder/file.jpg")
    let relativePath = fileUrl;
    if (fileUrl.startsWith("/uploads/")) {
      relativePath = fileUrl.replace("/uploads/", "");
    }

    const filePath = path.join(UPLOADS_DIR, relativePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`File deleted successfully: ${fileUrl}`);
      return { result: "ok" };
    } else {
      logger.warn(`File not found for deletion: ${fileUrl}`);
      return { result: "not found" };
    }
  } catch (error) {
    logger.error("Error deleting file from local storage:", error);
    throw error;
  }
};

/**
 * Get absolute path to uploads directory
 */
export const getUploadsPath = () => UPLOADS_DIR;

export default {
  uploadToLocal,
  deleteFromLocal,
  initializeUploadsDirectory,
  getUploadsPath,
};
