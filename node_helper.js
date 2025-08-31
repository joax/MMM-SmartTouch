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
    this.goveeStateUrl = "https://developer-api.govee.com/v1/devices/state";
    
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

  // Get current state of a specific Govee device
  getGoveeDeviceState: async function(deviceMac, deviceModel) {
    if (!this.goveeApiKey) {
      console.error("Govee API key not configured");
      return null;
    }

    try {
      const response = await axios.get(`${this.goveeStateUrl}?device=${deviceMac}&model=${deviceModel}`, {
        headers: {
          'Govee-API-Key': this.goveeApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 && response.data.data) {
        const state = response.data.data;
        console.log(`Device ${deviceMac} state:`, state);
        return {
          powerState: state.powerState,
          brightness: state.brightness,
          colorTemperature: state.color?.colorTemInKelvin || null
        };
      } else {
        console.log(`No state data for device ${deviceMac}`);
        return null;
      }
    } catch (error) {
      console.error(`Govee device state API error for ${deviceMac}: ${error.message}`);
      return null;
    }
  },

  // Enhanced method to get devices with their current states
  getGoveeDevicesWithStates: async function() {
    const devices = await this.getGoveeDevices();
    if (devices.length === 0) {
      return devices;
    }

    console.log(`Fetching states for ${devices.length} devices...`);
    
    // Get states for all devices in parallel
    const statePromises = devices.map(async device => {
      const state = await this.getGoveeDeviceState(device.device, device.model);
      
      if (state) {
        return {
          ...device,
          powerState: state.powerState,
          brightness: state.brightness,
          colorTemperature: state.colorTemperature
        };
      } else {
        // Fallback to defaults if state fetch fails
        return {
          ...device,
          powerState: device.powerState || "off",
          brightness: 100,
          colorTemperature: 6500
        };
      }
    });

    const devicesWithStates = await Promise.all(statePromises);
    console.log(`Retrieved states for ${devicesWithStates.length} devices`);
    
    return devicesWithStates;
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
      console.log("Fetching Govee devices with current states...")
      this.getGoveeDevicesWithStates()
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

    if (notification === "UPDATE_GOVEE_COLOR_TEMP") {
      const { device, model, colorTemperature } = payload;
      
      console.log(`Setting color temperature for device ${device} to ${colorTemperature}K`)
      
      // Try both possible command names for color temperature
      this.sendGoveeCommand({ name: "colorTem", value: colorTemperature }, device, model)
        .then(success => {
          if (!success) {
            console.log(`Trying alternative color temperature command format...`);
            return this.sendGoveeCommand({ name: "colorTemp", value: colorTemperature }, device, model);
          }
          return success;
        })
        .then(success => {
          if (success) {
            console.log(`Color temperature updated successfully`);
            this.sendSocketNotification("GOVEE_DEVICE_STATE_UPDATED", {
              device: device,
              colorTemperature: colorTemperature
            });
          } else {
            console.error(`Failed to update color temperature for device ${device}`);
          }
        });
    }

    if (notification === "UPDATE_GOVEE_BRIGHTNESS") {
      const { device, model, brightness } = payload;
      
      console.log(`Setting brightness for device ${device} to ${brightness}%`)
      
      this.sendGoveeCommand({ name: "brightness", value: brightness }, device, model)
        .then(success => {
          if (success) {
            console.log(`Brightness updated successfully`);
            this.sendSocketNotification("GOVEE_DEVICE_STATE_UPDATED", {
              device: device,
              brightness: brightness
            });
          } else {
            console.error(`Failed to update brightness for device ${device}`);
          }
        });
    }

    if (notification === "TOGGLE_ALL_GOVEE_DEVICES") {
      const { action, devices } = payload;
      
      console.log(`Turning all ${devices.length} devices ${action}`)
      console.log(`Device states before: ${devices.map(d => `${d.deviceName}:${d.powerState}`).join(', ')}`);
      
      // Process all devices in parallel
      const promises = devices.map(device => {
        console.log(`Sending ${action} command to device ${device.deviceName} (currently ${device.powerState})`);
        return this.sendGoveeCommand({ name: "turn", value: action }, device.device, device.model)
          .then(success => {
            if (success) {
              console.log(`Device ${device.deviceName} turned ${action} successfully`);
              return { device: device.device, success: true, newState: action };
            } else {
              console.error(`Failed to turn ${action} device ${device.deviceName}`);
              return { device: device.device, success: false, newState: device.powerState };
            }
          });
      });

      // Wait for all commands to complete
      Promise.all(promises).then(results => {
        console.log(`All devices command completed. ${results.filter(r => r.success).length}/${results.length} succeeded`);
        this.sendSocketNotification("ALL_GOVEE_DEVICES_TOGGLED", { 
          action: action,
          results: results
        });
      });
    }
  },
});
