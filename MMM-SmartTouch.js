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
    this.currentModalDeviceMac = null; // Track which device modal is currently open
    this.unsupportedFeatures = {}; // Track which features are unsupported by each device
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

  // ===== DEVICE BUTTON CREATION =====
  
  createGoveeDeviceButton: function (device) {
    const deviceButtonItem = document.createElement("li");
    deviceButtonItem.className = "li-t govee-device";
    deviceButtonItem.dataset.deviceMac = device.device;
    deviceButtonItem.dataset.deviceModel = device.model;

    this.updateDeviceButtonDisplay(deviceButtonItem, device);

    deviceButtonItem.addEventListener("click", () => {
      this.openDeviceModal(device);
    });

    return deviceButtonItem;
  },

  updateDeviceButtonDisplay: function (buttonElement, device) {
    const statusIcon = device.powerState === "on" ? "fa-lightbulb-o" : "fa-circle-o";
    const statusClass = device.powerState === "on" ? "device-on" : "device-off";
    
    Log.info(`Updating button display for ${device.deviceName}: powerState=${device.powerState}, icon=${statusIcon}, class=${statusClass}`);
    
    buttonElement.innerHTML = `<span class='fa ${statusIcon} fa-lg ${statusClass}'></span>`
        + "<br>" + device.deviceName
        + "<br><small class='" + statusClass + "'>" + (device.powerState === "on" ? "ON" : "OFF") + "</small>";
    
    buttonElement.className = `li-t govee-device ${statusClass}`;
  },





  // ===== GOVEE DEVICE CONTROL METHODS =====
  
  toggleDevicePower: function (deviceMac, deviceModel, currentState) {
    this.sendSocketNotification("TOGGLE_GOVEE_DEVICE", {
      device: deviceMac,
      model: deviceModel,
      currentState: currentState
    });
  },

  updateDeviceColorTemperature: function (deviceMac, deviceModel, colorTemp, deviceRange) {
    this.sendSocketNotification("UPDATE_GOVEE_COLOR_TEMP", {
      device: deviceMac,
      model: deviceModel,
      colorTemperature: parseInt(colorTemp),
      deviceRange: deviceRange
    });
  },

  updateDeviceBrightness: function (deviceMac, deviceModel, brightness) {
    this.sendSocketNotification("UPDATE_GOVEE_BRIGHTNESS", {
      device: deviceMac,
      model: deviceModel,
      brightness: parseInt(brightness)
    });
  },

  toggleAllDevices: function () {
    const onDevices = this.goveeDevices.filter(d => d.powerState === "on").length;
    const totalDevices = this.goveeDevices.length;
    const action = onDevices > totalDevices / 2 ? "off" : "on";
    
    this.sendSocketNotification("TOGGLE_ALL_GOVEE_DEVICES", {
      action: action,
      devices: this.goveeDevices
    });
  },

  // ===== GOVEE DEVICE STATE MANAGEMENT =====
  
  updateDeviceState: function (deviceMac, updates) {
    const deviceIndex = this.goveeDevices.findIndex(d => d.device === deviceMac);
    if (deviceIndex !== -1) {
      if (updates.powerState !== undefined) {
        this.goveeDevices[deviceIndex].powerState = updates.powerState;
      }
      if (updates.brightness !== undefined) {
        this.goveeDevices[deviceIndex].brightness = updates.brightness;
      }
      if (updates.colorTemperature !== undefined) {
        this.goveeDevices[deviceIndex].colorTemperature = updates.colorTemperature;
      }
      return this.goveeDevices[deviceIndex];
    }
    return null;
  },

  getDeviceState: function (deviceMac) {
    return this.goveeDevices.find(d => d.device === deviceMac) || null;
  },

  getAllDevicesState: function () {
    const onDevices = this.goveeDevices.filter(d => d.powerState === "on").length;
    const totalDevices = this.goveeDevices.length;
    return {
      onCount: onDevices,
      totalCount: totalDevices,
      allOn: onDevices === totalDevices,
      allOff: onDevices === 0,
      mostlyOn: onDevices > totalDevices / 2
    };
  },

  // ===== USER NOTIFICATIONS =====
  
  showNotification: function (title, message, duration = 3000) {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = "govee-notification";
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
      </div>
    `;

    // Add to DOM
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add("show");
    }, 100);

    // Auto-hide notification
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  },





  // ===== ALL DEVICES BUTTON =====
  
  createAllDevicesButton: function () {
    const allButtonItem = document.createElement("li");
    allButtonItem.className = "li-t all-devices-button";
    
    this.updateAllDevicesButtonDisplay(allButtonItem);
    
    allButtonItem.addEventListener("click", () => {
      this.toggleAllDevices();
    });

    return allButtonItem;
  },

  updateAllDevicesButtonDisplay: function (buttonElement) {
    const state = this.getAllDevicesState();
    
    const action = state.mostlyOn ? "off" : "on";
    const icon = state.mostlyOn ? "fa-moon-o" : "fa-sun-o";
    const text = state.mostlyOn ? "Turn All Off" : "Turn All On";
    
    buttonElement.innerHTML = `<span class='fa ${icon} fa-lg'></span><br>${text}`;
    buttonElement.dataset.action = action;
  },

  // ===== SET ALL LIGHTS BUTTON =====
  
  createSetAllLightsButton: function () {
    const setAllButtonItem = document.createElement("li");
    setAllButtonItem.className = "li-t set-all-lights-button";
    setAllButtonItem.innerHTML = `
      <span class='fa fa-sliders fa-lg'></span>
      <br>Set All Lights
      <br><small>Configure warm & intensity</small>
    `;
    
    setAllButtonItem.addEventListener("click", () => {
      this.openSetAllLightsModal();
    });

    return setAllButtonItem;
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
      const allButton = this.createAllDevicesButton();
      deviceList.appendChild(allButton);
      
      // Add "Set All Lights" button
      const setAllButton = this.createSetAllLightsButton();
      deviceList.appendChild(setAllButton);
      
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

  createLightConfigModal: function () {
    const modal = document.createElement("div");
    modal.className = "light-config-modal";
    modal.id = "light-config-modal";
    modal.style.display = "none";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";
    
    const modalTitle = document.createElement("h2");
    modalTitle.className = "modal-title";
    modalTitle.textContent = "Light Configuration";
    
    const closeButton = document.createElement("span");
    closeButton.className = "modal-close";
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", () => this.closeDeviceModal());

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";
    modalBody.id = "modal-body-content";

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modal.appendChild(modalContent);

    // Close modal when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.closeDeviceModal();
      }
    });

    return modal;
  },

  // ===== DEVICE MODAL MANAGEMENT =====
  
  openDeviceModal: function (device) {
    const modal = document.getElementById("light-config-modal");
    const modalBody = document.getElementById("modal-body-content");
    const modalTitle = modal.querySelector(".modal-title");
    
    // Update modal title
    modalTitle.textContent = `${device.deviceName} Configuration`;
    
    // Store device MAC for updates (not the device object reference)
    this.currentModalDeviceMac = device.device;
    
    // Get fresh device state from our array to ensure latest data
    const currentDeviceState = this.getDeviceState(device.device);
    if (!currentDeviceState) {
      console.error("Device not found in goveeDevices array:", device.device);
      return;
    }
    
    // Debug: Log current device state values
    Log.info(`Opening modal for ${currentDeviceState.deviceName}:`);
    Log.info(`  Power: ${currentDeviceState.powerState}`);
    Log.info(`  Brightness: ${currentDeviceState.brightness}%`);
    Log.info(`  Color Temp: ${currentDeviceState.colorTemperature}K`);
    
    // Always recreate controls with fresh event listeners and current state
    modalBody.innerHTML = '';
    const deviceControls = this.createModalDeviceControls(currentDeviceState);
    modalBody.appendChild(deviceControls);
    
    // Show modal
    modal.style.display = "flex";
    
    // Request fresh device state from API to update modal if needed
    Log.info(`Requesting fresh device state for ${device.device}`);
    this.sendSocketNotification("GET_GOVEE_DEVICE_STATE", {
      device: device.device,
      model: device.model
    });
  },

  closeDeviceModal: function () {
    const modal = document.getElementById("light-config-modal");
    const modalBody = document.getElementById("modal-body-content");
    
    modal.style.display = "none";
    this.currentModalDeviceMac = null;
    modalBody.innerHTML = '';
  },

  // ===== SET ALL LIGHTS MODAL =====

  openSetAllLightsModal: function () {
    let modal = document.getElementById("set-all-lights-modal");
    if (!modal) {
      modal = this.createSetAllLightsModal();
      document.body.appendChild(modal);
    }

    // Set default values (average of current devices or reasonable defaults)
    const avgSettings = this.getAverageDeviceSettings();
    
    // Update modal controls with average values
    const warmSlider = modal.querySelector('.set-all-warm-slider');
    const intensitySlider = modal.querySelector('.set-all-intensity-slider');
    const warmDisplay = modal.querySelector('.warm-control .value-display');
    const intensityDisplay = modal.querySelector('.intensity-control .value-display');
    
    if (warmSlider && warmDisplay) {
      warmSlider.value = avgSettings.colorTemperature;
      warmDisplay.textContent = avgSettings.colorTemperature + 'K';
    }
    
    if (intensitySlider && intensityDisplay) {
      intensitySlider.value = avgSettings.brightness;
      intensityDisplay.textContent = avgSettings.brightness + '%';
    }

    modal.style.display = "flex";
  },

  closeSetAllLightsModal: function () {
    const modal = document.getElementById("set-all-lights-modal");
    if (modal) {
      modal.style.display = "none";
    }
  },

  createSetAllLightsModal: function () {
    const modal = document.createElement("div");
    modal.className = "set-all-lights-modal";
    modal.id = "set-all-lights-modal";
    modal.style.display = "none";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    // Modal header
    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";
    modalHeader.innerHTML = `
      <h3>Set All Lights</h3>
      <span class="modal-close">&times;</span>
    `;

    // Modal body with controls
    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";
    modalBody.appendChild(this.createSetAllModalControls());

    // Modal footer with apply button
    const modalFooter = document.createElement("div");
    modalFooter.className = "modal-footer";
    modalFooter.innerHTML = `
      <button class="apply-to-all-btn">Apply to All Lights</button>
    `;

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modal.appendChild(modalContent);

    // Event listeners
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => this.closeSetAllLightsModal());

    const applyBtn = modal.querySelector('.apply-to-all-btn');
    applyBtn.addEventListener('click', () => this.applySettingsToAllLights());

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeSetAllLightsModal();
      }
    });

    return modal;
  },

  createSetAllModalControls: function () {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "set-all-modal-controls";

    const controlsRow = document.createElement("div");
    controlsRow.className = "set-all-controls-row";

    // Get device range constraints (use most restrictive range)
    const deviceRanges = this.getDeviceRangeConstraints();

    // Color Temperature Control
    const colorTempControl = document.createElement("div");
    colorTempControl.className = "vertical-slider-control warm-control";
    colorTempControl.innerHTML = `
      <h4>Color Temperature (${deviceRanges.colorTemp.min}K-${deviceRanges.colorTemp.max}K)</h4>
      <div class="vertical-slider-container">
        <label class="slider-label-top">Warm</label>
        <input type="range" class="set-all-warm-slider vertical-slider" 
               min="${deviceRanges.colorTemp.min}" max="${deviceRanges.colorTemp.max}" value="${deviceRanges.colorTemp.default}" 
               orient="vertical">
        <label class="slider-label-bottom">Cool</label>
      </div>
      <div class="value-display">${deviceRanges.colorTemp.default}K</div>
    `;

    // Brightness Control
    const brightnessControl = document.createElement("div");
    brightnessControl.className = "vertical-slider-control intensity-control";
    brightnessControl.innerHTML = `
      <h4>Intensity</h4>
      <div class="vertical-slider-container">
        <label class="slider-label-top">Bright</label>
        <input type="range" class="set-all-intensity-slider vertical-slider" 
               min="1" max="100" value="75" orient="vertical">
        <label class="slider-label-bottom">Dim</label>
      </div>
      <div class="value-display">75%</div>
    `;

    // Add event listeners for real-time updates
    const warmSlider = colorTempControl.querySelector('.set-all-warm-slider');
    const warmDisplay = colorTempControl.querySelector('.value-display');
    const intensitySlider = brightnessControl.querySelector('.set-all-intensity-slider');
    const intensityDisplay = brightnessControl.querySelector('.value-display');

    warmSlider.addEventListener("input", (e) => {
      e.stopPropagation();
      warmDisplay.textContent = e.target.value + 'K';
    });

    intensitySlider.addEventListener("input", (e) => {
      e.stopPropagation();
      intensityDisplay.textContent = e.target.value + '%';
    });

    controlsRow.appendChild(colorTempControl);
    controlsRow.appendChild(brightnessControl);
    controlsContainer.appendChild(controlsRow);

    return controlsContainer;
  },

  getAverageDeviceSettings: function () {
    if (this.goveeDevices.length === 0) {
      return {
        brightness: 75,
        colorTemperature: 4000
      };
    }

    let totalBrightness = 0;
    let totalColorTemp = 0;
    let validDevices = 0;

    this.goveeDevices.forEach(device => {
      if (device.brightness && device.colorTemperature) {
        totalBrightness += device.brightness;
        totalColorTemp += device.colorTemperature;
        validDevices++;
      }
    });

    if (validDevices === 0) {
      return {
        brightness: 75,
        colorTemperature: 4000
      };
    }

    return {
      brightness: Math.round(totalBrightness / validDevices),
      colorTemperature: Math.round(totalColorTemp / validDevices)
    };
  },

  getDeviceRangeConstraints: function () {
    let minColorTemp = 2000;
    let maxColorTemp = 9000;

    // Find the most restrictive range across all devices
    this.goveeDevices.forEach(device => {
      if (device.colorTempRange) {
        minColorTemp = Math.max(minColorTemp, device.colorTempRange.min);
        maxColorTemp = Math.min(maxColorTemp, device.colorTempRange.max);
      }
    });

    return {
      colorTemp: {
        min: minColorTemp,
        max: maxColorTemp,
        default: Math.floor((minColorTemp + maxColorTemp) / 2)
      }
    };
  },

  applySettingsToAllLights: function () {
    const modal = document.getElementById("set-all-lights-modal");
    if (!modal) return;

    const warmSlider = modal.querySelector('.set-all-warm-slider');
    const intensitySlider = modal.querySelector('.set-all-intensity-slider');

    if (!warmSlider || !intensitySlider) return;

    const colorTemperature = parseInt(warmSlider.value);
    const brightness = parseInt(intensitySlider.value);

    Log.info(`Applying settings to all lights: ${colorTemperature}K, ${brightness}%`);

    // Send to backend to apply to all devices
    this.sendSocketNotification("SET_ALL_GOVEE_DEVICES", {
      colorTemperature: colorTemperature,
      brightness: brightness
    });

    // Close modal
    this.closeSetAllLightsModal();

    // Show notification
    this.showNotification("Settings Applied", 
      `Applied ${colorTemperature}K warm, ${brightness}% intensity to all lights`, 
      3000);
  },

  // ===== MODAL DEVICE CONTROLS =====
  
  createModalDeviceControls: function (device) {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "modal-device-controls";

    const controlsRow = document.createElement("div");
    controlsRow.className = "modal-controls-row";

    // Power control (left column)
    const powerControl = this.createModalPowerControl(device);
    
    // Color Temperature control (middle column)
    const colorTempControl = this.createModalColorTempControl(device);
    
    // Brightness control (right column)
    const brightnessControl = this.createModalBrightnessControl(device);

    controlsRow.appendChild(powerControl);
    controlsRow.appendChild(colorTempControl);
    controlsRow.appendChild(brightnessControl);
    controlsContainer.appendChild(controlsRow);

    return controlsContainer;
  },

  createModalPowerControl: function (device) {
    const powerControl = document.createElement("div");
    powerControl.className = "power-control-column";
    
    const statusIcon = device.powerState === "on" ? "fa-lightbulb-o" : "fa-circle-o";
    const statusText = device.powerState === "on" ? "ON" : "OFF";
    
    powerControl.innerHTML = `
      <h4>Power</h4>
      <div class="power-status-container">
        <div class="device-status">
          <span class='fa ${statusIcon} fa-2x'></span>
          <span class="status-text">${statusText}</span>
        </div>
      </div>
    `;
    
    const powerBtn = document.createElement("button");
    powerBtn.className = `modal-power-btn ${device.powerState}`;
    powerBtn.innerHTML = '<span class="fa fa-power-off"></span>';
    
    powerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Get current device state, not the state when modal was created
      const currentDevice = this.getDeviceState(device.device);
      if (currentDevice) {
        this.toggleDevicePower(device.device, device.model, currentDevice.powerState);
      }
    });
    
    powerControl.appendChild(powerBtn);
    return powerControl;
  },

  createModalColorTempControl: function (device) {
    const colorTempControl = document.createElement("div");
    colorTempControl.className = "vertical-slider-control";
    
    // Check if color temperature is supported by this device
    const isSupported = (device.supportsColorTemp !== false) && 
                       (!this.unsupportedFeatures[device.device] || 
                        !this.unsupportedFeatures[device.device].includes("colorTemperature"));
    
    // Use device-specific range if available
    const minTemp = device.colorTempRange ? device.colorTempRange.min : 2000;
    const maxTemp = device.colorTempRange ? device.colorTempRange.max : 9000;
    const currentTemp = device.colorTemperature || Math.floor((minTemp + maxTemp) / 2);
    
    Log.info(`Creating color temp control for ${device.deviceName}: ${currentTemp}K (range: ${minTemp}K-${maxTemp}K)`);
    
    const disabledClass = isSupported ? "" : " disabled";
    const disabledAttr = isSupported ? "" : " disabled";
    const title = isSupported ? `Color Temperature (${minTemp}K-${maxTemp}K)` : "Color Temperature (Not Supported)";
    
    colorTempControl.innerHTML = `
      <h4 class="${disabledClass}">${title}</h4>
      <div class="vertical-slider-container">
        <label class="slider-label-top${disabledClass}">Warm</label>
        <input type="range" class="modal-warm-slider vertical-slider${disabledClass}" 
               min="${minTemp}" max="${maxTemp}" value="${currentTemp}" 
               orient="vertical"${disabledAttr}>
        <label class="slider-label-bottom${disabledClass}">Cool</label>
      </div>
      <div class="value-display${disabledClass}">${isSupported ? currentTemp + 'K' : 'N/A'}</div>
    `;
    
    const slider = colorTempControl.querySelector('.modal-warm-slider');
    const display = colorTempControl.querySelector('.value-display');
    
    if (isSupported) {
      slider.addEventListener("input", (e) => {
        e.stopPropagation();
        display.textContent = e.target.value + 'K';
      });
      
      slider.addEventListener("change", (e) => {
        e.stopPropagation();
        this.updateDeviceColorTemperature(device.device, device.model, e.target.value, device.colorTempRange);
      });
    } else {
      // Add click handler to show info for disabled slider
      slider.addEventListener("click", (e) => {
        e.preventDefault();
        this.showNotification("Feature Not Available", 
          "Color temperature control is not supported by this device via the API. Use the Govee app instead.", 
          4000);
      });
    }

    return colorTempControl;
  },

  createModalBrightnessControl: function (device) {
    const brightnessControl = document.createElement("div");
    brightnessControl.className = "vertical-slider-control";
    const currentBrightness = device.brightness || 100;
    Log.info(`Creating brightness control for ${device.deviceName}: ${currentBrightness}%`);
    
    brightnessControl.innerHTML = `
      <h4>Brightness</h4>
      <div class="vertical-slider-container">
        <label class="slider-label-top">Bright</label>
        <input type="range" class="modal-intensity-slider vertical-slider" 
               min="1" max="100" value="${currentBrightness}" 
               orient="vertical">
        <label class="slider-label-bottom">Dim</label>
      </div>
      <div class="value-display">${currentBrightness}%</div>
    `;
    
    const slider = brightnessControl.querySelector('.modal-intensity-slider');
    const display = brightnessControl.querySelector('.value-display');
    
    slider.addEventListener("input", (e) => {
      e.stopPropagation();
      display.textContent = e.target.value + '%';
    });
    
    slider.addEventListener("change", (e) => {
      e.stopPropagation();
      this.updateDeviceBrightness(device.device, device.model, e.target.value);
    });

    return brightnessControl;
  },

  updateModalValues: function (deviceMac, brightness, colorTemperature, powerState) {
    // Only update if this device modal is currently open
    if (!this.currentModalDeviceMac || this.currentModalDeviceMac !== deviceMac) {
      return;
    }

    const modal = document.getElementById("light-config-modal");
    if (modal.style.display === "none") {
      return;
    }

    // Update power state and status display
    if (powerState !== undefined) {
      const statusIcon = modal.querySelector('.device-status .fa');
      const statusText = modal.querySelector('.status-text');
      const powerBtn = modal.querySelector('.modal-power-btn');
      
      if (powerState === "on") {
        statusIcon.className = "fa fa-lightbulb-o fa-2x";
        statusText.textContent = "ON";
        powerBtn.className = "modal-power-btn on";
      } else {
        statusIcon.className = "fa fa-circle-o fa-2x";
        statusText.textContent = "OFF";
        powerBtn.className = "modal-power-btn off";
      }
    }

    // Update brightness slider and display (now in 3rd column)
    if (brightness !== undefined) {
      const intensitySlider = modal.querySelector('.modal-intensity-slider');
      const intensityControl = modal.querySelector('.vertical-slider-control:nth-child(3)');
      const intensityDisplay = intensityControl ? intensityControl.querySelector('.value-display') : null;
      if (intensitySlider && intensityDisplay) {
        intensitySlider.value = brightness;
        intensityDisplay.textContent = brightness + '%';
      }
    }

    // Update color temperature slider and display (now in 2nd column)
    if (colorTemperature !== undefined) {
      const warmSlider = modal.querySelector('.modal-warm-slider');
      const warmControl = modal.querySelector('.vertical-slider-control:nth-child(2)');
      const warmDisplay = warmControl ? warmControl.querySelector('.value-display') : null;
      if (warmSlider && warmDisplay) {
        warmSlider.value = colorTemperature;
        warmDisplay.textContent = colorTemperature + 'K';
      }
    }
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
        const allButton = this.createAllDevicesButton();
        deviceList.appendChild(allButton);
        
        // Add "Set All Lights" button
        const setAllButton = this.createSetAllLightsButton();
        deviceList.appendChild(setAllButton);
        
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

  updateAllDevicesButtonInMenu: function () {
    const allButton = document.querySelector('.all-devices-button');
    if (allButton) {
      this.updateAllDevicesButtonDisplay(allButton);
    }
  },

  updateDeviceButtonInMenu: function (deviceMac) {
    const deviceButton = document.querySelector(`[data-device-mac="${deviceMac}"]`);
    if (deviceButton) {
      const device = this.getDeviceState(deviceMac);
      if (device) {
        this.updateDeviceButtonDisplay(deviceButton, device);
        Log.info(`Updated menu button for device ${deviceMac}: ${device.powerState}`);
      }
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

    const lightModal = this.createLightConfigModal();
    document.body.appendChild(lightModal);

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
    
    // ===== GOVEE SOCKET NOTIFICATION HANDLERS =====
    
    if (notification === "GOVEE_DEVICES_LIST") {
      this.goveeDevices = payload;
      Log.info(`Received ${this.goveeDevices.length} Govee devices with states`);
      this.refreshGoveeMenu();
      
      // Log device states for debugging
      this.goveeDevices.forEach(device => {
        Log.info(`Frontend received device ${device.deviceName} (${device.device}): power=${device.powerState || 'unknown'}, brightness=${device.brightness || 'unknown'}%, colorTemp=${device.colorTemperature || 'unknown'}K`);
      });
    }

    if (notification === "GOVEE_DEVICE_TOGGLED") {
      Log.info(`Device ${payload.device} toggled to: ${payload.newState}`);
      
      // Update device state
      const updatedDevice = this.updateDeviceState(payload.device, {
        powerState: payload.newState
      });
      
      if (updatedDevice) {
        // Update modal if this device modal is open
        this.updateModalValues(payload.device, undefined, undefined, payload.newState);
        
        // Update the specific device button in the menu (more efficient than full refresh)
        this.updateDeviceButtonInMenu(payload.device);
        
        // Update all devices button
        this.updateAllDevicesButtonInMenu();
      }
    }

    if (notification === "ALL_GOVEE_DEVICES_TOGGLED") {
      Log.info(`All devices toggle completed: ${payload.results.filter(r => r.success).length}/${payload.results.length} succeeded`);
      
      // Update all device states and their menu buttons
      payload.results.forEach(result => {
        this.updateDeviceState(result.device, {
          powerState: result.newState
        });
        // Update individual device button in menu
        this.updateDeviceButtonInMenu(result.device);
      });
      
      // Update all devices button
      this.updateAllDevicesButtonInMenu();
    }

    if (notification === "GOVEE_DEVICE_STATE_UPDATED") {
      Log.info(`Device ${payload.device} state updated: brightness=${payload.brightness}, colorTemp=${payload.colorTemperature}`);
      
      // Update device state
      const updatedDevice = this.updateDeviceState(payload.device, {
        brightness: payload.brightness,
        colorTemperature: payload.colorTemperature,
        powerState: payload.powerState // Include power state if provided
      });
      
      if (updatedDevice) {
        // Update modal values if this device modal is currently open
        this.updateModalValues(payload.device, payload.brightness, payload.colorTemperature, payload.powerState);
        
        // Update menu button if power state changed
        if (payload.powerState !== undefined) {
          this.updateDeviceButtonInMenu(payload.device);
        }
      }
    }

    if (notification === "GOVEE_DEVICE_ERROR") {
      Log.warn(`Govee device error: ${payload.error}`);
      
      // Track unsupported features
      if (payload.error.includes("Color temperature not supported")) {
        if (!this.unsupportedFeatures[payload.device]) {
          this.unsupportedFeatures[payload.device] = [];
        }
        this.unsupportedFeatures[payload.device].push("colorTemperature");
        
        this.showNotification("Device Limitation", 
          `Color temperature control is not supported by this device model. Use the Govee app instead.`, 
          5000);
      } else if (payload.error.includes("Invalid color temperature")) {
        this.showNotification("Invalid Range", 
          `Color temperature must be between 2000K and 9000K.`, 
          3000);
      } else {
        this.showNotification("Device Error", 
          `Failed to control device: ${payload.error}`, 
          4000);
      }
    }

    if (notification === "ALL_GOVEE_DEVICES_SET") {
      Log.info(`Set all devices completed: ${payload.colorTempSuccesses}/${payload.totalDevices} color temp, ${payload.brightnessSuccesses}/${payload.totalDevices} brightness`);
      
      // Update device states based on results
      payload.results.forEach(result => {
        if (result.colorTempSuccess || result.brightnessSuccess) {
          const updateData = {};
          if (result.colorTempSuccess) {
            updateData.colorTemperature = payload.colorTemperature;
          }
          if (result.brightnessSuccess) {
            updateData.brightness = payload.brightness;
          }
          this.updateDeviceState(result.device, updateData);
        }
      });

      // Show success notification
      const successMessage = `${payload.colorTempSuccesses}/${payload.totalDevices} lights updated with color temperature, ${payload.brightnessSuccesses}/${payload.totalDevices} with brightness`;
      this.showNotification("Settings Applied", successMessage, 4000);
      
      // Refresh menu to show any updated states
      this.refreshGoveeMenu();
    }

    if (notification === "GOVEE_DEVICE_FRESH_STATE") {
      Log.info(`Received fresh state for device ${payload.device}: power=${payload.powerState}, brightness=${payload.brightness}%, colorTemp=${payload.colorTemperature}K`);
      
      // Update device state in our array
      const updatedDevice = this.updateDeviceState(payload.device, {
        powerState: payload.powerState,
        brightness: payload.brightness,
        colorTemperature: payload.colorTemperature
      });
      
      if (updatedDevice) {
        // Update modal values if this device modal is currently open
        this.updateModalValues(payload.device, payload.brightness, payload.colorTemperature, payload.powerState);
        
        // Update menu button to reflect fresh state
        this.updateDeviceButtonInMenu(payload.device);
      }
    }
  },

});
