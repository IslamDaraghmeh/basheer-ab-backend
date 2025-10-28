// Services/recording.service.js
import axios from "axios";

export const getRecordingPath = async (callid, tokenId) => {
  const url = "https://triplecore.ippbx.co.il/ippbx_api/v1.4/api/info/TENANT/recordingPath"; // استبدل YOUR_TENANT بالقيمة الحقيقية

  try {
    const response = await axios.post(
      url,
      {
        token_id: tokenId,
        callid: callid,
      },
      { timeout: 10000 } // 10 ثواني مهلة الانتظار
    );

    console.log("API response:", response.data);
    return response.data?.data?.recordingPath;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      console.error("Request timed out.");
    } else {
      console.error("API Error:", error.response?.data || error.message);
    }
    return null;
  }
};
