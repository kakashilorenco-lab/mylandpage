# Market research: regime + finalists (as of 2026-11-27)

Rules for this document: every number has a source and a date. **[EST]** = estimate,
**[SPEC]** = speculation, **[CONFLICT]** = sources disagree. Secondary sources (news,
aggregators) are marked; nothing here was verified against an exchange API, because this
build environment's network blocks exchange hosts. Re-verify against primary dashboards
(DefiLlama, CoinGlass, issuer docs, Hyperliquid API) before money moves.

## 1. Regime: risk-off, high volatility, liquidity draining

| Signal | Reading | Source (date) |
|---|---|---|
| BTC price | ~$59.6k–61.6k [CONFLICT across snapshots] | CoinGlass / CoinDesk via thelibraryestate.com (2026-11-27) |
| BTC cycle low | ~$55.1k printed 2026-11-21, under the June floor | CoinDCX (late Nov 2026) |
| Spot BTC ETF flows | Record November net outflow: $5.39B (tradingnews.com) vs $4.71B (CoinDCX) [CONFLICT]; 7 straight outflow sessions, last -$453M | 2026-11-27 |
| Funding | ~neutral (0.0017%–0.0054% per 8h) on Binance/OKX/Bybit | CoinGlass / CoinDesk (2026-11-27) |
| BTC futures OI | ~$40.4B (-1.1% 24h) | CoinGlass (2026-11-27) |
| Rally quality | 77% of $84.7M BTC liquidations were shorts → bounces = short covering, not new demand | CoinDesk (2026-11-27) |
| ETH | ~$1,670 (bounce to ~$1,738 reported) | CoinDCX, Au79 Substack (2026-11-24/27) |
| BTC dominance | 57.3%–59% after ~60.6% peak on 11-12; rising dominance = flight from alts, not BTC inflow | KuCoin / CryptoBriefing / CoinDCX (Nov 2026) |
| Stablecoin supply | $244B (CryptoBriefing, 11-17, "lowest since Sep 2025") vs $279.8B (Au79, 11-27) [CONFLICT, unresolved] | — |
| Options | ~$6.75–7B Deribit expiry 2026-11-27 08:00 UTC | CoinDesk (2026-11-27) |

**Conclusion.** Regime = `high_vol` drifting between `trending` (down) and `crisis`. In this
regime the highest-expectancy action for an automated system is usually *no position*.
The agent is therefore configured to trade only BTC/ETH (deep books, lowest cost) and to
spend most of its time holding. Alt "asymmetric value" longs are research positions for
the operator, not reflex trades.

## 2. Finalists (compiled into `schemas/v1.json`)

Only three candidates have enough verifiable data to compile. The prompt asked for 5–10;
padding the list with unverified metrics would break the "never invent metrics" rule.

### F1 — BTC-USD (regime trade, not a value thesis)
- **Thesis:** tradable mean reversion after forced flushes, trend-following shorts on
  breakdown continuation. Edge source = microstructure, not valuation.
- **Catalysts (confirmed):** ETF flow prints daily; options expiries. **[SPEC]** macro/Fed.
- **Bear case for longs:** record ETF outflows, new cycle low, rallies are short covering.
- **Invalidation:** sustained multi-day ETF inflows + reclaim of breakdown levels kills
  the short bias; new lows with expanding vol kill long fades.
- **Value accrual:** n/a (monetary asset).

### F2 — ETH-USD (beta leg)
- **Thesis:** same regime, higher beta; used only when BTC is not in `crisis`.
- **Bear case:** ETH underperforms in risk-off; dominance rising.
- **Invalidation:** ETH/BTC turning up with positive book imbalance invalidates shorts.

### F3 — HYPE (Hyperliquid) — the one organic value-accrual case
- **Fundamentals (sourced):** 99% of perp fees go to the Assistance Fund, which buys HYPE
  on market (Castle Labs / crypto.news). Holder buybacks $77.9M in the 30 days to
  2026-11-24 — #1 of 135 buyback protocols (Castle Labs, data via DefiLlama). Perp volume
  $10.08B/24h and $74.0B/7d to 2026-11-14; ~48% of onchain perp DEX volume; $6.18B OI
  (Castle Labs). Price ~$61.6 (2026-11-25, ripr.trade) vs ~$97.96 ATH 2026-09-23 (CoinCentral).
- **Is the edge organic?** Fees are paid by real traders → buybacks are revenue-funded,
  not emissions-funded. That is the right kind of value accrual.
- **Catalysts:** none confirmed upside. Confirmed *negative* supply events: ~14.2M HYPE
  on 2026-11-29 (Tokenomics.com) and up to 9.92M HYPE core-contributor unlock 2026-12-06
  (~$600M, Crypto.com; past releases reportedly smaller than scheduled) [CONFLICT on size].
- **Bear case (aggressive):** (a) market share has already fallen from ~71% peak to
  ~37–48% as Lighter/Aster/Variational compete; (b) buybacks are pro-cyclical — volume and
  fees fall in a bear, so the bid shrinks exactly when you need it; (c) HK SFC flagged it
  as an unlicensed platform; US status unresolved; (d) validator concentration; (e)
  unlocks dwarf one month of buybacks; (f) HIP-3 builder markets (~50% of volume by
  mid-2026) may share fees differently — verify how much of that flows to buybacks.
- **Invalidation:** 30d buyback run-rate drops >40% MoM; onchain perp share < ~35%;
  enforcement action against the venue.
- **Is it priced in?** Partially: −37% from ATH in a market-wide drawdown is mostly beta,
  not idiosyncratic re-rating. **[EST]** No mispricing claim is made.
- **Note:** not in the default live symbol set (venue/liquidity for HYPE spot must be
  confirmed first). Unlock windows force quality ≤ 2 in its criteria.

## 3. Watchlist (not compiled: data incomplete or conflicting)

| Token | What is sourced | Why not a finalist |
|---|---|---|
| UNI | Fee switch approved Dec 2025 ("UNIfication", Wikipedia); $8.2M buybacks 30d (Castle Labs); V3 holders revenue $5.28M Nov-to-date (DefiLlama via search) | Need fee trend, emissions/treasury sales vs buybacks |
| PUMP | $18.0M buybacks 30d (Castle Labs); 10B PUMP unlock 2026-12-14 ~$30M (DeFi Saver) | Memecoin-launchpad revenue is highly cyclical; holder concentration unverified |
| AAVE | Buyback status [CONFLICT]: "Aavenomics 3.0 automated" vs "paused since Apr 19" vs "$0 holder revenue May–Nov" | Cannot state value accrual until resolved |
| ENA, APT, SEI, Aster | Unlocks listed for Dec 2026 (DataWallet, DeFi Saver, Tokentoria) | Supply overhang; candidates for *short* research only |

Sector context: Castle Labs estimates ~$13.7B protocol revenue over 12 months but "most
leading tokens lagged bitcoin" and revenue ≠ holder earnings; top 10 protocols took 73% of
holder earnings. One research repo argues Q4 unlocks (~$8.7B) swamp holder revenue —
secondary source, treated as directional only.

## Sources
- CoinGlass BTC: https://www.coinglass.com/currencies/BTC
- CoinDesk morning brief (mirror): https://thelibraryestate.com/cryptocurrency-markets-global-crypto-morning-brief-bitcoin-rises-toward-61600-with-stocks-as-7-billion-of-options-expire-nov-27-2026/
- Trading News BTC/ETF outflows: https://www.tradingnews.com/news/bitcoin-btc-usd-holds-60000-after-3000-flush-67250-usd-target-needs-close-above-64441
- Au79 Macro: https://martyau79.substack.com/p/27nov2026-crypto-and-macro-liquidity
- CoinDCX: https://coindcx.com/blog/crypto-deep-dives/crypto-bull-run
- KuCoin dominance: https://www.kucoin.com/news/flash/bitcoin-dominance-falls-below-60-in-november-2026
- CryptoBriefing liquidity: https://cryptobriefing.com/bitcoin-below-65000-crypto-liquidity-drains/
- Castle Labs revenue rankings: https://castlelabs.io/research/crypto-revenue-rankings
- Castle Labs Hyperliquid: https://castlelabs.io/research/hyperliquid
- ripr HYPE perps: https://ripr.trade/perps/hype
- CoinCentral HYPE: https://coincentral.com/hyperliquid-hype-price-is-it-worth-buying-at-83-what-the-data-shows
- crypto.news HYPE: https://crypto.news/price-prediction/hyperliquid/
- CoinStats HYPE analysis (AI-generated, low weight): https://coinstats.app/ai/a/investment-analysis-hyperliquid
- Crypto.com December outlook: https://crypto.com/us/market-updates/best-crypto-december-2026
- DataWallet unlocks: https://www.datawallet.com/token-unlock-calendar
- DeFi Saver unlocks: https://www.todayscrypto.news/defi-saver-the-decentralized-finance-protocol-aggregator-that-simplifies-and-automates-their-useto-make-the-world/
- Tokentoria unlocks: https://tokentoria.com/en/unlocks/
- Ripple escrow: https://en.coin-turk.com/ripple-to-release-final-1-billion-xrp-escrow-of-2026-on-december-1/
- Castle Labs 12m report (ChainCatcher): https://www.chaincatcher.com/en/article/2305399
- Uniswap: https://en.wikipedia.org/wiki/Uniswap , https://defillama.com/protocol/uniswap-v3
- Governance research repo (secondary): https://github.com/Ricosworks1/governance-research-reports
