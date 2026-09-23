# FX AI v0.1

TradingView webhook receiver and research signal engine for USDJPY.

## Current flow
TradingView Pine alert -> POST /webhook/tradingview -> JSON validation -> NDJSON storage -> simple regime/signal classification.

Signals are **LONG_WATCH / SHORT_WATCH / NO_TRADE**, not automatic orders. The initial rules are deliberately simple so they can be backtested before adding complexity.

## Run
Node.js 18+:

```
npm start
```

Health check: `GET /health`

Webhook: `POST /webhook/tradingview`

For basic protection set environment variable `WEBHOOK_TOKEN`, then use:
`/webhook/tradingview?token=YOUR_SECRET`

## Next
1. Deploy to an HTTPS host.
2. Put the deployed webhook URL in TradingView.
3. Collect USDJPY 5m data.
4. Add market structure (HH/HL/LH/LL, BOS), sessions and RR.
5. Backtest with train/validation/out-of-sample splits before using live capital.
