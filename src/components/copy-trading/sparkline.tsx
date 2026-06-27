type Props = {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
};

export function Sparkline({ data, width = 96, height = 28, positive }: Props) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * stepX).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(" ");
  const last = data[data.length - 1];
  const isPos = positive ?? last >= 0;
  const color = isPos ? "#34d399" : "#f87171";
  const fillId = `spark-fill-${isPos ? "p" : "n"}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#${fillId})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={width}
        cy={height - ((last - min) / range) * height}
        r={2}
        fill={color}
      />
    </svg>
  );
}
