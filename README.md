# 壁纸浏览网站

一个使用 Flask + Vue.js + SQLite 开发的图片浏览网站，支持瀑布流和分页式两种视图模式，以及图片管理功能。

## 功能特点

1. **图片浏览**：通过浏览器浏览服务端的图片，支持瀑布流和分页式两种视图模式
2. **管理员功能**：管理员登录后可以管理图片分类、添加服务器图片文件夹、上传客户端图片
3. **分类浏览**：按管理员设置的文件夹分类浏览图片
4. **搜索功能**：支持按文件名模糊搜索图片
5. **图片详情**：点击缩略图查看原图及图片信息
6. **动画效果**：使用优雅的加载和过渡动画
7. **美观界面**：使用 Font Awesome 样式优化界面 UI

## 技术栈

- **后端**：Flask, SQLite
- **前端**：HTML, CSS, JavaScript, Vue.js, Font Awesome

## 项目结构

```
WallpaperWeb/
├── backend/              # Flask 后端代码
│   ├── app.py            # 主应用文件
│   └── setup_fontawesome.py  # Font Awesome 安装脚本
├── frontend/             # 前端相关文件（可扩展）
├── templates/            # HTML 模板文件
│   ├── base.html         # 基础模板
│   ├── index.html        # 首页模板
│   ├── category.html     # 图片分类浏览页面
│   ├── admin_login.html  # 管理员登录页面
│   └── admin_dashboard.html  # 管理员仪表盘
├── static/               # 静态文件
│   ├── css/              # CSS 样式文件
│   ├── js/               # JavaScript 文件
│   ├── images/           # 静态图片文件
│   └── fontawesome-free-6.6.0-web/  # Font Awesome 文件
├── uploads/              # 上传的图片存储目录
├── requirements.txt      # Python 依赖包列表
└── README.md             # 项目说明文档
```

## 安装和运行

### 1. 安装依赖

在项目根目录下运行以下命令安装所需的 Python 依赖：

```bash
pip install -r requirements.txt
```

### 2. 初始化数据库

运行应用时会自动初始化数据库（SQLite），创建必要的表和默认管理员账户。

默认管理员账户：
- 用户名：admin
- 密码：admin

### 3. 启动应用

在 `backend` 目录下运行以下命令启动 Flask 应用：

```bash
python app.py
```

应用会在 `http://localhost:5000` 启动。

## 使用说明

### 普通用户

1. 访问首页，浏览可用的图片分类
2. 点击分类进入图片浏览页面
3. 可以切换瀑布流和分页式两种视图模式
4. 使用搜索框按文件名搜索图片
5. 点击图片缩略图查看原图及详情

### 管理员

1. 访问 `/admin/login` 登录管理后台
2. 在管理面板中可以：
   - 添加新的图片分类
   - 扫描现有文件夹以导入图片
   - 上传新的图片到指定分类
   - 删除不需要的分类（默认分类除外）

## 注意事项

1. 确保 `uploads` 目录有写入权限
2. 首次运行时会自动创建必要的目录和数据库
3. 管理员可以通过扫描文件夹功能将服务器上已有的图片导入系统
4. 上传图片时，系统会自动检测文件类型，只允许上传支持的图片格式
5. 在生产环境中，请修改 `app.py` 中的 `secret_key` 为一个安全的随机字符串

## License

MIT