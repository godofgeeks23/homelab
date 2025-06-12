const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const { execSync } = require("child_process");
dotenv.config({ path: "./.env" });

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
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

// Get battery info and parse it
const getBatteryInfo = () => {
  try {
    const command = `upower -i /org/freedesktop/UPower/devices/battery_BAT1 | grep -E "state|percentage"`;
    const result = execSync(command, { encoding: "utf-8" });

    const stateMatch = result.match(/state:\s+(\w+)/);
    const percentageMatch = result.match(/percentage:\s+(\d+)%/);

    const state = stateMatch ? stateMatch[1] : null;
    const percentage = percentageMatch ? parseInt(percentageMatch[1]) : null;

    return { state, percentage };
  } catch (error) {
    console.error("Failed to get battery info:", error);
    sendEmail(
      process.env.ALERT_EMAIL,
      "❌ Homelab: Battery Error",
      `<p>Failed to get battery info: ${error}</p>`
    );
    return null;
  }
};
let prevState = null;
let notifiedLevels = new Set();

const monitorBattery = () => {
  const info = getBatteryInfo();
  if (!info) return;

  const { state, percentage } = info;
  console.log(`Battery State: ${state}, Percentage: ${percentage}%`);

  const sendAlert = (subject, html) => {
    sendEmail(process.env.ALERT_EMAIL, subject, html);
  };

  // 1. When it gets plugged in (charging started)
  if (state === "charging" && prevState !== "charging") {
    sendAlert(
      "✅ Homelab: Server Battery Charging",
      `<p>Your homelab server is plugged in and charging.</p>`
    );
  }

  // 2. When it is fully charged
  if (state === "fully" && prevState !== "fully") {
    sendAlert(
      "✅ Homelab: Server Battery Fully Charged",
      `<p>Your homelab server's battery is <strong>fully charged</strong>. You may unplug the power cord.</p>`
    );
  }

  // 3, 4, 5. When discharging and battery is below 20, 10, and 5%
  if (state === "discharging") {
    if (percentage <= 5 && !notifiedLevels.has("5")) {
      sendAlert(
        `🔴 Homelab: Battery Critically Low (${percentage}%)`,
        `<p>Battery is at <strong>${percentage}%</strong>. Plug in immediately to avoid shutdown!</p>`
      );
      notifiedLevels.add("5");
    } else if (percentage <= 10 && !notifiedLevels.has("10")) {
      sendAlert(
        `🟠 Homelab: Battery Very Low (${percentage}%)`,
        `<p>Battery is at <strong>${percentage}%</strong>. Please plug in soon.</p>`
      );
      notifiedLevels.add("10");
    } else if (percentage <= 20 && !notifiedLevels.has("20")) {
      sendAlert(
        `🟡 Homelab: Battery Low (${percentage}%)`,
        `<p>Battery is at <strong>${percentage}%</strong>. Consider plugging in.</p>`
      );
      notifiedLevels.add("20");
    }
  } else {
    // Clear notified levels when no longer discharging
    notifiedLevels.clear();
  }

  // Save previous state
  prevState = state;
};

// Run every 5 minutes
setInterval(monitorBattery, 60 * 1000);

// Run once at startup
monitorBattery();
