// services/cloudinary.js
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: 'dcl0q9iun',
  api_key: '732973213658368',
  api_secret: 'QU3IbIXxkQGUkl75dx2U2sjSjN4',
  secure: true
});

export default cloudinary;
