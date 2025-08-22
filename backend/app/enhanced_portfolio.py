"""
Enhanced Portfolio API with Industry-Standard Features
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import asyncio
import yfinance as yf

from .db import SessionLocal
from .models_db import User as UserModel, Portfolio as PortfolioModel
from .portfolio_analyzer import portfolio_analyzer

router = APIRouter()

# Pydantic models for API
class PortfolioAdd(BaseModel):
    symbol: str
    quantity: int
    purchase_price: float
    purchase_date: Optional[str] = None
    notes: Optional[str] = None

class PortfolioUpdate(BaseModel):
    quantity: Optional[int] = None
    purchase_price: Optional[float] = None
    notes: Optional[str] = None

class PortfolioResponse(BaseModel):
    id: int
    symbol: str
    company_name: str
    quantity: int
    avg_purchase_price: float
    total_invested: float
    current_price: float
    current_value: float
    total_gain_loss: float
    total_gain_loss_percent: float
    day_change: float
    day_change_percent: float
    weight: float
    sector: str
    purchase_date: str
    notes: Optional[str]

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/portfolio/holdings")
async def get_portfolio_holdings(user_id: int, db: Session = Depends(get_db)):
    """Get user's portfolio holdings without JWT (for compatibility)"""
    try:
        print(f"Getting portfolio for user_id: {user_id}")
        
        # Get user by ID
        user_obj = db.query(UserModel).filter_by(id=user_id).first()
        if not user_obj:
            print(f"User {user_id} not found")
            raise HTTPException(status_code=404, detail="User not found")
        
        print(f"Found user: {user_obj.username}")
        
        # Get portfolio items
        portfolio_items = db.query(PortfolioModel).filter_by(user_id=user_obj.id).all()
        print(f"Found {len(portfolio_items)} portfolio items")
        
        if not portfolio_items:
            return {
                "user_id": user_id,
                "username": user_obj.username,
                "holdings": [],
                "summary": {
                    "total_current_value": 0.0,
                    "total_invested": 0.0,
                    "total_pnl": 0.0,
                    "total_pnl_percentage": 0.0,
                    "holdings_count": 0
                }
            }
        
        portfolio_data = []
        total_value = 0.0
        total_invested = 0.0
        
        # Fetch live prices for all stocks
        for item in portfolio_items:
            try:
                print(f"Processing item: {item.symbol}")
                
                # Get live price from yfinance with timeout
                ticker = yf.Ticker(item.symbol)
                current_data = ticker.history(period="1d", timeout=10)
                
                if not current_data.empty:
                    current_price = float(current_data['Close'].iloc[-1])
                    print(f"Live price for {item.symbol}: {current_price}")
                else:
                    print(f"No live data for {item.symbol}, using stored price")
                    current_price = item.avg_purchase_price
                
                current_value = current_price * item.quantity
                invested_value = item.avg_purchase_price * item.quantity
                pnl = current_value - invested_value
                pnl_percentage = (pnl / invested_value * 100) if invested_value > 0 else 0
                
                portfolio_data.append({
                    "id": item.id,
                    "ticker_symbol": item.symbol,
                    "company_name": item.company_name or item.symbol,
                    "quantity": item.quantity,
                    "avg_purchase_price": item.avg_purchase_price,
                    "current_price": current_price,
                    "current_value": current_value,
                    "invested_value": invested_value,
                    "total_market_value": current_value,  # Same as current_value
                    "pnl": pnl,
                    "pnl_percentage": pnl_percentage,
                    "sector": item.sector or "Unknown",
                    "notes": item.notes or "",
                    "purchase_date": str(item.purchase_date) if item.purchase_date else ""
                })
                
                total_value += current_value
                total_invested += invested_value
                
            except Exception as e:
                print(f"Error fetching live data for {item.symbol}: {e}")
                # Use stored values if API fails
                current_price = item.avg_purchase_price
                current_value = current_price * item.quantity
                invested_value = item.avg_purchase_price * item.quantity
                
                portfolio_data.append({
                    "id": item.id,
                    "ticker_symbol": item.symbol,
                    "company_name": item.company_name or item.symbol,
                    "quantity": item.quantity,
                    "avg_purchase_price": item.avg_purchase_price,
                    "current_price": current_price,
                    "current_value": current_value,
                    "invested_value": invested_value,
                    "total_market_value": current_value,
                    "pnl": 0.0,
                    "pnl_percentage": 0.0,
                    "sector": item.sector or "Unknown",
                    "notes": item.notes or "",
                    "purchase_date": str(item.purchase_date) if item.purchase_date else ""
                })
                
                total_value += current_value
                total_invested += invested_value
        
        total_pnl = total_value - total_invested
        total_pnl_percentage = 0.0  # Set to 0 for now
        
        result = {
            "user_id": user_id,
            "username": user_obj.username,
            "holdings": portfolio_data,
            "summary": {
                "total_current_value": total_value,
                "total_invested": total_invested,
                "total_pnl": total_pnl,
                "total_pnl_percentage": total_pnl_percentage,
                "holdings_count": len(portfolio_data)
            }
        }
        
        print(f"Returning result with {len(portfolio_data)} holdings")
        return result
        
    except Exception as e:
        print(f"Portfolio fetch error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching portfolio: {str(e)}")
    finally:
        if db:
            db.close()

@router.get("/portfolio/holdings/live")
async def get_portfolio_holdings_live(user_id: int, db: Session = Depends(get_db)):
    """Get user's portfolio holdings with live prices (might be slower)"""
    try:
        # Get user by ID
        user_obj = db.query(UserModel).filter_by(id=user_id).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get portfolio items
        portfolio_items = db.query(PortfolioModel).filter_by(user_id=user_obj.id).all()
        
        if not portfolio_items:
            return {
                "user_id": user_id,
                "username": user_obj.username,
                "holdings": [],
                "summary": {
                    "total_current_value": 0.0,
                    "total_invested": 0.0,
                    "total_pnl": 0.0,
                    "total_pnl_percentage": 0.0,
                    "holdings_count": 0
                }
            }
        
        portfolio_data = []
        total_value = 0.0
        total_invested = 0.0
        
        for item in portfolio_items:
            try:
                # Get current price with timeout
                ticker = yf.Ticker(item.symbol)
                current_data = ticker.history(period="1d", timeout=10)  # 10 second timeout
                
                if not current_data.empty:
                    current_price = float(current_data['Close'].iloc[-1])
                else:
                    # Fallback to stored price if no data
                    current_price = item.avg_purchase_price
                
                current_value = current_price * item.quantity
                invested_value = item.avg_purchase_price * item.quantity
                pnl = current_value - invested_value
                pnl_percentage = (pnl / invested_value * 100) if invested_value > 0 else 0
                
                portfolio_data.append({
                    "id": item.id,
                    "ticker_symbol": item.symbol,
                    "company_name": item.company_name or item.symbol,
                    "quantity": item.quantity,
                    "avg_purchase_price": item.avg_purchase_price,
                    "current_price": current_price,
                    "current_value": current_value,
                    "invested_value": invested_value,
                    "pnl": pnl,
                    "pnl_percentage": pnl_percentage,
                    "sector": item.sector or "Unknown",
                    "notes": item.notes or "",
                    "purchase_date": item.purchase_date
                })
                
                total_value += current_value
                total_invested += invested_value
                
            except Exception as e:
                print(f"Error fetching data for {item.symbol}: {e}")
                # Use stored values if API fails
                current_value = item.avg_purchase_price * item.quantity
                invested_value = current_value
                
                portfolio_data.append({
                    "id": item.id,
                    "ticker_symbol": item.symbol,
                    "company_name": item.company_name or item.symbol,
                    "quantity": item.quantity,
                    "avg_purchase_price": item.avg_purchase_price,
                    "current_price": item.avg_purchase_price,
                    "current_value": current_value,
                    "invested_value": invested_value,
                    "pnl": 0.0,
                    "pnl_percentage": 0.0,
                    "sector": item.sector or "Unknown",
                    "notes": item.notes or "",
                    "purchase_date": item.purchase_date
                })
                
                total_value += current_value
                total_invested += invested_value
        
        total_pnl = total_value - total_invested
        total_pnl_percentage = (total_pnl / total_invested * 100) if total_invested > 0 else 0
        
        return {
            "user_id": user_id,
            "username": user_obj.username,
            "holdings": portfolio_data,
            "summary": {
                "total_current_value": total_value,
                "total_invested": total_invested,
                "total_pnl": total_pnl,
                "total_pnl_percentage": total_pnl_percentage,
                "holdings_count": len(portfolio_data)
            }
        }
        
    except Exception as e:
        print(f"Portfolio fetch error: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching portfolio: {str(e)}")
    finally:
        db.close()

@router.get("/portfolio")
async def get_portfolio(Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)):
    """Get user's complete portfolio with live data and analytics"""
    try:
        Authorize.jwt_required()
        user = Authorize.get_jwt_subject()
        
        # Get user
        user_obj = db.query(UserModel).filter_by(username=user).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get portfolio items
        portfolio_items = db.query(PortfolioModel).filter_by(user_id=user_obj.id).all()
        
        if not portfolio_items:
            return {
                'summary': {
                    'total_invested': 0,
                    'total_current_value': 0,
                    'total_gain_loss': 0,
                    'total_gain_loss_percent': 0,
                    'total_day_change': 0,
                    'total_day_change_percent': 0,
                    'total_holdings': 0
                },
                'holdings': [],
                'sector_allocation': {},
                'performance_metrics': {}
            }
        
        # Get current stock prices and info
        symbols = [item.symbol for item in portfolio_items]
        stock_info_tasks = [portfolio_analyzer.get_stock_info(symbol) for symbol in symbols]
        stock_info_list = await asyncio.gather(*stock_info_tasks)
        
        # Create stock info mapping
        stock_info_map = {info['symbol']: info for info in stock_info_list}
        stock_prices = {info['symbol']: info['current_price'] for info in stock_info_list}
        
        # Prepare portfolio data
        portfolio_data = []
        for item in portfolio_items:
            stock_info = stock_info_map.get(item.symbol, {})
            
            portfolio_data.append({
                'id': item.id,
                'symbol': item.symbol,
                'company_name': item.company_name or stock_info.get('company_name', item.symbol),
                'quantity': item.quantity,
                'avg_purchase_price': item.avg_purchase_price,
                'total_invested': item.total_invested,
                'sector': item.sector or stock_info.get('sector', 'Unknown'),
                'purchase_date': item.purchase_date.isoformat() if item.purchase_date else '',
                'notes': item.notes,
                'day_change': stock_info.get('day_change', 0),
                'day_change_percent': stock_info.get('day_change_percent', 0),
                'pe_ratio': stock_info.get('pe_ratio', 0),
                'beta': stock_info.get('beta', 1),
                'week_52_high': stock_info.get('week_52_high', 0),
                'week_52_low': stock_info.get('week_52_low', 0)
            })
        
        # Calculate portfolio metrics
        portfolio_metrics = portfolio_analyzer.calculate_portfolio_metrics(portfolio_data, stock_prices)
        
        return portfolio_metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching portfolio: {str(e)}")

# Simple portfolio models for frontend compatibility
class PortfolioAddSimple(BaseModel):
    user_id: int = 1
    symbol: str
    quantity: int
    avg_purchase_price: float
    company_name: Optional[str] = None
    sector: Optional[str] = "Unknown"
    notes: Optional[str] = ""

@router.post("/portfolio/add")
async def add_portfolio_simple(
    portfolio_data: PortfolioAddSimple,
    db: Session = Depends(get_db)
):
    """Add a new stock to portfolio (simple version for frontend compatibility)"""
    try:
        # Get user
        user_obj = db.query(UserModel).filter_by(id=portfolio_data.user_id).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if stock already exists in portfolio
        existing = db.query(PortfolioModel).filter_by(
            user_id=portfolio_data.user_id,
            symbol=portfolio_data.symbol.upper()
        ).first()
        
        if existing:
            # Update existing holding (average price)
            old_value = existing.quantity * existing.avg_purchase_price
            new_value = portfolio_data.quantity * portfolio_data.avg_purchase_price
            total_quantity = existing.quantity + portfolio_data.quantity
            total_value = old_value + new_value
            
            existing.quantity = total_quantity
            existing.avg_purchase_price = total_value / total_quantity
            existing.total_invested = total_value
            existing.company_name = portfolio_data.company_name or portfolio_data.symbol.upper()
            existing.sector = portfolio_data.sector
            existing.notes = portfolio_data.notes
            
            db.commit()
            return {
                "message": f"Updated {portfolio_data.symbol} holding",
                "ticker_symbol": portfolio_data.symbol,
                "total_quantity": total_quantity,
                "avg_purchase_price": existing.avg_purchase_price
            }
        else:
            # Create new portfolio entry
            portfolio_item = PortfolioModel(
                user_id=portfolio_data.user_id,
                symbol=portfolio_data.symbol.upper(),
                company_name=portfolio_data.company_name or portfolio_data.symbol.upper(),
                quantity=portfolio_data.quantity,
                avg_purchase_price=portfolio_data.avg_purchase_price,
                total_invested=portfolio_data.quantity * portfolio_data.avg_purchase_price,
                purchase_date=datetime.utcnow(),
                sector=portfolio_data.sector,
                notes=portfolio_data.notes
            )
            
            db.add(portfolio_item)
            db.commit()
            
            return {
                "message": f"Added {portfolio_data.symbol} to portfolio",
                "ticker_symbol": portfolio_data.symbol,
                "quantity": portfolio_data.quantity,
                "purchase_price": portfolio_data.avg_purchase_price
            }
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding to portfolio: {str(e)}")
    finally:
        db.close()

@router.post("/portfolio")
async def add_to_portfolio(
    portfolio_item: PortfolioAdd,
    Authorize: AuthJWT = Depends(),
    db: Session = Depends(get_db)
):
    """Add a new stock to portfolio or update existing holding"""
    try:
        Authorize.jwt_required()
        user = Authorize.get_jwt_subject()
        
        # Get user
        user_obj = db.query(UserModel).filter_by(username=user).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Validate symbol and get stock info
        stock_info = await portfolio_analyzer.get_stock_info(portfolio_item.symbol)
        if stock_info['current_price'] == 0:
            raise HTTPException(status_code=400, detail="Invalid stock symbol")
        
        # Check if stock already exists in portfolio
        existing_item = db.query(PortfolioModel).filter_by(
            user_id=user_obj.id,
            symbol=portfolio_item.symbol
        ).first()
        
        if existing_item:
            # Update existing holding (average down/up)
            total_quantity = existing_item.quantity + portfolio_item.quantity
            total_invested = existing_item.total_invested + (portfolio_item.quantity * portfolio_item.purchase_price)
            new_avg_price = total_invested / total_quantity
            
            existing_item.quantity = total_quantity
            existing_item.avg_purchase_price = new_avg_price
            existing_item.total_invested = total_invested
            existing_item.company_name = stock_info['company_name']
            existing_item.sector = stock_info['sector']
            
            if portfolio_item.notes:
                existing_item.notes = portfolio_item.notes
                
            db.commit()
            
            return {
                "message": "Portfolio updated successfully",
                "symbol": portfolio_item.symbol,
                "new_quantity": total_quantity,
                "new_avg_price": new_avg_price
            }
        else:
            # Create new portfolio item
            purchase_date = datetime.fromisoformat(portfolio_item.purchase_date) if portfolio_item.purchase_date else datetime.utcnow()
            
            new_item = PortfolioModel(
                user_id=user_obj.id,
                symbol=portfolio_item.symbol,
                company_name=stock_info['company_name'],
                quantity=portfolio_item.quantity,
                avg_purchase_price=portfolio_item.purchase_price,
                total_invested=portfolio_item.quantity * portfolio_item.purchase_price,
                purchase_date=purchase_date,
                sector=stock_info['sector'],
                notes=portfolio_item.notes
            )
            
            db.add(new_item)
            db.commit()
            
            return {
                "message": "Stock added to portfolio successfully",
                "symbol": portfolio_item.symbol,
                "quantity": portfolio_item.quantity
            }
            
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding to portfolio: {str(e)}")

@router.put("/portfolio/{portfolio_id}")
async def update_portfolio_item(
    portfolio_id: int,
    update_data: PortfolioUpdate,
    Authorize: AuthJWT = Depends(),
    db: Session = Depends(get_db)
):
    """Update a specific portfolio item"""
    try:
        Authorize.jwt_required()
        user = Authorize.get_jwt_subject()
        
        # Get user
        user_obj = db.query(UserModel).filter_by(username=user).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get portfolio item
        portfolio_item = db.query(PortfolioModel).filter_by(
            id=portfolio_id,
            user_id=user_obj.id
        ).first()
        
        if not portfolio_item:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        # Update fields
        if update_data.quantity is not None:
            portfolio_item.quantity = update_data.quantity
            portfolio_item.total_invested = portfolio_item.quantity * portfolio_item.avg_purchase_price
        
        if update_data.purchase_price is not None:
            portfolio_item.avg_purchase_price = update_data.purchase_price
            portfolio_item.total_invested = portfolio_item.quantity * portfolio_item.avg_purchase_price
        
        if update_data.notes is not None:
            portfolio_item.notes = update_data.notes
        
        db.commit()
        
        return {"message": "Portfolio item updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating portfolio: {str(e)}")

@router.delete("/portfolio/{portfolio_id}")
async def remove_from_portfolio_simple(
    portfolio_id: int,
    user_id: int = 1,
    db: Session = Depends(get_db)
):
    """Remove a stock from portfolio (simple version for frontend compatibility)"""
    try:
        # Get and delete portfolio item
        portfolio_item = db.query(PortfolioModel).filter_by(
            id=portfolio_id,
            user_id=user_id
        ).first()
        
        if not portfolio_item:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        symbol = portfolio_item.symbol
        db.delete(portfolio_item)
        db.commit()
        
        return {"message": f"Removed {symbol} from portfolio successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error removing from portfolio: {str(e)}")
    finally:
        db.close()

@router.delete("/portfolio/{portfolio_id}/auth")
async def remove_from_portfolio(
    portfolio_id: int,
    Authorize: AuthJWT = Depends(),
    db: Session = Depends(get_db)
):
    """Remove a stock from portfolio"""
    try:
        Authorize.jwt_required()
        user = Authorize.get_jwt_subject()
        
        # Get user
        user_obj = db.query(UserModel).filter_by(username=user).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get and delete portfolio item
        portfolio_item = db.query(PortfolioModel).filter_by(
            id=portfolio_id,
            user_id=user_obj.id
        ).first()
        
        if not portfolio_item:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        symbol = portfolio_item.symbol
        db.delete(portfolio_item)
        db.commit()
        
        return {"message": f"Removed {symbol} from portfolio successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error removing from portfolio: {str(e)}")

@router.get("/portfolio/analytics")
async def get_portfolio_analytics(Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)):
    """Get detailed portfolio analytics and insights"""
    try:
        Authorize.jwt_required()
        user = Authorize.get_jwt_subject()
        
        # Get user
        user_obj = db.query(UserModel).filter_by(username=user).first()
        if not user_obj:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get portfolio items
        portfolio_items = db.query(PortfolioModel).filter_by(user_id=user_obj.id).all()
        
        if not portfolio_items:
            return {"message": "No holdings found"}
        
        # Get portfolio metrics
        portfolio_data = []
        for item in portfolio_items:
            portfolio_data.append({
                'symbol': item.symbol,
                'quantity': item.quantity,
                'total_invested': item.total_invested,
                'sector': item.sector,
                'purchase_date': item.purchase_date
            })
        
        # Get current prices
        symbols = [item.symbol for item in portfolio_items]
        stock_info_tasks = [portfolio_analyzer.get_stock_info(symbol) for symbol in symbols]
        stock_info_list = await asyncio.gather(*stock_info_tasks)
        stock_prices = {info['symbol']: info['current_price'] for info in stock_info_list}
        
        analytics = portfolio_analyzer.calculate_portfolio_metrics(portfolio_data, stock_prices)
        
        return {
            "analytics": analytics,
            "insights": [
                "Diversify across more sectors for better risk management",
                "Consider rebalancing if any single stock exceeds 20% allocation",
                "Monitor high-beta stocks during volatile markets"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating analytics: {str(e)}")

# CORS Options handlers
@router.options("/portfolio")
def options_portfolio():
    return Response(status_code=204)

@router.options("/portfolio/{portfolio_id}")
def options_portfolio_item(portfolio_id: int):
    return Response(status_code=204)

@router.options("/portfolio/analytics")
def options_portfolio_analytics():
    return Response(status_code=204)
