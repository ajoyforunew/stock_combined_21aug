from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Integer, default=0)  # 1 for admin, 0 for normal user
    
    # Relationship
    portfolios = relationship("Portfolio", back_populates="user")

class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    company_name = Column(String)
    quantity = Column(Integer, nullable=False)
    avg_purchase_price = Column(Float, nullable=False)  # Average buying price
    total_invested = Column(Float, nullable=False)  # Total amount invested
    purchase_date = Column(DateTime, default=datetime.utcnow)
    sector = Column(String)  # Industry sector
    notes = Column(Text)  # User notes about the investment
    
    # Relationship
    user = relationship("User", back_populates="portfolios")
