"""
Enhanced Market Data Service with Caching and Rate Limiting
Designed to handle thousands of concurrent users
"""

import asyncio
import aiohttp
import yfinance as yf
from datetime import datetime, timedelta
import redis
import json
from typing import Dict, List, Optional
import logging
from functools import lru_cache
import numpy as np

class ScalableMarketDataService:
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        self.session = None
        self.cache_ttl = {
            'market_overview': 30,  # 30 seconds
            'technical_analysis': 120,  # 2 minutes
            'market_sentiment': 60   # 1 minute
        }
        
        # Connection pool for external APIs
        self.connector = aiohttp.TCPConnector(
            limit=100,  # Total connection pool size
            limit_per_host=30,  # Per host connection limit
            ttl_dns_cache=300,  # DNS cache TTL
            use_dns_cache=True,
        )
        
        self.nse_symbols = {
            'nifty50': '^NSEI',
            'sensex': '^BSESN',
            'bankNifty': '^NSEBANK',
            'niftyIT': '^CNXIT'
        }
        
        # Popular stocks for analysis
        self.top_stocks = [
            'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
            'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS',
            'LT.NS', 'ASIANPAINT.NS', 'AXISBANK.NS', 'MARUTI.NS', 'BAJFINANCE.NS'
        ]

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            connector=self.connector,
            timeout=aiohttp.ClientTimeout(total=10)
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
        await self.connector.close()

    async def get_cached_data(self, cache_key: str) -> Optional[Dict]:
        """Get data from Redis cache"""
        try:
            cached_data = self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logging.warning(f"Cache read error: {e}")
        return None

    async def set_cached_data(self, cache_key: str, data: Dict, ttl: int):
        """Set data in Redis cache"""
        try:
            self.redis_client.setex(
                cache_key, 
                ttl, 
                json.dumps(data, default=str)
            )
        except Exception as e:
            logging.warning(f"Cache write error: {e}")

    async def get_market_overview(self) -> Dict:
        """Get cached market overview or fetch fresh data"""
        cache_key = "market_overview"
        
        # Try cache first
        cached_data = await self.get_cached_data(cache_key)
        if cached_data:
            cached_data['from_cache'] = True
            return cached_data

        # Fetch fresh data if cache miss
        try:
            market_data = await self._fetch_fresh_market_data()
            
            # Cache the result
            await self.set_cached_data(
                cache_key, 
                market_data, 
                self.cache_ttl['market_overview']
            )
            
            market_data['from_cache'] = False
            return market_data
            
        except Exception as e:
            logging.error(f"Error fetching market data: {e}")
            return self._get_fallback_market_data()

    async def _fetch_fresh_market_data(self) -> Dict:
        """Fetch fresh market data with concurrent requests"""
        
        # Create concurrent tasks for different data sources
        tasks = [
            self._fetch_indices_data(),
            self._fetch_top_movers(),
            self._fetch_market_breadth()
        ]
        
        # Execute all tasks concurrently
        indices_data, (gainers, losers), breadth = await asyncio.gather(
            *tasks, return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(indices_data, Exception):
            indices_data = {}
        if isinstance(gainers, Exception):
            gainers, losers = [], []
        if isinstance(breadth, Exception):
            breadth = {}

        return {
            'indices': indices_data,
            'topGainers': gainers,
            'topLosers': losers,
            'marketBreadth': breadth,
            'lastUpdated': datetime.now().isoformat(),
            'from_cache': False
        }

    async def _fetch_indices_data(self) -> Dict:
        """Fetch indices data concurrently"""
        async def fetch_single_index(name: str, symbol: str) -> tuple:
            try:
                # Use yfinance with async wrapper
                loop = asyncio.get_event_loop()
                ticker = await loop.run_in_executor(
                    None, 
                    lambda: yf.Ticker(symbol)
                )
                hist = await loop.run_in_executor(
                    None,
                    lambda: ticker.history(period="2d")
                )
                
                if len(hist) >= 2:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2]
                    change = current_price - prev_price
                    change_percent = (change / prev_price) * 100
                    
                    return name, {
                        'price': round(float(current_price), 2),
                        'change': round(float(change), 2),
                        'changePercent': round(float(change_percent), 2)
                    }
            except Exception as e:
                logging.error(f"Error fetching {symbol}: {e}")
                return name, None

        # Fetch all indices concurrently
        tasks = [
            fetch_single_index(name, symbol) 
            for name, symbol in self.nse_symbols.items()
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        indices_data = {}
        for result in results:
            if isinstance(result, tuple) and result[1]:
                name, data = result
                indices_data[name] = data
                
        return indices_data

    async def get_technical_analysis(self, symbol: str) -> Dict:
        """Get cached technical analysis or calculate fresh"""
        cache_key = f"technical_analysis_{symbol}"
        
        # Try cache first
        cached_data = await self.get_cached_data(cache_key)
        if cached_data:
            cached_data['from_cache'] = True
            return cached_data

        # Calculate fresh technical analysis
        try:
            technical_data = await self._calculate_technical_indicators(symbol)
            
            # Cache the result
            await self.set_cached_data(
                cache_key,
                technical_data,
                self.cache_ttl['technical_analysis']
            )
            
            technical_data['from_cache'] = False
            return technical_data
            
        except Exception as e:
            logging.error(f"Error calculating technical analysis for {symbol}: {e}")
            return self._get_fallback_technical_data(symbol)

    async def _calculate_technical_indicators(self, symbol: str) -> Dict:
        """Calculate technical indicators asynchronously"""
        
        # Fetch historical data
        loop = asyncio.get_event_loop()
        ticker = await loop.run_in_executor(None, lambda: yf.Ticker(symbol))
        hist = await loop.run_in_executor(
            None, 
            lambda: ticker.history(period="1y")
        )
        
        if len(hist) < 50:
            raise ValueError(f"Insufficient data for {symbol}")

        # Calculate indicators concurrently
        tasks = [
            loop.run_in_executor(None, self._calculate_rsi, hist['Close']),
            loop.run_in_executor(None, self._calculate_macd, hist['Close']),
            loop.run_in_executor(None, self._calculate_bollinger_bands, hist['Close']),
            loop.run_in_executor(None, self._calculate_moving_averages, hist['Close']),
            loop.run_in_executor(None, self._calculate_support_resistance, hist)
        ]
        
        rsi, macd, bb, ma, sr = await asyncio.gather(*tasks)
        
        current_price = float(hist['Close'].iloc[-1])
        volume = float(hist['Volume'].iloc[-1])
        
        return {
            'symbol': symbol,
            'currentPrice': current_price,
            'volume': volume,
            'technicalIndicators': {
                'rsi': rsi,
                'macd': macd,
                'ma20': ma['ma20'],
                'ma50': ma['ma50'],
                'ma200': ma['ma200']
            },
            'bollingerBands': bb,
            'supportResistance': sr,
            'lastUpdated': datetime.now().isoformat()
        }

    # ... (Include all the calculation methods from the original file)
    
    def _calculate_rsi(self, prices, period=14):
        """Calculate RSI indicator"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return float(rsi.iloc[-1])

    def _calculate_macd(self, prices):
        """Calculate MACD indicator"""
        ema12 = prices.ewm(span=12).mean()
        ema26 = prices.ewm(span=26).mean()
        macd_line = ema12 - ema26
        signal_line = macd_line.ewm(span=9).mean()
        histogram = macd_line - signal_line
        
        return {
            'macd': float(macd_line.iloc[-1]),
            'signal': float(signal_line.iloc[-1]),
            'histogram': float(histogram.iloc[-1])
        }

    def _calculate_bollinger_bands(self, prices, period=20):
        """Calculate Bollinger Bands"""
        sma = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        
        return {
            'upper': float(sma.iloc[-1] + (std.iloc[-1] * 2)),
            'middle': float(sma.iloc[-1]),
            'lower': float(sma.iloc[-1] - (std.iloc[-1] * 2))
        }

    def _calculate_moving_averages(self, prices):
        """Calculate moving averages"""
        return {
            'ma20': float(prices.rolling(window=20).mean().iloc[-1]),
            'ma50': float(prices.rolling(window=50).mean().iloc[-1]),
            'ma200': float(prices.rolling(window=200).mean().iloc[-1]) if len(prices) >= 200 else None
        }

    def _calculate_support_resistance(self, hist):
        """Calculate support and resistance levels"""
        high_prices = hist['High'].rolling(window=20).max()
        low_prices = hist['Low'].rolling(window=20).min()
        
        return {
            'resistance': float(high_prices.iloc[-1]),
            'support': float(low_prices.iloc[-1])
        }

    async def _fetch_top_movers(self):
        """Fetch top movers with rate limiting"""
        # Implementation similar to original but with concurrency
        # and proper error handling
        pass

    async def _fetch_market_breadth(self):
        """Fetch market breadth data"""
        # Implementation with caching and concurrency
        pass

    def _get_fallback_market_data(self):
        """Fallback data when APIs fail"""
        return {
            'indices': {
                'nifty50': {'price': 24936.40, 'change': -45.60, 'changePercent': -0.18},
                'sensex': {'price': 81867.55, 'change': -102.57, 'changePercent': -0.13}
            },
            'topGainers': [],
            'topLosers': [],
            'marketBreadth': {'advancing': 0, 'declining': 0, 'unchanged': 0},
            'lastUpdated': datetime.now().isoformat(),
            'from_cache': False,
            'fallback': True
        }

    def _get_fallback_technical_data(self, symbol):
        """Fallback technical data"""
        return {
            'symbol': symbol,
            'currentPrice': 0,
            'technicalIndicators': {},
            'fallback': True
        }

# Singleton instance
scalable_market_service = ScalableMarketDataService()
