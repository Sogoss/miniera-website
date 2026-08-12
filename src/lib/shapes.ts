/* The clip shapes, generated instead of copied.
 *
 * The names came from Material 3 in PR 5; the geometry follows here. Google
 * does not publish either the paths or the parameters of its shapes — they are
 * built at run time from a rounded polygon — and PR 5 decided that no
 * third-party shape package enters this repository, which leaves one road:
 * build them here, from the same construction, with parameters that are ours
 * and are written down next to the shape.
 *
 * So these are shapes **in the manner of** Material 3, not Material 3's own.
 * The distinction is not modesty: without published parameters the tuning is
 * done by eye against reference images, and claiming a fidelity nobody can
 * check is the kind of half-truth this repository spends its guards catching.
 *
 * Two constructions, because two families of shape.
 *
 * The clovers and the cookie are **scalloped**: a ring of circular lobes, each
 * joined to the next by a concave arc. This was written first as a rounded
 * polygon — a star with its corners cut by arcs tangent to both edges — which
 * is the obvious construction and the wrong one: the arc at a corner can never
 * be wider than the corner itself, so deep notches give sharp tips and round
 * tips give shallow notches. A clover needs both at once, and only circles give
 * both at once. The export knew as much: it draws its clovers as overlapping
 * `<circle>` elements. What differs here is the join — a fillet arc where the
 * export leaves a cusp, and that is most of what makes these read as Material
 * rather than as flowers.
 *
 * The gem is the other family: a plain polygon with rounded corners, since it
 * has facets and no lobes at all.
 *
 * Coordinates are in the 0…1 of `clipPathUnits="objectBoundingBox"`, so a shape
 * scales with whatever it clips. That also means it *stretches* with it: these
 * are drawn for a square, which is what the design applies them to — a 56×56
 * portrait.
 *
 * Like events.ts and cycles.ts this module imports nothing and never asks what
 * time it is. It is a function of its parameters and of nothing else, which is
 * what lets its output be compared byte for byte in a test.
 */

export type Point = { x: number; y: number };

/** A vertex of a polygon, with the radius its corner is rounded by. */
export type Corner = { point: Point; rounding: number };

/** A ring of circular lobes joined by concave arcs. */
export type ScallopSpec = {
  lobes: number;
  /** Radius of one lobe. Lobes touch the edge of the box: centre at 0.5 − r. */
  lobeRadius: number;
  /** Radius of the concave arc between two lobes. Zero leaves a cusp. */
  filletRadius: number;
};

const CENTRE: Point = { x: 0.5, y: 0.5 };
const RADIUS = 0.5;

/* Four decimals is a tenth of a pixel on a 56px portrait and about half a pixel
   on a 500px one: below what anyone can see, above what a rounding artefact
   needs to show up as a flat spot on a curve. */
const PRECISION = 4;

function round(value: number): number {
  return Number(value.toFixed(PRECISION));
}

function polar(angle: number, radius: number): Point {
  return {
    x: CENTRE.x + radius * Math.cos(angle),
    y: CENTRE.y + radius * Math.sin(angle),
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function towards(from: Point, to: Point, by: number): Point {
  const length = distance(from, to) || 1;
  return {
    x: from.x + ((to.x - from.x) / length) * by,
    y: from.y + ((to.y - from.y) / length) * by,
  };
}

function arc(radius: number, to: Point, sweep: 0 | 1, large: 0 | 1): string {
  return `A ${round(radius)} ${round(radius)} 0 ${large} ${sweep} ${round(to.x)} ${round(to.y)}`;
}

/**
 * A scalloped shape: `lobes` circles around the centre, each joined to its
 * neighbours by a concave arc.
 *
 * The lobes sit at `0.5 − lobeRadius` from the centre, so they touch the edge of
 * the box and the shape fills its square. The fillet between two of them is the
 * circle of radius `filletRadius` tangent to both, and its centre is what the
 * square root below solves for, on the bisector between the two lobes.
 *
 * Every arc here takes the short way round, and that is a fact about the
 * construction rather than an assumption: the fillet's centre always comes out
 * further from the middle than the lobe's own — it is tangent to the lobe from
 * the outside, so it sits `lobeRadius + filletRadius` away along a line pointing
 * outwards. Both points of tangency therefore fall on the outer half of the
 * lobe, and the arc between them is under half a circle. So no large-arc flag is
 * ever set, and a first version of this that worked one out per lobe was
 * carrying a branch nothing could reach.
 *
 * It also means the lobes are cut back further than the export's, whose circles
 * simply overlap and meet in a cusp at about three quarters of a turn. That is
 * the visible difference between the two families, and the reason these read as
 * Material and those read as flowers.
 */
export function scallopedPath(spec: ScallopSpec): string {
  const { lobes, lobeRadius, filletRadius } = spec;
  if (lobes < 2 || lobeRadius <= 0 || lobeRadius >= RADIUS) return '';

  const ride = RADIUS - lobeRadius;
  const step = (2 * Math.PI) / lobes;
  const half = step / 2;

  /* Where a fillet's centre sits: at distance D from the centre of the shape,
     such that it is `lobeRadius + filletRadius` from each of the two lobes it
     joins. Cosine rule, solved for D. */
  const reach = lobeRadius + filletRadius;
  const under = ride * ride * (Math.cos(half) ** 2 - 1) + reach * reach;
  if (under < 0) return '';
  const filletRide = ride * Math.cos(half) + Math.sqrt(under);

  const lobeCentres: Point[] = [];
  const filletCentres: Point[] = [];
  for (let i = 0; i < lobes; i++) {
    const angle = -Math.PI / 2 + i * step;
    lobeCentres.push(polar(angle, ride));
    filletCentres.push(polar(angle + half, filletRide));
  }

  const pieces: string[] = [];

  for (let i = 0; i < lobes; i++) {
    const lobe = lobeCentres[i]!;
    const before = filletCentres[(i - 1 + lobes) % lobes]!;
    const after = filletCentres[i]!;

    // Tangency is on the line joining two centres, at the lobe's radius.
    const entry = towards(lobe, before, lobeRadius);
    const exit = towards(lobe, after, lobeRadius);

    if (i === 0) pieces.push(`M ${round(entry.x)} ${round(entry.y)}`);

    pieces.push(arc(lobeRadius, exit, 1, 0));

    const nextEntry = towards(lobeCentres[(i + 1) % lobes]!, after, lobeRadius);
    if (filletRadius > 0) {
      // Concave: the outline turns the other way round the fillet's centre.
      pieces.push(arc(filletRadius, nextEntry, 0, 0));
    } else {
      pieces.push(`L ${round(nextEntry.x)} ${round(nextEntry.y)}`);
    }
  }

  pieces.push('Z');
  return pieces.join(' ');
}

/**
 * A polygon with every corner replaced by a circular arc tangent to both of its
 * edges. What the gem is made of.
 *
 * The requested rounding is a wish, not a promise: a corner is cut back at most
 * halfway along its shorter edge, so that two adjacent corners cannot eat into
 * each other. Ask for more and you get the largest arc that still leaves a
 * straight segment between the two — the right answer for a faceted shape, and
 * the reason the lobed ones are not built this way.
 */
export function roundedPolygonPath(corners: readonly Corner[]): string {
  if (corners.length < 3) return '';

  const pieces: string[] = [];

  for (let i = 0; i < corners.length; i++) {
    const previous = corners[(i - 1 + corners.length) % corners.length]!.point;
    const vertex = corners[i]!.point;
    const next = corners[(i + 1) % corners.length]!.point;

    const toPrevious = distance(vertex, previous);
    const toNext = distance(vertex, next);

    /* Half the angle at this corner, from the two unit vectors leaving it. The
       clamp keeps acos out of the ±1 rounding trap, where a straight-ish corner
       comes back as NaN and takes the whole path with it. */
    const ux = (previous.x - vertex.x) / (toPrevious || 1);
    const uy = (previous.y - vertex.y) / (toPrevious || 1);
    const wx = (next.x - vertex.x) / (toNext || 1);
    const wy = (next.y - vertex.y) / (toNext || 1);
    const half = Math.acos(Math.min(1, Math.max(-1, ux * wx + uy * wy))) / 2;
    const tangent = Math.tan(half);

    const wanted = corners[i]!.rounding / (tangent || 1);
    const cut = Math.min(wanted, Math.min(toPrevious, toNext) / 2);
    const radius = cut * tangent;

    const from = towards(vertex, previous, cut);
    const to = towards(vertex, next, cut);

    /* Which way this corner turns. In SVG's coordinates y grows downwards, so a
       positive cross product is a clockwise turn, and clockwise is sweep 1. */
    const cross =
      (vertex.x - previous.x) * (next.y - vertex.y) -
      (vertex.y - previous.y) * (next.x - vertex.x);

    pieces.push(
      `${i === 0 ? 'M' : 'L'} ${round(from.x)} ${round(from.y)}`,
      arc(radius, to, cross > 0 ? 1 : 0, 0),
    );
  }

  pieces.push('Z');
  return pieces.join(' ');
}

/**
 * The gem: eight facets at uneven distances from the centre, cut longer across
 * one diagonal than the other.
 *
 * Written as angles and radii rather than as eight pairs of coordinates,
 * because that is what the shape *is* — and because a table of coordinates is
 * the thing nobody can re-tune six months later.
 */
export function gemCorners(): Corner[] {
  const facets: { angle: number; radius: number }[] = [
    { angle: -68, radius: 0.9 },
    { angle: -22, radius: 1 },
    { angle: 22, radius: 0.9 },
    { angle: 68, radius: 1 },
    { angle: 112, radius: 0.9 },
    { angle: 158, radius: 1 },
    { angle: 202, radius: 0.9 },
    { angle: 248, radius: 1 },
  ];

  return facets.map(({ angle, radius }) => ({
    point: polar((angle * Math.PI) / 180, RADIUS * radius),
    rounding: RADIUS * 0.16,
  }));
}

/**
 * The five shapes, by the `id` they are referenced with.
 *
 * The parameters are the tuning, and they are the answer to «why 0.25?»: they
 * were moved until the shape read right at 56×56, which is the size the design
 * applies these at and the only size at which the difference between two of them
 * is a difference anybody sees. Four lobes of radius 0.25 is the export's own
 * quatrefoil — four circles of r = 0.27 — with the cusps between them filleted.
 *
 * `clip-skewed` is not generated. Material has no equivalent — its `slanted` is
 * a rounded square on a tilted axis, this is a hard-edged quadrilateral — so it
 * keeps the geometry of the export, decided in PR 5 and unchanged here.
 */
export const CLIP_SHAPES: { id: string; description: string; path: string }[] = [
  {
    id: 'clip-clover-4',
    description: 'quattro lobi attorno a una croce',
    path: scallopedPath({ lobes: 4, lobeRadius: 0.25, filletRadius: 0.07 }),
  },
  {
    id: 'clip-cookie-6',
    description: 'centro largo, sei lobi',
    path: scallopedPath({ lobes: 6, lobeRadius: 0.175, filletRadius: 0.11 }),
  },
  {
    id: 'clip-clover-8',
    description: 'centro stretto, otto lobi',
    path: scallopedPath({ lobes: 8, lobeRadius: 0.155, filletRadius: 0.05 }),
  },
  {
    id: 'clip-gem',
    description: 'otto lati arrotondati',
    path: roundedPolygonPath(gemCorners()),
  },
  {
    id: 'clip-skewed',
    description: 'quadrilatero con due lati inclinati',
    path: 'M 0 0.08 L 1 0 L 1 0.92 L 0 1 Z',
  },
];
