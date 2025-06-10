const nodemailer = require("nodemailer");
const dotenv = require("dotenv").config("./.env");

const emailConfig = {
  HOST: process.env.SMTP_HOST,
  PORT: process.env.SMTP_PORT,
  SECURE: process.env.SMTP_SECURE,
  FROM: process.env.SMTP_FROM,
  AUTH: {
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
  },
};

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: emailConfig.HOST,
  port: emailConfig.PORT,
  secure: emailConfig.SECURE === "true",
  auth: {
    user: emailConfig.AUTH.USER,
    pass: emailConfig.AUTH.PASS,
  },
});

// Function to send email
const sendEmail = async (to) => {
  try {
    const mailOptions = {
      from: emailConfig.FROM,
      to,
      subject: "Notification Test",
      html: "This is a test email",
    };

    console.log("Sending email to:", to);

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

// module.exports = {
//   sendEmail,
// };

sendEmail("aviralji4@gmail.com");
