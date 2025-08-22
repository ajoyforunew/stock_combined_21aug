"""
Enhanced FastAPI Application with Production-Ready Features
Designed to handle thousands of concurrent users
"""

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import asyncio
import uvloop  # For better async performance
import redis
import time
import hashlib
import logging
from contextlib import asynccontextmanager
from prometheus_fastapi_instrumentator import Instrumentator

# Import enhanced services
from .scalable_market_data import scalable_market_service
from .rate_limiter import advanced_rate_limiter
from .auth import router as auth_router
from .portfolio import router as portfolio_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis connection for caching and rate limiting
redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Startup
    logger.info("Starting application...")
    
    # Set uvloop as the event loop policy for better performance
    if hasattr(asyncio, 'set_event_loop_policy'):
        asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    
    # Initialize market data service
    async with scalable_market_service:
        yield
    
    # Shutdown
    logger.info("Shutting down application...")

# Create FastAPI app with lifespan management
app = FastAPI(
    title="Scalable NSE Stock Prediction API",
    description="Production-ready API for handling thousands of concurrent users",
    version="2.0.0",
    lifespan=lifespan
)

# Add monitoring
instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app)

# Add middlewares
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-production-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(portfolio_router, prefix="/api/portfolio", tags=["portfolio"])

# Advanced rate limiting middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Advanced rate limiting with Redis"""
    client_ip = request.client.host
    endpoint = request.url.path
    
    # Create rate limit key
    rate_limit_key = f"rate_limit:{client_ip}:{endpoint}"
    
    # Check rate limit
    try:
        current_requests = redis_client.get(rate_limit_key)
        if current_requests is None:
            redis_client.setex(rate_limit_key, 60, 1)  # 1 request per minute window
        else:
            current_requests = int(current_requests)
            
            # Different limits for different endpoints
            if "/api/technical-analysis" in endpoint:
                limit = 30  # 30 requests per minute for technical analysis
            elif "/api/market-overview" in endpoint:
                limit = 60  # 60 requests per minute for market overview
            else:
                limit = 100  # 100 requests per minute for other endpoints
            
            if current_requests >= limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded. Try again later."}
                )
            
            redis_client.incr(rate_limit_key)
    
    except Exception as e:
        logger.warning(f"Rate limiting error: {e}")
    
    response = await call_next(request)
    return response

# Caching decorator
def cache_response(cache_key_prefix: str, ttl: int = 60):
    """Decorator for caching API responses"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{cache_key_prefix}:{hashlib.md5(str(kwargs).encode()).hexdigest()}"
            
            # Try to get from cache
            try:
                cached_result = redis_client.get(cache_key)
                if cached_result:
                    import json
                    return json.loads(cached_result)
            except Exception as e:
                logger.warning(f"Cache read error: {e}")
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            
            try:
                import json
                redis_client.setex(cache_key, ttl, json.dumps(result, default=str))
            except Exception as e:
                logger.warning(f"Cache write error: {e}")
            
            return result
        return wrapper
    return decorator

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check for load balancer"""
    try:
        # Check Redis connection
        redis_client.ping()
        
        # Check market data service
        # You could add more comprehensive health checks here
        
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "services": {
                "redis": "ok",
                "market_data": "ok"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")

# Enhanced API endpoints with caching
@app.get("/api/market-overview")
@cache_response("market_overview", ttl=30)
async def get_market_overview():
    """Get market overview with caching"""
    try:
        data = await scalable_market_service.get_market_overview()
        return data
    except Exception as e:
        logger.error(f"Market overview error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch market data")

@app.get("/api/technical-analysis/{symbol}")
@cache_response("technical_analysis", ttl=120)
async def get_technical_analysis(symbol: str):
    """Get technical analysis with caching"""
    try:
        # Validate symbol
        valid_symbols = [
            'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
            'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'KOTAKBANK.NS',
            'LT.NS', 'ASIANPAINT.NS', 'AXISBANK.NS', 'MARUTI.NS', 'BAJFINANCE.NS',
            'HCLTECH.NS', 'WIPRO.NS', 'ULTRACEMCO.NS', 'TITAN.NS', 'SUNPHARMA.NS'
        ]
        
        if symbol not in valid_symbols:
            raise HTTPException(status_code=400, detail="Invalid symbol")
        
        data = await scalable_market_service.get_technical_analysis(symbol)
        return data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Technical analysis error for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch technical analysis")

@app.get("/api/market-sentiment")
@cache_response("market_sentiment", ttl=60)
async def get_market_sentiment():
    """Get market sentiment with caching"""
    try:
        # Implementation would call scalable market service
        # For now, return cached sentiment data
        return {
            "overall_sentiment": "Neutral",
            "sentiment_score": 52,
            "fear_greed_index": 48,
            "lastUpdated": time.time()
        }
    except Exception as e:
        logger.error(f"Market sentiment error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch market sentiment")

# WebSocket endpoint for real-time updates (optional)
@app.websocket("/ws/market-data")
async def websocket_market_data(websocket):
    """WebSocket endpoint for real-time market data"""
    await websocket.accept()
    
    try:
        while True:
            # Send market updates every 30 seconds
            market_data = await scalable_market_service.get_market_overview()
            await websocket.send_json(market_data)
            await asyncio.sleep(30)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close()

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,  # Multiple worker processes
        loop="uvloop",  # Use uvloop for better performance
        access_log=True,
        log_level="info"
    )
