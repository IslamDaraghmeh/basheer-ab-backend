// Controllers/call.controller.js
import CallModel from "#db/models/Call.model.js";
import { getRecordingPath } from "#services/recording.service.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";

export const getCallRecording = asyncHandler(async (req, res) => {
  const { insuredId } = req.params;
  const { callid, token_id } = req.body;

  if (!callid || !token_id) {
    return badRequestResponse(res, "callid and token_id are required");
  }

  let call = await CallModel.findOne({ callid });

  if (call) {
    logger.info("Call recording retrieved from database", { callid, insuredId });

    return successResponse(res, {
      callid: call.callid,
      insuredId,
      recordingUrl: call.recordingUrl
    }, "Call retrieved from the database");
  }

  const recordingUrl = await getRecordingPath(callid, token_id);

  if (!recordingUrl) {
    logger.warn("Recording not found", { callid, insuredId });
    return notFoundResponse(res, "Recording not found or request timed out");
  }

  call = await CallModel.create({
    callid,
    insuredId,
    recordingUrl,
  });

  logger.info("Call recording created and saved", { callid, insuredId, recordingUrl });

  return createdResponse(res, {
    callid: call.callid,
    insuredId: call.insuredId,
    recordingUrl: call.recordingUrl
  }, "Call created and recording saved");
});
