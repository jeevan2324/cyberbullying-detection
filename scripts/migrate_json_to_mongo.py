import sys
import os
import json

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app.database import check_mongo_connection
from app.services.migration_service import migrate_json_to_mongo


def main():
    print("==================================================")
    print("  Reported Words Migration: JSON -> MongoDB")
    print("==================================================")

    # 1. Check connection first
    conn = check_mongo_connection()
    if not conn.get("connected"):
        print(f"[ERROR] Cannot connect to MongoDB: {conn.get('error', 'Server unreachable')}")
        print("Please ensure MongoDB service is running (e.g. Start-Service MongoDB).")
        sys.exit(1)

    print(f"[INFO] Connected to MongoDB database: {conn.get('database')}")

    # 2. Run migration
    result = migrate_json_to_mongo()

    if not result.get("success"):
        print(f"[ERROR] Migration failed: {result.get('error')}")
        sys.exit(1)

    print("\n--- Migration Results ---")
    print(f"Backup file created/preserved : {result['backup_file']}")
    print(f"Total words found in JSON     : {result['total_words_in_json']}")
    print(f"Total reports found in JSON   : {result['total_reports_in_json']}")
    print(f"Newly inserted reports        : {result['newly_inserted_reports']}")
    print(f"Already existing reports      : {result['already_existing_reports']}")
    print(f"Words upserted in MongoDB     : {result['words_upserted']}")

    if result["inconsistencies"]:
        print(f"\n[WARNING] Found {len(result['inconsistencies'])} data inconsistencies:")
        for inc in result["inconsistencies"]:
            print(f"  - {inc}")
    else:
        print("\n[SUCCESS] No data inconsistencies detected.")

    print("\n[SUCCESS] Migration completed successfully.")


if __name__ == "__main__":
    main()
