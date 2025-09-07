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
        const viewerImage = document.getElementById('viewer-image');
        let scale = 1;
        let x = 0;
        let y = 0;
        const minScale = 0.5;
        const maxScale = 5;
        const scaleStep = 0.1;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        // 重置图片状态
        function resetImageState() {
            scale = 1;
            x = 0;
            y = 0;
            if (viewerImage) {
                viewerImage.style.transform = 'translate(0, 0) scale(1)';
                viewerImage.style.cursor = 'zoom-in';
            }
        }
        
        // 应用图片变换
        function applyImageTransform() {
            if (viewerImage) {
                viewerImage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
                viewerImage.style.cursor = isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'zoom-in');
            }
        }
        
        // 缩放图片函数
        function scaleImage(delta, centerX, centerY) {
            if (!viewerImage) return;
            
            // 保存当前中心点
            const currentScale = scale;
            
            // 计算新的缩放比例
            if (delta > 0) {
                scale = Math.min(scale + scaleStep, maxScale);
            } else {
                scale = Math.max(scale - scaleStep, minScale);
            }
            
            // 如果提供了中心点，则围绕该点缩放
            if (centerX !== undefined && centerY !== undefined) {
                const scaleRatio = scale / currentScale;
                x = centerX - (centerX - x) * scaleRatio;
                y = centerY - (centerY - y) * scaleRatio;
            }
            
            applyImageTransform();
        }
        
        // 点击空白处关闭查看器
        imageViewer.addEventListener('click', function(e) {
            if (e.target === imageViewer) {
                // 调用Vue实例的closeImageViewer方法
                if (window.app && window.app.closeImageViewer) {
                    window.app.closeImageViewer();
                } else {
                    // 备用方案
                    imageViewer.classList.remove('active');
                    document.body.style.overflow = '';
                    resetImageState();
                }
            }
        });
        
        // 键盘ESC键关闭查看器
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && imageViewer.classList.contains('active')) {
                // 调用Vue实例的closeImageViewer方法
                if (window.app && window.app.closeImageViewer) {
                    window.app.closeImageViewer();
                } else {
                    // 备用方案
                    imageViewer.classList.remove('active');
                    document.body.style.overflow = '';
                    resetImageState();
                }
            }
        });
        
        // 鼠标滚轮缩放
        if (viewerImage) {
            viewerImage.addEventListener('wheel', function(e) {
                e.preventDefault();
                
                // 获取鼠标在图片上的位置
                const rect = viewerImage.getBoundingClientRect();
                const mouseX = e.clientX - rect.left - rect.width / 2;
                const mouseY = e.clientY - rect.top - rect.height / 2;
                
                // 检查是否按住Ctrl键（Windows）或Command键（Mac）
                if (e.ctrlKey || e.metaKey) {
                    // 使用deltaY的正负来判断滚轮方向
                    scaleImage(-e.deltaY, mouseX, mouseY);
                }
            }, { passive: false });
            
            // 点击图片在新标签页打开
            viewerImage.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // 如果是双指点击，忽略
                if (e.touches && e.touches.length > 1) {
                    return;
                }
                
                // 如果刚刚发生了拖拽，则不执行点击操作
                if (isDragging) {
                    isDragging = false;
                    viewerImage.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
                    return;
                }
                
                // 在新标签页打开图片
                window.open(viewerImage.src, '_blank');
            });
            
            // 鼠标拖拽功能
            viewerImage.addEventListener('mousedown', function(e) {
                e.preventDefault();
                isDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                viewerImage.style.cursor = 'grabbing';
            });
            
            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;
                
                x += deltaX;
                y += deltaY;
                
                lastX = e.clientX;
                lastY = e.clientY;
                
                applyImageTransform();
            });
            
            document.addEventListener('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    viewerImage.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
                }
            });
            
            document.addEventListener('mouseleave', function() {
                if (isDragging) {
                    isDragging = false;
                    viewerImage.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
                }
            });
            
            // 触摸事件缩放和拖拽支持
            let touchStartDistance = 0;
            let touchStartScale = 1;
            let touchStartX = 0;
            let touchStartY = 0;
            let isTouchDragging = false;
            
            viewerImage.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    // 单指触摸开始（可能是拖拽）
                    isTouchDragging = true;
                    touchStartX = e.touches[0].clientX - x;
                    touchStartY = e.touches[0].clientY - y;
                } else if (e.touches.length === 2) {
                    // 双指触摸开始（缩放）
                    isTouchDragging = false;
                    // 计算两指之间的距离
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    touchStartDistance = Math.sqrt(dx * dx + dy * dy);
                    touchStartScale = scale;
                    // 计算两指中心点
                    touchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    touchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                }
            });
            
            viewerImage.addEventListener('touchmove', function(e) {
                if (e.touches.length === 1 && isTouchDragging && scale > 1) {
                    // 单指拖拽
                    e.preventDefault();
                    x = e.touches[0].clientX - touchStartX;
                    y = e.touches[0].clientY - touchStartY;
                    applyImageTransform();
                } else if (e.touches.length >= 2) {
                    // 双指或更多手指缩放
                    e.preventDefault();
                    // 如果之前是拖拽状态，现在切换到缩放状态
                    if (isTouchDragging) {
                        isTouchDragging = false;
                        // 重新计算缩放相关参数
                        const dx = e.touches[0].clientX - e.touches[1].clientX;
                        const dy = e.touches[0].clientY - e.touches[1].clientY;
                        touchStartDistance = Math.sqrt(dx * dx + dy * dy);
                        touchStartScale = scale;
                    }
                    
                    // 计算当前两指之间的距离
                    const dx = e.touches[0].clientX - e.touches[1].clientX;
                    const dy = e.touches[0].clientY - e.touches[1].clientY;
                    const touchDistance = Math.sqrt(dx * dx + dy * dy);
                    
                    // 计算缩放比例变化
                    const scaleFactor = touchDistance / touchStartDistance;
                    const newScale = touchStartScale * scaleFactor;
                    
                    // 应用缩放，保持在最小和最大范围内
                    const prevScale = scale;
                    scale = Math.max(minScale, Math.min(maxScale, newScale));
                    
                    // 计算两指中心点
                    const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                    const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                    
                    // 调整位置以保持缩放中心点不变
                    const rect = viewerImage.getBoundingClientRect();
                    const imageCenterX = rect.width / 2;
                    const imageCenterY = rect.height / 2;
                    const relCenterX = centerX - rect.left - imageCenterX;
                    const relCenterY = centerY - rect.top - imageCenterY;
                    
                    x += relCenterX * (1 - scale/prevScale);
                    y += relCenterY * (1 - scale/prevScale);
                    
                    applyImageTransform();
                }
            }, { passive: false });
            
            viewerImage.addEventListener('touchend', function(e) {
                // 只有当所有手指都离开屏幕时才重置拖拽状态
                if (e.touches.length === 0) {
                    isTouchDragging = false;
                }
            });
        }
        
        // 当查看器激活时，重置图片状态并初始化按钮事件
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (imageViewer.classList.contains('active')) {
                        resetImageState();
                        initViewerButtons();
                    }
                }
            });
        });
        
        observer.observe(imageViewer, { attributes: true });
        
        // 初始化查看器按钮事件
        function initViewerButtons() {
            // 获取查看器中的按钮
            const prevBtn = document.getElementById('prev-image');
            const nextBtn = document.getElementById('next-image');
            const viewDetailsBtn = document.getElementById('view-details');
            const deleteBtn = document.getElementById('delete-image');
            
            // 上一张按钮事件
            if (prevBtn) {
                prevBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // 调用Vue实例的上一张图片方法
                    if (window.app && window.app.viewPrevImage) {
                        window.app.viewPrevImage();
                    }
                });
            }
            
            // 下一张按钮事件
            if (nextBtn) {
                nextBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // 调用Vue实例的下一张图片方法
                    if (window.app && window.app.viewNextImage) {
                        window.app.viewNextImage();
                    }
                });
            }
            
            // 查看详情按钮事件
            if (viewDetailsBtn) {
                viewDetailsBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // 调用Vue实例的查看详情方法
                    if (window.app && window.app.showImageDetails) {
                        window.app.showImageDetails();
                    }
                });
            }
            
            // 删除按钮事件
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // 调用Vue实例的删除图片方法
                    if (window.app && window.app.deleteCurrentImage) {
                        window.app.deleteCurrentImage();
                    }
                });
            }
        }
        
        // 添加滑动切换图片功能
        if (viewerImage) {
            let touchStartX = 0;
            let touchEndX = 0;
            
            // 触摸开始事件
            viewerImage.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                }
            });
            
            // 触摸结束事件
            viewerImage.addEventListener('touchend', function(e) {
                if (e.changedTouches.length === 1) {
                    touchEndX = e.changedTouches[0].clientX;
                    handleSwipe();
                }
            });
            
            // 处理滑动
            function handleSwipe() {
                const swipeThreshold = 50; // 滑动阈值
                
                // 向左滑动（下一张）
                if (touchEndX < touchStartX - swipeThreshold) {
                    if (window.app && window.app.viewNextImage) {
                        window.app.viewNextImage();
                    }
                }
                // 向右滑动（上一张）
                else if (touchEndX > touchStartX + swipeThreshold) {
                    if (window.app && window.app.viewPrevImage) {
                        window.app.viewPrevImage();
                    }
                }
            }
        }
    }
    
    // 图片选中功能 - 重写版本，确保不会阻止正常的点击事件
    let selectedImages = new Set();
    
    function initImageSelection() {
        // 不直接绑定到图片点击事件，避免干扰Vue的事件处理
        document.addEventListener('keydown', function(e) {
            // 只监听Ctrl/Command键的按下
            if (e.key === 'Control' || e.key === 'Meta') {
                // 添加全局标记，表示Ctrl/Command键已按下
                document.body.classList.add('ctrl-pressed');
            }
        });
        
        document.addEventListener('keyup', function(e) {
            // 监听Ctrl/Command键的释放
            if (e.key === 'Control' || e.key === 'Meta') {
                // 移除全局标记
                document.body.classList.remove('ctrl-pressed');
            }
        });
        
        // 为图片添加鼠标悬停效果，但不阻止点击事件
        const images = document.querySelectorAll('.image-thumbnail');
        images.forEach(img => {
            // 添加鼠标悬停效果，显示选中提示
            img.addEventListener('mouseenter', function() {
                if (document.body.classList.contains('ctrl-pressed')) {
                    this.style.cursor = 'cell';
                    this.style.opacity = '0.8';
                } else {
                    this.style.cursor = 'pointer';
                    this.style.transform = 'scale(1.02)';
                }
                this.style.transition = 'all 0.2s ease';
            });
            
            img.addEventListener('mouseleave', function() {
                this.style.cursor = 'default';
                this.style.transform = 'scale(1)';
                this.style.opacity = '1';
            });
            
            // 添加辅助选中功能，但不阻止正常点击事件
            img.addEventListener('click', function(e) {
                // 只有在按下Ctrl/Command键时才执行选中逻辑
                if (e.ctrlKey || e.metaKey) {
                    // 不调用e.preventDefault()和e.stopPropagation()，让点击事件正常冒泡
                    
                    if (this.classList.contains('selected')) {
                        // 取消选中
                        this.classList.remove('selected');
                        selectedImages.delete(this.src);
                    } else {
                        // 选中当前图片
                        this.classList.add('selected');
                        selectedImages.add(this.src);
                    }
                    
                    console.log('选中的图片数量:', selectedImages.size);
                }
            });
        });
        
        // 点击页面其他地方取消选中
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
    
    /* 图片查看器按钮默认隐藏，鼠标掠过显示 */
    .image-viewer .close-btn,
    .image-viewer .nav-btn,
    .image-viewer .image-viewer-actions {
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .image-viewer:hover .close-btn,
    .image-viewer:hover .nav-btn,
    .image-viewer:hover .image-viewer-actions {
        opacity: 1;
    }
    
    /* 为左右两侧的导航按钮添加特定的悬停区域 */
    .image-viewer-content {
        position: relative;
    }
    
    /* 增强用户体验：点击图片时也显示按钮 */
    .image-viewer.active .close-btn,
    .image-viewer.active .nav-btn,
    .image-viewer.active .image-viewer-actions {
        opacity: 0;
    }
    
    /* 当鼠标移动时立即显示按钮 */
    .image-viewer.active:hover .close-btn,
    .image-viewer.active:hover .nav-btn,
    .image-viewer.active:hover .image-viewer-actions {
        opacity: 1;
        transition: opacity 0.2s ease;
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