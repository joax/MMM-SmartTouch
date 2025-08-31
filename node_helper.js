/* Magic Mirror
 * Node Helper: MMM-SmartTouch
 *
 * By SmartBuilds.io - Pratik and Eben
 * https://smartbuilds.io
 * MIT Licensed.
 */
const NodeHelper = require("node_helper")

module.exports = NodeHelper.create({
  start: function () {
    this.started = false;
    this.config = {};
    this.currentBrightness = 255; // Default brightness level
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'CONFIG') {
      if (!this.started) {
        this.config = payload;
        this.started = true;
        console.log("Smart Touch module has started")
        this.sendSocketNotification("SHUTIT", payload);
      }
    }

    if (notification === "SHUTDOWN") {
      console.log("Shutting down Rpi...")
      require('child_process').exec('shutdown -h now', console.log)
    }

    if (notification === "RESTART") {
      console.log("Restarting Rpi...")
      require('child_process').exec('sudo reboot', console.log)
    }

    if (notification === "BRIGHTNESS_UP") {
      this.currentBrightness = Math.min(255, this.currentBrightness + 25);
      console.log(`Increasing brightness to ${this.currentBrightness}`)
      require('child_process').exec(`brightness ${this.currentBrightness}`, (error, stdout, stderr) => {
        if (error) {
          console.log(`Brightness error: ${error}`);
          return;
        }
        this.sendSocketNotification("BRIGHTNESS_CHANGED", this.currentBrightness);
      });
    }

    if (notification === "BRIGHTNESS_DOWN") {
      this.currentBrightness = Math.max(0, this.currentBrightness - 25);
      console.log(`Decreasing brightness to ${this.currentBrightness}`)
      require('child_process').exec(`brightness ${this.currentBrightness}`, (error, stdout, stderr) => {
        if (error) {
          console.log(`Brightness error: ${error}`);
          return;
        }
        this.sendSocketNotification("BRIGHTNESS_CHANGED", this.currentBrightness);
      });
    }

    if (notification === "GET_BRIGHTNESS") {
      require('child_process').exec('brightness', (error, stdout, stderr) => {
        if (error) {
          console.log(`Brightness check error: ${error}`);
          return;
        }
        const brightness = parseInt(stdout.trim()) || this.currentBrightness;
        this.currentBrightness = brightness;
        this.sendSocketNotification("BRIGHTNESS_CHANGED", this.currentBrightness);
      });
    }
  },
});
