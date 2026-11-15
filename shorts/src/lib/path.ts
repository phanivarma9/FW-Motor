// Polyline helpers: sample position / direction at a distance along a 2D path (x, y).
export type P2 = [number, number];

export const makePath = (pts: P2[]) => {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(l);
    total += l;
  }
  const at = (d: number) => {
    let acc = 0;
    const dd = Math.max(0, Math.min(total, d));
    for (let i = 0; i < lens.length; i++) {
      if (dd <= acc + lens[i] || i === lens.length - 1) {
        const t = lens[i] === 0 ? 0 : (dd - acc) / lens[i];
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[i + 1];
        return {
          x: x0 + (x1 - x0) * t,
          y: y0 + (y1 - y0) * t,
          angle: Math.atan2(y1 - y0, x1 - x0),
          seg: i,
        };
      }
      acc += lens[i];
    }
    return { x: pts[0][0], y: pts[0][1], angle: 0, seg: 0 };
  };
  // cumulative distance at each vertex
  const vertexDist = pts.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return { pts, lens, total, at, vertexDist };
};
