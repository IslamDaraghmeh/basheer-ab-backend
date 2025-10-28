import { Router } from "express";
import * as callRoute from './controller/call.controller.js'
const callRouter=Router();
callRouter.post("/calls/:insuredId", callRoute.getCallRecording);
export default callRouter;