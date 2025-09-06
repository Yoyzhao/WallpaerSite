// 主JavaScript文件，用于处理网站的交互逻辑

// DOM元素加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面动画
    initPageAnimations();
    
    // 初始化导航菜单
    initNavigation();
    
    // 初始化搜索功能
    initSearch();
    
    // 初始化图片懒加载
    initLazyLoading();
    
    // 检查页面类型并初始化相应功能
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/category')) {
        initCategoryPage();
    } else if (currentPath.includes('/admin')) {
        initAdminPages();
    }
});

// 页面动画初始化
function initPageAnimations() {
    // 页面载入时的淡入效果
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    // 为所有可点击元素添加悬停效果
    const clickableElements = document.querySelectorAll('a, button, .clickable');
    clickableElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transition = 'transform 0.2s ease';
            this.style.transform = 'scale(1.05)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// 导航菜单初始化
function initNavigation() {
    // 移动端菜单切换（如果有）
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav ul');
    
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }
    
    // 滚动时改变导航栏样式
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (header && window.scrollY > 50) {
            header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
            header.style.padding = '15px 0';
        } else if (header) {
            header.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            header.style.padding = '20px 0';
        }
    });
}

// 搜索功能初始化
function initSearch() {
    const searchForms = document.querySelectorAll('.search-form');
    searchForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const searchInput = this.querySelector('input[type="text"]');
            if (searchInput && !searchInput.value.trim()) {
                e.preventDefault();
                searchInput.focus();
                // 添加抖动效果
                searchInput.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    searchInput.style.animation = '';
                }, 500);
            }
        });
    });
}

// 图片懒加载初始化
function initLazyLoading() {
    // 检查浏览器是否支持IntersectionObserver
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    // 加载图片
                    if (image.dataset.src) {
                        image.src = image.dataset.src;
                        image.removeAttribute('data-src');
                        // 移除加载状态
                        image.classList.remove('loading');
                    }
                    observer.unobserve(image);
                }
            });
        });
        
        // 观察所有懒加载图片
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(image => {
            imageObserver.observe(image);
        });
    } else {
        // 回退方案：立即加载所有图片
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(image => {
            image.src = image.dataset.src;
            image.removeAttribute('data-src');
            image.classList.remove('loading');
        });
    }
}

// 分类页面初始化
function initCategoryPage() {
    // 图片查看器逻辑
    const imageViewer = document.getElementById('image-viewer');
    if (imageViewer) {
        // 点击空白处关闭查看器
        imageViewer.addEventListener('click', function(e) {
            if (e.target === imageViewer || e.target.classList.contains('close-btn')) {
                imageViewer.classList.remove('active');
                // 防止页面滚动
                document.body.style.overflow = '';
            }
        });
        
        // 键盘ESC键关闭查看器
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && imageViewer.classList.contains('active')) {
                imageViewer.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // 图片选中功能
    let selectedImages = new Set();
    
    function initImageSelection() {
        const images = document.querySelectorAll('.image-thumbnail');
        
        images.forEach(img => {
            img.addEventListener('click', function(e) {
                // 检查是否是通过查看大图功能触发的点击
                const isViewImageClick = e.target.closest('.image-card') && 
                                        (e.target.classList.contains('image-thumbnail') ||
                                         e.target.classList.contains('image-info'));
                
                // 如果不是查看大图的点击（或者使用了Ctrl/Command键），则切换选中状态
                if (!isViewImageClick || (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    if (this.classList.contains('selected')) {
                        // 取消选中
                        this.classList.remove('selected');
                        selectedImages.delete(this.src);
                    } else {
                        // 添加选中（如果没有使用Ctrl/Command，则先取消其他选中）
                        if (!(e.ctrlKey || e.metaKey)) {
                            // 取消其他所有图片的选中状态
                            document.querySelectorAll('.image-thumbnail.selected').forEach(selectedImg => {
                                selectedImg.classList.remove('selected');
                                selectedImages.delete(selectedImg.src);
                            });
                        }
                        // 选中当前图片
                        this.classList.add('selected');
                        selectedImages.add(this.src);
                    }
                    
                    console.log('选中的图片数量:', selectedImages.size);
                }
            });
        });
        
        // 点击页面其他地方取消选中（可选功能）
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.image-card') && !e.target.closest('.view-controls') && !e.target.closest('.pagination')) {
                // 取消所有图片的选中状态
                document.querySelectorAll('.image-thumbnail.selected').forEach(selectedImg => {
                    selectedImg.classList.remove('selected');
                });
                selectedImages.clear();
            }
        });
    }
    
    // 初始化图片选中功能
    initImageSelection();
    
    // 视图切换逻辑
    const viewModeButtons = document.querySelectorAll('.view-mode-btn');
    viewModeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除其他按钮的active状态
            viewModeButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的active状态
            this.classList.add('active');
            // 添加点击动画
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    });
    
    // 排序功能逻辑
    const sortButtons = document.querySelectorAll('.sort-btn');
    let currentSort = 'desc'; // 默认倒序
    
    // 确保只在DOM元素加载完成后添加事件监听器
    if (sortButtons.length > 0) {
        sortButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 更新按钮状态
                sortButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                currentSort = this.dataset.sort;
                
                // 添加点击动画
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);
                
                // 排序图片
                sortImagesByTime(currentSort);
            });
        });
    }
    
    // 按时间排序图片的函数
    function sortImagesByTime(sortOrder) {
        // 获取当前活动的视图容器
        const activeViewMode = document.getElementById('waterfall-btn').classList.contains('active') ? 'waterfall' : 'grid';
        const imagesContainer = activeViewMode === 'waterfall' ? 
            document.getElementById('masonry-grid') : 
            document.getElementById('grid-view');
        
        if (!imagesContainer) {
            console.log('未找到图片容器');
            return;
        }
        
        // 获取所有图片项
        const imageItems = Array.from(imagesContainer.querySelectorAll('[data-upload-time]'));
        
        if (imageItems.length === 0) {
            console.log('未找到带上传时间的图片项');
            return;
        }
        
        // 根据data-upload-time属性排序
        imageItems.sort((a, b) => {
            try {
                const timeA = new Date(a.dataset.uploadTime).getTime();
                const timeB = new Date(b.dataset.uploadTime).getTime();
                return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
            } catch (error) {
                console.error('排序错误:', error);
                return 0;
            }
        });
        
        // 清空容器并重新添加排序后的图片
        // 添加淡入效果
        imageItems.forEach(item => {
            item.style.opacity = '0';
            item.style.transition = 'opacity 0.3s ease';
        });
        
        // 延迟一点时间再重新添加图片以增强视觉效果
        setTimeout(() => {
            // 清空容器
            while (imagesContainer.firstChild) {
                imagesContainer.removeChild(imagesContainer.firstChild);
            }
            
            // 重新添加排序后的图片
            imageItems.forEach((item, index) => {
                // 设置一点延迟以创建级联效果
                setTimeout(() => {
                    imagesContainer.appendChild(item);
                    item.style.opacity = '1';
                }, index * 30);
            });
        }, 200);
    }
}

// 管理员页面初始化
function initAdminPages() {
    // 表单验证
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            // 添加提交动画
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton && !submitButton.disabled) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
            }
        });
    });
    
    // 确认对话框样式美化
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 点击时的反馈动画
            this.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 200);
        });
    });
}

// 添加自定义动画
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .fade-in-up {
        animation: fadeInUp 0.5s ease-out;
    }
    
    /* 滚动条样式 */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    
    ::-webkit-scrollbar-track {
        background: #f1f1f1;
    }
    
    ::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: #555;
    }
`;

document.head.appendChild(style);

// 导出公共函数供其他脚本使用
window.WallpaperApp = {
    initPageAnimations,
    initNavigation,
    initSearch,
    initLazyLoading,
    initCategoryPage,
    initAdminPages
};