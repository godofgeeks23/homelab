const { execSync } = require("child_process");
const sendEmail = require("./emailClient");
const sendNotification = require("./gotifyClient");

const NOTIFICATION_MODULES = ["gotify"];

const batteryDevice = "/org/freedesktop/UPower/devices/battery_BAT1";

// Get battery info and parse it
const getBatteryInfo = () => {
  try {
    const command = `upower -i ${batteryDevice} | grep -E "state|percentage"`;
    const result = execSync(command, { encoding: "utf-8" });

    const stateMatch = result.match(/state:\s+(\w+)/);
    const percentageMatch = result.match(/percentage:\s+(\d+)%/);

    const state = stateMatch ? stateMatch[1] : null;
    const percentage = percentageMatch ? parseInt(percentageMatch[1]) : null;

    return { state, percentage };
  } catch (error) {
    console.error("Failed to get battery info:", error);
    sendAlert(
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

  const sendAlert = (subject, content) => {
    NOTIFICATION_MODULES.forEach((module) => {
      if (module === "email") {
        sendEmail(process.env.ALERT_EMAIL, subject, content);
      } else if (module === "gotify") {
        sendNotification(subject, content);
      }
    });
  };

  // 1. When it gets plugged in (charging started)
  if (state === "charging" && prevState !== "charging") {
    sendAlert(
      "✅ Homelab: Server Battery Charging",
      `Your homelab server is plugged in and charging.`
    );
  }

  // 2. When it is fully charged
  if (state === "fully" && prevState !== "fully") {
    sendAlert(
      "✅ Homelab: Server Battery Fully Charged",
      `Your homelab server's battery is fully charged. You may unplug the power cord`
    );
  }

  // 3, 4, 5. When discharging and battery is below 20, 10, and 5%
  if (state === "discharging") {
    if (percentage <= 5 && !notifiedLevels.has("5")) {
      sendAlert(
        `🔴 Homelab: Battery Critically Low (${percentage}%)`,
        `Battery is at ${percentage}% Plug in immediately to avoid shutdown!`
      );
      notifiedLevels.add("5");
    } else if (percentage <= 10 && !notifiedLevels.has("10")) {
      sendAlert(
        `🟠 Homelab: Battery Very Low (${percentage}%)`,
        `Battery is at ${percentage}% Please plug in soon.`
      );
      notifiedLevels.add("10");
    } else if (percentage <= 20 && !notifiedLevels.has("20")) {
      sendAlert(
        `🟡 Homelab: Battery Low (${percentage}%)`,
        `Battery is at ${percentage}% Consider plugging in.`
      );
      notifiedLevels.add("20");
    }
  } else {
    // Clear notified levels when no longer discharging
    notifiedLevels.clear();
  }

  // Save previous state
  if (state != "pending") {
    prevState = state;
  }
};

// Run every 5 minutes
setInterval(monitorBattery, 20 * 1000);

// Run once at startup
monitorBattery();
