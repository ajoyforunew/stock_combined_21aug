from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import yfinance as yf
import pickle
from datetime import datetime, timedelta

from .auth import router as auth_router
from .portfolio import router as portfolio_router
from .db import Base, engine
from .models_db import User, Portfolio
from .api_send_email import router as email_router



app = FastAPI(title="NSE Stock Prediction API")
app.include_router(email_router)

# Global exception handler for 500 errors to always return JSON
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error. Please try again later.",
            "error": str(exc),
            "trace": traceback.format_exc()
        },
    )
# CORS (allow frontend dev origin)

# Harden CORS for production: only allow your real frontend domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Dev
        "https://your-production-frontend.com"  # <-- Replace with your real domain
    ],
    allow_credentials=True,
    allow_methods=["POST", "GET", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add simple rate limiting middleware (10 requests/min per IP)
from .rate_limiter import SimpleRateLimiter
app.add_middleware(SimpleRateLimiter, max_requests=10, window_seconds=60)

# TODO: Enforce JWT authentication on all sensitive endpoints (see auth.py)

# ====== Load models and ticker map ======


# Use absolute path for model files
import os
from .ticker_data import TICKER_MAP
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models")
with open(os.path.join(MODEL_PATH, "price_model_nse.pkl"), "rb") as f:
    PRICE_MODEL = pickle.load(f)
with open(os.path.join(MODEL_PATH, "vol_model_nse.pkl"), "rb") as f:
    VOL_MODEL = pickle.load(f)

# Try to get the features the models were trained on (LightGBM exposes this)
PRICE_FEATURES = getattr(PRICE_MODEL, "feature_name_", None)
VOL_FEATURES = getattr(VOL_MODEL, "feature_name_", None)

def ensure_nse_suffix(symbol: str) -> str:
    s = symbol.upper()
    return s if s.endswith(".NS") else f"{s}.NS"

# ====== Technicals (all pandas, no external libs) ======
def ema(series: pd.Series, span: int) -> pd.Series:
    return series.ewm(span=span, adjust=False).mean()

def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def compute_macd(close: pd.Series):
    ema12 = ema(close, 12)
    ema26 = ema(close, 26)
    macd = ema12 - ema26
    signal = ema(macd, 9)
    hist = macd - signal
    return macd, signal, hist

def compute_bbands(close: pd.Series, window: int = 20, dev: float = 2.0):
    ma = close.rolling(window).mean()
    std = close.rolling(window).std()
    upper = ma + dev * std
    lower = ma - dev * std
    return upper, ma, lower

def compute_atr(high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14):
    prev_close = close.shift(1)
    tr = pd.concat([
        (high - low),
        (high - prev_close).abs(),
        (low - prev_close).abs()
    ], axis=1).max(axis=1)
    return tr.rolling(window).mean()

def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    # Moving Averages
    for w in [5, 10, 20, 50, 100, 200]:
        df[f"MA_{w}"] = df["Close"].rolling(w).mean()
    # EMAs
    for w in [10, 20]:
        df[f"EMA_{w}"] = ema(df["Close"], w)
    # Volatility & momentum
    df["Volatility_10"] = df["Close"].rolling(10).std()
    df["Momentum_4"] = df["Close"].diff(4)
    # Log return
    df["Log_Return"] = np.log(df["Close"] / df["Close"].shift(1))
    # RSI
    df["RSI_14"] = compute_rsi(df["Close"], 14)
    # MACD
    macd, macd_sig, macd_hist = compute_macd(df["Close"])
    df["MACD"] = macd
    df["MACD_Signal"] = macd_sig
    df["MACD_Hist"] = macd_hist
    # Bollinger Bands
    bb_u, bb_m, bb_l = compute_bbands(df["Close"], 20, 2.0)
    df["BB_Upper"] = bb_u
    df["BB_Middle"] = bb_m
    df["BB_Lower"] = bb_l
    # ATR
    df["ATR_14"] = compute_atr(df["High"], df["Low"], df["Close"], 14)
    return df

def add_time_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["DayOfWeek"] = df.index.dayofweek
    df["Month"] = df.index.month
    df["Quarter"] = df.index.quarter
    return df

def fetch_fundamentals(symbol: str) -> dict:
    # Fundamentals are constant across rows; we attach same value to each row
    try:
        info = yf.Ticker(symbol).info
    except Exception:
        info = {}
    return {
        "marketCap": info.get("marketCap", np.nan),
        "trailingPE": info.get("trailingPE", np.nan),
        "forwardPE": info.get("forwardPE", np.nan),
        "priceToBook": info.get("priceToBook", np.nan),
        "dividendYield": info.get("dividendYield", np.nan),
        "beta": info.get("beta", np.nan),
    }

def build_feature_frame(symbol: str, lookback_days: int = 365) -> pd.DataFrame:
    end = datetime.today()
    start = end - timedelta(days=lookback_days)
    df = yf.download(symbol, start=start, end=end)
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

    # Base engineering
    df = add_technical_indicators(df)
    df = add_time_features(df)

    # Fundamentals (constant columns)
    fundamentals = fetch_fundamentals(symbol)
    for k, v in fundamentals.items():
        df[k] = v

    # Clean NAs
    df = df.replace([np.inf, -np.inf], np.nan).fillna(method="ffill").fillna(method="bfill")
    return df

def align_features(X: pd.DataFrame, expected_cols: list[str] | None) -> pd.DataFrame:
    """
    Aligns DataFrame columns to model's expected feature list.
    If expected_cols is None, uses X as-is.
    Missing cols -> 0, Extra cols -> kept (LightGBM ignores by name),
    but we reindex to exact order if provided.
    """
    if not expected_cols:
        return X
    aligned = pd.DataFrame(index=X.index)
    for col in expected_cols:
        if col in X.columns:
            aligned[col] = X[col]
        else:
            aligned[col] = 0.0
    return aligned

def next_trading_day(d: pd.Timestamp) -> pd.Timestamp:
    # Skip weekends (NSE holidays not handled)
    nd = d + timedelta(days=1)
    while nd.weekday() >= 5:  # 5=Sat, 6=Sun
        nd += timedelta(days=1)
    return nd

# Create tables if they do not exist
Base.metadata.create_all(bind=engine)

app.include_router(auth_router)
app.include_router(portfolio_router)

@app.get("/predict")
def predict(
    symbol: str = Query(..., description="NSE ticker like RELIANCE or RELIANCE.NS"),
    days: int = Query(30, ge=1, le=120, description="Forecast horizon (1-120)")
):
    # Normalize symbol to NSE format
    sym = ensure_nse_suffix(symbol)

    # Ensure ticker is in training map
    if sym not in TICKER_MAP:
        raise HTTPException(status_code=400, detail=f"{sym} not in trained NSE ticker list.")

    try:
        # 1) Build historical feature frame
        feat_df = build_feature_frame(sym, lookback_days=365)

        # 2) Add Ticker ID
        feat_df["Ticker"] = TICKER_MAP[sym]

        # 3) Define feature matrix (drop targets if they existed in training)
        # Models were trained to predict Close and Volume; we DO NOT include them in X
        base_X = feat_df.drop(columns=[c for c in ["Close", "Volume"] if c in feat_df.columns])

        # 4) Align to model features
        X_price = align_features(base_X, PRICE_FEATURES)
        X_vol = align_features(base_X, VOL_FEATURES)

        # 5) Prepare a working OHLCV df to extend into the future
        # We'll use last known rows and append predictions for sequential recursion
        ohlcv_cols = [c for c in ["Open", "High", "Low", "Close", "Volume"] if c in feat_df.columns]
        ohlcv_df = feat_df[ohlcv_cols].copy()
        last_idx = feat_df.index[-1]

        # 6) Recursive multi-step forecasting
        preds = []
        last_price = feat_df["Close"].iloc[-1] if "Close" in feat_df.columns else np.nan
        last_vol = feat_df["Volume"].iloc[-1] if "Volume" in feat_df.columns else np.nan

        # We'll recompute features each step based on extended OHLCV
        work_df = feat_df.copy()

        for i in range(days):
            # a) Use the latest engineered row to predict next-day
            latest_X_price = X_price.iloc[[-1]]
            latest_X_vol = X_vol.iloc[[-1]]

            pred_close = float(PRICE_MODEL.predict(latest_X_price)[0])
            pred_vol = float(VOL_MODEL.predict(latest_X_vol)[0])

            # b) Create a new future OHLCV row (approximate OHLC from predicted close)
            fut_date = next_trading_day(last_idx)
            # Simple OHLC synthesis around predicted close
            fut_close = pred_close
            fut_open = float(pred_close) if np.isfinite(pred_close) else float(last_price)
            fut_high = float(max(fut_close, fut_open))
            fut_low = float(min(fut_close, fut_open))
            fut_volume = float(max(pred_vol, 0.0)) if np.isfinite(pred_vol) else float(last_vol or 0.0)

            # Append to OHLCV working frame
            new_row = pd.DataFrame({
                "Open": [fut_open],
                "High": [fut_high],
                "Low": [fut_low],
                "Close": [fut_close],
                "Volume": [fut_volume],
            }, index=pd.DatetimeIndex([fut_date]))
            # merge with work_df's base OHLCV columns
            for c in ["Open", "High", "Low", "Close", "Volume"]:
                if c in work_df.columns:
                    pass
                else:
                    work_df[c] = np.nan
            work_df = pd.concat([work_df, new_row], axis=0)

            # Recompute technicals & time features ONLY for the tail to keep it light
            tail = work_df[["Open", "High", "Low", "Close", "Volume"]].copy()
            tail = add_technical_indicators(tail)
            tail = add_time_features(tail)

            # Reattach fundamentals (constants)
            fundamentals = fetch_fundamentals(sym)
            for k, v in fundamentals.items():
                tail[k] = v

            # Reattach Ticker id
            tail["Ticker"] = TICKER_MAP[sym]

            # Forward/backward fill to remove any NaNs due to windows
            tail = tail.replace([np.inf, -np.inf], np.nan).fillna(method="ffill").fillna(method="bfill")

            # Update working engineered df, and rebuild aligned X
            work_df = tail
            base_X = work_df.drop(columns=[c for c in ["Close", "Volume"] if c in work_df.columns])
            X_price = align_features(base_X, PRICE_FEATURES)
            X_vol = align_features(base_X, VOL_FEATURES)

            # Save current prediction row (we attach engineered features too)
            feature_row = base_X.iloc[-1].to_dict()
            preds.append({
                "date": fut_date.strftime("%Y-%m-%d"),
                "predicted_close": pred_close,
                "predicted_volume": pred_vol,
                **feature_row
            })

            # Advance pointers
            last_idx = fut_date
            last_price = fut_close
            last_vol = fut_volume

        # Sanitize predictions: replace NaN/inf with None for JSON compatibility
        import math
        def sanitize(obj):
            if isinstance(obj, float):
                if math.isnan(obj) or math.isinf(obj):
                    return None
                return obj
            elif isinstance(obj, dict):
                return {k: sanitize(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [sanitize(x) for x in obj]
            else:
                return obj

        return {
            "symbol": sym,
            "predictions": sanitize(preds)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
