# backend/app/train_nse_advanced.py
import pickle
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from lightgbm import LGBMRegressor
import os
import ta  # Technical Analysis library

NSE_TICKERS = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS"]

def add_technical_indicators(df):
    df["MA_5"] = df["Close"].rolling(5).mean()
    df["MA_10"] = df["Close"].rolling(10).mean()
    df["MA_20"] = df["Close"].rolling(20).mean()
    df["MA_50"] = df["Close"].rolling(50).mean()
    df["MA_100"] = df["Close"].rolling(100).mean()
    df["MA_200"] = df["Close"].rolling(200).mean()

    df["RSI_14"] = ta.momentum.RSIIndicator(df["Close"], window=14).rsi()
    macd = ta.trend.MACD(df["Close"])
    df["MACD"] = macd.macd()
    df["MACD_Signal"] = macd.macd_signal()
    bb = ta.volatility.BollingerBands(df["Close"], window=20, window_dev=2)
    df["BB_High"] = bb.bollinger_hband()
    df["BB_Low"] = bb.bollinger_lband()

    df["ATR"] = ta.volatility.AverageTrueRange(
        df["High"], df["Low"], df["Close"], window=14
    ).average_true_range()
    return df

def add_time_features(df):
    df["dayofweek"] = df.index.dayofweek
    df["month"] = df.index.month
    df["quarter"] = df.index.quarter
    return df

def fetch_fundamentals(ticker):
    info = yf.Ticker(ticker).info
    return {
        "marketCap": info.get("marketCap"),
        "trailingPE": info.get("trailingPE"),
        "forwardPE": info.get("forwardPE"),
        "priceToBook": info.get("priceToBook"),
        "dividendYield": info.get("dividendYield"),
        "returnOnEquity": info.get("returnOnEquity"),
        "debtToEquity": info.get("debtToEquity"),
        "profitMargins": info.get("profitMargins"),
        "epsTrailingTwelveMonths": info.get("epsTrailingTwelveMonths"),
    }

def train_multi_ticker_nse(save_path="models"):
    os.makedirs(save_path, exist_ok=True)
    all_data = []
    ticker_map = {}

    print(f"Fetching NSE data for {len(NSE_TICKERS)} tickers...")
    for idx, ticker in enumerate(NSE_TICKERS):
        end = datetime.today()
        start = end - timedelta(days=365*5)
        df = yf.download(ticker, start=start, end=end)
        df.columns = df.columns.get_level_values(0)

        if df.empty:
            print(f"⚠ Skipping {ticker} (no data)")
            continue

        df = add_technical_indicators(df)
        df = add_time_features(df)

        fundamentals = fetch_fundamentals(ticker)
        for k, v in fundamentals.items():
            df[k] = v  # Constant per ticker

        df["Ticker"] = idx
        all_data.append(df)
        ticker_map[ticker] = idx

    if not all_data:
        raise ValueError("No NSE data fetched.")

    combined_df = pd.concat(all_data).dropna()

    X = combined_df.drop(columns=["Close", "Volume"])
    y_price = combined_df["Close"]
    y_volume = combined_df["Volume"]

    print("Training price model...")
    price_model = LGBMRegressor()
    price_model.fit(X, y_price)

    print("Training volume model...")
    vol_model = LGBMRegressor()
    vol_model.fit(X, y_volume)

    with open(f"{save_path}/price_model_nse.pkl", "wb") as f:
        pickle.dump(price_model, f)
    with open(f"{save_path}/vol_model_nse.pkl", "wb") as f:
        pickle.dump(vol_model, f)
    with open(f"{save_path}/ticker_map_nse.pkl", "wb") as f:
        pickle.dump(ticker_map, f)

    print("✅ Advanced NSE models saved!")

if __name__ == "__main__":
    train_multi_ticker_nse()
