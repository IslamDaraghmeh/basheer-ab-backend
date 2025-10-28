import multer from 'multer';
import { nanoid } from 'nanoid';

export function myMulter(customValidation) {
  const storage = multer.diskStorage({
    filename: function (req, file, cb) {
      cb(null, Date.now() + '_' + nanoid() + '_' + file.originalname);
    }
  });

  function fileFilter(req, file, cb) {
   
    if (customValidation.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'), false); 
    }
  }     
  
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024 
    }
  });

  return upload;
}


export const fileValidation = {
  imag: ['image/png', 'image/jpeg'], 
  pdf: ['application/pdf'],
  video: ['video/mp4', 'video/avi', 'video/mkv'],  
   word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    all: [
    'image/png',
    'image/jpeg',
    'application/pdf',
    'video/mp4',
    'video/avi',
    'video/mkv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ], 
};

export const HME = (error, req, res, next) => {
  if (error) {
    res.status(400).json({ message: 'File upload error', error: error.message });
  } else {
    next();
  }
};
