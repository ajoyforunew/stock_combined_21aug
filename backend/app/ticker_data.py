import os
import pickle

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models")
with open(os.path.join(MODEL_PATH, "ticker_map_nse.pkl"), "rb") as f:
    TICKER_MAP = pickle.load(f)
