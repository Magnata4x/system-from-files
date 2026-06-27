import { useState } from "react";
import { SectionCard } from "./section-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, ShieldOff, Download, Copy, RefreshCw, Laptop, Smartphone, Printer } from "lucide-react";
import { toast } from "sonner";

function passwordStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const SESSIONS = [
  { id: "s1", device: "Chrome — macOS", location: "São Paulo, BR", last: "Now", current: true },
  { id: "s2", device: "Safari — iPhone 15", location: "São Paulo, BR", last: "2h ago", current: false },
  { id: "s3", device: "Firefox — Windows", location: "Lisbon, PT", last: "Yesterday", current: false },
];

const LOGINS = [
  { date: "May 24, 2026 14:02", device: "Chrome / macOS", location: "São Paulo, BR", success: true },
  { date: "May 23, 2026 09:48", device: "Safari / iOS", location: "São Paulo, BR", success: true },
  { date: "May 22, 2026 22:11", device: "Unknown", location: "Hanoi, VN", success: false },
  { date: "May 21, 2026 18:33", device: "Firefox / Win", location: "Lisbon, PT", success: true },
  { date: "May 20, 2026 07:14", device: "Chrome / Android", location: "Rio, BR", success: true },
];

function genBackupCodes() {
  const toCode = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
  };
  return Array.from({ length: 8 }, toCode);
}

export function SettingsSecurity() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [tfaOpen, setTfaOpen] = useState(false);
  const [tfaStep, setTfaStep] = useState<1 | 2 | 3>(1);
  const [otp, setOtp] = useState("");
  const [codes, setCodes] = useState<string[]>([]);

  const strength = passwordStrength(pw.next);
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-muted", "bg-red-500", "bg-amber-500", "bg-yellow-400", "bg-emerald-500"];

  const startTfa = () => {
    setTfaStep(1);
    setOtp("");
    setCodes(genBackupCodes());
    setTfaOpen(true);
  };

  const verifyOtp = () => {
    if (otp.length !== 6) return toast.error("Enter the 6-digit code");
    setTfaStep(3);
  };

  const finishTfa = () => {
    setTfaEnabled(true);
    setTfaOpen(false);
    toast.success("Two-factor authentication enabled");
  };

  return (
    <>
      <SectionCard title="Change password">
        <div className="grid gap-3 max-w-md">
          <div>
            <Label className="text-xs">Current password</Label>
            <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">New password</Label>
            <Input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded ${i <= strength ? strengthColors[strength] : "bg-muted"}`} />
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{strengthLabels[strength] || "Use 8+ chars, mixed case, number, symbol"}</div>
          </div>
          <div>
            <Label className="text-xs">Confirm new password</Label>
            <Input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          <div>
            <Button
              size="sm"
              disabled={!pw.current || strength < 3 || pw.next !== pw.confirm}
              onClick={() => {
                toast.success("Password updated");
                setPw({ current: "", next: "", confirm: "" });
              }}
            >
              Update password
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Two-factor authentication"
        description="Add an extra layer with an authenticator app."
        action={
          tfaEnabled ? (
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="size-3 mr-1" /> Enabled
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-400 border-red-500/30">
              <ShieldOff className="size-3 mr-1" /> Disabled
            </Badge>
          )
        }
      >
        <div className="flex flex-wrap gap-2">
          {!tfaEnabled ? (
            <Button size="sm" onClick={startTfa}>Enable 2FA</Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => { setCodes(genBackupCodes()); toast.success("Backup codes regenerated"); }}>
                <RefreshCw className="size-3.5 mr-1" /> Regenerate backup codes
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTfaStep(3); setTfaOpen(true); }}>View backup codes</Button>
              <Button size="sm" variant="outline" className="text-red-400 border-red-500/30" onClick={() => { setTfaEnabled(false); toast.message("2FA disabled"); }}>Disable</Button>
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Active sessions" description="Devices currently signed in to your account." action={
        <Button size="sm" variant="outline" className="text-red-400 border-red-500/30" onClick={() => toast.success("All other sessions revoked")}>Sign out other sessions</Button>
      }>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-2 py-2">Device</th>
                <th className="text-left font-medium px-2 py-2">Location</th>
                <th className="text-left font-medium px-2 py-2">Last active</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {SESSIONS.map((s) => (
                <tr key={s.id} className="border-b border-border/50">
                  <td className="px-2 py-2 flex items-center gap-2">
                    {s.device.includes("iPhone") ? <Smartphone className="size-4 text-muted-foreground" /> : <Laptop className="size-4 text-muted-foreground" />}
                    {s.device}
                  </td>
                  <td className="px-2 py-2 text-muted-foreground">{s.location}</td>
                  <td className="px-2 py-2 text-muted-foreground">{s.last}</td>
                  <td className="px-2 py-2 text-right">
                    {s.current ? <Badge variant="secondary">Current</Badge> : <Button variant="ghost" size="sm" className="text-red-400 h-7" onClick={() => toast.success("Session revoked")}>Revoke</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Login history" description="Last 5 sign-in attempts.">
        <ul className="space-y-1.5">
          {LOGINS.map((l, i) => (
            <li key={i} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-background/30 border border-border">
              <div className="flex flex-col">
                <span>{l.date}</span>
                <span className="text-xs text-muted-foreground">{l.device} · {l.location}</span>
              </div>
              <Badge className={l.success ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"}>
                {l.success ? "Success" : "Failed"}
              </Badge>
            </li>
          ))}
        </ul>
      </SectionCard>

      <Dialog open={tfaOpen} onOpenChange={setTfaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {tfaStep === 1 && "Step 1 of 3 — Scan QR code"}
              {tfaStep === 2 && "Step 2 of 3 — Verify code"}
              {tfaStep === 3 && "Step 3 of 3 — Backup codes"}
            </DialogTitle>
          </DialogHeader>

          {tfaStep === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Scan with Google Authenticator, 1Password, or Authy.</p>
              <div className="flex justify-center">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth%3A%2F%2Ftotp%2FAISignalRadar%3Ayou%40example.com%3Fsecret%3DJBSWY3DPEHPK3PXP%26issuer%3DAISignalRadar"
                  alt="2FA QR code"
                  className="rounded-md bg-white p-2"
                  width={200}
                  height={200}
                />
              </div>
              <div className="text-xs text-center text-muted-foreground font-mono">JBSWY3DPEHPK3PXP</div>
              <DialogFooter>
                <Button onClick={() => setTfaStep(2)}>Next</Button>
              </DialogFooter>
            </div>
          )}

          {tfaStep === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-lg tracking-[0.5em] font-mono"
              />
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setTfaStep(1)}>Back</Button>
                <Button onClick={verifyOtp}>Verify</Button>
              </DialogFooter>
            </div>
          )}

          {tfaStep === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Save these in a safe place. Each code can be used once.</p>
              <div className="grid grid-cols-2 gap-2">
                {codes.map((c) => (
                  <div key={c} className="font-mono text-sm bg-secondary rounded px-3 py-2 text-center">{c}</div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(codes.join("\n")); toast.success("Copied"); }}>
                  <Copy className="size-3.5 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const blob = new Blob([codes.join("\n")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "aisignalradar-backup-codes.txt"; a.click();
                  URL.revokeObjectURL(url);
                }}>
                  <Download className="size-3.5 mr-1" /> Download
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const w = window.open("", "_blank", "width=600,height=700");
                  if (!w) return toast.error("Allow pop-ups to print");
                  w.document.write(`<!doctype html><html><head><title>AISignalRadar — Backup Codes</title>
                    <style>
                      body{font-family:ui-sans-serif,system-ui,sans-serif;color:#111;padding:32px;max-width:560px;margin:0 auto}
                      h1{font-size:18px;margin:0 0 4px}
                      .sub{font-size:12px;color:#666;margin-bottom:24px}
                      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
                      .code{font-family:ui-monospace,Menlo,monospace;font-size:16px;padding:12px;border:1px solid #ddd;border-radius:6px;text-align:center;letter-spacing:1px}
                      .foot{margin-top:24px;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:12px}
                      @media print{button{display:none}}
                    </style></head><body>
                    <h1>AISignalRadar — 2FA Backup Codes</h1>
                    <div class="sub">Generated ${new Date().toLocaleString()} · Each code can be used once. Store in a safe place.</div>
                    <div class="grid">${codes.map((c) => `<div class="code">${c}</div>`).join("")}</div>
                    <div class="foot">If you lose access to your authenticator app, use any of these codes to sign in. Treat them like passwords.</div>
                    <script>window.onload=()=>window.print()</script>
                  </body></html>`);
                  w.document.close();
                }}>
                  <Printer className="size-3.5 mr-1" /> Print
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={finishTfa}>I've saved my codes</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
