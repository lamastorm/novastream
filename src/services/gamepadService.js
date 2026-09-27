// Service manette désactivé (Mode manette supprimé)

class GamepadService {
  constructor() {
    this.isActive = false;
    this.callbacks = {};
    this.gamepadConnected = false;
  }

  init() {
    // Mode manette désactivé
  }

  setCallbacks() {}

  startPolling() {}

  stopPolling() {}
}

export const gamepadService = new GamepadService();
