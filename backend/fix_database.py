import sqlite3
import os
import hashlib

# 设置数据库路径
database_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'wallpaper.db')

# 确保数据文件夹存在
data_folder = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
os.makedirs(data_folder, exist_ok=True)

print(f"正在连接到数据库: {database_path}")

# 连接数据库并修复缺失的表和列
conn = sqlite3.connect(database_path)
cursor = conn.cursor()

try:
    # 检查并创建缺失的表
    # 检查categories表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'")
    if not cursor.fetchone():
        print("categories表不存在，正在创建...")
        cursor.execute('''
            CREATE TABLE categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                folder_path TEXT NOT NULL UNIQUE
            )
        ''')
        print("已成功创建categories表")
        conn.commit()
    else:
        print("categories表已存在")
    
    # 检查users表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    if not cursor.fetchone():
        print("users表不存在，正在创建...")
        cursor.execute('''
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                user_type TEXT NOT NULL DEFAULT 'user'
            )
        ''')
        print("已成功创建users表")
        # 创建管理员账户
        hashed_password = hashlib.sha256('admin'.encode()).hexdigest()
        cursor.execute("INSERT INTO users (username, password, user_type) VALUES (?, ?, ?)", ('admin', hashed_password, 'admin'))
        print("已创建默认管理员账户")
        conn.commit()
    else:
        print("users表已存在")
        # 检查users表是否存在user_type列
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        print(f"当前users表的列: {columns}")
        
        if 'user_type' not in columns:
            print("user_type列不存在，正在添加...")
            # 添加user_type列，默认为'user'
            cursor.execute("ALTER TABLE users ADD COLUMN user_type TEXT NOT NULL DEFAULT 'user'")
            print("已成功添加user_type列")
            
            # 更新管理员用户的user_type为'admin'
            cursor.execute("UPDATE users SET user_type = 'admin' WHERE username = 'admin'")
            print("已更新管理员用户的user_type")
            
            conn.commit()
        else:
            print("user_type列已存在，无需修改")
    
    # 检查并创建user_category_permissions表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_category_permissions'")
    if not cursor.fetchone():
        print("user_category_permissions表不存在，正在创建...")
        cursor.execute('''
            CREATE TABLE user_category_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                category_id INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (category_id) REFERENCES categories (id),
                UNIQUE (user_id, category_id)
            )
        ''')
        print("已成功创建user_category_permissions表")
        conn.commit()
    else:
        print("user_category_permissions表已存在")
    
    # 检查并创建images表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='images'")
    if not cursor.fetchone():
        print("images表不存在，正在创建...")
        cursor.execute('''
            CREATE TABLE images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                filepath TEXT NOT NULL,
                category_id INTEGER,
                upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sort_index INTEGER,
                FOREIGN KEY (category_id) REFERENCES categories (id)
            )
        ''')
        print("已成功创建images表")
        conn.commit()
    else:
        print("images表已存在")
    
    # 确保默认分类存在
    cursor.execute("SELECT * FROM categories WHERE name = '默认分类'")
    if not cursor.fetchone():
        print("默认分类不存在，正在创建...")
        default_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', 'default')
        os.makedirs(default_folder, exist_ok=True)
        cursor.execute("INSERT INTO categories (name, folder_path) VALUES (?, ?)", ('默认分类', default_folder))
        print("已创建默认分类")
        conn.commit()
    else:
        print("默认分类已存在")
    
    # 检查数据库中的所有用户及其user_type
    cursor.execute("SELECT id, username, user_type FROM users")
    users = cursor.fetchall()
    print("数据库中的用户:")
    for user in users:
        print(f"ID: {user[0]}, 用户名: {user[1]}, 用户类型: {user[2]}")
        
except sqlite3.Error as e:
    print(f"数据库操作错误: {e}")
except Exception as e:
    print(f"发生错误: {e}")
finally:
    conn.close()
    print("数据库连接已关闭")

print("数据库修复完成！")