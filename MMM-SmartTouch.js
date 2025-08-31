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
    this.sliderInteractionActive = false; // Track if user is interacting with sliders
    this.sliderInteractionTimeout = null; // Timeout to clear interaction lock
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

    // Open modal when clicked
    deviceButtonItem.addEventListener("click", () => {
      this.openLightModal(device);
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
    warmSlider.addEventListener("mousedown", () => this.startSliderInteraction());
    warmSlider.addEventListener("touchstart", () => this.startSliderInteraction());
    
    warmSlider.addEventListener("change", (e) => {
      e.stopPropagation();
      console.log(`Warm slider changed to: ${e.target.value}K for device ${device.device}`);
      this.updateDeviceWarm(device.device, device.model, e.target.value);
      warmGroup.querySelector('.value-display').textContent = e.target.value + 'K';
    });
    
    // Also handle input event for real-time feedback
    warmSlider.addEventListener("input", (e) => {
      e.stopPropagation();
      this.startSliderInteraction(); // Refresh the interaction lock
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
    intensitySlider.addEventListener("mousedown", () => this.startSliderInteraction());
    intensitySlider.addEventListener("touchstart", () => this.startSliderInteraction());
    
    intensitySlider.addEventListener("change", (e) => {
      e.stopPropagation();
      console.log(`Intensity slider changed to: ${e.target.value}% for device ${device.device}`);
      this.updateDeviceIntensity(device.device, device.model, e.target.value);
      intensityGroup.querySelector('.value-display').textContent = e.target.value + '%';
    });
    
    // Also handle input event for real-time feedback
    intensitySlider.addEventListener("input", (e) => {
      e.stopPropagation();
      this.startSliderInteraction(); // Refresh the interaction lock
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

  startSliderInteraction: function () {
    console.log("Slider interaction started - locking menu refreshes");
    this.sliderInteractionActive = true;
    
    // Clear any existing timeout
    if (this.sliderInteractionTimeout) {
      clearTimeout(this.sliderInteractionTimeout);
    }
    
    // Set timeout to clear the lock after 2 seconds of inactivity
    this.sliderInteractionTimeout = setTimeout(() => {
      console.log("Slider interaction timeout - unlocking menu refreshes");
      this.sliderInteractionActive = false;
      this.sliderInteractionTimeout = null;
    }, 2000);
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
    closeButton.addEventListener("click", () => this.closeLightModal());

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
        this.closeLightModal();
      }
    });

    return modal;
  },

  openLightModal: function (device) {
    console.log(`Opening light modal for device: ${device.deviceName}`);
    
    const modal = document.getElementById("light-config-modal");
    const modalBody = document.getElementById("modal-body-content");
    const modalTitle = modal.querySelector(".modal-title");
    
    // Update modal title with device name
    modalTitle.textContent = `${device.deviceName} Configuration`;
    
    // Clear previous content
    modalBody.innerHTML = '';
    
    // Create device controls for modal
    const deviceControls = this.createModalDeviceControls(device);
    modalBody.appendChild(deviceControls);
    
    // Show modal
    modal.style.display = "flex";
    
    // Store current device for updates
    this.currentModalDevice = device;
  },

  closeLightModal: function () {
    console.log("Closing light modal");
    const modal = document.getElementById("light-config-modal");
    modal.style.display = "none";
    this.currentModalDevice = null;
  },

  createModalDeviceControls: function (device) {
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "modal-device-controls";

    // Device status and power control
    const statusSection = document.createElement("div");
    statusSection.className = "modal-section";
    
    const statusIcon = device.powerState === "on" ? "fa-lightbulb-o" : "fa-circle-o";
    const statusText = device.powerState === "on" ? "ON" : "OFF";
    
    statusSection.innerHTML = `
      <div class="device-status">
        <span class='fa ${statusIcon} fa-2x'></span>
        <span class="status-text">${statusText}</span>
      </div>
    `;
    
    const powerBtn = document.createElement("button");
    powerBtn.className = `modal-power-btn ${device.powerState}`;
    powerBtn.innerHTML = '<span class="fa fa-power-off"></span> Toggle Power';
    powerBtn.addEventListener("click", () => {
      this.toggleDevicePower(device.device, device.model, device.powerState);
    });
    
    statusSection.appendChild(powerBtn);
    controlsContainer.appendChild(statusSection);

    // Warm control section
    const warmSection = document.createElement("div");
    warmSection.className = "modal-section";
    warmSection.innerHTML = `
      <h3>Color Temperature</h3>
      <div class="slider-container">
        <label>Cool</label>
        <input type="range" class="modal-warm-slider" min="2000" max="9000" value="${device.colorTemperature || 6500}">
        <label>Warm</label>
      </div>
      <div class="value-display">${device.colorTemperature || 6500}K</div>
    `;
    
    const warmSlider = warmSection.querySelector('.modal-warm-slider');
    const warmDisplay = warmSection.querySelector('.value-display');
    
    warmSlider.addEventListener("input", (e) => {
      warmDisplay.textContent = e.target.value + 'K';
    });
    
    warmSlider.addEventListener("change", (e) => {
      console.log(`Modal warm slider changed to: ${e.target.value}K for device ${device.device}`);
      this.updateDeviceWarm(device.device, device.model, e.target.value);
    });

    controlsContainer.appendChild(warmSection);

    // Intensity control section
    const intensitySection = document.createElement("div");
    intensitySection.className = "modal-section";
    intensitySection.innerHTML = `
      <h3>Brightness</h3>
      <div class="slider-container">
        <label>Dim</label>
        <input type="range" class="modal-intensity-slider" min="1" max="100" value="${device.brightness || 100}">
        <label>Bright</label>
      </div>
      <div class="value-display">${device.brightness || 100}%</div>
    `;
    
    const intensitySlider = intensitySection.querySelector('.modal-intensity-slider');
    const intensityDisplay = intensitySection.querySelector('.value-display');
    
    intensitySlider.addEventListener("input", (e) => {
      intensityDisplay.textContent = e.target.value + '%';
    });
    
    intensitySlider.addEventListener("change", (e) => {
      console.log(`Modal intensity slider changed to: ${e.target.value}% for device ${device.device}`);
      this.updateDeviceIntensity(device.device, device.model, e.target.value);
    });

    controlsContainer.appendChild(intensitySection);

    return controlsContainer;
  },

  updateModalValues: function (deviceMac, brightness, colorTemperature, powerState) {
    // Only update if this device modal is currently open
    if (!this.currentModalDevice || this.currentModalDevice.device !== deviceMac) {
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

    // Update brightness slider and display
    if (brightness !== undefined) {
      const intensitySlider = modal.querySelector('.modal-intensity-slider');
      const intensityDisplay = modal.querySelector('.modal-section:last-child .value-display');
      if (intensitySlider && intensityDisplay) {
        intensitySlider.value = brightness;
        intensityDisplay.textContent = brightness + '%';
      }
    }

    // Update color temperature slider and display
    if (colorTemperature !== undefined) {
      const warmSlider = modal.querySelector('.modal-warm-slider');
      const warmDisplay = modal.querySelector('.modal-section:nth-child(2) .value-display');
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
    
    if (notification === "GOVEE_DEVICES_LIST") {
      this.goveeDevices = payload;
      Log.info(`Received ${this.goveeDevices.length} Govee devices`);
      // Always refresh menu (no expansion conflicts with modal approach)
      this.refreshGoveeMenu();
    }

    if (notification === "GOVEE_DEVICE_TOGGLED") {
      Log.info(`Device ${payload.device} toggled to: ${payload.newState}`);
      // Update the device state in our local array
      const deviceIndex = this.goveeDevices.findIndex(d => d.device === payload.device);
      if (deviceIndex !== -1) {
        this.goveeDevices[deviceIndex].powerState = payload.newState;
        // Update modal if this device modal is open
        this.updateModalValues(payload.device, undefined, undefined, payload.newState);
        // Always refresh menu for power state changes (no expansion conflicts now)
        this.refreshGoveeMenu();
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
      // Always refresh menu (no expansion conflicts with modal approach)
      this.refreshGoveeMenu();
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
        
        // Update modal values if this device modal is currently open
        console.log(`Calling updateModalValues for device ${payload.device}`);
        this.updateModalValues(payload.device, payload.brightness, payload.colorTemperature);
      }
    }
  },

});
