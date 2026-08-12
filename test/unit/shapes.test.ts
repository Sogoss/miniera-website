/* The shape generator, proved on the numbers.
 *
 * A wrong shape fails nothing: the page renders, the photo is cut, and the cut
 * is simply not the one that was drawn. It is a defect you can only see, which
 * is why the manual check is in the plan — and why everything about the shapes
 * that *can* be stated as a number is stated here, so that what is left for the
 * eye is the tuning and not the arithmetic.
 */
import { describe, expect, it } from 'vitest';
import {
  CLIP_SHAPES,
  type Corner,
  gemCorners,
  roundedPolygonPath,
  scallopedPath,
} from '../../src/lib/shapes.ts';

type Command = { kind: string; numbers: number[]; to: { x: number; y: number } };

/** The commands of a path, each with its numbers and its destination. */
function commandsOf(path: string): Command[] {
  return path
    .split(/(?=[MLAZ])/)
    .map((piece) => piece.trim())
    .filter((piece) => piece && piece[0] !== 'Z')
    .map((piece) => {
      const numbers = [...piece.matchAll(/-?\d+(?:\.\d+)?/g)].map((n) => Number(n[0]));
      // Every command ends with the point it draws to — an arc has five
      // parameters in front of it, M and L none. Reading the *last* pair is
      // what keeps this from picking up the flags of an arc as coordinates,
      // which is what the first version of this helper did.
      return {
        kind: piece[0]!,
        numbers,
        to: { x: numbers[numbers.length - 2]!, y: numbers[numbers.length - 1]! },
      };
    });
}

/** Every point a path draws to, in order. */
function pointsOf(path: string): { x: number; y: number }[] {
  return commandsOf(path).map((command) => command.to);
}

/**
 * The centre of the circle an arc was drawn on, from its two ends and its
 * radius. Two circles satisfy that; the sweep flag says which.
 */
function arcCentre(
  from: { x: number; y: number },
  command: Command,
): { x: number; y: number } {
  const [radius, , , , sweep] = command.numbers;
  const to = command.to;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const halfChord = Math.hypot(to.x - from.x, to.y - from.y) / 2;
  const height = Math.sqrt(Math.max(0, radius! ** 2 - halfChord ** 2));

  /* Unit normal to the chord, turned a quarter clockwise on screen — which is
     the side the centre is on for a clockwise arc, y growing downwards. */
  const nx = -(to.y - from.y) / (halfChord * 2);
  const ny = (to.x - from.x) / (halfChord * 2);
  const side = sweep === 1 ? 1 : -1;

  return { x: midX + side * nx * height, y: midY + side * ny * height };
}

function rotate(point: { x: number; y: number }, by: number) {
  const dx = point.x - 0.5;
  const dy = point.y - 0.5;
  return {
    x: 0.5 + dx * Math.cos(by) - dy * Math.sin(by),
    y: 0.5 + dx * Math.sin(by) + dy * Math.cos(by),
  };
}

const CLOVER_4 = { lobes: 4, lobeRadius: 0.25, filletRadius: 0.07 };

describe('scallopedPath', () => {
  it('draws a closed path that starts where a path starts', () => {
    const path = scallopedPath(CLOVER_4);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.trimEnd().endsWith('Z')).toBe(true);
  });

  it('stays inside the box it is measured against', () => {
    // objectBoundingBox coordinates: outside 0…1 the shape would clip past the
    // element and the excess would go unnoticed until something else sat there.
    for (const spec of [CLOVER_4, { lobes: 8, lobeRadius: 0.155, filletRadius: 0.05 }]) {
      for (const { x, y } of pointsOf(scallopedPath(spec))) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('fills the box instead of floating in the middle of it', () => {
    // The outermost point of a shape is on a lobe, half way along its arc, and
    // never among the coordinates written in the path: what is written there
    // are the points of tangency. So the lobe's circle is reconstructed and
    // asked the question directly — does it reach the edge?
    //
    // Get the ride wrong and every portrait comes out evenly smaller than its
    // frame, which reads as a padding somebody chose.
    const commands = commandsOf(scallopedPath(CLOVER_4));

    for (const [i, command] of commands.entries()) {
      if (command.kind !== 'A' || command.numbers[0] !== CLOVER_4.lobeRadius) continue;
      const centre = arcCentre(commands[i - 1]!.to, command);
      const reach = Math.hypot(centre.x - 0.5, centre.y - 0.5) + CLOVER_4.lobeRadius;
      expect(reach).toBeCloseTo(0.5, 3);
    }
  });

  it('draws one lobe and one fillet per lobe', () => {
    expect(scallopedPath(CLOVER_4).match(/A /g)).toHaveLength(8);
    expect(
      scallopedPath({ lobes: 6, lobeRadius: 0.175, filletRadius: 0.11 }).match(/A /g),
    ).toHaveLength(12);
  });

  it('has the symmetry its number of lobes implies', () => {
    // Four lobes means the shape maps onto itself every quarter turn. Nothing
    // else in the suite would notice a shape that did not: it would just look
    // slightly wrong to somebody, later.
    const points = pointsOf(scallopedPath(CLOVER_4));
    const step = (2 * Math.PI) / 4;

    for (const point of points) {
      const turned = rotate(point, step);
      const nearest = Math.min(
        ...points.map((other) => Math.hypot(other.x - turned.x, other.y - turned.y)),
      );
      expect(nearest).toBeLessThan(0.001);
    }
  });

  it('curves the joins the other way from the lobes', () => {
    // Lobes convex, fillets concave. One sweep flag for the whole path is the
    // obvious first guess and gives a shape that bulges where it should bite.
    const arcs = commandsOf(scallopedPath(CLOVER_4)).filter((c) => c.kind === 'A');
    const lobes = arcs.filter((c) => c.numbers[0] === CLOVER_4.lobeRadius);
    const fillets = arcs.filter((c) => c.numbers[0] === CLOVER_4.filletRadius);

    expect(lobes).toHaveLength(4);
    expect(fillets).toHaveLength(4);
    for (const lobe of lobes) expect(lobe.numbers[4]).toBe(1);
    for (const fillet of fillets) expect(fillet.numbers[4]).toBe(0);
  });

  it('takes the short way round every arc, because it always can', () => {
    // The fillet is tangent to a lobe from the outside, so its centre is always
    // further out than the lobe's and both points of tangency land on the outer
    // half of the lobe: no arc here ever needs the large-arc flag. Stated as a
    // test because it is the assumption the code now rests on — the first
    // version worked the flag out per lobe and carried a branch nothing could
    // reach.
    for (const arc of commandsOf(scallopedPath(CLOVER_4)).filter((c) => c.kind === 'A')) {
      expect(arc.numbers[3]).toBe(0);
    }
  });

  it('leaves a cusp when asked for no fillet at all', () => {
    const cusped = scallopedPath({ lobes: 4, lobeRadius: 0.25, filletRadius: 0 });
    expect(cusped).toContain('L ');
    expect(cusped.match(/A /g)).toHaveLength(4);
  });

  it('gives the same path twice for the same numbers', () => {
    // It has to: the published CSS is compared build to build, and a generator
    // that drifted would make every diff about itself.
    expect(scallopedPath(CLOVER_4)).toBe(scallopedPath({ ...CLOVER_4 }));
  });

  it('refuses what it cannot draw instead of drawing nonsense', () => {
    expect(scallopedPath({ lobes: 1, lobeRadius: 0.25, filletRadius: 0.05 })).toBe('');
    expect(scallopedPath({ lobes: 4, lobeRadius: 0, filletRadius: 0.05 })).toBe('');
    expect(scallopedPath({ lobes: 4, lobeRadius: 0.5, filletRadius: 0.05 })).toBe('');
  });
});

describe('roundedPolygonPath', () => {
  it('rounds every corner of the polygon it is given', () => {
    expect(roundedPolygonPath(gemCorners()).match(/A /g)).toHaveLength(8);
  });

  it('keeps the gem inside its box', () => {
    for (const { x, y } of pointsOf(roundedPolygonPath(gemCorners()))) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it('cuts a corner back no further than half its shorter edge', () => {
    // Two neighbouring corners must not eat into each other: ask for a rounding
    // wider than the edge and you get the widest arc that still leaves a
    // straight segment, not a tangle of overlapping arcs.
    const square: Corner[] = [
      { point: { x: 0, y: 0 }, rounding: 10 },
      { point: { x: 1, y: 0 }, rounding: 10 },
      { point: { x: 1, y: 1 }, rounding: 10 },
      { point: { x: 0, y: 1 }, rounding: 10 },
    ];
    for (const { x, y } of pointsOf(roundedPolygonPath(square))) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
    // A square with every corner cut halfway is a diamond: no straight edge is
    // left, and the arcs meet exactly at the midpoints.
    expect(roundedPolygonPath(square)).toContain('0.5 0');
  });

  it('has nothing to draw with fewer than three corners', () => {
    expect(roundedPolygonPath([])).toBe('');
    expect(
      roundedPolygonPath([
        { point: { x: 0, y: 0 }, rounding: 0.1 },
        { point: { x: 1, y: 1 }, rounding: 0.1 },
      ]),
    ).toBe('');
  });
});

describe('CLIP_SHAPES', () => {
  it('carries the five shapes of the design, named once each', () => {
    expect(CLIP_SHAPES).toHaveLength(5);
    expect(new Set(CLIP_SHAPES.map((shape) => shape.id)).size).toBe(5);
  });

  it('gives every shape a geometry', () => {
    // An empty `d` is a clipPath that clips everything away: the photo
    // disappears, the id still resolves, and every other guard stays green.
    for (const shape of CLIP_SHAPES) {
      expect(shape.path, `${shape.id} has no geometry`).toMatch(/^M [\d.]/);
      expect(shape.path).toContain('Z');
    }
  });

  it('names its shapes as Material does, not as the export did', () => {
    expect(CLIP_SHAPES.map((shape) => shape.id)).toEqual([
      'clip-clover-4',
      'clip-cookie-6',
      'clip-clover-8',
      'clip-gem',
      'clip-skewed',
    ]);
  });

  it('keeps the export geometry for the one shape Material has no name for', () => {
    // clip-skewed is a hard-edged quadrilateral; Material's `slanted` is a
    // rounded square on a tilted axis. Nothing was rebuilt here, and the shape
    // says so by having no arcs in it at all.
    const skewed = CLIP_SHAPES.find((shape) => shape.id === 'clip-skewed')!;
    expect(skewed.path).not.toContain('A ');
  });
});
