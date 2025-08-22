"""
Script to update the database schema to match the enhanced portfolio model
"""

import sqlite3
from datetime import datetime

def update_portfolio_schema():
    conn = sqlite3.connect('app.db')
    cursor = conn.cursor()
    
    try:
        # Check current columns
        cursor.execute('PRAGMA table_info(portfolios)')
        existing_columns = [col[1] for col in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")
        
        # Add missing columns one by one
        columns_to_add = [
            ('company_name', 'VARCHAR'),
            ('avg_purchase_price', 'REAL DEFAULT 0.0'),
            ('total_invested', 'REAL DEFAULT 0.0'),
            ('purchase_date', 'DATETIME'),
            ('sector', 'VARCHAR'),
            ('notes', 'TEXT')
        ]
        
        for col_name, col_type in columns_to_add:
            if col_name not in existing_columns:
                try:
                    cursor.execute(f'ALTER TABLE portfolios ADD COLUMN {col_name} {col_type}')
                    print(f"Added column: {col_name}")
                except sqlite3.OperationalError as e:
                    print(f"Failed to add {col_name}: {e}")
        
        # Update existing records with default values if needed
        cursor.execute('''
            UPDATE portfolios 
            SET 
                company_name = COALESCE(company_name, symbol),
                avg_purchase_price = COALESCE(avg_purchase_price, 100.0),
                total_invested = COALESCE(total_invested, quantity * 100.0),
                purchase_date = COALESCE(purchase_date, datetime('now')),
                sector = COALESCE(sector, 'Unknown'),
                notes = COALESCE(notes, '')
            WHERE company_name IS NULL OR avg_purchase_price IS NULL
        ''')
        
        conn.commit()
        print("Database schema updated successfully!")
        
        # Verify the update
        cursor.execute('PRAGMA table_info(portfolios)')
        updated_columns = cursor.fetchall()
        print("\nUpdated table schema:")
        for col in updated_columns:
            print(f"  {col[1]} ({col[2]})")
            
    except Exception as e:
        print(f"Error updating schema: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    update_portfolio_schema()
