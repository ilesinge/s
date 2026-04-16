export class AppState {
  constructor({ canvas, setState }) {
    this.canvas = canvas;
    this.setState = setState;
  }

  async onEnter() {}
  async onExit() {}
  onMessage(x, y, v, sid) {}
  async onUpdate() {}
}
