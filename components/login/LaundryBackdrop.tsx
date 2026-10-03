/**
 * Fondo de login: agua, espuma y burbujas en SVG/CSS (sin video).
 * Loop permitido solo aquí: el login se ve una vez por sesión.
 * Fuera de esta superficie nada se mueve solo.
 */
const BUBBLES = [
  { size: 18, left: "6%", delay: "0s", dur: "11s" },
  { size: 42, left: "14%", delay: "1.6s", dur: "15s" },
  { size: 22, left: "27%", delay: "3.4s", dur: "9s" },
  { size: 64, left: "41%", delay: "0.7s", dur: "17s" },
  { size: 28, left: "55%", delay: "2.4s", dur: "12s" },
  { size: 16, left: "68%", delay: "5.1s", dur: "8s" },
  { size: 50, left: "79%", delay: "1.2s", dur: "14s" },
  { size: 24, left: "90%", delay: "3.8s", dur: "10s" },
  { size: 36, left: "48%", delay: "6.2s", dur: "13s" },
  { size: 14, left: "33%", delay: "4.5s", dur: "7s" },
];

const FOAM = [
  { left: "8%", size: 10, delay: "0s" },
  { left: "18%", size: 7, delay: "1.1s" },
  { left: "29%", size: 12, delay: "0.4s" },
  { left: "41%", size: 8, delay: "1.8s" },
  { left: "52%", size: 11, delay: "0.7s" },
  { left: "63%", size: 6, delay: "2.2s" },
  { left: "74%", size: 13, delay: "1.4s" },
  { left: "86%", size: 9, delay: "0.3s" },
];

export default function LaundryBackdrop() {
  return (
    <div className="laundry-backdrop" aria-hidden="true">
      <div className="laundry-glow" />

      <div className="laundry-wave-wrap laundry-wave-a">
        <WaveSvg fill="rgba(70, 95, 255, 0.22)" />
        <WaveSvg fill="rgba(70, 95, 255, 0.22)" />
      </div>
      <div className="laundry-wave-wrap laundry-wave-b">
        <WaveSvg fill="rgba(14, 165, 164, 0.18)" />
        <WaveSvg fill="rgba(14, 165, 164, 0.18)" />
      </div>
      <div className="laundry-wave-wrap laundry-wave-c">
        <WaveSvg fill="rgba(255, 255, 255, 0.06)" />
        <WaveSvg fill="rgba(255, 255, 255, 0.06)" />
      </div>

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
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            bottom: "-8%",
            ["--delay"]: b.delay,
            ["--dur"]: b.dur,
          } as React.CSSProperties}
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
        d="M0,96 C150,140 300,52 450,96 C600,140 750,52 900,96 C1050,140 1200,52 1200,96 L1200,200 L0,200 Z"
      />
    </svg>
  );
}
