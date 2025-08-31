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

    // Toggle device when clicked
    deviceButtonItem.addEventListener("click", () => {
      this.sendSocketNotification("TOGGLE_GOVEE_DEVICE", {
        device: device.device,
        model: device.model,
        currentState: device.powerState
      });
    });

    return deviceButtonItem;
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
      this.refreshGoveeMenu();
    }

    if (notification === "GOVEE_DEVICE_TOGGLED") {
      Log.info(`Device ${payload.device} toggled to: ${payload.newState}`);
      // Update the device state in our local array
      const deviceIndex = this.goveeDevices.findIndex(d => d.device === payload.device);
      if (deviceIndex !== -1) {
        this.goveeDevices[deviceIndex].powerState = payload.newState;
        this.refreshGoveeMenu();
      }
    }
  },

});
