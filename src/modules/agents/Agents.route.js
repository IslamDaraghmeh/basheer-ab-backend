import { Router } from "express";
import * as agentRouter from './controller/Agents.controller.js'
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./Agents.endpoint.js";

const AgentRouter=Router();
AgentRouter.post('/addAgents', auth(endPoints.addAgents) ,agentRouter.create)
AgentRouter.delete('/deleteAgents/:id',auth(endPoints.deleteAgents), agentRouter.remove)
AgentRouter.patch('/updateAgents/:id',auth(endPoints.updateAgents),agentRouter.update)
AgentRouter.get('/all',auth(endPoints.allAgents),agentRouter.list )
AgentRouter.get('/totalAgents',agentRouter.count)
export default AgentRouter;