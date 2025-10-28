// Controllers/call.controller.js
import CallModel from "../../../../DB/models/Call.model.js";
import { getRecordingPath } from "../../../services/recording.service.js";

export const getCallRecording = async (req, res) => {
  try {
    const { insuredId } = req.params;
    const { callid, token_id } = req.body;

    if (!callid || !token_id) {
      return res.status(400).json({ message: "callid and token_id are required" });
    }

    let call = await CallModel.findOne({ callid });

    if (call) {
      return res.status(200).json({
        message: "Call retrieved from the database",
        callid: call.callid,
        insuredId,
        recordingUrl: call.recordingUrl,
      });
    }

    const recordingUrl = await getRecordingPath(callid, token_id);

    if (!recordingUrl) {
      return res.status(404).json({ message: "Recording not found or request timed out" });
    }

    call = await CallModel.create({
      callid,
      insuredId,
      recordingUrl,
    });

    return res.status(201).json({
      message: "Call created and recording saved",
      callid: call.callid,
      insuredId: call.insuredId,
      recordingUrl: call.recordingUrl,
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while retrieving the recording",
      error: error.message,
    });
  }
};
