const DELAY_MS = 50;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createIotDevice(deviceId, { initialState = { on: false, brightness: 0 }, delay = DELAY_MS } = {}) {
  let state = { ...initialState };

  return {
    async getStatus() {
      await sleep(delay);
      return { deviceId, ...state };
    },

    async setStatus(newState) {
      await sleep(delay);
      state = { ...state, ...newState };
      return { deviceId, ...state };
    },

    // simulates a user physically changing the device — server is unaware
    manualOverride(newState) {
      state = { ...state, ...newState };
    },
  };
}

module.exports = { createIotDevice };
