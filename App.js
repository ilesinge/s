export class App {
  #states = {};
  #currentState = null;

  constructor({ canvas }) {
    this.canvas = canvas;
  }

  _register(name, state) {
    this.#states[name] = state;
  }

  async setState(name) {
    console.log("Setting state to", name);
    if (this.#currentState?.onExit) await this.#currentState.onExit();
    this.#currentState = this.#states[name];
    if (this.#currentState?.onEnter) await this.#currentState.onEnter();
  }

  onMessage(x, y, v, sid) {
    this.#currentState?.onMessage?.(x, y, v, sid);
  }
}
