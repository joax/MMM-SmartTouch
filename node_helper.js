/* Magic Mirror
 * Node Helper: MMM-SmartTouch
 *
 * By SmartBuilds.io - Pratik and Eben
 * https://smartbuilds.io
 * MIT Licensed.
 */
const NodeHelper = require("node_helper")
const axios = require("axios")
require("dotenv").config({ path: __dirname + "/.env" })

module.exports = NodeHelper.create({
  start: function () {
    this.started = false;
    this.config = {};
    this.currentBrightness = 255; // Default brightness level
    
    // Govee API configuration
    this.goveeApiKey = process.env.GOVEE_API_KEY;
    this.goveeApiUrl = "https://developer-api.govee.com/v1/devices/control";
    this.goveeDevicesUrl = "https://developer-api.govee.com/v1/devices";
    
    if (!this.goveeApiKey) {
      console.warn("Govee API key missing. Please check your .env file.");
    }
  },

  // Govee API methods
  sendGoveeCommand: async function(command, deviceMac, deviceModel) {
    if (!this.goveeApiKey || !deviceMac || !deviceModel) {
      console.error("Govee API not configured properly or missing device parameters");
      return false;
    }

    try {
      const response = await axios.put(this.goveeApiUrl, {
        device: deviceMac,
        model: deviceModel,
        cmd: command
      }, {
        headers: {
          'Govee-API-Key': this.goveeApiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Govee API response: ${response.status} - ${response.data.message || 'Success'}`);
      return response.status === 200;
    } catch (error) {
      console.error(`Govee API error: ${error.message}`);
      return false;
    }
  },

  // Get list of Govee devices
  getGoveeDevices: async function() {
    if (!this.goveeApiKey) {
      console.error("Govee API key not configured");
      return [];
    }

    try {
      const response = await axios.get(this.goveeDevicesUrl, {
        headers: {
          'Govee-API-Key': this.goveeApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.data && response.data.data.devices) {
        console.log(`Found ${response.data.data.devices.length} Govee devices`);
        return response.data.data.devices;
      } else {
        console.log("No Govee devices found");
        return [];
      }
    } catch (error) {
      console.error(`Govee devices API error: ${error.message}`);
      return [];
    }
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



    if (notification === "GET_GOVEE_DEVICES") {
      console.log("Fetching Govee devices...")
      this.getGoveeDevices()
        .then(devices => {
          this.sendSocketNotification("GOVEE_DEVICES_LIST", devices);
        });
    }

    if (notification === "TOGGLE_GOVEE_DEVICE") {
      const { device, model, currentState } = payload;
      const newState = currentState === "on" ? "off" : "on";
      
      console.log(`Toggling device ${device} from ${currentState} to ${newState}`)
      
      this.sendGoveeCommand({ name: "turn", value: newState }, device, model)
        .then(success => {
          if (success) {
            this.sendSocketNotification("GOVEE_DEVICE_TOGGLED", { 
              device: device, 
              newState: newState 
            });
          } else {
            console.error(`Failed to toggle device ${device}`);
          }
        });
    }
  },
});
