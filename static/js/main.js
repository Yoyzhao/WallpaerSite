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
    // 图片查看器逻辑 - 已取消缩放功能
    const imageViewer = document.getElementById('image-viewer');
    if (imageViewer) {
        const viewerImage = document.getElementById('viewer-image');
        
        // 重置图片状态
        function resetImageState() {
            if (viewerImage) {
                viewerImage.style.transform = 'translate(0, 0) scale(1)';
                viewerImage.style.cursor = 'default';
            }
        }
        
        // 应用图片变换 - 始终保持原始大小
        function applyImageTransform() {
            if (viewerImage) {
                viewerImage.style.transform = 'translate(0, 0) scale(1)';
                viewerImage.style.cursor = 'default';
            }
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
        
        // 检测设备类型
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        
        // 如果是移动设备，使用触摸交互逻辑
        if (isMobile && viewerImage) {
            // 获取所有需要控制显示/隐藏的按钮元素
            const actionsContainer = document.querySelector('.image-viewer-actions');
            const closeBtn = document.querySelector('.close-btn');
            const prevBtn = document.getElementById('prev-image');
            const nextBtn = document.getElementById('next-image');
            
            let lastTapTime = 0;
            let isControlsVisible = false;
            
            // 同时控制所有控制按钮的显示/隐藏
            function toggleControlsVisibility(show) {
                // 操作按钮容器
                if (actionsContainer) {
                    actionsContainer.style.opacity = show ? '1' : '0';
                    actionsContainer.style.visibility = show ? 'visible' : 'hidden';
                    actionsContainer.style.pointerEvents = show ? 'auto' : 'none';
                }
                // 关闭按钮
                if (closeBtn) {
                    closeBtn.style.opacity = show ? '1' : '0';
                    closeBtn.style.visibility = show ? 'visible' : 'hidden';
                    closeBtn.style.pointerEvents = show ? 'auto' : 'none';
                }
                // 上一页按钮
                if (prevBtn) {
                    prevBtn.style.opacity = show ? '1' : '0';
                    prevBtn.style.visibility = show ? 'visible' : 'hidden';
                    prevBtn.style.pointerEvents = show ? 'auto' : 'none';
                }
                // 下一页按钮
                if (nextBtn) {
                    nextBtn.style.opacity = show ? '1' : '0';
                    nextBtn.style.visibility = show ? 'visible' : 'hidden';
                    nextBtn.style.pointerEvents = show ? 'auto' : 'none';
                }
                
                isControlsVisible = show;
            }
            
            // 轻触（单击）显示/隐藏所有控制按钮
            viewerImage.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // 获取当前时间戳
                const currentTime = Date.now();
                
                // 判断是否是双击操作（两次点击间隔小于300毫秒）
                if (currentTime - lastTapTime < 300) {
                    // 双击操作：在新标签页打开图片
                    window.open(viewerImage.src, '_blank');
                    lastTapTime = 0; // 重置双击检测
                } else {
                    // 单击操作：切换所有控制按钮的显示状态
                    toggleControlsVisibility(!isControlsVisible);
                    lastTapTime = currentTime;
                }
            });
            
            // 为所有控制元素添加过渡效果和初始状态
            const allControls = [actionsContainer, closeBtn, prevBtn, nextBtn];
            allControls.forEach(control => {
                if (control) {
                    // 确保元素默认隐藏
                    control.style.opacity = '0';
                    control.style.visibility = 'hidden';
                    control.style.pointerEvents = 'none';
                    
                    // 添加平滑过渡动画 - 只对opacity进行过渡，visibility立即变化
                    control.style.transition = 'opacity 0.3s ease';
                }
            });
            
            // 当查看器状态变化时重置图片状态
            const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.attributeName === 'class') {
                        if (imageViewer.classList.contains('active')) {
                            // 查看器激活时的操作
                            resetImageState();
                            initViewerButtons();
                            
                            if (isMobile) {
                                // 移动端默认隐藏控制按钮
                                setTimeout(() => toggleControlsVisibility(false), 1000);
                            } else {
                                // PC端不需要隐藏控制按钮，让CSS的hover效果正常工作
                                toggleControlsVisibility(true);
                            }
                        } else {
                            // 查看器关闭时的操作
                            if (isMobile) {
                                toggleControlsVisibility(false);
                                lastTapTime = 0;
                            }
                        }
                    }
                });
            });
            
            observer.observe(imageViewer, { attributes: true });
        }
        
        // 如果是PC端，添加鼠标悬停显示操作按钮的逻辑
        if (!isMobile && viewerImage) {
            // 获取所有按钮元素
            const actionsContainer = document.querySelector('.image-viewer-actions');
            const closeBtn = document.querySelector('.close-btn');
            const prevBtn = document.getElementById('prev-image');
            const nextBtn = document.getElementById('next-image');
            
            // PC端默认显示所有控制按钮，让CSS的hover效果正常工作
            const allControls = [actionsContainer, closeBtn, prevBtn, nextBtn];
            allControls.forEach(control => {
                if (control) {
                    control.style.opacity = '1';
                    control.style.visibility = 'visible';
                    control.style.pointerEvents = 'auto';
                    control.style.transition = 'opacity 0.3s ease';
                }
            });
            
            // 恢复图片点击在新标签页打开的功能
            viewerImage.addEventListener('click', function(e) {
                e.stopPropagation();
                window.open(viewerImage.src, '_blank');
            });
        }
        
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
            
            // 删除按钮事件已在HTML中通过onclick属性直接设置，这里不再重复绑定
            // 防止重复触发confirm对话框
            if (deleteBtn) {
                // 这里仅保留一个空的条件判断，避免代码错误
            }
        }
        
        // 添加滑动切换图片功能 - 优化版（缩短黑屏时间）
        if (viewerImage && isMobile) {  // 只在移动端应用推拉式动画
            let touchStartX = 0;
            let touchStartY = 0;
            let currentX = 0;
            let isDragging = false;
            let startTime = 0;
            const container = viewerImage.parentElement; // 获取图片容器
            
            // 触摸开始事件
            viewerImage.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    currentX = 0;
                    isDragging = true;
                    startTime = Date.now();
                    
                    // 为图片添加过渡效果，使滑动更流畅
                    viewerImage.style.transition = 'transform 0.1s ease-out';
                    // 确保容器可以正确处理多个图片
                    if (container) {
                        container.style.overflow = 'hidden';
                        container.style.position = 'relative';
                    }
                }
            });
            
            // 触摸移动事件 - 添加实时视觉反馈
            viewerImage.addEventListener('touchmove', function(e) {
                if (e.touches.length === 1 && isDragging) {
                    const currentTouchX = e.touches[0].clientX;
                    currentX = currentTouchX - touchStartX;
                    
                    // 仅在水平滑动超过垂直滑动时才移动图片（防止误触）
                    const touchY = e.touches[0].clientY;
                    const verticalDelta = Math.abs(touchY - touchStartY);
                    
                    if (Math.abs(currentX) > verticalDelta * 2) {
                        e.preventDefault(); // 阻止页面滚动
                        viewerImage.style.transform = `translateX(${currentX}px)`;
                    } else {
                        isDragging = false;
                        viewerImage.style.transform = 'translateX(0)';
                    }
                }
            });
            
            // 触摸结束事件 - 实现推拉式动画（优化黑屏时间）
            viewerImage.addEventListener('touchend', function(e) {
                if (e.changedTouches.length === 1 && isDragging) {
                    const touchEndX = e.changedTouches[0].clientX;
                    const swipeDistance = touchEndX - touchStartX;
                    const swipeTime = Date.now() - startTime;
                    
                    // 缩短动画时间
                    viewerImage.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    
                    // 计算滑动速度（像素/毫秒）
                    const swipeVelocity = Math.abs(swipeDistance) / swipeTime;
                    
                    // 动态阈值判断：距离阈值或速度阈值，满足任一即可触发
                    const distanceThreshold = 80; // 基础距离阈值
                    const velocityThreshold = 0.5; // 速度阈值（像素/毫秒）
                    
                    // 向左滑动（下一张）- 优化版推拉式动画
                    if (swipeDistance < -distanceThreshold || (swipeDistance < 0 && swipeVelocity > velocityThreshold)) {
                        if (window.app && window.app.viewNextImage) {
                            // 执行动画效果：当前图片向左滑出屏幕
                            viewerImage.style.transform = `translateX(-100%)`;
                            
                            // 提前加载下一张图片，不等待动画完成，显著减少黑屏时间
                            const nextImagePromise = new Promise(resolve => {
                                window.app.viewNextImage();
                                // 小延迟确保图片加载和DOM更新
                                setTimeout(resolve, 50);
                            });
                            
                            // 图片加载后立即执行进入动画
                            nextImagePromise.then(() => {
                                // 新图片从右侧进入
                                viewerImage.style.transform = `translateX(100%)`;
                                // 强制重排以确保动画生效
                                void viewerImage.offsetWidth;
                                // 平滑地将图片移动到中心位置
                                viewerImage.style.transform = 'translateX(0)';
                            });
                        }
                    }
                    // 向右滑动（上一张）- 优化版推拉式动画
                    else if (swipeDistance > distanceThreshold || (swipeDistance > 0 && swipeVelocity > velocityThreshold)) {
                        if (window.app && window.app.viewPrevImage) {
                            // 执行动画效果：当前图片向右滑出屏幕
                            viewerImage.style.transform = `translateX(100%)`;
                            
                            // 提前加载上一张图片，不等待动画完成，显著减少黑屏时间
                            const prevImagePromise = new Promise(resolve => {
                                window.app.viewPrevImage();
                                // 小延迟确保图片加载和DOM更新
                                setTimeout(resolve, 50);
                            });
                            
                            // 图片加载后立即执行进入动画
                            prevImagePromise.then(() => {
                                // 新图片从左侧进入
                                viewerImage.style.transform = `translateX(-100%)`;
                                // 强制重排以确保动画生效
                                void viewerImage.offsetWidth;
                                // 平滑地将图片移动到中心位置
                                viewerImage.style.transform = 'translateX(0)';
                            });
                        }
                    }
                    // 如果滑动距离不够，弹回原位
                    else {
                        viewerImage.style.transform = 'translateX(0)';
                    }
                    
                    // 重置拖动状态
                    isDragging = false;
                }
            });
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
    
    // 排序功能逻辑（现在排序在后端完成，保留UI按钮）
    const sortButtons = document.querySelectorAll('.sort-btn');
    
    // 确保只在DOM元素加载完成后添加事件监听器
    if (sortButtons.length > 0) {
        sortButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 更新按钮状态
                sortButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // 添加点击动画
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);
            });
        });
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