import { Router } from "express";
import * as insuranceCompanyRoute from './controller/insuranceCompany.controller.js'
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./insuranceCompany.endpoint.js";
import  {checkDepartmentPermission}  from "../../middleware/checkDepartmentPermission.js";
const insuranceCompanyRouter=Router();

// Insurance Company CRUD

// Create
insuranceCompanyRouter.post('/addInsuranceCompany',auth(endpoints.addCompany),insuranceCompanyRoute.create)

// Read
insuranceCompanyRouter.get('/all',auth(endpoints.allCompany),insuranceCompanyRoute.list)
insuranceCompanyRouter.get('/by-type/:insuranceTypeId',auth(endpoints.allCompany),insuranceCompanyRoute.getCompaniesByInsuranceType)
insuranceCompanyRouter.get('/:id',auth(endpoints.allCompany),insuranceCompanyRoute.getInsuranceCompanyById)

// Update
insuranceCompanyRouter.patch('/updateInsuranceCompany/:id',auth(endpoints.updateCompany),insuranceCompanyRoute.updateInsuranceCompany) // Legacy
insuranceCompanyRouter.patch('/:id',auth(endpoints.updateCompany),insuranceCompanyRoute.updateInsuranceCompany) // New simplified

// Delete
insuranceCompanyRouter.delete('/delete/:id',auth(endpoints.deleteCompany),insuranceCompanyRoute.deleteInsuranceCompany) // Legacy
insuranceCompanyRouter.delete('/:id',auth(endpoints.deleteCompany),insuranceCompanyRoute.deleteInsuranceCompany) // New simplified

export default insuranceCompanyRouter;