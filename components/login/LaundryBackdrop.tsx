/**
 * Fondo de login: ciclo de lavado en SVG/CSS (sin video).
 * Loop permitido solo aquí: el login se ve una vez por sesión.
 * Fuera de esta superficie nada se mueve solo.
 *
 * El movimiento va a compás: cuatro carriles, un mismo periodo,
 * ondas en relación 2:3:4. No es un enjambre de tiempos sueltos.
 */
const CYCLE = 16;

const LANES = [
  { left: "14%", size: 20 },
  { left: "34%", size: 34 },
  { left: "54%", size: 24 },
  { left: "76%", size: 30 },
];

const BUBBLES = LANES.flatMap((lane, laneIndex) =>
  [0, 1].map((beat) => ({
    ...lane,
    delay: `${(laneIndex * 0.55 + beat * (CYCLE / 2)).toFixed(2)}s`,
    dur: `${CYCLE}s`,
  })),
);

const FOAM = Array.from({ length: 8 }, (_, i) => ({
  left: `${10 + i * 11}%`,
  size: 8 + (i % 3) * 2,
  delay: `${(i * 0.35).toFixed(2)}s`,
}));

export default function LaundryBackdrop() {
  return (
    <div className="laundry-backdrop" aria-hidden="true">
      <div className="laundry-glow" />
      <div className="laundry-drum">
        <span className="laundry-drum__ring" />
        <span className="laundry-drum__ring laundry-drum__ring--mid" />
        <span className="laundry-drum__hub" />
      </div>
      <div className="laundry-sheen" />

      <div className="laundry-wave-wrap laundry-wave-a">
        <WaveSvg fill="rgba(70, 95, 255, 0.28)" />
        <WaveSvg fill="rgba(70, 95, 255, 0.28)" />
      </div>
      <div className="laundry-wave-wrap laundry-wave-b">
        <WaveSvg fill="rgba(14, 165, 164, 0.24)" />
        <WaveSvg fill="rgba(14, 165, 164, 0.24)" />
      </div>
      <div className="laundry-wave-wrap laundry-wave-c">
        <WaveSvg fill="rgba(255, 255, 255, 0.10)" />
        <WaveSvg fill="rgba(255, 255, 255, 0.10)" />
      </div>
      <div className="laundry-water-bed" />

      {FOAM.map((f, i) => (
        <span
          key={`foam-${i}`}
          className="laundry-foam"
          style={{
            left: f.left,
            width: f.size,
            height: f.size * 0.72,
            animationDelay: f.delay,
          }}
        />
      ))}

      {BUBBLES.map((b, i) => (
        <span
          key={`bubble-${i}`}
          className="soap-bubble"
          style={
            {
              width: b.size,
              height: b.size,
              left: b.left,
              bottom: "6%",
              ["--delay"]: b.delay,
              ["--dur"]: b.dur,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function WaveSvg({ fill }: { fill: string }) {
  return (
    <svg
      className="laundry-wave-svg"
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
    >
      <path
        fill={fill}
        d="M0,118 C200,168 400,68 600,118 C800,168 1000,68 1200,118 L1200,200 L0,200 Z"
      />
    </svg>
  );
}
