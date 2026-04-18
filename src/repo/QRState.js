import { Canvas } from "../canvas.js";
import { AppState } from "../app/AppState.js";
import { Button } from "../scene/Button.js";
import { QRCode } from "../scene/QRCode.js";
import { Fill } from "../scene/Fill.js";

export class QRState extends AppState {
  async onEnter() {
    this.add(new Fill(9));
    this.add(new QRCode("t.ly/XhonS", { centered: true }));

    this.add(
      new Button(0, 22, await Canvas.load_png("sprites/prev.png"), async () => {
        this.prevApp();
      }),
    );

    this.add(
      new Button(
        27,
        22,
        await Canvas.load_png("sprites/next.png"),
        async () => {
          this.nextApp();
        },
      ),
    );
  }
}
