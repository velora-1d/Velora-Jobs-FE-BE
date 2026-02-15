import sqlite3
import psycopg2
import os
import json
from datetime import datetime

# Configuration
SQLITE_DB = "velora.db"
POSTGRES_DB = "postgresql://postgres:password@localhost:5432/velora_jobs"

def migrate():
    print("🚀 Starting migration from SQLite to Postgres...")
    
    # Connect to SQLite
    try:
        sqlite_conn = sqlite3.connect(SQLITE_DB)
        sqlite_conn.row_factory = sqlite3.Row
        sqlite_cursor = sqlite_conn.cursor()
        print("✅ Connected to SQLite")
    except Exception as e:
        print(f"❌ Failed to connect to SQLite: {e}")
        return

    # Connect to Postgres
    try:
        pg_conn = psycopg2.connect(POSTGRES_DB)
        pg_cursor = pg_conn.cursor()
        print("✅ Connected to Postgres")
    except Exception as e:
        print(f"❌ Failed to connect to Postgres: {e}")
        return

    # Helper to migrate a table
    def migrate_table(table_name, columns):
        print(f"   Migrating table: {table_name}...")
        sqlite_cursor.execute(f"SELECT * FROM {table_name}")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print(f"   ⚠️ No data in {table_name}")
            return

        cols = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(columns))
        query = f"INSERT INTO {table_name} ({cols}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING"
        
        count = 0
        for row in rows:
            data = []
            for col in columns:
                val = row[col]
                # Handle booleans (SQLite stores as 0/1, Postgres needs True/False)
                if isinstance(val, int) and col in ['is_active', 'has_website']:
                    val = bool(val)
                data.append(val)
            
            try:
                pg_cursor.execute(query, tuple(data))
                count += 1
            except Exception as e:
                print(f"   ❌ Error inserting row {row['id']} into {table_name}: {e}")
                pg_conn.rollback()
        
        pg_conn.commit()
        print(f"   ✅ Migrated {count} rows to {table_name}")

    # Helper for tables without 'id' as primary key or special handling
    def migrate_settings():
        print(f"   Migrating table: settings...")
        sqlite_cursor.execute("SELECT * FROM settings")
        rows = sqlite_cursor.fetchall()
        
        if not rows:
            print("   ⚠️ No data in settings")
            return

        query = "INSERT INTO settings (key, value, description) VALUES (%s, %s, %s) ON CONFLICT (key) DO NOTHING"
        
        count = 0
        for row in rows:
            try:
                pg_cursor.execute(query, (row['key'], row['value'], row['description']))
                count += 1
            except Exception as e:
                print(f"   ❌ Error inserting setting {row['key']}: {e}")
                pg_conn.rollback()
        
        pg_conn.commit()
        print(f"   ✅ Migrated {count} settings")

    # Order matters due to Foreign Keys
    # 1. Users
    migrate_table('users', ['id', 'email', 'hashed_password', 'is_active'])
    
    # 2. Leads
    migrate_table('leads', [
        'id', 'title', 'company', 'location', 'email', 'description', 'url', 
        'source', 'match_score', 'match_reason', 'phone', 'has_website', 
        'status', 'created_at', 'updated_at'
    ])
    
    # 3. FollowUps
    migrate_table('follow_ups', [
        'id', 'lead_id', 'type', 'note', 'status', 'next_follow_date', 
        'created_at', 'updated_at'
    ])
    
    # 4. Projects
    migrate_table('projects', [
        'id', 'lead_id', 'name', 'description', 'status', 'budget', 
        'deadline', 'progress', 'created_at', 'updated_at'
    ])
    
    # 5. Invoices
    migrate_table('invoices', [
        'id', 'project_id', 'invoice_number', 'items', 'subtotal', 
        'tax_percent', 'total', 'status', 'due_date', 'paid_at', 
        'notes', 'created_at', 'updated_at'
    ])
    
    # 6. Campaigns
    migrate_table('campaigns', [
        'id', 'name', 'status', 'message_template', 'target_criteria', 
        'scheduled_at', 'created_at', 'updated_at'
    ])
    
    # 7. Settings
    migrate_settings()

    print("🎉 Migration completed successfully!")
    sqlite_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    migrate()
