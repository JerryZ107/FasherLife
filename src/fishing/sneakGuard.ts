import { Container, Graphics } from "pixi.js";

/** Q版保安：大檐帽 + 藏青制服 + 手电，不复用钓手立绘。 */
export function makeGuardView(): { root: Container; body: Graphics } {
  const root = new Container();
  const shadow = new Graphics();
  shadow.ellipse(0, 5, 15, 6);
  shadow.fill({ color: 0x000000, alpha: 0.38 });
  const body = new Graphics();
  root.addChild(shadow, body);
  return { root, body };
}

export function paintGuard(g: Graphics, facingLeft: boolean, t: number) {
  g.clear();
  const flip = facingLeft ? -1 : 1;
  const bob = Math.sin(t * 11) * 0.8;

  g.ellipse(0, 6, 14, 5.5);
  g.fill({ color: 0x000000, alpha: 0.12 });

  g.roundRect(-7, -6 + bob, 6, 14, 2);
  g.fill({ color: 0x1a1a28 });
  g.roundRect(1, -6 + bob, 6, 14, 2);
  g.fill({ color: 0x1a1a28 });
  g.roundRect(-7, 6 + bob, 6, 4, 1);
  g.fill({ color: 0x0d0d14 });
  g.roundRect(1, 6 + bob, 6, 4, 1);
  g.fill({ color: 0x0d0d14 });

  g.roundRect(-11, -26 + bob, 22, 22, 5);
  g.fill({ color: 0x1c3358 });
  g.roundRect(-11, -8 + bob, 22, 5, 1);
  g.fill({ color: 0x2a1a0c });
  g.circle(-5, -18 + bob, 1.6);
  g.fill({ color: 0xffd166 });
  g.circle(5, -18 + bob, 1.6);
  g.fill({ color: 0xffd166 });
  g.roundRect(-12 * flip, -22 + bob, 7, 8, 2);
  g.fill({ color: 0xef476f });
  g.roundRect(-11, -26 + bob, 22, 4, 1);
  g.fill({ color: 0x15243c });

  const armX = 12 * flip;
  g.roundRect(Math.min(armX - 3, -3), -22 + bob, 7, 14, 3);
  g.fill({ color: 0x1c3358 });
  g.roundRect(armX - 3, -12 + bob, 12, 4, 2);
  g.fill({ color: 0x2a2a32 });
  g.circle(armX + 10, -10 + bob, 3.2);
  g.fill({ color: 0xffe08a, alpha: 0.95 });
  g.ellipse(armX + 18, -10 + bob, 9, 5);
  g.fill({ color: 0xffd166, alpha: 0.28 });

  g.circle(0, -34 + bob, 9);
  g.fill({ color: 0xf0c8a0 });
  g.roundRect(-3, -32 + bob, 6, 3, 1);
  g.fill({ color: 0xc4894a, alpha: 0.5 });
  g.ellipse(0, -31 + bob, 2.2, 1.1);
  g.fill({ color: 0x5c3a28 });

  g.roundRect(-11, -46 + bob, 22, 10, 3);
  g.fill({ color: 0x12141c });
  g.ellipse(0, -37 + bob, 13, 3.5);
  g.fill({ color: 0x0a0c12 });
  g.roundRect(-11, -40 + bob, 22, 3, 1);
  g.fill({ color: 0xffd166 });
  g.circle(0, -41 + bob, 2.1);
  g.fill({ color: 0xfff4c8 });
}
