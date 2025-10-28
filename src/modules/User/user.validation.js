import Joi from "joi";
export const signin = {
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': "Please enter a valid email address"
        }),
        password: Joi.string().required().min(7).messages({
            'string.min': 'Password must be at least 7 characters long'
        })
    }).required()
};
export const forgetPassword = {
    body: Joi.object({
        newPassword: Joi.string().required().min(7).messages({
            'string.min': 'Password must be at least 7 characters long ',
        }),
        email: Joi.string().email().required().messages({
            'string.email': "Please enter a valid email address"
        }),
        code: Joi.string().required()
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
        password: Joi.string().optional().min(7).messages({
            'string.min': 'Password must be at least 7 characters long'
        }),
    }).required()
}
export const addHeadOfDepartmentToDepartment={
    body:Joi.object({
        name:Joi.string().required().min(3).max(25).messages({
                'string.min': "Username must be at least 2 characters long ",
            'string.max': "Username must be at most 25 characters long"
        }),
        email: Joi.string().required().email().messages({
            'string.email': "Please enter a valid email address"
        }),
        password: Joi.string().required().min(7).messages({
            'string.min': 'Password must be at least 7 characters long'
        }),
    }).required()
}

export const AddEmployee={
    body:Joi.object({
        name:Joi.string().required().min(3).max(25).messages({
                'string.min': "Username must be at least 2 characters long ",
            'string.max': "Username must be at most 25 characters long"
        }),
        email: Joi.string().required().email().messages({
            'string.email': "Please enter a valid email address"
        }),
        password: Joi.string().required().min(7).messages({
            'string.min': 'Password must be at least 7 characters long'
        }),
    }).required()
}

export const resetEmployeePassword = {
    body: Joi.object({
        newPassword: Joi.string().required().min(7).messages({
            'string.min': 'Password must be at least 7 characters long',
            'any.required': 'New password is required'
        }),
    }).required()
}