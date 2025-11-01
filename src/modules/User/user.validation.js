import Joi from "joi";

// Strong password regex: min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+=\-{}\[\]:;"'<>,.\/\\|`~])[A-Za-z\d@$!%*?&#^()_+=\-{}\[\]:;"'<>,.\/\\|`~]{12,}$/;

const passwordSchema = Joi.string()
  .required()
  .min(12)
  .pattern(passwordRegex)
  .messages({
    'string.min': 'Password must be at least 12 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required'
  });

export const signin = {
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': "Please enter a valid email address",
            'any.required': 'Email is required'
        }),
        // For signin, we don't enforce new password rules on existing passwords
        password: Joi.string().required().min(7).messages({
            'string.min': 'Password must be at least 7 characters long',
            'any.required': 'Password is required'
        })
    }).required()
};

export const forgetPassword = {
    body: Joi.object({
        newPassword: passwordSchema,
        email: Joi.string().email().required().messages({
            'string.email': "Please enter a valid email address",
            'any.required': 'Email is required'
        }),
        code: Joi.string().required().messages({
            'any.required': 'Reset code is required'
        })
    }).required()
};

export const sendCode = {
    body: Joi.object({
        email: Joi.string().required().email().messages({
            'string.email': "Please enter a valid email address"
        }),
    }).required()
};

export const addAgent={
    body:Joi.object({
        name:Joi.string().required().min(3).max(25).messages({
                'string.min': "Username must be at least 2 characters long ",
            'string.max': "Username must be at most 25 characters long"
        }),
        email: Joi.string().required().email().messages({
            'string.email': "Please enter a valid email address"
        }),
        password: passwordSchema.optional(),
    }).required()
}

export const addHeadOfDepartmentToDepartment={
    body:Joi.object({
        name:Joi.string().required().min(3).max(25).messages({
                'string.min': "Username must be at least 3 characters long ",
            'string.max': "Username must be at most 25 characters long"
        }),
        email: Joi.string().required().email().messages({
            'string.email': "Please enter a valid email address"
        }),
        password: passwordSchema,
    }).required()
}

export const AddEmployee={
    body:Joi.object({
        name:Joi.string().required().min(3).max(25).messages({
                'string.min': "Username must be at least 3 characters long ",
            'string.max': "Username must be at most 25 characters long"
        }),
        email: Joi.string().required().email().messages({
            'string.email': "Please enter a valid email address"
        }),
        password: passwordSchema,
    }).required()
}

export const resetEmployeePassword = {
    body: Joi.object({
        newPassword: passwordSchema,
    }).required()
}