from fastapi import Query, APIRouter, Depends, HTTPException, Response
from fastapi_jwt_auth import AuthJWT
from pydantic import BaseModel
from .db import SessionLocal
from .models_db import User as UserModel, Portfolio as PortfolioModel
import yfinance as yf
from .ticker_data import TICKER_MAP

router = APIRouter()

# Explicit OPTIONS handler for CORS preflight
@router.options("/portfolio/delete")
def options_portfolio_delete():
    """Handle CORS preflight for delete portfolio."""
    return Response(status_code=204)
from .models_db import User as UserModel, Portfolio as PortfolioModel
import yfinance as yf
from .ticker_data import TICKER_MAP

router = APIRouter()

@router.delete("/portfolio/cleanup-invalid")
def cleanup_invalid_tickers(Authorize: AuthJWT = Depends()):
    """Remove all invalid tickers from the user's portfolio."""
    Authorize.jwt_required()
    user = Authorize.get_jwt_subject()
    db = SessionLocal()
    user_obj = db.query(UserModel).filter_by(username=user).first()
    if not user_obj:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    portfolios = db.query(PortfolioModel).filter_by(user_id=user_obj.id).all()
    removed = []
    for p in portfolios:
        symbol = p.symbol.upper()
        valid = False
        if symbol in TICKER_MAP:
            valid = True
        else:
            try:
                info = yf.Ticker(symbol).info
                if info and info.get("regularMarketPrice") is not None:
                    valid = True
            except Exception:
                pass
        if not valid:
            db.delete(p)
            removed.append(symbol)
    db.commit()
    db.close()
    return {"msg": f"Removed invalid tickers: {', '.join(removed) if removed else 'None'}"}

@router.delete("/portfolio/delete")
def delete_stock(symbol: str = Query(...), Authorize: AuthJWT = Depends()):
    """Delete a stock from the user's portfolio by symbol."""
    Authorize.jwt_required()
    user = Authorize.get_jwt_subject()
    db = SessionLocal()
    user_obj = db.query(UserModel).filter_by(username=user).first()
    if not user_obj:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    # Normalize input symbol for comparison
    input_symbol = symbol.strip().upper()
    # Remove .NS suffix if present for matching
    if input_symbol.endswith('.NS'):
        input_symbol_base = input_symbol[:-3]
    else:
        input_symbol_base = input_symbol

    # Find all matching symbols for this user (case-insensitive, with/without .NS)
    portfolios = db.query(PortfolioModel).filter(PortfolioModel.user_id == user_obj.id).all()
    deleted_count = 0
    for p in portfolios:
        db_symbol = p.symbol.strip().upper()
        db_symbol_base = db_symbol[:-3] if db_symbol.endswith('.NS') else db_symbol
        if db_symbol == input_symbol or db_symbol_base == input_symbol_base:
            db.delete(p)
            deleted_count += 1
    db.commit()
    db.close()
    if deleted_count:
        return {"msg": f"Deleted {symbol.upper()} from portfolio (removed {deleted_count} record(s))."}
    else:
        return {"msg": f"No matching ticker found for {symbol.upper()} in portfolio."}


class AddStockRequest(BaseModel):
    symbol: str
    quantity: int



@router.post("/portfolio/add")
def add_stock(req: AddStockRequest, Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user = Authorize.get_jwt_subject()
    db = SessionLocal()
    user_obj = db.query(UserModel).filter_by(username=user).first()
    if not user_obj:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    # Accept either ticker or company name
    symbol = req.symbol.strip().upper()
    found_symbol = None
    # 1. Direct ticker match in TICKER_MAP
    if symbol in TICKER_MAP:
        found_symbol = symbol
    else:
        # 2. Try yfinance ticker lookup
        try:
            info = yf.Ticker(symbol).info
            if info and info.get("regularMarketPrice") is not None:
                found_symbol = symbol
        except Exception as e:
            # Log and continue
            found_symbol = None
        # 3. Company name search in TICKER_MAP values (case-insensitive substring)
        if not found_symbol:
            search = symbol.lower()
            for tick, name in TICKER_MAP.items():
                if search in name.lower() or search == name.lower():
                    found_symbol = tick
                    break
        # 4. Company name search using yfinance (slow, fallback)
        if not found_symbol:
            try:
                matches = yf.utils.get_tickers()
                for tick in matches:
                    try:
                        tinfo = yf.Ticker(tick).info
                        cname = tinfo.get("shortName", "").lower()
                        if search in cname or search == cname:
                            found_symbol = tick
                            break
                    except Exception:
                        continue
            except Exception:
                pass
    if not found_symbol:
        db.close()
        # Return a clear JSON error message for frontend
        raise HTTPException(
            status_code=422,
            detail="Invalid ticker. Please provide a correct NSE ticker symbol (e.g., RELIANCE, TCS, INFY, ICICIBANK.NS)."
        )
    portfolio = PortfolioModel(user_id=user_obj.id, symbol=found_symbol, quantity=req.quantity)
    db.add(portfolio)
    db.commit()
    db.refresh(portfolio)
    db.close()
    return {"msg": f"Stock added: {found_symbol}"}

@router.get("/portfolio")
def get_portfolio(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    user = Authorize.get_jwt_subject()
    db = SessionLocal()
    user_obj = db.query(UserModel).filter_by(username=user).first()
    if not user_obj:
        db.close()
        raise HTTPException(status_code=404, detail="User not found")
    portfolios = db.query(PortfolioModel).filter_by(user_id=user_obj.id).all()
    db.close()
    return {"portfolio": [{"symbol": p.symbol, "quantity": p.quantity} for p in portfolios]}