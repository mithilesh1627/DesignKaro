import sqlite3
from pathlib import Path

def migrate():
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    db_paths = [
        repo_root / "designkaro.db",
        repo_root / "backend" / "designkaro.db",
    ]
    for db_path in db_paths:
        if not db_path.exists():
            continue
        print(f"Connecting to database at {db_path}...")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'")
        if not cursor.fetchone():
            print(f"No user_profiles table in {db_path}")
            conn.close()
            continue
        cursor.execute("PRAGMA table_info(user_profiles)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Existing columns in {db_path.name}: {columns}")
        if "target_role" not in columns:
            print("Adding target_role column to user_profiles table...")
            cursor.execute("ALTER TABLE user_profiles ADD COLUMN target_role VARCHAR(64) DEFAULT 'Staff Systems Architect' NOT NULL")
            conn.commit()
            print("Successfully added target_role column!")
        else:
            print("target_role column already exists.")
        conn.close()

if __name__ == "__main__":
    migrate()
