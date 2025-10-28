import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dcl0q9iun",
  api_key: process.env.CLOUDINARY_API_KEY || "732973213658368",
  api_secret:
    process.env.CLOUDINARY_API_SECRET || "QU3IbIXxkQGUkl75dx2U2sjSjN4",
});

export const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
      ...options,
    });

    // Delete the local file after upload
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return result;
  } catch (error) {
    // Delete the local file even if upload fails
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

export const deleteFromCloudinary = async (
  publicId,
  resourceType = "image"
) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    throw error;
  }
};

export default cloudinary;
