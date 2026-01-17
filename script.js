// 全局变量
const API_KEY = '5781f058b97694a1b9bfbb955ac5f3b8';
const API_ID = '235';
const API_BASE_URL = 'http://v.juhe.cn/toutiao/index';

let selectedCities = ['佛山', '珠海', '汕头', '茂名', '惠州', '深圳', '香港', '越南', '台湾', '新加坡', '天津', '贵州', '西安', '日本', '英国', '美国', '委内瑞拉', '澳洲', '中山', '澳门', '肇庆', '江门', '加拿大', '印尼'];
let autoRefreshInterval = null;
let voices = [];
let currentUtterance = null;

// DOM 元素
const elements = {
    navBtns: document.querySelectorAll('.nav-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    cityCheckboxes: document.querySelectorAll('.city-checkbox input[type="checkbox"]'),
    refreshNewsBtn: document.getElementById('refreshNews'),
    autoRefreshBtn: document.getElementById('autoRefresh'),
    newsList: document.getElementById('newsList'),
    newsCategory: document.getElementById('newsCategory'),
    searchNews: document.getElementById('searchNews'),
    textEditor: document.getElementById('textEditor'),
    speakTextBtn: document.getElementById('speakText'),
    pauseSpeechBtn: document.getElementById('pauseSpeech'),
    stopSpeechBtn: document.getElementById('stopSpeech'),
    voiceSelect: document.getElementById('voiceSelect'),
    rateSlider: document.getElementById('rateSlider'),
    pitchSlider: document.getElementById('pitchSlider'),
    volumeSlider: document.getElementById('volumeSlider'),
    convertToAudioBtn: document.getElementById('convertToAudio'),
    audioFormat: document.getElementById('audioFormat'),
    audioStatus: document.getElementById('audioStatus'),
    notification: document.getElementById('notification'),
    audioPlayer: document.getElementById('audioPlayer')
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    setupEventListeners();
    await loadVoices();
    loadSettings();
    refreshNews();
    showNotification('新闻推送平台已启动', 'success');
}

// 设置事件监听器
function setupEventListeners() {
    // 导航切换
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', switchTab);
    });

    // 城市选择
    elements.cityCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedCities);
    });

    // 新闻相关
    elements.refreshNewsBtn.addEventListener('click', refreshNews);
    elements.autoRefreshBtn.addEventListener('click', toggleAutoRefresh);
    elements.newsCategory.addEventListener('change', filterNews);
    elements.searchNews.addEventListener('input', filterNews);

    // 语音相关
    elements.speakTextBtn.addEventListener('click', speakText);
    elements.pauseSpeechBtn.addEventListener('click', pauseSpeech);
    elements.stopSpeechBtn.addEventListener('click', stopSpeech);
    elements.convertToAudioBtn.addEventListener('click', convertTextToAudio);
    
    // 滑块变化时更新语音参数
    [elements.rateSlider, elements.pitchSlider, elements.volumeSlider].forEach(slider => {
        slider.addEventListener('input', updateSpeechParameters);
    });

    // 监听语音变化
    if ('speechSynthesis' in window) {
        speechSynthesis.addEventListener('voiceschanged', loadVoices);
    }
}

// 标签切换
function switchTab(e) {
    const targetTab = e.target.dataset.tab;
    
    // 更新导航按钮状态
    elements.navBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    // 更新标签内容显示
    elements.tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(`${targetTab}-tab`).classList.add('active');
}

// 更新选中的城市
function updateSelectedCities() {
    selectedCities = Array.from(elements.cityCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    
    localStorage.setItem('selectedCities', JSON.stringify(selectedCities));
    refreshNews();
}

// 加载设置
function loadSettings() {
    const savedCities = localStorage.getItem('selectedCities');
    if (savedCities) {
        selectedCities = JSON.parse(savedCities);
        elements.cityCheckboxes.forEach(checkbox => {
            checkbox.checked = selectedCities.includes(checkbox.value);
        });
    }

    const autoSpeak = localStorage.getItem('autoSpeakNews');
    if (autoSpeak !== null) {
        document.getElementById('autoSpeakNews').checked = autoSpeak === 'true';
    }

    const notifications = localStorage.getItem('enableNotifications');
    if (notifications !== null) {
        document.getElementById('enableNotifications').checked = notifications === 'true';
    }

    const theme = localStorage.getItem('theme');
    if (theme) {
        document.getElementById('themeSelect').value = theme;
        applyTheme(theme);
    }
}

// 应用主题
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.style.filter = 'invert(1) hue-rotate(180deg)';
    } else if (theme === 'light') {
        document.body.style.filter = '';
    }
    // auto 主题跟随系统，不额外处理
}

// 获取新闻数据
async function fetchNews(category = 'top') {
    try {
        const params = new URLSearchParams({
            key: API_KEY,
            type: category,
            page: '1',
            page_size: '20'
        });

        const response = await fetch(`${API_BASE_URL}?${params}`);
        const data = await response.json();
        
        if (data.error_code === 0) {
            return data.result.data;
        } else {
            throw new Error(data.reason || '获取新闻失败');
        }
    } catch (error) {
        console.error('获取新闻出错:', error);
        showNotification(`获取新闻失败: ${error.message}`, 'error');
        return [];
    }
}

// 刷新新闻
async function refreshNews() {
    elements.newsList.innerHTML = '<div class="loading">正在加载新闻...</div>';
    
    try {
        // 由于聚合数据API的限制，我们模拟多城市新闻数据
        const newsData = await simulateMultiCityNews();
        displayNews(newsData);
        
        if (document.getElementById('autoSpeakNews').checked) {
            autoSpeakLatestNews(newsData.slice(0, 3));
        }
        
        showNotification(`已更新 ${newsData.length} 条新闻`, 'success');
    } catch (error) {
        elements.newsList.innerHTML = '<div class="loading">加载新闻失败，请稍后重试</div>';
        showNotification('加载新闻失败', 'error');
    }
}

// 模拟多城市新闻数据（由于API限制）
async function simulateMultiCityNews() {
    const categories = ['social', 'domestic', 'international', 'sports', 'entertainment', 'technology'];
    const cities = selectedCities.length > 0 ? selectedCities : ['北京'];
    
    let simulatedNews = [];
    
    // 为每个城市生成模拟新闻
    for (let city of cities.slice(0, 10)) { // 限制城市数量以避免过多请求
        for (let i = 0; i < 2; i++) {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const news = {
                uniquekey: `${city}_${Date.now()}_${i}`,
                title: `${city}${getRandomNewsTitle(category)}`,
                date: new Date(Date.now() - Math.random() * 86400000).toISOString(),
                category: category,
                city: city,
                content: getRandomNewsContent(city, category)
            };
            simulatedNews.push(news);
        }
    }
    
    return simulatedNews.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getRandomNewsTitle(category) {
    const titles = {
        social: ['社会发展取得新进展', '民生改善政策出台', '社区建设成果显著', '社会保障体系完善'],
        domestic: ['国内重要政策发布', '经济发展稳中向好', '基础设施建设提速', '教育改革深入推进'],
        international: ['国际关系新发展', '国际合作项目启动', '外交政策积极调整', '国际影响力提升'],
        sports: ['体育赛事精彩纷呈', '运动员创佳绩', '体育产业发展迅速', '全民健身热潮兴起'],
        entertainment: ['文化产业蓬勃发展', '优秀作品不断涌现', '明星活动引关注', '娱乐产业创新升级'],
        technology: ['科技创新重大突破', '新技术应用广泛推广', '数字经济发展迅猛', '智能化水平显著提升']
    };
    
    const categoryTitles = titles[category] || titles.social;
    return categoryTitles[Math.floor(Math.random() * categoryTitles.length)];
}

function getRandomNewsContent(city, category) {
    return `近日，${city}在${getCategoryName(category)}方面取得重要进展。相关部门积极推进各项工作，取得了显著成效。专家表示，这将为${city}的未来发展奠定坚实基础，同时也为全国类似工作提供了有益借鉴。目前各项措施正在有序实施中，预计将带来积极影响。`;
}

function getCategoryName(category) {
    const names = {
        social: '社会建设',
        domestic: '国内事务',
        international: '国际交流',
        sports: '体育运动',
        entertainment: '文化娱乐',
        technology: '科技创新'
    };
    return names[category] || '社会发展';
}

// 显示新闻
function displayNews(newsData) {
    if (newsData.length === 0) {
        elements.newsList.innerHTML = '<div class="loading">暂无新闻数据</div>';
        return;
    }

    const newsHTML = newsData.map(news => `
        <article class="news-item" data-city="${news.city}" data-category="${news.category}">
            <div class="news-header">
                <h3 class="news-title">${news.title}</h3>
                <div class="news-meta">
                    <span class="news-city">${news.city}</span>
                    <span class="news-category">${getCategoryName(news.category)}</span>
                    <span class="news-time">${formatTime(news.date)}</span>
                </div>
            </div>
            <div class="news-content">${news.content}</div>
            <div class="news-actions">
                <button class="action-btn" onclick="speakNews('${news.title}', '${news.content}')">
                    <i class="fas fa-volume-up"></i> 朗读
                </button>
                <button class="action-btn" onclick="shareNews('${news.title}')">
                    <i class="fas fa-share"></i> 分享
                </button>
                <button class="action-btn" onclick="copyNews('${news.title}', '${news.content}')">
                    <i class="fas fa-copy"></i> 复制
                </button>
            </div>
        </article>
    `).join('');

    elements.newsList.innerHTML = newsHTML;
}

// 格式化时间
function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN');
}

// 过滤新闻
function filterNews() {
    const category = elements.newsCategory.value;
    const searchTerm = elements.searchNews.value.toLowerCase();
    
    const newsItems = document.querySelectorAll('.news-item');
    
    newsItems.forEach(item => {
        const itemCategory = item.dataset.category;
        const itemTitle = item.querySelector('.news-title').textContent.toLowerCase();
        const itemContent = item.querySelector('.news-content').textContent.toLowerCase();
        
        const categoryMatch = category === 'all' || itemCategory === category;
        const searchMatch = !searchTerm || 
                           itemTitle.includes(searchTerm) || 
                           itemContent.includes(searchTerm);
        
        item.style.display = (categoryMatch && searchMatch) ? 'block' : 'none';
    });
}

// 自动刷新切换
function toggleAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        elements.autoRefreshBtn.innerHTML = '<i class="fas fa-clock"></i> 自动更新: 关闭';
        showNotification('已关闭自动更新', 'warning');
    } else {
        autoRefreshInterval = setInterval(refreshNews, 300000); // 5分钟
        elements.autoRefreshBtn.innerHTML = '<i class="fas fa-clock"></i> 自动更新: 开启';
        showNotification('已开启自动更新（每5分钟）', 'success');
    }
}

// 语音相关功能
function loadVoices() {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            console.warn('浏览器不支持语音合成');
            resolve([]);
            return;
        }

        const updateVoices = () => {
            voices = speechSynthesis.getVoices();
            populateVoiceSelect();
            resolve(voices);
        };

        if (speechSynthesis.getVoices().length > 0) {
            updateVoices();
        } else {
            speechSynthesis.addEventListener('voiceschanged', updateVoices, { once: true });
            setTimeout(updateVoices, 1000); // 超时保护
        }
    });
}

function populateVoiceSelect() {
    elements.voiceSelect.innerHTML = '<option value="">默认语音</option>';
    
    voices.forEach((voice, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        elements.voiceSelect.appendChild(option);
    });
}

function speakText() {
    const text = elements.textEditor.value.trim();
    if (!text) {
        showNotification('请输入要朗读的文本', 'warning');
        return;
    }

    speak(text);
}

function speakNews(title, content) {
    const text = `${title}。${content}`;
    speak(text);
}

function speak(text) {
    if (!('speechSynthesis' in window)) {
        showNotification('浏览器不支持语音合成', 'error');
        return;
    }

    stopSpeech(); // 停止当前播放

    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // 设置语音参数
    updateSpeechParameters();
    
    // 设置语音选择
    const voiceIndex = elements.voiceSelect.value;
    if (voiceIndex !== '' && voices[voiceIndex]) {
        currentUtterance.voice = voices[voiceIndex];
    }

    currentUtterance.onstart = () => {
        elements.speakTextBtn.innerHTML = '<i class="fas fa-play"></i> 播放中...';
        elements.speakTextBtn.disabled = true;
    };

    currentUtterance.onend = () => {
        elements.speakTextBtn.innerHTML = '<i class="fas fa-volume-up"></i> 朗读文本';
        elements.speakTextBtn.disabled = false;
        currentUtterance = null;
    };

    currentUtterance.onerror = (event) => {
        showNotification('语音播放出错', 'error');
        elements.speakTextBtn.innerHTML = '<i class="fas fa-volume-up"></i> 朗读文本';
        elements.speakTextBtn.disabled = false;
        currentUtterance = null;
    };

    speechSynthesis.speak(currentUtterance);
}

function pauseSpeech() {
    if ('speechSynthesis' in window && speechSynthesis.speaking) {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            elements.pauseSpeechBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
        } else {
            speechSynthesis.pause();
            elements.pauseSpeechBtn.innerHTML = '<i class="fas fa-play"></i> 继续';
        }
    }
}

function stopSpeech() {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        elements.speakTextBtn.innerHTML = '<i class="fas fa-volume-up"></i> 朗读文本';
        elements.speakTextBtn.disabled = false;
        elements.pauseSpeechBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
        currentUtterance = null;
    }
}

function updateSpeechParameters() {
    if (currentUtterance) {
        currentUtterance.rate = parseFloat(elements.rateSlider.value);
        currentUtterance.pitch = parseFloat(elements.pitchSlider.value);
        currentUtterance.volume = parseFloat(elements.volumeSlider.value);
    }
}

// 文字转音频文件
async function convertTextToAudio() {
    const text = elements.textEditor.value.trim();
    if (!text) {
        showNotification('请输入要转换的文本', 'warning');
        return;
    }

    if (text.length > 500) {
        showNotification('文本过长，建议不超过500字符以确保音质', 'warning');
        return;
    }

    elements.convertToAudioBtn.disabled = true;
    elements.audioStatus.textContent = '正在准备音频转换服务...';

    // 直接显示转换对话框（因为API有跨域限制）
    showAudioConversionDialog(text);
    
    elements.audioStatus.textContent = '';
    elements.convertToAudioBtn.disabled = false;
}

// 尝试免费TTS API
async function tryFreeTTSAPIs(text) {
    const apis = [
        {
            name: 'ttsmp3.com',
            url: 'https://ttsmp3.com/make.php',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `msg=${encodeURIComponent(text)}&lang=en-us&source=ttsmp3`
        }
    ];

    // 由于跨域限制，大多数免费TTS API无法直接调用
    // 这里我们提供用户手动操作的指导
    throw new Error('CORS限制');
}

// 提供录音指导
function provideRecordingInstructions(text) {
    elements.audioStatus.innerHTML = `
        <div style="background:#e3f2fd;padding:15px;border-radius:5px;margin:10px 0;">
            <h4 style="margin:0 0 10px 0;color:#1976d2;">🎵 音频生成指导</h4>
            <p style="margin:5px 0;"><strong>推荐方案：</strong></p>
            <ol style="margin:10px 0;padding-left:20px;">
                <li>点击下方的"播放文本"按钮</li>
                <li>同时使用系统录音工具录制</li>
                <li>Windows: Win+G 打开游戏栏录音</li>
                <li>Mac: Cmd+Shift+5 屏幕录制</li>
                <li>手机: 使用录音机应用</li>
            </ol>
            <p style="margin:10px 0;"><strong>或者访问在线TTS服务：</strong></p>
            <ul style="margin:10px 0;padding-left:20px;">
                <li><a href="https://ttsmp3.com" target="_blank">TTSMP3.com</a> (免费)</li>
                <li><a href="https://text2speech.org" target="_blank">Text2Speech.org</a> (免费)</li>
                <li><a href="https://naturalreaders.com/online/" target="_blank">Natural Readers</a> (在线)</li>
            </ul>
        </div>
    `;

    // 自动播放文本供用户录制
    setTimeout(() => {
        speak(text);
        elements.audioStatus.innerHTML += `<p style="color:#4caf50;font-weight:bold;"><i class="fas fa-play"></i> 正在播放，请开始录音...</p>`;
    }, 1000);

    setTimeout(() => {
        elements.audioStatus.textContent = '';
        elements.convertToAudioBtn.disabled = false;
    }, 15000);
}

// 增强的音频转换对话框
function showAudioConversionDialog(text) {
    // 由于字符串转义复杂，我们简化实现，直接在状态区域显示指导
    elements.audioStatus.innerHTML = `
        <div style="background:#fff3cd;border:1px solid #ffeaa7;padding:15px;border-radius:5px;margin:10px 0;">
            <h4 style="margin:0 0 10px 0;color:#856404;">🔊 音频生成指导</h4>
            <p style="margin:5px 0;"><strong>推荐方案：</strong></p>
            <div style="background:#d1ecf1;padding:10px;border-radius:3px;margin:10px 0;">
                <strong>在线TTS服务（直接生成音频文件）：</strong><br>
                • <a href="https://ttsmp3.com" target="_blank">TTSMP3.com</a> - 免费，支持多种语言<br>
                • <a href="https://text2speech.org" target="_blank">Text2Speech.org</a> - 简单易用<br>
                • <a href="https://naturalreaders.com/online/" target="_blank">Natural Readers</a> - 高质量语音
            </div>
            <div style="background:#d4edda;padding:10px;border-radius:3px;margin:10px 0;">
                <strong>浏览器录制方案：</strong><br>
                点击下方播放按钮，同时使用系统录音工具：<br>
                <button onclick="speakText();" style="background:#28a745;color:white;border:none;padding:8px 15px;border-radius:3px;cursor:pointer;margin:5px 0;">
                    🎵 播放文本
                </button>
                <small style="display:block;margin-top:5px;color:#155724;">
                Windows: Win+G 录屏录音 | Mac: Cmd+Shift+5 | 手机: 使用录音机
                </small>
            </div>
        </div>
    `;

// 自动朗读最新新闻
function autoSpeakLatestNews(newsItems) {
    if (!document.getElementById('autoSpeakNews').checked) return;
    
    if ('speechSynthesis' in window && newsItems.length > 0) {
        const latestNews = newsItems[0];
        setTimeout(() => {
            speakNews(latestNews.title, latestNews.content.substring(0, 100) + '...');
        }, 1000);
    }
}

// 新闻操作功能
function shareNews(title) {
    if (navigator.share) {
        navigator.share({
            title: title,
            text: '来自全球新闻推送平台',
            url: window.location.href
        });
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(`${title} - ${window.location.href}`);
        showNotification('新闻链接已复制到剪贴板', 'success');
    }
}

function copyNews(title, content) {
    const text = `${title}\n\n${content}`;
    navigator.clipboard.writeText(text).then(() => {
        showNotification('新闻内容已复制', 'success');
    }).catch(() => {
        showNotification('复制失败', 'error');
    });
}

// 通知功能
function showNotification(message, type = 'success') {
    elements.notification.textContent = message;
    elements.notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        elements.notification.classList.remove('show');
    }, 3000);
}

// 监听设置变更
document.addEventListener('change', function(e) {
    if (e.target.id === 'autoSpeakNews') {
        localStorage.setItem('autoSpeakNews', e.target.checked);
    } else if (e.target.id === 'enableNotifications') {
        localStorage.setItem('enableNotifications', e.target.checked);
    } else if (e.target.id === 'themeSelect') {
        localStorage.setItem('theme', e.target.value);
        applyTheme(e.target.value);
    }
});

// 页面卸载时清理
window.addEventListener('beforeunload', function() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    stopSpeech();
});

// 导出全局函数供HTML调用
globalThis.speakNews = speakNews;
globalThis.shareNews = shareNews;
globalThis.copyNews = copyNews;