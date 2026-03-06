const DELAY_MS = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createWifiDevice(deviceId, { initialState = { on: false, brightness: 0 }, delay = DELAY_MS } = {}) {
  let state = { ...initialState };
  let wifiConnected = true;
  let pushListener = null;
  let disconnectListener = null;

  function pushUpdate() {
    if (wifiConnected && pushListener) {
      pushListener({ deviceId, ...state });
    }
  }

  return {
    async getStatus() {
      await sleep(delay);
      return { deviceId, ...state };
    },

    async setStatus(newState) {
      await sleep(delay);
      state = { ...state, ...newState };
      pushUpdate();
      return { deviceId, ...state };
    },

    // user physically touches device — pushes update over wifi if connected
    manualOverride(newState) {
      state = { ...state, ...newState };
      pushUpdate();
    },

    onPush(listener) {
      pushListener = listener;
    },

    onDisconnect(listener) {
      disconnectListener = listener;
    },

    disconnectWifi() {
      wifiConnected = false;
      if (disconnectListener) disconnectListener();
    },

    reconnectWifi() {
      wifiConnected = true;
      pushUpdate(); // re-broadcasts current state on reconnect
    },
  };
}

module.exports = { createWifiDevice };
