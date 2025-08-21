# features.py
import pandas as pd
import ta


def add_indicators(df_):
    df = df_.copy()
    df = df.sort_values('ds').reset_index(drop=True)
    df.columns = df.columns.get_level_values(0)

    df['Return'] = df['Close'].pct_change()
    df['SMA5'] = df['Close'].rolling(5).mean()
    df['SMA20'] = df['Close'].rolling(20).mean()
    df['EMA20'] = df['Close'].ewm(span=20, adjust=False).mean()
    df['RSI'] = ta.momentum.RSIIndicator(close=df['Close'], window=14).rsi()

    macd_ind = ta.trend.MACD(close=df['Close'], window_slow=26, window_fast=12, window_sign=9)
    df['MACD'] = macd_ind.macd()
    df['MACD_signal'] = macd_ind.macd_signal()

    bb = ta.volatility.BollingerBands(close=df['Close'], window=20, window_dev=2)
    df['BB_upper'] = bb.bollinger_hband()
    df['BB_lower'] = bb.bollinger_lband()
    df['BB_width'] = (df['BB_upper'] - df['BB_lower']) / df['SMA20']

    atr = ta.volatility.AverageTrueRange(high=df['High'], low=df['Low'], close=df['Close'], window=14)
    df['ATR'] = atr.average_true_range()

    return df