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

    const requestData = {
      device: deviceMac,
      model: deviceModel,
      cmd: command
    };

    console.log(`Sending Govee API request:`, JSON.stringify(requestData, null, 2));

    try {
      const response = await axios.put(this.goveeApiUrl, requestData, {
        headers: {
          'Govee-API-Key': this.goveeApiKey,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Govee API response: ${response.status} - ${JSON.stringify(response.data)}`);
      return response.status === 200;
    } catch (error) {
      console.error(`Govee API error: ${error.message}`);
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  },

  // Get list of Govee devices with their capabilities
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
        const devices = response.data.data.devices;
        console.log(`Found ${devices.length} Govee devices`);
        
        // Process devices to extract color temperature capabilities
        const devicesWithCapabilities = devices.map(device => {
          const processedDevice = { ...device };
          
          // Extract color temperature range if available
          if (device.properties && device.properties.colorTem && device.properties.colorTem.range) {
            const colorTempRange = device.properties.colorTem.range;
            processedDevice.colorTempRange = {
              min: colorTempRange.min || 2000,
              max: colorTempRange.max || 9000
            };
            processedDevice.supportsColorTemp = true;
            console.log(`Device ${device.device} (${device.model}) supports color temp: ${colorTempRange.min}K - ${colorTempRange.max}K`);
          } else {
            processedDevice.supportsColorTemp = false;
            console.log(`Device ${device.device} (${device.model}) does not support color temperature`);
          }
          
          return processedDevice;
        });
        
        return devicesWithCapabilities;
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
        
        // Parse properties array format
        if (state.properties && Array.isArray(state.properties)) {
          const properties = state.properties;
          console.log(`Analyzing properties for ${deviceMac}:`, JSON.stringify(properties, null, 2));
          
          // Find power state
          const powerProp = properties.find(p => p.powerState !== undefined);
          const powerState = powerProp ? powerProp.powerState : "unknown";
          console.log(`Power state property:`, powerProp);
          
          // Find brightness
          const brightnessProp = properties.find(p => p.brightness !== undefined);
          const brightness = brightnessProp ? brightnessProp.brightness : 50;
          console.log(`Brightness property:`, brightnessProp);
          
          // Find color temperature - check multiple possible property names
          const colorTempProp = properties.find(p => 
            p.colorTem !== undefined || 
            p.colorTemp !== undefined || 
            p.colorTemInKelvin !== undefined ||
            p.ct !== undefined ||
            (p.color && p.color.colorTemInKelvin !== undefined)
          );
          console.log(`Color temp property:`, colorTempProp);
          
          let colorTemperature = 6500; // default
          if (colorTempProp) {
            if (colorTempProp.colorTem !== undefined) {
              colorTemperature = colorTempProp.colorTem;
            } else if (colorTempProp.colorTemp !== undefined) {
              colorTemperature = colorTempProp.colorTemp;
            } else if (colorTempProp.colorTemInKelvin !== undefined) {
              colorTemperature = colorTempProp.colorTemInKelvin;
            } else if (colorTempProp.ct !== undefined) {
              colorTemperature = colorTempProp.ct;
            } else if (colorTempProp.color && colorTempProp.color.colorTemInKelvin !== undefined) {
              colorTemperature = colorTempProp.color.colorTemInKelvin;
            }
          }
          
          const parsedState = {
            powerState: powerState,
            brightness: brightness,
            colorTemperature: colorTemperature
          };
          
          console.log(`Parsed state for ${deviceMac}: power=${parsedState.powerState}, brightness=${parsedState.brightness}%, colorTemp=${parsedState.colorTemperature}K`);
          
          return parsedState;
        } else {
          // Fallback for different response format
          return {
            powerState: state.powerState || "unknown",
            brightness: state.brightness || 50,
            colorTemperature: state.color?.colorTemInKelvin || 6500
          };
        }
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
      
      let deviceWithState;
      if (state) {
        deviceWithState = {
          ...device,
          powerState: state.powerState,
          brightness: state.brightness,
          colorTemperature: state.colorTemperature
        };
        console.log(`✓ Device ${device.deviceName} state: ${state.powerState}, ${state.brightness}%, ${state.colorTemperature}K`);
      } else {
        // Fallback to defaults if state fetch fails
        deviceWithState = {
          ...device,
          powerState: device.powerState || "off",
          brightness: 100,
          colorTemperature: 6500
        };
        console.log(`⚠ Device ${device.deviceName} state fetch failed, using defaults: off, 100%, 6500K`);
      }
      
      return deviceWithState;
    });

    const devicesWithStates = await Promise.all(statePromises);
    console.log(`Retrieved states for ${devicesWithStates.length} devices`);
    
    return devicesWithStates;
  },

  socketNotificationReceived: async function (notification, payload) {
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

    if (notification === "GET_GOVEE_DEVICE_STATE") {
      const { device, model } = payload;
      console.log(`Fetching fresh state for device ${device} (${model})`);
      
      this.getGoveeDeviceState(device, model)
        .then(state => {
          if (state) {
            console.log(`Fresh state for ${device}: power=${state.powerState}, brightness=${state.brightness}%, colorTemp=${state.colorTemperature}K`);
            this.sendSocketNotification("GOVEE_DEVICE_FRESH_STATE", {
              device: device,
              powerState: state.powerState,
              brightness: state.brightness,
              colorTemperature: state.colorTemperature
            });
          } else {
            console.warn(`Failed to get fresh state for device ${device}`);
          }
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
      const { device, model, colorTemperature, deviceRange } = payload;
      
      console.log(`Attempting to set color temperature for device ${device} (model: ${model}) to ${colorTemperature}K`);
      
      // Use device-specific range if provided, otherwise use default
      const minTemp = deviceRange ? deviceRange.min : 2000;
      const maxTemp = deviceRange ? deviceRange.max : 9000;
      
      // Validate color temperature range
      if (colorTemperature < minTemp || colorTemperature > maxTemp) {
        console.error(`Invalid color temperature: ${colorTemperature}K. Device ${model} supports ${minTemp}K - ${maxTemp}K`);
        this.sendSocketNotification("GOVEE_DEVICE_ERROR", {
          device: device,
          error: `Invalid color temperature range: ${colorTemperature}K. This device supports ${minTemp}K - ${maxTemp}K`
        });
        return;
      }
      
      // Try the standard color temperature command
      this.sendGoveeCommand({ name: "colorTem", value: colorTemperature }, device, model)
        .then(success => {
          if (success) {
            console.log(`Color temperature updated successfully to ${colorTemperature}K`);
            this.sendSocketNotification("GOVEE_DEVICE_STATE_UPDATED", {
              device: device,
              colorTemperature: colorTemperature
            });
          } else {
            // Color temperature command failed - device likely doesn't support it
            console.warn(`Device ${device} (model: ${model}) does not support color temperature control via API`);
            console.warn(`This is a known limitation with some Govee models. Color temperature may only be available through the Govee app.`);
            
            this.sendSocketNotification("GOVEE_DEVICE_ERROR", {
              device: device,
              error: "Color temperature not supported by this device model",
              suggestion: "Use the Govee app to change color temperature"
            });
          }
        })
        .catch(error => {
          console.error(`Color temperature update error for device ${device}: ${error.message}`);
          this.sendSocketNotification("GOVEE_DEVICE_ERROR", {
            device: device,
            error: `API error: ${error.message}`
          });
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
