import { LucideIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export function ChannelRow({
  icon: Icon,
  label,
  description,
  on,
  onToggle,
  disabled,
  badge,
  iconColor,
  children,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  on: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  badge?: React.ReactNode;
  iconColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border border-border bg-card/40 p-4 ${disabled ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3">
        <div
          className="size-9 rounded-md flex items-center justify-center shrink-0"
          style={{ background: iconColor ? `${iconColor}1a` : "hsl(var(--secondary))" }}
        >
          <Icon className="size-[18px]" style={{ color: iconColor ?? "hsl(var(--foreground))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-foreground">{label}</span>
            {badge}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Switch checked={on} onCheckedChange={onToggle} disabled={disabled} />
      </div>
      {on && children && <div className="mt-3 pl-12">{children}</div>}
    </div>
  );
}
