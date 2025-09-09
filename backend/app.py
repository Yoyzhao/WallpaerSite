from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for, session
import os
import sqlite3
import hashlib
import json
from datetime import datetime
import re
import pytz
# 添加Pillow库用于获取图片尺寸
try:
    from PIL import Image
except ImportError:
    # 如果没有安装Pillow，设置一个标志
    Image = None

app = Flask(__name__, 
            static_folder='../static',
            template_folder='../templates')
app.secret_key = 'your-secret-key'  # 请在生产环境中使用安全的密钥

# 配置上传文件夹和允许的文件类型
UPLOAD_FOLDER = '../uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 设置数据库路径
DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'wallpaper.db')

# 确保上传文件夹存在
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 初始化数据库
def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # 创建分类表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            folder_path TEXT NOT NULL UNIQUE
        )
    ''')
    
    # 创建用户表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    ''')
    
    # 创建图片信息表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            category_id INTEGER,
            upload_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            sort_index INTEGER,
            FOREIGN KEY (category_id) REFERENCES categories (id)
        )
    ''')
    
    # 创建管理员账户（默认用户名：admin，密码：admin）
    cursor.execute("SELECT * FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        hashed_password = hashlib.sha256('admin'.encode()).hexdigest()
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", ('admin', hashed_password))
    
    # 创建默认分类
    cursor.execute("SELECT * FROM categories WHERE name = '默认分类'")
    if not cursor.fetchone():
        default_folder = os.path.join(UPLOAD_FOLDER, 'default')
        os.makedirs(default_folder, exist_ok=True)
        cursor.execute("INSERT INTO categories (name, folder_path) VALUES (?, ?)", ('默认分类', default_folder))
    
    conn.commit()
    conn.close()

# 检查文件类型是否允许
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# 检查用户是否已登录
def is_admin_logged_in():
    return 'admin_logged_in' in session and session['admin_logged_in']

# 获取所有分类
def get_categories():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM categories")
    categories = cursor.fetchall()
    conn.close()
    return categories

# 获取指定分类的图片
def get_images_by_category(category_id, page=1, per_page=20, search_term='', sort_direction='desc'):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    offset = (page - 1) * per_page
    
    # 根据排序方向决定ORDER BY子句
    order_by = "ORDER BY sort_index ASC" if sort_direction == 'asc' else "ORDER BY sort_index DESC"
    
    if search_term:
        query = f"""
            SELECT id, filename, filepath, upload_time, sort_index
            FROM images 
            WHERE category_id = ? AND filename LIKE ? 
            {order_by} 
            LIMIT ? OFFSET ?
        """
        cursor.execute(query, (category_id, f'%{search_term}%', per_page, offset))
    else:
        query = f"""
            SELECT id, filename, filepath, upload_time, sort_index
            FROM images 
            WHERE category_id = ? 
            {order_by} 
            LIMIT ? OFFSET ?
        """
        cursor.execute(query, (category_id, per_page, offset))
    
    images = cursor.fetchall()
    
    # 获取总数
    if search_term:
        cursor.execute("SELECT COUNT(*) FROM images WHERE category_id = ? AND filename LIKE ?", (category_id, f'%{search_term}%'))
    else:
        cursor.execute("SELECT COUNT(*) FROM images WHERE category_id = ?", (category_id,))
    total_count = cursor.fetchone()[0]
    
    conn.close()
    
    total_pages = (total_count + per_page - 1) // per_page
    
    return {
        'images': images,
        'total_pages': total_pages,
        'current_page': page,
        'total_count': total_count
    }

# 获取图片详情
def get_image_detail(image_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT images.id, images.filename, images.filepath, images.upload_time, categories.name 
        FROM images 
        JOIN categories ON images.category_id = categories.id 
        WHERE images.id = ?
    """, (image_id,))
    image = cursor.fetchone()
    conn.close()
    return image

# 为指定分类的图片更新排序索引
def update_sort_index_for_category(category_id, cursor=None, conn=None):
    # 如果没有提供连接和游标，创建新的
    if conn is None or cursor is None:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        need_commit = True
    else:
        need_commit = False
    
    # 按upload_time降序获取该分类的所有图片
    cursor.execute("""
        SELECT id FROM images 
        WHERE category_id = ? 
        ORDER BY upload_time DESC
    """, (category_id,))
    
    images = cursor.fetchall()
    
    # 更新每张图片的sort_index
    for index, (image_id,) in enumerate(images, 1):
        cursor.execute(
            "UPDATE images SET sort_index = ? WHERE id = ?",
            (index, image_id)
        )
    
    # 只有在需要时才提交和关闭连接
    if need_commit:
        conn.commit()
        conn.close()

# 扫描文件夹并更新数据库
def scan_folder_and_update_db(folder_path, category_id, cursor=None, conn=None):
    # 如果没有提供连接和游标，创建新的
    if conn is None or cursor is None:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        need_commit = True
    else:
        need_commit = False
    
    # 获取当前数据库中该分类的所有图片
    cursor.execute("SELECT filepath FROM images WHERE category_id = ?", (category_id,))
    db_files = set([row[0] for row in cursor.fetchall()])
    
    # 扫描文件夹中的所有图片
    folder_files = set()
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if allowed_file(file):
                file_path = os.path.join(root, file)
                folder_files.add(file_path)
                
                # 如果文件不在数据库中，添加它
                if file_path not in db_files:
                    cursor.execute(
                        "INSERT INTO images (filename, filepath, category_id) VALUES (?, ?, ?)",
                        (file, file_path, category_id)
                    )
    
    # 删除数据库中有但文件夹中不存在的文件记录
    for file_path in db_files:
        if file_path not in folder_files:
            cursor.execute("DELETE FROM images WHERE filepath = ?", (file_path,))
    
    # 更新排序索引
    update_sort_index_for_category(category_id, cursor, conn)
    
    # 只有在需要时才提交和关闭连接
    if need_commit:
        conn.commit()
        conn.close()

# 上传图片API
@app.route('/admin/upload_image', methods=['POST'])
def upload_image():
    if not is_admin_logged_in():
        return jsonify({'success': False, 'message': '请先登录'})
        
    try:
        # 获取表单数据
        category_id = request.form.get('category_id')
        files = request.files.getlist('images[]')
        
        if not category_id:
            return jsonify({'success': False, 'message': '请选择分类'})
            
        # 获取分类文件夹路径
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("SELECT folder_path FROM categories WHERE id = ?", (category_id,))
        category = cursor.fetchone()
        conn.close()
        
        if not category:
            return jsonify({'success': False, 'message': '分类不存在'})
            
        folder_path = category[0]
        uploaded_count = 0
        
        # 保存上传的文件
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        for file in files:
            if file and allowed_file(file.filename):
                # 生成唯一文件名
                filename = file.filename
                filepath = os.path.join(folder_path, filename)
                
                # 如果文件已存在，添加时间戳
                counter = 1
                name, ext = os.path.splitext(filename)
                while os.path.exists(filepath):
                    filename = f"{name}_{counter}{ext}"
                    filepath = os.path.join(folder_path, filename)
                    counter += 1
                    
                # 保存文件
                file.save(filepath)
                
                # 更新数据库
                cursor.execute(
                    "INSERT INTO images (filename, filepath, category_id) VALUES (?, ?, ?)",
                    (filename, filepath, category_id)
                )
                
                uploaded_count += 1
                
        conn.commit()
        conn.close()
        
        # 更新该分类的排序索引
        update_sort_index_for_category(category_id)
        
        if uploaded_count == 0:
            return jsonify({'success': False, 'message': '没有有效的图片文件被上传'})
            
        return jsonify({'success': True, 'message': f'成功上传 {uploaded_count} 张图片'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'上传失败: {str(e)}'})

# 获取分类图片API
@app.route('/api/category/<int:category_id>/images', methods=['GET'])
def get_category_images(category_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search_term = request.args.get('search', '', type=str)
    
    # 验证页码
    if page < 1:
        page = 1
        
    # 验证每页数量
    if per_page < 1:
        per_page = 20
    elif per_page > 100:
        per_page = 100
        
    try:
        # 检查分类是否存在
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM categories WHERE id = ?", (category_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({'success': False, 'message': '分类不存在'})
        conn.close()
        
        # 获取图片数据
        result = get_images_by_category(category_id, page, per_page, search_term)
        
        # 格式化图片数据
        formatted_images = []
        for img in result['images']:
            # 数据库返回的顺序是: id, filename, filepath, upload_time
                # 从完整路径中提取相对于uploads目录的路径
                # 获取uploads目录的绝对路径
                uploads_abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
                # 计算图片文件相对于uploads目录的路径
                rel_path = os.path.relpath(img[2], uploads_abs_path)
                # 将Windows路径分隔符替换为URL路径分隔符
                rel_path = rel_path.replace('\\', '/')
                # 生成正确的图片URL路径
                image_url = url_for('serve_uploads', filename=rel_path)
                
                # 处理时间戳，转换为UTC+8时间
                upload_time = img[3]
                if isinstance(upload_time, str):
                    # 如果是字符串形式的时间戳，尝试解析
                    try:
                        # 尝试解析SQLite的时间戳格式
                        dt = datetime.strptime(upload_time, '%Y-%m-%d %H:%M:%S')
                        # 设置为UTC+8时区
                        utc8_tz = pytz.timezone('Asia/Shanghai')
                        # 假设数据库中的时间是UTC时间，需要转换
                        dt_utc = pytz.utc.localize(dt)
                        dt_utc8 = dt_utc.astimezone(utc8_tz)
                        # 格式化输出为UTC+8时间
                        upload_time = dt_utc8.strftime('%Y-%m-%d %H:%M:%S')
                    except ValueError:
                        # 如果解析失败，保持原格式
                        pass
                
                formatted_images.append({
                    'id': img[0],
                    'filename': img[1],
                    'filepath': image_url,
                    'upload_time': upload_time,
                    'sort_index': img[4]  # 添加sort_index字段
                })
            
        return jsonify({
            'success': True,
            'images': formatted_images,
            'total_pages': result['total_pages'],
            'current_page': result['current_page'],
            'total_count': result['total_count']
        })
    except Exception as e:
        return jsonify({'success': False, 'message': f'获取图片失败: {str(e)}'})

# 已废弃，使用serve_uploads代替
# @app.route('/uploads/<filename>')
# def serve_uploaded_file(filename):
#     # 直接提供文件，避免重定向循环
#     try:
#         return send_from_directory(UPLOAD_FOLDER, filename)
#     except FileNotFoundError:
#         # 如果文件不存在，返回错误图片
#         return send_from_directory('../static/images', 'error.webp'), 404

# 分类管理相关路由已在下方统一实现

# 删除分类API
@app.route('/admin/delete_category/<int:category_id>', methods=['POST'])
def delete_category(category_id):
    if not is_admin_logged_in():
        return jsonify({'success': False, 'message': '请先登录'})
        
    # 不允许删除默认分类
    if category_id == 1:
        return jsonify({'success': False, 'message': '默认分类不能删除'})
        
    try:
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # 获取分类信息
        cursor.execute("SELECT name, folder_path FROM categories WHERE id = ?", (category_id,))
        category = cursor.fetchone()
        
        if not category:
            conn.close()
            return jsonify({'success': False, 'message': '分类不存在'})
            
        # 先删除该分类下的所有图片记录
        cursor.execute("DELETE FROM images WHERE category_id = ?", (category_id,))
        
        # 然后删除分类记录（不删除实际文件夹）
        cursor.execute("DELETE FROM categories WHERE id = ?", (category_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '分类删除成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'删除失败: {str(e)}'})

# 首页路由
@app.route('/')
def index():
    categories = get_categories()
    return render_template('index.html', categories=categories)

# 测试页脚对齐路由
@app.route('/test_footer')
def test_footer():
    return render_template('test_footer.html')

# 分类页面路由
@app.route('/category/<int:category_id>')
def category(category_id):
    # 获取分类信息
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM categories WHERE id = ?", (category_id,))
    category = cursor.fetchone()
    conn.close()
    
    if not category:
        return "分类不存在", 404

    return render_template('category.html', category_id=category_id, category_name=category[0])

# 测试添加分类功能的路由
@app.route('/test/add_category')
def test_add_category():
    return render_template('test_add_category.html')

# 管理员登录路由
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if is_admin_logged_in():
        return redirect(url_for('admin_dashboard'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("SELECT password FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()
        
        if user and hashlib.sha256(password.encode()).hexdigest() == user[0]:
            session['admin_logged_in'] = True
            session['admin_username'] = username
            return redirect(url_for('admin_dashboard'))
        else:
            return render_template('admin_login.html', error='用户名或密码错误')
            
    return render_template('admin_login.html')

# 管理员注销路由
@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin_login'))

# 管理员仪表盘路由
@app.route('/admin/dashboard')
def admin_dashboard():
    if not is_admin_logged_in():
        return redirect(url_for('admin_login'))
        
    categories = get_categories()
    return render_template('admin_dashboard.html', categories=categories)

# 添加分类路由
@app.route('/admin/add_category', methods=['POST'])
def add_category():
    print("收到添加分类请求")
    print(f"请求方法: {request.method}")
    print(f"请求内容类型: {request.content_type}")
    
    if not is_admin_logged_in():
        print("未登录，拒绝添加分类请求")
        return jsonify({'success': False, 'message': '请先登录'})
    
    # 尝试从JSON中获取数据，如果失败则从表单中获取
    try:
        data = request.get_json()
        print(f"获取JSON数据: {data}")
        if data:
            name = data.get('name')
            folder_path = data.get('folder_path')
        else:
            name = request.form.get('name')
            folder_path = request.form.get('folder_path')
        print(f"表单数据 - name: {name}, folder_path: {folder_path}")
    except Exception as e:
        print(f"获取数据异常: {str(e)}")
        name = request.form.get('name')
        folder_path = request.form.get('folder_path')
    
    # 验证数据
    if not name or not folder_path:
        print(f"数据验证失败 - name: {name}, folder_path: {folder_path}")
        return jsonify({'success': False, 'message': '分类名称和文件夹路径不能为空'})
    
    # 验证文件夹路径是否存在
    if not os.path.exists(folder_path):
        print(f"文件夹不存在: {folder_path}")
        return jsonify({'success': False, 'message': '指定的文件夹路径不存在'})
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    try:
        print(f"执行SQL插入 - name: {name}, folder_path: {folder_path}")
        cursor.execute("INSERT INTO categories (name, folder_path) VALUES (?, ?)", (name, folder_path))
        category_id = cursor.lastrowid
        print(f"插入成功，分类ID: {category_id}")
        # 扫描文件夹并更新数据库 - 使用同一个数据库连接
        scan_folder_and_update_db(folder_path, category_id, cursor, conn)
        conn.commit()
        print("分类添加成功")
        return jsonify({'success': True, 'message': '分类添加成功'})
    except sqlite3.IntegrityError:
        print("SQL完整性错误，分类名称或文件夹路径已存在")
        conn.rollback()
        return jsonify({'success': False, 'message': '分类名称或文件夹路径已存在'})
    except Exception as e:
        print(f"添加分类异常: {str(e)}")
        conn.rollback()
        return jsonify({'success': False, 'message': f'添加分类失败: {str(e)}'})
    finally:
        conn.close()
        print("数据库连接已关闭")

# 删除分类路由已在上方实现

# 上传图片路由（单文件上传）
@app.route('/admin/upload', methods=['POST'])
def admin_upload():
    if not is_admin_logged_in():
        return jsonify({'success': False, 'message': '请先登录'})
    
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': '没有文件部分'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': '没有选择文件'})
    
    category_id = request.form.get('category_id')
    if not category_id:
        return jsonify({'success': False, 'message': '请选择分类'})
    
    if file and allowed_file(file.filename):
        # 获取分类的文件夹路径
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("SELECT folder_path FROM categories WHERE id = ?", (category_id,))
        category = cursor.fetchone()
        conn.close()
        
        if not category:
            return jsonify({'success': False, 'message': '分类不存在'})
        
        folder_path = category[0]
        
        # 保存文件
        filename = file.filename
        file_path = os.path.join(folder_path, filename)
        
        # 如果文件已存在，添加UTC+8时间戳避免覆盖
        if os.path.exists(file_path):
            # 设置为UTC+8时区
            utc8_tz = pytz.timezone('Asia/Shanghai')
            timestamp = datetime.now(utc8_tz).strftime('%Y%m%d%H%M%S')
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{timestamp}{ext}"
            file_path = os.path.join(folder_path, filename)
        
        file.save(file_path)
        
        # 更新数据库
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO images (filename, filepath, category_id) VALUES (?, ?, ?)",
            (filename, file_path, category_id)
        )
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': '图片上传成功'})
    
    return jsonify({'success': False, 'message': '不支持的文件类型'})

# 扫描文件夹路由
@app.route('/admin/scan_folder/<int:category_id>', methods=['POST'])
def scan_folder(category_id):
    if not is_admin_logged_in():
        return jsonify({'success': False, 'message': '请先登录'})
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT folder_path FROM categories WHERE id = ?", (category_id,))
    category = cursor.fetchone()
    conn.close()
    
    if not category:
        return jsonify({'success': False, 'message': '分类不存在'})
    
    try:
        scan_folder_and_update_db(category[0], category_id)
        return jsonify({'success': True, 'message': '文件夹扫描完成'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'扫描失败: {str(e)}'})

# 获取图片列表API
@app.route('/api/images/<int:category_id>')
def api_images(category_id):
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search_term = request.args.get('search', '', type=str)
    view_mode = request.args.get('view_mode', 'waterfall', type=str)
    sort_direction = request.args.get('sort', 'desc', type=str)  # 默认为降序
    
    result = get_images_by_category(category_id, page, per_page, search_term, sort_direction)
    
    # 格式化图片数据
    formatted_images = []
    for img in result['images']:
        # 数据库返回的顺序是: id, filename, filepath, upload_time
        # 获取uploads目录的绝对路径
        uploads_abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
        
        # 检查文件是否在uploads目录内
        if os.path.commonpath([uploads_abs_path]) == os.path.commonpath([uploads_abs_path, img[2]]):
            # 对于uploads目录内的文件，计算相对路径
            rel_path = os.path.relpath(img[2], uploads_abs_path)
        else:
            # 对于不在uploads目录内的文件，直接使用文件名
            rel_path = os.path.basename(img[2])
            
        # 将Windows路径分隔符替换为URL路径分隔符
        rel_path = rel_path.replace('\\', '/')
        # 生成正确的图片URL路径
        image_url = url_for('serve_uploads', filename=rel_path)
        
        # 处理时间戳，转换为UTC+8时间
        upload_time = img[3]
        if isinstance(upload_time, str):
            # 如果是字符串形式的时间戳，尝试解析
            try:
                # 尝试解析SQLite的时间戳格式
                dt = datetime.strptime(upload_time, '%Y-%m-%d %H:%M:%S')
                # 设置为UTC+8时区
                utc8_tz = pytz.timezone('Asia/Shanghai')
                # 假设数据库中的时间是UTC时间，需要转换
                dt_utc = pytz.utc.localize(dt)
                dt_utc8 = dt_utc.astimezone(utc8_tz)
                # 格式化输出为UTC+8时间
                upload_time = dt_utc8.strftime('%Y-%m-%d %H:%M:%S')
            except ValueError:
                # 如果解析失败，保持原格式
                pass
        
        # 获取图片实际尺寸和文件大小
        width = None
        height = None
        size = None
        
        # 尝试获取文件大小
        try:
            # 获取原始文件的绝对路径
            original_file_path = img[2]  # 这是数据库中存储的原始文件路径
            if os.path.exists(original_file_path):
                size = os.path.getsize(original_file_path)  # 获取文件大小（字节）
        except Exception as e:
            print(f"获取文件大小失败: {e}")
        
        # 尝试获取图片尺寸
        try:
            if Image and os.path.exists(original_file_path):
                with Image.open(original_file_path) as img_obj:
                    width, height = img_obj.size
        except Exception as e:
            print(f"获取图片尺寸失败: {e}")
        
        formatted_images.append({
            'id': img[0],
            'filename': img[1],
            'filepath': image_url,
            'upload_time': upload_time,
            'width': width,
            'height': height,
            'size': size
        })
    
    return jsonify({
        'images': formatted_images,
        'total_pages': result['total_pages'],
        'current_page': result['current_page'],
        'total_count': result['total_count'],
        'view_mode': view_mode
    })

# 获取图片详情API
@app.route('/api/image/<int:image_id>')
def api_image_detail(image_id):
    image = get_image_detail(image_id)
    if not image:
        return jsonify({'success': False, 'message': '图片不存在'})
    
    # 获取图片的相对路径用于显示
    relative_path = os.path.relpath(image[2], os.path.dirname(app.root_path))
    relative_path = relative_path.replace('\\', '/')
    
    # 处理时间戳，转换为UTC+8时间
    upload_time = image[2]
    if isinstance(upload_time, str):
        # 如果是字符串形式的时间戳，尝试解析
        try:
            # 尝试解析SQLite的时间戳格式
            dt = datetime.strptime(upload_time, '%Y-%m-%d %H:%M:%S')
            # 设置为UTC+8时区
            utc8_tz = pytz.timezone('Asia/Shanghai')
            # 假设数据库中的时间是UTC时间，需要转换
            dt_utc = pytz.utc.localize(dt)
            dt_utc8 = dt_utc.astimezone(utc8_tz)
            # 格式化输出为UTC+8时间
            upload_time = dt_utc8.strftime('%Y-%m-%d %H:%M:%S')
        except ValueError:
            # 如果解析失败，保持原格式
            pass
    
    return jsonify({
        'success': True,
        'image': {
            'id': image[0],
            'filename': image[1],
            'filepath': relative_path,
            'upload_time': upload_time,
            'category': image[3]
        }
    })

# 删除图片API
@app.route('/api/images/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    try:
        # 获取图片信息
        image = get_image_detail(image_id)
        if not image:
            return jsonify({'success': False, 'message': '图片不存在'})
        
        # 获取图片路径
        file_path = image[2]
        
        # 删除数据库中的记录
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM images WHERE id = ?", (image_id,))
        conn.commit()
        conn.close()
        
        # 尝试删除实际文件
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"删除文件失败: {e}")
                # 文件删除失败不影响数据库删除操作
        
        return jsonify({'success': True, 'message': '图片删除成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'删除失败: {str(e)}'})

# 提供图片文件服务
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    try:
        # 解码URL编码的文件名，确保中文文件名正确处理
        import urllib.parse
        decoded_filename = urllib.parse.unquote(filename)
        
        # 获取文件名（处理URL编码后的文件名）
        file_basename = os.path.basename(decoded_filename)
        
        # 从数据库中查找文件的实际路径
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        
        # 尝试通过文件名匹配（处理所有位置的文件）
        cursor.execute("SELECT filepath FROM images WHERE filename = ?", (file_basename,))
        image = cursor.fetchone()
        
        conn.close()
        
        if image:
            # 获取文件的实际路径
            actual_filepath = image[0]
            
            # 验证文件是否存在
            if not os.path.exists(actual_filepath):
                raise FileNotFoundError(f"文件不存在: {actual_filepath}")
            
            # 获取文件所在的目录和文件名
            directory = os.path.dirname(actual_filepath)
            file_name = os.path.basename(actual_filepath)
            
            # 直接读取文件内容并返回，避免send_from_directory可能的路径问题
            try:
                # 根据文件扩展名设置正确的MIME类型
                import mimetypes
                mime_type, _ = mimetypes.guess_type(file_name)
                if mime_type is None:
                    mime_type = 'application/octet-stream'
                
                with open(actual_filepath, 'rb') as f:
                    response = app.response_class(
                        response=f.read(),
                        status=200,
                        mimetype=mime_type
                    )
                    return response
            except Exception as e:
                # 如果直接读取也失败，返回错误图片
                return send_from_directory('../static/images', 'error.webp'), 500
        else:
            # 如果在数据库中找不到文件，返回错误图片
            return send_from_directory('../static/images', 'error.webp'), 404
    except FileNotFoundError:
        # 如果文件不存在，返回错误图片
        return send_from_directory('../static/images', 'error.webp'), 404
    except Exception as e:
        # 处理其他异常
        return send_from_directory('../static/images', 'error.webp'), 500

# 提供静态文件服务
@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('../static', filename)

if __name__ == '__main__':
    init_db()
    
    # 获取默认分类ID并扫描文件夹
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, folder_path FROM categories WHERE name = '默认分类'")
    default_category = cursor.fetchone()
    conn.close()
    
    if default_category:
        scan_folder_and_update_db(default_category[1], default_category[0])
    
    # 开放所有IP访问，设置host为0.0.0.0
    app.run(debug=False, host='0.0.0.0')