"use client";
export function LineChart({
  points,
  series,
  format = (v: number) => String(Math.round(v)),
  label,
}: {
  points: { x: number; values: number[] }[];
  series: string[];
  format?: (v: number) => string;
  label: string;
}) {
  const colors = ["#2450c0", "#4fae86", "#d99a1e", "#cb5b4b"];
  const max = Math.max(1, ...points.flatMap((p) => p.values)) * 1.12,
    minX = points[0]?.x ?? 0,
    maxX = points.at(-1)?.x ?? 1;
  const x = (v: number) => 58 + ((v - minX) / (maxX - minX || 1)) * 630,
    y = (v: number) => 215 - (v / max) * 180;
  return (
    <div className="chart">
      <svg viewBox="0 0 720 270" role="img" aria-label={label}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1="58"
              x2="690"
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="#ece7df"
              strokeDasharray="4 5"
            />
            <text x="48" y={y(max * t) + 4} textAnchor="end" className="axis">
              {format(max * t)}
            </text>
          </g>
        ))}
        {points
          .filter(
            (_, i) => i % Math.max(1, Math.floor(points.length / 6)) === 0,
          )
          .map((p) => (
            <text
              key={p.x}
              x={x(p.x)}
              y="241"
              textAnchor="middle"
              className="axis"
            >
              {p.x}
            </text>
          ))}
        {series.map((s, i) => (
          <polyline
            key={s}
            fill="none"
            stroke={colors[i]}
            strokeWidth="2.8"
            strokeLinejoin="round"
            points={points
              .map((p) => `${x(p.x)},${y(p.values[i] ?? 0)}`)
              .join(" ")}
          />
        ))}
        {points.map((p) => (
          <g key={p.x}>
            {p.values.map((v, i) => (
              <circle key={i} cx={x(p.x)} cy={y(v)} r="3" fill={colors[i]}>
                <title>
                  {p.x}: {series[i]} {format(v)}
                </title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="legend">
        {series.map((s, i) => (
          <span key={s}>
            <i style={{ background: colors[i] }} />
            {s}
          </span>
        ))}
      </div>
      <details className="chart-data">
        <summary>Lihat angka grafik</summary>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label={label}
        >
          <table>
            <thead>
              <tr>
                <th>Nilai sumbu X</th>
                {series.map((name) => (
                  <th key={name}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.x}>
                  <td>{p.x}</td>
                  {p.values.map((value, i) => (
                    <td key={i}>{Math.round(value).toLocaleString("id-ID")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
