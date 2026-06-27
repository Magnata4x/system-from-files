import { useState } from "react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useProfileStore } from "@/lib/profile-store";
import { toast } from "sonner";

export function DangerZone() {
  const { info } = useProfileStore();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const exportData = () => {
    toast.success("Export requested", {
      description: "We'll email you a download link within 24h.",
    });
  };

  const confirmDelete = () => {
    if (typed !== info.email) return;
    toast.error("Account scheduled for deletion", {
      description: "You have 30 days to cancel from your inbox.",
    });
    setOpen(false);
    setTyped("");
  };

  return (
    <>
      <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <header className="mb-4 flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
        </header>

        <div className="space-y-2.5">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3">
            <div className="size-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
              <Download className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">Export my data</div>
              <p className="text-xs text-muted-foreground mt-0.5">All signals, alerts, settings — JSON archive.</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportData}>Request export</Button>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-card/40 p-3">
            <div className="size-9 rounded-md bg-destructive/10 flex items-center justify-center shrink-0">
              <Trash2 className="size-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">Delete account</div>
              <p className="text-xs text-muted-foreground mt-0.5">Permanent after 30 days. All data wiped.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              Delete account
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTyped(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" /> Delete account
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your AISignalRadar account, all signals, alerts and exchange connections. You have 30 days to reverse this from your inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive/90">
              To confirm, type your email exactly: <b className="font-mono">{info.email}</b>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Your email</Label>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={info.email}
                autoComplete="off"
                className="mt-1.5 font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={typed !== info.email}
              onClick={confirmDelete}
            >
              Delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
