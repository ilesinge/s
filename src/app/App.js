export class App {
  #states = {};
  #stateEntering = false;
  #stateExiting = false;
  #currentState = null;
  #currentStateName = undefined;

  constructor(canvas, options) {
    this.canvas = canvas;
    this.options = options;
  }

  _register(name, state) {
    state.app = this;
    this.#states[name] = state;
  }

  async setState(name) {
    if (this.#currentStateName === name) return;

    console.log("Setting state to", name);
    this.#stateExiting = true;
    if (this.#currentState?.onExit) await this.#currentState.onExit();
    this.#stateExiting = false;

    if (this.#states[name]) {
      this.#currentState = this.#states[name];
      this.#currentStateName = name;
    } else {
      throw new Error(`No state nammed ${name}`);
    }

    this.#stateEntering = true;
    if (this.#currentState?.onEnter) await this.#currentState.onEnter();
    this.#stateEntering = false;
  }

  onMessage(x, y, v, sid) {
    if (this.#stateEntering || this.#stateExiting) return;

    this.#currentState?.onMessage?.(x, y, v, sid);
  }
}
