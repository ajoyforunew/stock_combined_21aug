"""
Enhanced Portfolio Service with Industry-Standard Features
"""

import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import asyncio
from sqlalchemy.orm import Session

class PortfolioAnalyzer:
    def __init__(self):
        self.indian_stocks_mapping = {
            'RELIANCE.NS': 'Reliance Industries Ltd.',
            'TCS.NS': 'Tata Consultancy Services Ltd.',
            'HDFCBANK.NS': 'HDFC Bank Ltd.',
            'INFY.NS': 'Infosys Ltd.',
            'ICICIBANK.NS': 'ICICI Bank Ltd.',
            'HINDUNILVR.NS': 'Hindustan Unilever Ltd.',
            'SBIN.NS': 'State Bank of India',
            'BHARTIARTL.NS': 'Bharti Airtel Ltd.',
            'ITC.NS': 'ITC Ltd.',
            'KOTAKBANK.NS': 'Kotak Mahindra Bank Ltd.',
            'LT.NS': 'Larsen & Toubro Ltd.',
            'ASIANPAINT.NS': 'Asian Paints Ltd.',
            'AXISBANK.NS': 'Axis Bank Ltd.',
            'MARUTI.NS': 'Maruti Suzuki India Ltd.',
            'BAJFINANCE.NS': 'Bajaj Finance Ltd.',
            'HCLTECH.NS': 'HCL Technologies Ltd.',
            'WIPRO.NS': 'Wipro Ltd.',
            'ULTRACEMCO.NS': 'UltraTech Cement Ltd.',
            'TITAN.NS': 'Titan Company Ltd.',
            'SUNPHARMA.NS': 'Sun Pharmaceutical Industries Ltd.'
        }
        
        self.sector_mapping = {
            'RELIANCE.NS': 'Oil & Gas',
            'TCS.NS': 'Information Technology',
            'HDFCBANK.NS': 'Banking',
            'INFY.NS': 'Information Technology',
            'ICICIBANK.NS': 'Banking',
            'HINDUNILVR.NS': 'FMCG',
            'SBIN.NS': 'Banking',
            'BHARTIARTL.NS': 'Telecommunications',
            'ITC.NS': 'FMCG',
            'KOTAKBANK.NS': 'Banking',
            'LT.NS': 'Engineering',
            'ASIANPAINT.NS': 'Paints',
            'AXISBANK.NS': 'Banking',
            'MARUTI.NS': 'Automotive',
            'BAJFINANCE.NS': 'Financial Services',
            'HCLTECH.NS': 'Information Technology',
            'WIPRO.NS': 'Information Technology',
            'ULTRACEMCO.NS': 'Cement',
            'TITAN.NS': 'Jewellery',
            'SUNPHARMA.NS': 'Pharmaceuticals'
        }

    async def get_current_price(self, symbol: str) -> Optional[float]:
        """Get current market price for a symbol"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="1d")
            if not hist.empty:
                return float(hist['Close'].iloc[-1])
        except Exception as e:
            print(f"Error fetching price for {symbol}: {e}")
        return None

    async def get_stock_info(self, symbol: str) -> Dict:
        """Get comprehensive stock information"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="1y")
            
            current_price = float(hist['Close'].iloc[-1]) if not hist.empty else 0
            
            # Calculate 52-week high/low
            week_52_high = float(hist['High'].max()) if not hist.empty else 0
            week_52_low = float(hist['Low'].min()) if not hist.empty else 0
            
            # Calculate daily change
            if len(hist) >= 2:
                prev_close = float(hist['Close'].iloc[-2])
                day_change = current_price - prev_close
                day_change_percent = (day_change / prev_close) * 100
            else:
                day_change = 0
                day_change_percent = 0
            
            return {
                'symbol': symbol,
                'company_name': self.indian_stocks_mapping.get(symbol, info.get('longName', symbol)),
                'current_price': current_price,
                'day_change': day_change,
                'day_change_percent': day_change_percent,
                'sector': self.sector_mapping.get(symbol, info.get('sector', 'Unknown')),
                'market_cap': info.get('marketCap', 0),
                'pe_ratio': info.get('trailingPE', 0),
                'week_52_high': week_52_high,
                'week_52_low': week_52_low,
                'dividend_yield': info.get('dividendYield', 0),
                'beta': info.get('beta', 0)
            }
        except Exception as e:
            print(f"Error fetching stock info for {symbol}: {e}")
            return {
                'symbol': symbol,
                'company_name': self.indian_stocks_mapping.get(symbol, symbol),
                'current_price': 0,
                'day_change': 0,
                'day_change_percent': 0,
                'sector': self.sector_mapping.get(symbol, 'Unknown'),
                'market_cap': 0,
                'pe_ratio': 0,
                'week_52_high': 0,
                'week_52_low': 0,
                'dividend_yield': 0,
                'beta': 0
            }

    def calculate_portfolio_metrics(self, portfolio_items: List[Dict], stock_prices: Dict[str, float]) -> Dict:
        """Calculate comprehensive portfolio metrics"""
        
        total_invested = sum(item['total_invested'] for item in portfolio_items)
        total_current_value = 0
        total_day_change = 0
        
        sector_allocation = {}
        top_holdings = []
        
        for item in portfolio_items:
            symbol = item['symbol']
            current_price = stock_prices.get(symbol, 0)
            
            # Current value calculations
            current_value = item['quantity'] * current_price
            total_current_value += current_value
            
            # P&L calculations
            total_gain_loss = current_value - item['total_invested']
            total_gain_loss_percent = (total_gain_loss / item['total_invested']) * 100 if item['total_invested'] > 0 else 0
            
            # Day change for this holding
            if 'day_change' in item:
                day_change_value = item['quantity'] * item['day_change']
                total_day_change += day_change_value
            
            # Sector allocation
            sector = item.get('sector', 'Unknown')
            if sector not in sector_allocation:
                sector_allocation[sector] = {'value': 0, 'percentage': 0}
            sector_allocation[sector]['value'] += current_value
            
            # Prepare holding data
            holding = {
                **item,
                'current_price': current_price,
                'current_value': current_value,
                'total_gain_loss': total_gain_loss,
                'total_gain_loss_percent': total_gain_loss_percent,
                'weight': 0  # Will calculate after we have total
            }
            top_holdings.append(holding)
        
        # Calculate weights and sector percentages
        for holding in top_holdings:
            if total_current_value > 0:
                holding['weight'] = (holding['current_value'] / total_current_value) * 100
        
        for sector in sector_allocation:
            if total_current_value > 0:
                sector_allocation[sector]['percentage'] = (sector_allocation[sector]['value'] / total_current_value) * 100
        
        # Sort holdings by current value
        top_holdings.sort(key=lambda x: x['current_value'], reverse=True)
        
        # Portfolio level metrics
        total_gain_loss = total_current_value - total_invested
        total_gain_loss_percent = (total_gain_loss / total_invested) * 100 if total_invested > 0 else 0
        total_day_change_percent = (total_day_change / total_current_value) * 100 if total_current_value > 0 else 0
        
        return {
            'summary': {
                'total_invested': total_invested,
                'total_current_value': total_current_value,
                'total_gain_loss': total_gain_loss,
                'total_gain_loss_percent': total_gain_loss_percent,
                'total_day_change': total_day_change,
                'total_day_change_percent': total_day_change_percent,
                'total_holdings': len(portfolio_items)
            },
            'holdings': top_holdings,
            'sector_allocation': sector_allocation,
            'performance_metrics': self.calculate_performance_metrics(portfolio_items, stock_prices)
        }

    def calculate_performance_metrics(self, portfolio_items: List[Dict], stock_prices: Dict[str, float]) -> Dict:
        """Calculate advanced performance metrics"""
        
        if not portfolio_items:
            return {}
        
        # Calculate portfolio beta (simplified)
        total_value = sum(item['quantity'] * stock_prices.get(item['symbol'], 0) for item in portfolio_items)
        weighted_beta = 0
        
        for item in portfolio_items:
            current_value = item['quantity'] * stock_prices.get(item['symbol'], 0)
            weight = current_value / total_value if total_value > 0 else 0
            beta = item.get('beta', 1)
            weighted_beta += weight * beta
        
        # Calculate diversification metrics
        unique_sectors = len(set(item.get('sector', 'Unknown') for item in portfolio_items))
        
        return {
            'portfolio_beta': weighted_beta,
            'diversification_score': min(100, (unique_sectors / 10) * 100),  # Max score at 10 sectors
            'concentration_risk': max([item['quantity'] * stock_prices.get(item['symbol'], 0) / total_value * 100 for item in portfolio_items]) if total_value > 0 else 0
        }

# Global portfolio analyzer instance
portfolio_analyzer = PortfolioAnalyzer()
