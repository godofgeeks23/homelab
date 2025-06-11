const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config("./.env");

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to send email
const sendEmail = async (to) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
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
