import pandas as pd
import numpy as np

def create_features(df):
    df = df.copy()
    df["Return"] = df["Close"].pct_change()
    df["Lag1"] = df["Close"].shift(1)
    df["Lag2"] = df["Close"].shift(2)
    df["Lag3"] = df["Close"].shift(3)
    df["MA5"] = df["Close"].rolling(5).mean()
    df["MA10"] = df["Close"].rolling(10).mean()
    df = df.dropna()
    return df

def recursive_forecast(df, price_model, vol_model, days):
    df = create_features(df)
    future_dates = pd.date_range(start=df.index[-1] + pd.Timedelta(days=1), periods=days, freq="B")

    forecasts = []
    last_data = df.iloc[-3:].copy()

    for date in future_dates:
        features = last_data.iloc[-1:].copy()
        X_price = features[["Lag1", "Lag2", "Lag3", "MA5", "MA10"]]
        X_vol = features[["Lag1", "Lag2", "Lag3", "MA5", "MA10"]]  # same features

        pred_price = price_model.predict(X_price)[0]
        pred_vol = vol_model.predict(X_vol)[0]

        forecasts.append({
            "ds": date.strftime("%Y-%m-%d"),
            "Predicted_Close": float(pred_price),
            "Predicted_Volume": float(pred_vol)
        })

        new_row = pd.DataFrame({
            "Close": [pred_price],
            "Lag1": [pred_price],
            "Lag2": [last_data.iloc[-1]["Lag1"]],
            "Lag3": [last_data.iloc[-1]["Lag2"]],
            "MA5": [np.mean([pred_price] + last_data["Close"].tolist()[-4:])],
            "MA10": [np.mean([pred_price] + last_data["Close"].tolist()[-9:])],
        }, index=[date])

        last_data = pd.concat([last_data, new_row]).iloc[-10:]

    return pd.DataFrame(forecasts)
