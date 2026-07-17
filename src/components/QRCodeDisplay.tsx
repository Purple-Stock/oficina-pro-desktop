import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  emptyLabel?: string;
}

export function QRCodeDisplay({
  value,
  size = 64,
  className = "",
  emptyLabel = "—",
}: QRCodeDisplayProps) {
  if (!value) {
    return (
      <div
        className={`bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-md ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-blue-400">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-white p-1 rounded-xl shadow-md ${className}`}
      style={{ width: size, height: size }}
    >
      <QRCodeSVG
        value={value}
        size={size - 8}
        level="M"
        includeMargin={false}
      />
    </div>
  );
}
