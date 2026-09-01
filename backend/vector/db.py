import sqlite3

import sqlite_vec

from vector.config import DB_PATH


def get_db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    return conn


def init_vec_table():
    conn = get_db_conn()
    conn.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_entities
        USING vec0(embedding float[768])
    """)
    conn.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS vec_campaigns
        USING vec0(embedding float[768])
    """)
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_vec_table()
