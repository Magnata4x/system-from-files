import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight syntax highlighter — no external deps.
// keys/identifiers (function calls, object keys) -> blue
// strings -> green
// numbers -> amber
// comments -> muted
// keywords -> violet
type Lang = "javascript" | "python" | "curl" | "json";

const KEYWORDS: Record<Lang, string[]> = {
  javascript: ["const", "let", "var", "await", "async", "function", "return", "import", "from", "console"],
  python: ["import", "from", "def", "return", "print", "as"],
  curl: ["curl"],
  json: [],
};

type Token = { text: string; cls?: string };

function tokenize(code: string, lang: Lang): Token[] {
  const tokens: Token[] = [];
  const kw = new Set(KEYWORDS[lang]);
  // Regex order matters: comments → strings → numbers → keywords/idents → other
  const re =
    /(\/\/[^\n]*|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|([^\s\w])/g;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) tokens.push({ text: code.slice(last, m.index) });
    const [match, comment, str, num, ident, ws, sym] = m;
    if (comment) tokens.push({ text: comment, cls: "text-muted-foreground/70 italic" });
    else if (str) tokens.push({ text: str, cls: "text-emerald-400" });
    else if (num) tokens.push({ text: num, cls: "text-amber-400" });
    else if (ident) {
      if (kw.has(ident)) tokens.push({ text: ident, cls: "text-violet-400" });
      else tokens.push({ text: ident, cls: "text-[#5fa8ff]" });
    } else if (ws) tokens.push({ text: ws });
    else if (sym) tokens.push({ text: sym, cls: "text-foreground/80" });
    last = m.index + match.length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last) });
  return tokens;
}

export function CodeBlock({ code, lang, className }: { code: string; lang: Lang; className?: string }) {
  const [copied, setCopied] = useState(false);
  const tokens = useMemo(() => tokenize(code, lang), [code, lang]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  return (
    <div className={cn("relative rounded-lg border border-border bg-[#0a0e15] overflow-hidden group", className)}>
      <button
        onClick={copy}
        className="absolute top-2.5 right-2.5 z-10 size-7 rounded-md bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
        aria-label="Copy code"
      >
        {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
      </button>
      <pre className="text-[12.5px] leading-relaxed px-4 py-3.5 overflow-x-auto font-mono">
        <code>
          {tokens.map((t, i) =>
            t.cls ? (
              <span key={i} className={t.cls}>
                {t.text}
              </span>
            ) : (
              <span key={i}>{t.text}</span>
            )
          )}
        </code>
      </pre>
    </div>
  );
}
