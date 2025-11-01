import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./department.endpoint.js";
import * as departmentRoute from './controller/department.controller.js'

const departmentRouter=Router();
departmentRouter.post( '/add', auth(endPoints.addDepartment), departmentRoute.create)
departmentRouter.delete('/delete/:id', auth(endPoints.deleteDepartment), departmentRoute.remove)
departmentRouter.get('/all', auth(endPoints.all),departmentRoute.list)
departmentRouter.get('/dep/:id', auth(endPoints.DepartmentById),departmentRoute.getById)
departmentRouter.patch('/update/:id',auth(endPoints.updateDepartment),departmentRoute.update)
export default departmentRouter;