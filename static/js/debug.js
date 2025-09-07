// 调试脚本，用于检查分类页面交互问题
console.log('调试脚本已加载');

// 创建调试信息显示区域
function createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.position = 'fixed';
    panel.style.top = '10px';
    panel.style.right = '10px';
    panel.style.width = '300px';
    panel.style.maxHeight = '400px';
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    panel.style.color = 'white';
    panel.style.padding = '10px';
    panel.style.borderRadius = '5px';
    panel.style.overflowY = 'auto';
    panel.style.zIndex = '9999';
    panel.style.fontSize = '12px';
    panel.style.fontFamily = 'monospace';
    
    const title = document.createElement('div');
    title.textContent = '调试信息';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '5px';
    title.style.borderBottom = '1px solid #555';
    title.style.paddingBottom = '5px';
    panel.appendChild(title);
    
    const content = document.createElement('div');
    content.id = 'debug-content';
    panel.appendChild(content);
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清空';
    clearBtn.style.marginTop = '5px';
    clearBtn.style.padding = '2px 5px';
    clearBtn.style.fontSize = '10px';
    clearBtn.onclick = function() {
        document.getElementById('debug-content').innerHTML = '';
    };
    panel.appendChild(clearBtn);
    
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '隐藏';
    toggleBtn.style.marginTop = '5px';
    toggleBtn.style.marginLeft = '5px';
    toggleBtn.style.padding = '2px 5px';
    toggleBtn.style.fontSize = '10px';
    toggleBtn.onclick = function() {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        toggleBtn.textContent = panel.style.display === 'none' ? '显示' : '隐藏';
    };
    panel.appendChild(toggleBtn);
    
    document.body.appendChild(panel);
    
    return panel;
}

// 添加调试信息
function addDebugInfo(message) {
    const content = document.getElementById('debug-content');
    const log = document.createElement('div');
    log.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
    log.style.marginBottom = '2px';
    content.appendChild(log);
    content.scrollTop = content.scrollHeight;
    console.log(message);
}

// 尝试修复图片点击事件
function fixImageClickEvents() {
    const images = document.querySelectorAll('.image-thumbnail');
    addDebugInfo('找到图片数量: ' + images.length);
    
    images.forEach(img => {
        // 移除所有现有的点击事件监听器（通过克隆元素）
        const newImg = img.cloneNode(true);
        img.parentNode.replaceChild(newImg, img);
        
        // 添加新的点击事件处理
        newImg.addEventListener('click', function(e) {
            addDebugInfo('图片点击事件被触发: ' + this.src);
            
            // 尝试直接调用Vue的viewImage方法
            if (window.app && window.app.viewImage) {
                const imageId = this.alt.match(/\d+/)?.[0];
                if (imageId && window.app.images) {
                    const image = window.app.images.find(img => img.id == imageId);
                    if (image) {
                        addDebugInfo('调用Vue的viewImage方法: ' + image.id);
                        window.app.viewImage(image);
                    } else {
                        addDebugInfo('未找到对应的图片数据');
                        // 直接在新标签页打开图片
                        window.open(this.src, '_blank');
                    }
                } else {
                    addDebugInfo('Vue实例未正确初始化');
                    // 直接在新标签页打开图片
                    window.open(this.src, '_blank');
                }
            } else {
                addDebugInfo('Vue实例或viewImage方法不存在');
                // 直接在新标签页打开图片
                window.open(this.src, '_blank');
            }
        });
        
        // 添加悬停效果
        newImg.addEventListener('mouseenter', function() {
            this.style.cursor = 'pointer';
            this.style.transform = 'scale(1.02)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        newImg.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// 检查DOMContentLoaded事件
document.addEventListener('DOMContentLoaded', function() {
    // 创建调试面板
    createDebugPanel();
    addDebugInfo('调试脚本已加载');
    addDebugInfo('DOM已完全加载');
    
    // 检查Vue实例是否存在
    if (window.app) {
        addDebugInfo('Vue实例已初始化');
        addDebugInfo('图片数量: ' + (window.app.images ? window.app.images.length : '0'));
        addDebugInfo('当前页面: ' + window.app.currentPage);
        addDebugInfo('总页数: ' + window.app.totalPages);
    } else {
        addDebugInfo('Vue实例未初始化');
    }
    
    // 添加全局点击事件监听，检查是否有点击被阻止
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('image-thumbnail')) {
            addDebugInfo('全局捕获到图片点击: ' + e.target.alt);
        }
    }, true); // 使用捕获阶段
    
    // 等待图片加载完成后修复点击事件
    setTimeout(fixImageClickEvents, 1000);
    
    // 每隔2秒检查并修复点击事件
    setInterval(fixImageClickEvents, 2000);
});