const axios = require("axios");
const FormData = require("form-data");

const sendNotification = async (title, message) => {
  const gotifyServer = process.env.GOTIFY_HOST_SERVER;
  const gotifyToken = process.env.GOTIFY_APP_TOKEN;
  const url = `${gotifyServer}/message?token=${gotifyToken}`;

  const form = new FormData();
  form.append("title", title);
  form.append("message", message);
  form.append("priority", "5");

  try {
    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
    });
    console.log("Notification sent successfully:", response.data);
  } catch (error) {
    console.error(
      "Error sending notification:",
      error.response?.data || error.message
    );
  }
};

module.exports = sendNotification;
