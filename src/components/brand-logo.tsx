export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: "var(--brand-blue-deep)",
        borderRadius: 10,
      }}
    >
      <svg
        width={size * 0.7}
        height={size * 0.7}
        viewBox="100 40 170 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* candle 1 */}
        <line x1="122" y1="62" x2="122" y2="72" stroke="#378ADD" strokeWidth="1.8" />
        <rect x="117" y="72" width="10" height="32" rx="1.5" fill="#378ADD" />
        <line x1="122" y1="104" x2="122" y2="116" stroke="#378ADD" strokeWidth="1.8" />

        {/* candle 2 */}
        <line x1="142" y1="58" x2="142" y2="68" stroke="#85B7EB" strokeWidth="1.8" />
        <rect x="137" y="68" width="10" height="40" rx="1.5" fill="#85B7EB" />
        <line x1="142" y1="108" x2="142" y2="118" stroke="#85B7EB" strokeWidth="1.8" />

        {/* candle 3 */}
        <line x1="162" y1="52" x2="162" y2="62" stroke="#B5D4F4" strokeWidth="1.8" />
        <rect x="157" y="62" width="10" height="50" rx="1.5" fill="#B5D4F4" />
        <line x1="162" y1="112" x2="162" y2="122" stroke="#B5D4F4" strokeWidth="1.8" />

        {/* candle 4 small */}
        <line x1="182" y1="64" x2="182" y2="70" stroke="#85B7EB" strokeWidth="1.8" opacity="0.6" />
        <rect x="177" y="70" width="10" height="20" rx="1.5" fill="#85B7EB" opacity="0.6" />
        <line x1="182" y1="90" x2="182" y2="100" stroke="#85B7EB" strokeWidth="1.8" opacity="0.6" />

        {/* candle 5 premium */}
        <line x1="202" y1="48" x2="202" y2="56" stroke="#E6F1FB" strokeWidth="1.8" />
        <rect x="197" y="56" width="10" height="56" rx="1.5" fill="#E6F1FB" />
        <line x1="202" y1="112" x2="202" y2="124" stroke="#E6F1FB" strokeWidth="1.8" />

        {/* radar waves */}
        <path d="M214 90 Q228 72 228 90 Q228 108 214 90" fill="none" stroke="#378ADD" strokeWidth="1.8" opacity="0.9" />
        <path d="M214 90 Q244 60 244 90 Q244 120 214 90" fill="none" stroke="#378ADD" strokeWidth="1.8" opacity="0.55" />
        <path d="M214 90 Q260 48 260 90 Q260 132 214 90" fill="none" stroke="#378ADD" strokeWidth="1.8" opacity="0.25" />

        {/* baseline */}
        <line x1="110" y1="128" x2="270" y2="128" stroke="#B5D4F4" strokeWidth="0.6" opacity="0.4" />
      </svg>
    </div>
  );
}

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
