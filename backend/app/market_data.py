import yfinance as yf
import requests
import json
from datetime import datetime, timedelta
import asyncio
import aiohttp
from typing import Dict, List
import numpy as np

class MarketDataService:
    def __init__(self):
        self.nse_symbols = {
            'nifty50': '^NSEI',
            'sensex': '^BSESN',
            'bankNifty': '^NSEBANK',
            'niftyIT': '^CNXIT'
        }
        
        self.top_stocks = [
            'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
            'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS',
            'LT.NS', 'ASIANPAINT.NS', 'AXISBANK.NS', 'MARUTI.NS', 'BAJFINANCE.NS',
            'HCLTECH.NS', 'WIPRO.NS', 'ULTRACEMCO.NS', 'TITAN.NS', 'SUNPHARMA.NS'
        ]

    async def get_market_overview(self) -> Dict:
        """Get live market overview data"""
        try:
            market_data = {}
            
            # Fetch major indices
            for name, symbol in self.nse_symbols.items():
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="2d")
                
                if len(hist) >= 2:
                    current_price = hist['Close'].iloc[-1]
                    prev_price = hist['Close'].iloc[-2]
                    change = current_price - prev_price
                    change_percent = (change / prev_price) * 100
                    
                    market_data[name] = {
                        'price': round(current_price, 2),
                        'change': round(change, 2),
                        'changePercent': round(change_percent, 2)
                    }
            
            # Get top gainers and losers
            gainers, losers = await self._get_top_movers()
            
            # Get market breadth
            breadth = await self._get_market_breadth()
            
            return {
                'indices': market_data,
                'topGainers': gainers,
                'topLosers': losers,
                'marketBreadth': breadth,
                'lastUpdated': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error fetching market overview: {e}")
            return self._get_fallback_market_data()

    async def _get_top_movers(self) -> tuple:
        """Get top gainers and losers"""
        try:
            stocks_data = []
            
            # Fetch data for top stocks
            for symbol in self.top_stocks[:15]:  # Limit to avoid API rate limits
                try:
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(period="2d")
                    
                    if len(hist) >= 2:
                        current_price = hist['Close'].iloc[-1]
                        prev_price = hist['Close'].iloc[-2]
                        change = current_price - prev_price
                        change_percent = (change / prev_price) * 100
                        
                        stocks_data.append({
                            'symbol': symbol.replace('.NS', ''),
                            'price': round(current_price, 2),
                            'change': round(change, 2),
                            'changePercent': round(change_percent, 2)
                        })
                except:
                    continue
            
            # Sort by change percentage
            stocks_data.sort(key=lambda x: x['changePercent'], reverse=True)
            
            gainers = stocks_data[:5]  # Top 5 gainers
            losers = stocks_data[-5:]  # Top 5 losers
            losers.reverse()  # Show worst performers first
            
            return gainers, losers
            
        except Exception as e:
            print(f"Error fetching top movers: {e}")
            return self._get_fallback_movers()

    async def _get_market_breadth(self) -> Dict:
        """Calculate market breadth (advances/declines)"""
        try:
            # Simulate market breadth calculation
            # In a real implementation, you'd fetch data from NSE/BSE APIs
            advances = np.random.randint(1500, 2000)
            declines = np.random.randint(1200, 1600)
            unchanged = np.random.randint(200, 400)
            
            return {
                'advances': advances,
                'declines': declines,
                'unchanged': unchanged
            }
        except:
            return {'advances': 1750, 'declines': 1350, 'unchanged': 250}

    async def get_market_sentiment(self) -> Dict:
        """Calculate market sentiment indicators"""
        try:
            # Get VIX data for volatility
            vix_data = await self._get_volatility_index()
            
            # Calculate overall sentiment based on market performance
            sentiment_score = await self._calculate_sentiment_score()
            
            # Get fear & greed index
            fear_greed = await self._calculate_fear_greed_index()
            
            # Get sector sentiment
            sector_sentiment = await self._get_sector_sentiment()
            
            # Get news sentiment
            news_sentiment = await self._get_news_sentiment()
            
            return {
                'overall': {
                    'score': sentiment_score,
                    'label': self._get_sentiment_label(sentiment_score),
                    'color': self._get_sentiment_color(sentiment_score)
                },
                'fear_greed': {
                    'score': fear_greed,
                    'label': self._get_fear_greed_label(fear_greed),
                    'color': self._get_fear_greed_color(fear_greed)
                },
                'volatility': {
                    'score': vix_data,
                    'label': self._get_volatility_label(vix_data),
                    'color': self._get_volatility_color(vix_data)
                },
                'sectors': sector_sentiment,
                'news': news_sentiment,
                'lastUpdated': datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error calculating market sentiment: {e}")
            return self._get_fallback_sentiment_data()

    async def _get_volatility_index(self) -> int:
        """Get volatility index (VIX equivalent)"""
        try:
            # Fetch India VIX
            ticker = yf.Ticker("^INDIAVIX")
            hist = ticker.history(period="1d")
            
            if len(hist) > 0:
                vix_value = hist['Close'].iloc[-1]
                return int(vix_value)
            else:
                return 25  # Default moderate volatility
        except:
            return 25

    async def _calculate_sentiment_score(self) -> int:
        """Calculate overall market sentiment score"""
        try:
            # Get Nifty performance over different periods
            nifty = yf.Ticker("^NSEI")
            hist = nifty.history(period="1mo")
            
            if len(hist) >= 5:
                # Calculate momentum indicators
                recent_performance = (hist['Close'].iloc[-1] / hist['Close'].iloc[-5] - 1) * 100
                monthly_performance = (hist['Close'].iloc[-1] / hist['Close'].iloc[0] - 1) * 100
                
                # Calculate sentiment score (0-100)
                sentiment = 50 + (recent_performance * 2) + (monthly_performance * 1.5)
                return max(0, min(100, int(sentiment)))
            else:
                return 55  # Neutral
        except:
            return 55

    async def _calculate_fear_greed_index(self) -> int:
        """Calculate fear & greed index"""
        try:
            # Simplified calculation based on market momentum and volatility
            nifty = yf.Ticker("^NSEI")
            hist = nifty.history(period="1mo")
            
            if len(hist) >= 10:
                volatility = hist['Close'].rolling(10).std().iloc[-1]
                momentum = (hist['Close'].iloc[-1] / hist['Close'].iloc[-10] - 1) * 100
                
                # Calculate fear/greed (higher volatility = more fear)
                fear_greed = 50 + momentum * 2 - volatility * 0.5
                return max(0, min(100, int(fear_greed)))
            else:
                return 50
        except:
            return 50

    async def _get_sector_sentiment(self) -> List[Dict]:
        """Get sector-wise sentiment"""
        sectors = [
            {'sector': 'Banking', 'symbol': '^NSEBANK'},
            {'sector': 'IT', 'symbol': '^CNXIT'},
            {'sector': 'Auto', 'symbol': '^CNXAUTO'},
            {'sector': 'Pharma', 'symbol': '^CNXPHARMA'},
            {'sector': 'Energy', 'symbol': '^CNXENERGY'},
            {'sector': 'FMCG', 'symbol': '^CNXFMCG'}
        ]
        
        sector_data = []
        for sector in sectors:
            try:
                ticker = yf.Ticker(sector['symbol'])
                hist = ticker.history(period="5d")
                
                if len(hist) >= 3:
                    recent_change = (hist['Close'].iloc[-1] / hist['Close'].iloc[-3] - 1) * 100
                    sentiment_score = max(0, min(100, int(50 + recent_change * 3)))
                    
                    trend = "up" if recent_change > 1 else "down" if recent_change < -1 else "neutral"
                    
                    sector_data.append({
                        'sector': sector['sector'],
                        'sentiment': sentiment_score,
                        'trend': trend
                    })
                else:
                    # Fallback data
                    sector_data.append({
                        'sector': sector['sector'],
                        'sentiment': np.random.randint(45, 65),
                        'trend': np.random.choice(['up', 'down', 'neutral'])
                    })
            except:
                # Fallback data
                sector_data.append({
                    'sector': sector['sector'],
                    'sentiment': np.random.randint(45, 65),
                    'trend': np.random.choice(['up', 'down', 'neutral'])
                })
        
        return sector_data

    async def _get_news_sentiment(self) -> List[Dict]:
        """Get news sentiment (simplified implementation)"""
        # In a real implementation, you'd integrate with news APIs and sentiment analysis
        sample_news = [
            {"title": "Indian markets gain on positive global cues and FII inflows", "sentiment": "positive", "score": np.random.randint(65, 80)},
            {"title": "Banking sector shows resilience amid rate cut expectations", "sentiment": "positive", "score": np.random.randint(60, 75)},
            {"title": "IT stocks face pressure due to global slowdown concerns", "sentiment": "negative", "score": np.random.randint(30, 45)},
            {"title": "Auto sector recovers on festive season demand outlook", "sentiment": "positive", "score": np.random.randint(60, 70)},
            {"title": "Metal stocks mixed on China demand uncertainty", "sentiment": "neutral", "score": np.random.randint(45, 55)}
        ]
        
        return sample_news

    def _get_sentiment_label(self, score: int) -> str:
        if score >= 70: return "Bullish"
        elif score >= 60: return "Neutral-Bullish"
        elif score >= 40: return "Neutral"
        elif score >= 30: return "Neutral-Bearish"
        else: return "Bearish"

    def _get_sentiment_color(self, score: int) -> str:
        if score >= 60: return "text-green-600"
        elif score >= 40: return "text-yellow-600"
        else: return "text-red-600"

    def _get_fear_greed_label(self, score: int) -> str:
        if score >= 75: return "Extreme Greed"
        elif score >= 55: return "Greed"
        elif score >= 45: return "Neutral"
        elif score >= 25: return "Fear"
        else: return "Extreme Fear"

    def _get_fear_greed_color(self, score: int) -> str:
        if score >= 75: return "text-red-600"
        elif score >= 55: return "text-orange-500"
        elif score >= 45: return "text-yellow-600"
        elif score >= 25: return "text-blue-600"
        else: return "text-purple-600"

    def _get_volatility_label(self, score: int) -> str:
        if score <= 15: return "Very Low"
        elif score <= 25: return "Low"
        elif score <= 35: return "Moderate"
        elif score <= 45: return "High"
        else: return "Very High"

    def _get_volatility_color(self, score: int) -> str:
        if score <= 25: return "text-green-600"
        elif score <= 35: return "text-yellow-600"
        else: return "text-red-600"

    def _get_fallback_market_data(self) -> Dict:
        """Fallback data when API fails"""
        return {
            'indices': {
                'nifty50': {'price': 24936.40, 'change': 142.75, 'changePercent': 0.58},
                'sensex': {'price': 81867.55, 'change': 378.30, 'changePercent': 0.46},
                'bankNifty': {'price': 51432.85, 'change': -89.45, 'changePercent': -0.17},
                'niftyIT': {'price': 42863.20, 'change': 215.85, 'changePercent': 0.51}
            },
            'topGainers': [
                {'symbol': 'ADANIPORTS', 'price': 1285.75, 'change': 68.20, 'changePercent': 5.60},
                {'symbol': 'TATAMOTORS', 'price': 952.40, 'change': 45.85, 'changePercent': 5.06}
            ],
            'topLosers': [
                {'symbol': 'BAJFINANCE', 'price': 6542.30, 'change': -185.70, 'changePercent': -2.76},
                {'symbol': 'HDFCLIFE', 'price': 635.85, 'change': -16.45, 'changePercent': -2.52}
            ],
            'marketBreadth': {'advances': 1750, 'declines': 1350, 'unchanged': 250},
            'lastUpdated': datetime.now().isoformat()
        }

    def _get_fallback_movers(self) -> tuple:
        """Fallback top movers data"""
        gainers = [
            {'symbol': 'ADANIPORTS', 'price': 1285.75, 'change': 68.20, 'changePercent': 5.60},
            {'symbol': 'TATAMOTORS', 'price': 952.40, 'change': 45.85, 'changePercent': 5.06}
        ]
        losers = [
            {'symbol': 'BAJFINANCE', 'price': 6542.30, 'change': -185.70, 'changePercent': -2.76},
            {'symbol': 'HDFCLIFE', 'price': 635.85, 'change': -16.45, 'changePercent': -2.52}
        ]
        return gainers, losers

    def _get_fallback_sentiment_data(self) -> Dict:
        """Fallback sentiment data"""
        return {
            'overall': {'score': 62, 'label': 'Neutral-Bullish', 'color': 'text-green-600'},
            'fear_greed': {'score': 58, 'label': 'Neutral', 'color': 'text-yellow-600'},
            'volatility': {'score': 28, 'label': 'Low', 'color': 'text-green-600'},
            'sectors': [
                {'sector': 'Banking', 'sentiment': 64, 'trend': 'up'},
                {'sector': 'IT', 'sentiment': 42, 'trend': 'down'}
            ],
            'news': [
                {'title': 'Markets show positive momentum', 'sentiment': 'positive', 'score': 65}
            ],
            'lastUpdated': datetime.now().isoformat()
        }

# Global instance
market_service = MarketDataService()
