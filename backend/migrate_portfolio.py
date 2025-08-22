"""
Database Migration Script for Enhanced Portfolio
Run this script to upgrade your portfolio table with new fields
"""

import sqlite3
import os
from datetime import datetime

# Path to your database
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'app.db')

def migrate_portfolio_table():
    """Migrate the portfolio table to include new fields"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if the new columns already exist
        cursor.execute("PRAGMA table_info(portfolios)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add new columns if they don't exist
        new_columns = {
            'company_name': 'TEXT',
            'avg_purchase_price': 'REAL',
            'total_invested': 'REAL', 
            'purchase_date': 'DATETIME',
            'sector': 'TEXT',
            'notes': 'TEXT'
        }
        
        for column_name, column_type in new_columns.items():
            if column_name not in columns:
                try:
                    if column_name == 'avg_purchase_price':
                        # Set a default value for existing records
                        cursor.execute(f"ALTER TABLE portfolios ADD COLUMN {column_name} {column_type} DEFAULT 0.0")
                    elif column_name == 'total_invested':
                        cursor.execute(f"ALTER TABLE portfolios ADD COLUMN {column_name} {column_type} DEFAULT 0.0")
                    elif column_name == 'purchase_date':
                        cursor.execute(f"ALTER TABLE portfolios ADD COLUMN {column_name} {column_type} DEFAULT '{datetime.utcnow().isoformat()}'")
                    else:
                        cursor.execute(f"ALTER TABLE portfolios ADD COLUMN {column_name} {column_type}")
                    print(f"Added column: {column_name}")
                except sqlite3.OperationalError as e:
                    print(f"Column {column_name} might already exist: {e}")
        
        # Update existing records with calculated values
        cursor.execute("""
            UPDATE portfolios 
            SET total_invested = quantity * avg_purchase_price
            WHERE total_invested = 0.0 AND avg_purchase_price > 0
        """)
        
        conn.commit()
        print("Portfolio table migration completed successfully!")
        
        # Show current table structure
        cursor.execute("PRAGMA table_info(portfolios)")
        columns = cursor.fetchall()
        print("\nCurrent portfolio table structure:")
        for column in columns:
            print(f"  {column[1]} ({column[2]})")
            
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_portfolio_table()
