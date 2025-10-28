import { Router } from "express";
import * as agentRouter from './controller/Agents.controller.js'
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./Agents.endpoint.js";

const AgentRouter=Router();
AgentRouter.post('/addAgents', auth(endPoints.addAgents) ,agentRouter.addAgents)
AgentRouter.delete('/deleteAgents/:id',auth(endPoints.deleteAgents), agentRouter.deleteAgents)
AgentRouter.patch('/updateAgents/:id',auth(endPoints.updateAgents),agentRouter.updateAgents)
AgentRouter.get('/all',auth(endPoints.allAgents),agentRouter.allAgents )
AgentRouter.get('/totalAgents',agentRouter.totalAgents)
export default AgentRouter;