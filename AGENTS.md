<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Financial news is fetched only server-side through the existing sentiment API and returned separately from price/momentum scoring, preventing credential exposure and silent score blending.
- Bot4x has no local simulator: DEMO and REAL both read the operational backend and the verified ledger; DEMO executes real orders on Binance Spot Testnet (requires BINANCE_TRADING_ENV=testnet, BOT4X_DEMO_AUTO_EXECUTION=true and verified testnet credentials in exchange_credentials), REAL stays gated server-side.
