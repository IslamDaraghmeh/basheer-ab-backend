import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./user.endpoint.js";
import * as userRoute from './controller/user.controller.js'
import { validation } from "../../middleware/validation.js";
import * as userValid from '../User/user.validation.js'
import { authLimiter, strictLimiter } from "../../middleware/rateLimiter.js";

const userRouter=Router();
userRouter.put('/changepassword',auth(endPoints.prof),userRoute.changepassword)
userRouter.put('/change',auth(endPoints.prof),userRoute.changeInformation)
userRouter.get('/profile',auth(endPoints.prof),userRoute.profile)
userRouter.post('/add', authLimiter, userRoute.addAdmin)
userRouter.post('/signin', authLimiter, validation(userValid.signin),userRoute.signin)

userRouter.patch('/sendcode', strictLimiter, validation(userValid.sendCode),userRoute.sendCode)
userRouter.patch('/forgetpassword', strictLimiter, validation(userValid.forgetPassword),userRoute.forgetPassward)
userRouter.post('/addHeadOfEmployeeToDepartment/:id',auth(endPoints.addHeadOfDepartmentToDepartmen),validation(userValid.addHeadOfDepartmentToDepartment),userRoute.addHeadOfDepartmentToDepartment)
userRouter.delete('/deleteHeadOfEmployeeFromDepartment/:depId/:userId', auth(endPoints.deleteHeadOfDepartmentToDepartmen),userRoute.deleteHeadOfDepartmentFromDepartment)
userRouter.get('/getHeadOfEmployee/:id', auth(endPoints.getHeadOfDepartment), userRoute.getHeadOfDepartment)
userRouter.post('/addEmployee/:id', auth(endPoints.addEmployee),validation(userValid.AddEmployee), userRoute.addEmployee)
userRouter.delete('/deleteEmployee/:depId/:employeeId',auth(endPoints.deleteEmployee), userRoute.deleteEmployee)
userRouter.get('/allEmployee/:depId' , auth(endPoints.allEmployee),userRoute.allEmployee)

// Permissions endpoints
userRouter.get('/permissions/all', userRoute.getAllPermissions)
userRouter.get('/permissions/my-permissions', auth(endPoints.prof), userRoute.getMyPermissions)

// Admin reset employee password
userRouter.patch('/reset-employee-password/:userId', auth(endPoints.resetEmployeePassword), validation(userValid.resetEmployeePassword), userRoute.resetEmployeePassword)

export default userRouter;