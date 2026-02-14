from database import SessionLocal, engine
from sqlalchemy import text

def add_email_column():
    db = SessionLocal()
    try:
        # Check if column exists
        result = db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='leads' AND column_name='email'"))
        if result.fetchone():
            print("Column 'email' already exists in 'leads' table.")
            return

        print("Adding 'email' column to 'leads' table...")
        db.execute(text("ALTER TABLE leads ADD COLUMN email VARCHAR"))
        db.commit()
        print("Successfully added 'email' column.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_email_column()
