import joi from "joi";

export const createDocumentSettings = {
  body: joi.object({
    companyName: joi.string().min(2).max(100).required().messages({
      "string.empty": "Company name is required",
      "string.min": "Company name must be at least 2 characters",
      "string.max": "Company name cannot exceed 100 characters"
    }),
    header: joi.object({
      text: joi.string().allow("").max(500),
      backgroundColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      textColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      fontSize: joi.number().min(8).max(72)
    }).optional(),
    footer: joi.object({
      text: joi.string().allow("").max(500),
      backgroundColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      textColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      fontSize: joi.number().min(8).max(72)
    }).optional(),
    documentTemplate: joi.object({
      marginTop: joi.number().min(0).max(100),
      marginBottom: joi.number().min(0).max(100),
      marginLeft: joi.number().min(0).max(100),
      marginRight: joi.number().min(0).max(100)
    }).optional()
  })
};

export const updateDocumentSettings = {
  body: joi.object({
    companyName: joi.string().min(2).max(100).optional(),
    header: joi.object({
      text: joi.string().allow("").max(500),
      backgroundColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      textColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      fontSize: joi.number().min(8).max(72)
    }).optional(),
    footer: joi.object({
      text: joi.string().allow("").max(500),
      backgroundColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      textColor: joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
      fontSize: joi.number().min(8).max(72)
    }).optional(),
    documentTemplate: joi.object({
      marginTop: joi.number().min(0).max(100),
      marginBottom: joi.number().min(0).max(100),
      marginLeft: joi.number().min(0).max(100),
      marginRight: joi.number().min(0).max(100)
    }).optional(),
    isActive: joi.boolean().optional()
  }),
  params: joi.object({
    id: joi.string().hex().length(24).required()
  })
};

export const getDocumentSettingsById = {
  params: joi.object({
    id: joi.string().hex().length(24).required()
  })
};

export const deleteDocumentSettings = {
  params: joi.object({
    id: joi.string().hex().length(24).required()
  })
};

export const activateDocumentSettings = {
  params: joi.object({
    id: joi.string().hex().length(24).required()
  })
};

export const getAllDocumentSettings = {
  query: joi.object({
    page: joi.number().min(1).optional(),
    limit: joi.number().min(1).max(100).optional()
  })
};