import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./user.endpoint.js";
import * as userRoute from './controller/user.controller.js'
import { validation } from "../../middleware/validation.js";
import * as userValid from '../User/user.validation.js'
import { authLimiter, strictLimiter } from "../../middleware/rateLimiter.js";

const userRouter=Router();
userRouter.put('/changepassword',auth(endPoints.prof),userRoute.updatePassword)
userRouter.put('/change',auth(endPoints.prof),userRoute.updateProfile)
userRouter.get('/profile',auth(endPoints.prof),userRoute.getProfile)
userRouter.post('/add', authLimiter, userRoute.create)
userRouter.post('/signin', authLimiter, validation(userValid.signin),userRoute.signin)

userRouter.patch('/sendcode', strictLimiter, validation(userValid.sendCode),userRoute.sendCode)
userRouter.patch('/forgetpassword', strictLimiter, validation(userValid.forgetPassword),userRoute.forgetPassword)
userRouter.post('/addHeadOfEmployeeToDepartment/:id',auth(endPoints.addHeadOfDepartmentToDepartment),validation(userValid.addHeadOfDepartmentToDepartment),userRoute.createDepartmentHead)
userRouter.delete('/deleteHeadOfEmployeeFromDepartment/:depId/:userId', auth(endPoints.deleteHeadOfDepartmentToDepartment),userRoute.deleteDepartmentHead)
userRouter.get('/getHeadOfEmployee/:id', auth(endPoints.getHeadOfDepartment), userRoute.getHeadOfDepartment)
userRouter.post('/addEmployee/:id', auth(endPoints.addEmployee),validation(userValid.AddEmployee), userRoute.createEmployee)
userRouter.delete('/deleteEmployee/:depId/:employeeId',auth(endPoints.deleteEmployee), userRoute.deleteEmployee)
userRouter.get('/allEmployee/:depId' , auth(endPoints.allEmployee),userRoute.listEmployees)

// Permissions endpoints
userRouter.get('/permissions/all', userRoute.listPermissions)
userRouter.get('/permissions/my-permissions', auth(endPoints.prof), userRoute.getMyPermissions)

// Admin reset employee password
userRouter.patch('/reset-employee-password/:userId', auth(endPoints.resetEmployeePassword), validation(userValid.resetEmployeePassword), userRoute.resetEmployeePassword)

export default userRouter;