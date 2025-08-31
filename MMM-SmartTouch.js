/* Magic Mirror
 * MMM-SmartTouch.js
 *
 * By SmartBuilds.io - Pratik and Eben
 * https://smartbuilds.io
 * MIT Licensed.
 */

Module.register("MMM-SmartTouch", {
  defaults: {
  },

  start: function () {
    Log.info(this.name + " has started...");
    this.currentBrightness = 255; // Default brightness level
    this.goveeDevices = []; // Store Govee devices
    this.expandedDeviceMac = null; // Track which device is currently expanded
    this.sendSocketNotification("CONFIG", this.config);
    // Get current brightness level on startup
    this.sendSocketNotification("GET_BRIGHTNESS", {});
    // Get Govee devices on startup
    this.sendSocketNotification("GET_GOVEE_DEVICES", {});
  },

  getStyles: function () {
    return [this.file("css/mmm-smarttouch.css"), "font-awesome.css"];
  },

  // Load translations files
  getTranslations: function () {
    return {
      en: "translations/en.json",
      nb: "translations/nb.json",
    };
  },

  createContainerDiv: function () {
    const containerDiv = document.createElement("div");
    containerDiv.className = "st-container";

    return containerDiv;
  },

  toggleStandby: function () {
    const existingBodyClass = document.body.className;
    if (existingBodyClass === "st-standby show") {
      document.body.className = "st-standby fade";
    } else {
      document.body.className = "st-standby show";
    }
  },

  createStandByButtonDiv: function () {
    const standByButtonDiv = document.createElement("div");
    standByButtonDiv.className = "st-container__standby-button";

    standByButtonDiv.appendChild(document.createElement("span"))
    standByButtonDiv.addEventListener("click", () => this.toggleStandby());

    return standByButtonDiv;
  },

  toggleSideMenu: function () {
    const menuToggleDiv = document.getElementById("st-menu-toggle")
    menuToggleDiv.classList.toggle('show');

    const mainMenuDiv = document.getElementById("st-main-menu")
    mainMenuDiv.classList.toggle('show')
  },

  toggleGoveeMenu: function () {
    const goveeToggleDiv = document.getElementById("st-govee-toggle")
    goveeToggleDiv.classList.toggle('show');

    const goveeMenuDiv = document.getElementById("st-govee-menu")
    goveeMenuDiv.classList.toggle('show')
  },

  createMenuToggleButtonDiv: function () {
    const menuToggleButtonDiv = document.createElement("div");
    menuToggleButtonDiv.className = "st-container__menu-toggle";
    menuToggleButtonDiv.id = "st-menu-toggle";

    const hamburgerLineOne = document.createElement("div");
    hamburgerLineOne.className = "st-container__menu-toggle st-toggle__bar_one";

    const hamburgerLineTwo = document.createElement("div");
    hamburgerLineTwo.className = "st-toggle__bar_two";

    const hamburgerLineThree = document.createElement("div");
    hamburgerLineThree.className = "st-toggle__bar_three";

    menuToggleButtonDiv.appendChild(hamburgerLineOne);
    menuToggleButtonDiv.appendChild(hamburgerLineTwo);
    menuToggleButtonDiv.appendChild(hamburgerLineThree);

    menuToggleButtonDiv.addEventListener("click", () => this.toggleSideMenu());

    return menuToggleButtonDiv;
  },

  createGoveeToggleButtonDiv: function () {
    const goveeToggleButtonDiv = document.createElement("div");
    goveeToggleButtonDiv.className = "st-container__govee-toggle";
    goveeToggleButtonDiv.id = "st-govee-toggle";

    const lightbulbIcon = document.createElement("span");
    lightbulbIcon.className = "fa fa-lightbulb-o fa-2x";
    
    goveeToggleButtonDiv.appendChild(lightbulbIcon);
    goveeToggleButtonDiv.addEventListener("click", () => this.toggleGoveeMenu());

    return goveeToggleButtonDiv;
  },

  createShutdownButton: function () {
    const shutdownButtonItem = document.createElement("li");
    shutdownButtonItem.innerHTML = "<span class='fa fa-power-off fa-lg'></span>"
        + "<br>" +  this.translate('SHUTDOWN');
    shutdownButtonItem.className = "li-t"

    // Send shutdown notification when clicked
    shutdownButtonItem.addEventListener("click",
        () => this.sendSocketNotification("SHUTDOWN", {}));

    return shutdownButtonItem
  },

  createRestartButton: function () {
    const restartButtonItem = document.createElement("li");
    restartButtonItem.innerHTML = "<span class='fa fa-repeat fa-lg'></span>"
        + "<br>" + this.translate('RESTART');
    restartButtonItem.className = "li-t"

    // Send restart notification when clicked
    restartButtonItem.addEventListener("click",
        () => this.sendSocketNotification("RESTART", {}));

    return restartButtonItem
  },

  createBrightnessUpButton: function () {
    const brightnessUpButtonItem = document.createElement("li");
    brightnessUpButtonItem.innerHTML = "<span class='fa fa-sun-o fa-lg'></span>"
        + "<br>" + this.translate('BRIGHTNESS_UP');
    brightnessUpButtonItem.className = "li-t"

    // Send brightness up notification when clicked
    brightnessUpButtonItem.addEventListener("click",
        () => this.sendSocketNotification("BRIGHTNESS_UP", {}));

    return brightnessUpButtonItem
  },

  createBrightnessDownButton: function () {
    const brightnessDownButtonItem = document.createElement("li");
    brightnessDownButtonItem.innerHTML = "<span class='fa fa-moon-o fa-lg'></span>"
        + "<br>" + this.translate('BRIGHTNESS_DOWN');
    brightnessDownButtonItem.className = "li-t"

    // Send brightness down notification when clicked
    brightnessDownButtonItem.addEventListener("click",
        () => this.sendSocketNotification("BRIGHTNESS_DOWN", {}));

    return brightnessDownButtonItem
  },



  createMainMenuDiv: function () {
    const mainMenuDiv = document.createElement("div");
    mainMenuDiv.className = "st-container__main-menu";
    mainMenuDiv.id = "st-main-menu";

    const shutdownButton = this.createShutdownButton();
    const restartButton = this.createRestartButton();
    const brightnessUpButton = this.createBrightnessUpButton();
    const brightnessDownButton = this.createBrightnessDownButton();

    const buttonList = document.createElement("ul");
    buttonList.appendChild(brightnessUpButton);
    buttonList.appendChild(brightnessDownButton);
    buttonList.appendChild(shutdownButton);
    buttonList.appendChild(restartButton);

    mainMenuDiv.appendChild(buttonList);

    return mainMenuDiv;
  },

  createGoveeDeviceButton: function (device) {
    const deviceButtonItem = document.createElement("li");
    const statusIcon = device.powerState === "on" ? "fa-lightbulb-o" : "fa-circle-o";
    deviceButtonItem.innerHTML = `<span class='fa ${statusIcon} fa-lg'></span>`
        + "<br>" + device.deviceName;
    deviceButtonItem.className = "li-t govee-device"
    deviceButtonItem.dataset.deviceMac = device.device;
    deviceButtonItem.dataset.deviceModel = device.model;
    deviceButtonItem.dataset.expanded = "false";

    // Toggle expanded controls when clicked
    deviceButtonItem.addEventListener("click", () => {
      this.toggleDeviceControls(deviceButtonItem, device);
    });

    return deviceButtonItem;
  },

  toggleDeviceControls: function (deviceElement, device) {
    const isExpanded = deviceElement.dataset.expanded === "true";
    const goveeMenu = document.getElementById("st-govee-menu");
    
    if (isExpanded) {
      // Collapse - remove controls and restore original content
      this.collapseDeviceControls(deviceElement, device);
      // Check if any devices are still expanded
      const hasExpanded = goveeMenu.querySelector('.expanded');
      if (!hasExpanded) {
        goveeMenu.classList.remove('has-expanded');
        this.expandedDeviceMac = null; // Clear expanded device tracking
      }
    } else {
      // Collapse any other expanded devices first
      const otherExpanded = goveeMenu.querySelectorAll('.expanded');
      otherExpanded.forEach(el => {
        const deviceMac = el.dataset.deviceMac;
        const deviceObj = this.goveeDevices.find(d => d.device === deviceMac);
        if (deviceObj) {
          this.collapseDeviceControls(el, deviceObj);
        }
      });
      
      // Expand this device
      this.expandDeviceControls(deviceElement, device);
      goveeMenu.classList.add('has-expanded');
      this.expandedDeviceMac = device.device; // Track expanded device
    }
  },

  collapseDeviceControls: function (deviceElement, device) {
    const statusIcon = device.powerState === "on" ? "fa-lightbulb-o" : "fa-circle-o";
    deviceElement.innerHTML = `<span class='fa ${statusIcon} fa-lg'></span>`
        + "<br>" + device.deviceName;
    deviceElement.dataset.expanded = "false";
    deviceElement.classList.remove("expanded");
    
    // Clear expanded tracking if this was the expanded device
    if (this.expandedDeviceMac === device.device) {
      this.expandedDeviceMac = null;
    }
  },

  expandDeviceControls: function (deviceElement, device) {
    const statusIcon = device.powerState === "on" ? "fa-lightbulb-o" : "fa-circle-o";
    
    // Create the expanded content structure
    const deviceHeader = document.createElement("div");
    deviceHeader.className = "device-header";
    deviceHeader.innerHTML = `<span class='fa ${statusIcon} fa-lg'></span><span class="device-name">${device.deviceName}</span>`;
    
    const deviceControls = document.createElement("div");
    deviceControls.className = "device-controls";
    
    // Power button
    const powerBtn = document.createElement("button");
    powerBtn.className = `power-btn ${device.powerState}`;
    powerBtn.innerHTML = '<span class="fa fa-power-off"></span>';
    powerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDevicePower(device.device, device.model, device.powerState);
    });
    
    // Warm control group
    const warmGroup = document.createElement("div");
    warmGroup.className = "control-group";
    warmGroup.innerHTML = `<label>Warm:</label><span class="value-display">${device.colorTemperature || 6500}K</span>`;
    
    const warmSlider = document.createElement("input");
    warmSlider.type = "range";
    warmSlider.className = "warm-slider";
    warmSlider.min = "2000";
    warmSlider.max = "9000";
    warmSlider.value = device.colorTemperature || 6500;
    warmSlider.addEventListener("change", (e) => {
      e.stopPropagation();
      console.log(`Warm slider changed to: ${e.target.value}K for device ${device.device}`);
      this.updateDeviceWarm(device.device, device.model, e.target.value);
      warmGroup.querySelector('.value-display').textContent = e.target.value + 'K';
    });
    
    // Also handle input event for real-time feedback
    warmSlider.addEventListener("input", (e) => {
      e.stopPropagation();
      warmGroup.querySelector('.value-display').textContent = e.target.value + 'K';
    });
    warmGroup.insertBefore(warmSlider, warmGroup.querySelector('.value-display'));
    
    // Intensity control group
    const intensityGroup = document.createElement("div");
    intensityGroup.className = "control-group";
    intensityGroup.innerHTML = `<label>Intensity:</label><span class="value-display">${device.brightness || 100}%</span>`;
    
    const intensitySlider = document.createElement("input");
    intensitySlider.type = "range";
    intensitySlider.className = "intensity-slider";
    intensitySlider.min = "1";
    intensitySlider.max = "100";
    intensitySlider.value = device.brightness || 100;
    intensitySlider.addEventListener("change", (e) => {
      e.stopPropagation();
      console.log(`Intensity slider changed to: ${e.target.value}% for device ${device.device}`);
      this.updateDeviceIntensity(device.device, device.model, e.target.value);
      intensityGroup.querySelector('.value-display').textContent = e.target.value + '%';
    });
    
    // Also handle input event for real-time feedback
    intensitySlider.addEventListener("input", (e) => {
      e.stopPropagation();
      intensityGroup.querySelector('.value-display').textContent = e.target.value + '%';
    });
    intensityGroup.insertBefore(intensitySlider, intensityGroup.querySelector('.value-display'));
    
    // Assemble the controls
    deviceControls.appendChild(powerBtn);
    deviceControls.appendChild(warmGroup);
    deviceControls.appendChild(intensityGroup);
    
    // Clear and add new content
    deviceElement.innerHTML = '';
    deviceElement.appendChild(deviceHeader);
    deviceElement.appendChild(deviceControls);
    
    deviceElement.dataset.expanded = "true";
    deviceElement.classList.add("expanded");
  },

  toggleDevicePower: function (deviceMac, deviceModel, currentState) {
    this.sendSocketNotification("TOGGLE_GOVEE_DEVICE", {
      device: deviceMac,
      model: deviceModel,
      currentState: currentState
    });
  },

  updateDeviceWarm: function (deviceMac, deviceModel, colorTemp) {
    console.log(`Sending color temp update: ${colorTemp}K to device ${deviceMac}`);
    console.log(`Expanded device: ${this.expandedDeviceMac}`);
    this.sendSocketNotification("UPDATE_GOVEE_COLOR_TEMP", {
      device: deviceMac,
      model: deviceModel,
      colorTemperature: parseInt(colorTemp)
    });
  },

  updateDeviceIntensity: function (deviceMac, deviceModel, brightness) {
    this.sendSocketNotification("UPDATE_GOVEE_BRIGHTNESS", {
      device: deviceMac,
      model: deviceModel,
      brightness: parseInt(brightness)
    });
  },

  updateExpandedDeviceValues: function (deviceMac, brightness, colorTemperature) {
    // Only update if this device is currently expanded
    if (this.expandedDeviceMac !== deviceMac) {
      return;
    }

    const expandedElement = document.querySelector(`[data-device-mac="${deviceMac}"].expanded`);
    if (!expandedElement) {
      return;
    }

    // Update brightness slider and display if provided
    if (brightness !== undefined) {
      const intensitySlider = expandedElement.querySelector('.intensity-slider');
      if (intensitySlider) {
        intensitySlider.value = brightness;
        // Find the value display in the same control group
        const controlGroup = intensitySlider.closest('.control-group');
        const intensityDisplay = controlGroup ? controlGroup.querySelector('.value-display') : null;
        if (intensityDisplay) {
          intensityDisplay.textContent = brightness + '%';
        }
      }
    }

    // Update color temperature slider and display if provided
    if (colorTemperature !== undefined) {
      const warmSlider = expandedElement.querySelector('.warm-slider');
      if (warmSlider) {
        warmSlider.value = colorTemperature;
        // Find the value display in the same control group
        const controlGroup = warmSlider.closest('.control-group');
        const warmDisplay = controlGroup ? controlGroup.querySelector('.value-display') : null;
        if (warmDisplay) {
          warmDisplay.textContent = colorTemperature + 'K';
        }
      }
    }
  },

  createAllLightsButton: function () {
    const allButtonItem = document.createElement("li");
    allButtonItem.className = "li-t all-lights-button";
    
    // Determine if most devices are on or off to decide the action
    const onDevices = this.goveeDevices.filter(d => d.powerState === "on").length;
    const totalDevices = this.goveeDevices.length;
    const mostlyOn = onDevices > totalDevices / 2;
    
    const action = mostlyOn ? "off" : "on";
    const icon = mostlyOn ? "fa-moon-o" : "fa-sun-o";
    const text = mostlyOn ? "Turn All Off" : "Turn All On";
    
    allButtonItem.innerHTML = `<span class='fa ${icon} fa-lg'></span><br>${text}`;
    allButtonItem.dataset.action = action;
    
    allButtonItem.addEventListener("click", () => {
      this.toggleAllLights(action);
    });

    return allButtonItem;
  },

  toggleAllLights: function (action) {
    console.log(`Turning all lights ${action}`);
    this.sendSocketNotification("TOGGLE_ALL_GOVEE_DEVICES", {
      action: action,
      devices: this.goveeDevices
    });
  },

  createGoveeMenuDiv: function () {
    const goveeMenuDiv = document.createElement("div");
    goveeMenuDiv.className = "st-container__govee-menu";
    goveeMenuDiv.id = "st-govee-menu";

    const deviceList = document.createElement("ul");
    
    if (this.goveeDevices.length === 0) {
      const noDevicesItem = document.createElement("li");
      noDevicesItem.innerHTML = "<span class='fa fa-exclamation-triangle fa-lg'></span><br>No Devices";
      noDevicesItem.className = "li-t";
      deviceList.appendChild(noDevicesItem);
    } else {
      // Add "Turn All On/Off" button at the top
      const allButton = this.createAllLightsButton();
      deviceList.appendChild(allButton);
      
      // Add separator
      const separator = document.createElement("li");
      separator.className = "menu-separator";
      deviceList.appendChild(separator);
      
      // Add individual devices
      this.goveeDevices.forEach(device => {
        const deviceButton = this.createGoveeDeviceButton(device);
        deviceList.appendChild(deviceButton);
      });
    }

    goveeMenuDiv.appendChild(deviceList);
    return goveeMenuDiv;
  },

  refreshGoveeMenu: function () {
    const goveeMenuDiv = document.getElementById("st-govee-menu");
    if (goveeMenuDiv) {
      // Clear existing content
      goveeMenuDiv.innerHTML = '';
      
      // Create new device list with proper event listeners
      const deviceList = document.createElement("ul");
      
      if (this.goveeDevices.length === 0) {
        const noDevicesItem = document.createElement("li");
        noDevicesItem.innerHTML = "<span class='fa fa-exclamation-triangle fa-lg'></span><br>No Devices";
        noDevicesItem.className = "li-t";
        deviceList.appendChild(noDevicesItem);
      } else {
        // Add "Turn All On/Off" button at the top
        const allButton = this.createAllLightsButton();
        deviceList.appendChild(allButton);
        
        // Add separator
        const separator = document.createElement("li");
        separator.className = "menu-separator";
        deviceList.appendChild(separator);
        
        // Add individual devices
        this.goveeDevices.forEach(device => {
          const deviceButton = this.createGoveeDeviceButton(device);
          deviceList.appendChild(deviceButton);
        });
      }
      
      goveeMenuDiv.appendChild(deviceList);
    }
  },

  getDom: function () {
    // Initial standby state
    document.body.className = "st-standby show";

    const container = this.createContainerDiv();

    const standByButton = this.createStandByButtonDiv();
    container.appendChild(standByButton);

    const menuToggleButton = this.createMenuToggleButtonDiv();
    container.appendChild(menuToggleButton);

    const goveeToggleButton = this.createGoveeToggleButtonDiv();
    container.appendChild(goveeToggleButton);

    const mainMenu = this.createMainMenuDiv();
    document.body.appendChild(mainMenu);

    const goveeMenu = this.createGoveeMenuDiv();
    document.body.appendChild(goveeMenu);

    return container;
  },

  notificationReceived: function (notification, payload, sender) {
  },

  // Recieve notification from sockets via nodehelper.js
  socketNotificationReceived: function (notification, payload) {
    if (notification === "BRIGHTNESS_CHANGED") {
      this.currentBrightness = payload;
      Log.info(`Brightness changed to: ${this.currentBrightness}`);
    }
    
    if (notification === "GOVEE_DEVICES_LIST") {
      this.goveeDevices = payload;
      Log.info(`Received ${this.goveeDevices.length} Govee devices`);
      // Only refresh menu if no device is currently expanded
      if (!this.expandedDeviceMac) {
        this.refreshGoveeMenu();
      }
    }

    if (notification === "GOVEE_DEVICE_TOGGLED") {
      Log.info(`Device ${payload.device} toggled to: ${payload.newState}`);
      // Update the device state in our local array
      const deviceIndex = this.goveeDevices.findIndex(d => d.device === payload.device);
      if (deviceIndex !== -1) {
        this.goveeDevices[deviceIndex].powerState = payload.newState;
        // Only refresh menu if no device is currently expanded
        if (!this.expandedDeviceMac) {
          this.refreshGoveeMenu();
        }
      }
    }

    if (notification === "ALL_GOVEE_DEVICES_TOGGLED") {
      Log.info(`All devices toggle completed: ${payload.results.filter(r => r.success).length}/${payload.results.length} succeeded`);
      // Update device states based on results
      payload.results.forEach(result => {
        const deviceIndex = this.goveeDevices.findIndex(d => d.device === result.device);
        if (deviceIndex !== -1) {
          this.goveeDevices[deviceIndex].powerState = result.newState;
        }
      });
      // Only refresh menu if no device is currently expanded
      if (!this.expandedDeviceMac) {
        this.refreshGoveeMenu();
      }
    }

    if (notification === "GOVEE_DEVICE_STATE_UPDATED") {
      console.log(`GOVEE_DEVICE_STATE_UPDATED received:`, payload);
      console.log(`Current expanded device: ${this.expandedDeviceMac}`);
      
      // Update specific device properties without full menu refresh
      const deviceIndex = this.goveeDevices.findIndex(d => d.device === payload.device);
      if (deviceIndex !== -1) {
        if (payload.brightness !== undefined) {
          this.goveeDevices[deviceIndex].brightness = payload.brightness;
          Log.info(`Device ${payload.device} brightness updated to ${payload.brightness}%`);
        }
        if (payload.colorTemperature !== undefined) {
          this.goveeDevices[deviceIndex].colorTemperature = payload.colorTemperature;
          Log.info(`Device ${payload.device} color temperature updated to ${payload.colorTemperature}K`);
        }
        
        // Update expanded device values in place if this device is currently expanded
        console.log(`Calling updateExpandedDeviceValues for device ${payload.device}`);
        this.updateExpandedDeviceValues(payload.device, payload.brightness, payload.colorTemperature);
      }
    }
  },

});
