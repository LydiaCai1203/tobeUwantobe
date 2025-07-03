// 旅行页面应用
class TripApp {
    constructor() {
        this.currentTrip = null;
        this.currentLocation = null;
        this.currentPlanIndex = 0;
        this.currentActionPlanIndex = undefined;
        this.locationPermission = false;
        this.watchId = null;
        this.reminderTimeouts = [];
        this.completedPlans = new Set();
        this.comments = {};
        this.currentRating = 0;
        this.selectedImages = [];
        
        this.init();
    }

    init() {
        this.getTripFromURL();
        this.bindEvents();
        this.updateCurrentTime();
        this.checkLocationPermission();
        this.initSharedComments();
        this.createPlanActions();
        this.generateTimeline();
        this.startMockLocationMonitoring();
        this.startPlanReminders();
        this.updateProgressDisplay();
        
        setInterval(() => this.updateCurrentTime(), 1000);
    }

    // 从URL获取行程信息
    getTripFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentTrip = urlParams.get('trip');
        
        if (!this.currentTrip) {
            this.showModal('错误', '未找到行程信息', () => {
                window.location.href = 'index.html';
            });
        }
    }

    bindEvents() {
        // 返回首页按钮
        document.getElementById('backToHomeBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // 刷新位置按钮
        document.getElementById('refreshLocationBtn').addEventListener('click', () => {
            this.refreshMockLocation();
        });

        // 权限请求按钮
        document.getElementById('grantPermissionBtn').addEventListener('click', () => {
            this.requestLocationPermission();
        });

        document.getElementById('denyPermissionBtn').addEventListener('click', () => {
            this.hidePermissionModal();
        });

        // 模态框事件
        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalConfirm').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalCancel').addEventListener('click', () => {
            this.hideModal();
        });

        // 地图模态框事件
        document.getElementById('mapModalClose').addEventListener('click', () => {
            this.hideMapModal();
        });

        document.getElementById('openAmapBtn').addEventListener('click', () => {
            this.openAmapNavigation();
        });

        // 评论区事件
        document.getElementById('commentModalClose').addEventListener('click', () => {
            this.hideCommentModal();
        });

        document.getElementById('submitCommentBtn').addEventListener('click', () => {
            this.submitComment();
        });

        // 评分星级事件
        document.querySelectorAll('#ratingStars i').forEach(star => {
            star.addEventListener('click', (e) => {
                this.setRating(parseInt(e.target.dataset.rating));
            });
        });

        // 图片上传事件
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files);
        });
    }

    // 初始化共享评论数据
    initSharedComments() {
        const sharedComments = {
            'shanghai-japan-3days': {
                0: [
                    {
                        author: '旅行达人小王',
                        content: '浦东机场出发很顺利，航班准时，服务很好！安检也很快速，整体体验很棒。',
                        rating: 5,
                        time: '2024-01-15 10:30',
                        images: ['https://picsum.photos/300/200?random=1']
                    }
                ],
                1: [
                    {
                        author: '日本通',
                        content: '成田机场入境很顺利，工作人员态度友好，指示牌清晰。',
                        rating: 5,
                        time: '2024-01-15 12:30',
                        images: ['https://picsum.photos/300/200?random=8']
                    }
                ]
            }
        };
        
        this.comments = sharedComments;
    }

    // 生成时间线
    generateTimeline() {
        const timeline = document.getElementById('timeline');
        const tripData = this.getTripData();
        
        timeline.innerHTML = '';
        
        // 按天数分组
        const groupedByDay = {};
        tripData.forEach((plan, index) => {
            const day = plan.day || 1;
            if (!groupedByDay[day]) {
                groupedByDay[day] = [];
            }
            groupedByDay[day].push({ ...plan, originalIndex: index });
        });
        
        // 按天数顺序生成时间线
        Object.keys(groupedByDay).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
            const dayPlans = groupedByDay[day];
            
            dayPlans.forEach((plan) => {
                const timelineItem = this.createTimelineItem(plan, plan.originalIndex);
                timeline.appendChild(timelineItem);
            });
        });
        
        this.updateProgressDisplay();
    }

    // 更新进度显示
    updateProgressDisplay() {
        const tripData = this.getTripData();
        const totalCount = tripData.length;
        const completedCount = this.completedPlans.size;
        
        document.getElementById('totalCount').textContent = totalCount;
        document.getElementById('completedCount').textContent = completedCount;
        
        // 更新进度条
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
            progressFill.style.width = `${progressPercentage}%`;
        }
    }

    // 创建时间线项目
    createTimelineItem(plan, index) {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.dataset.index = index;
        
        // 检查计划完成状态
        const isCompleted = this.completedPlans.has(index);
        const isCurrent = index === this.currentPlanIndex;
        
        // 设置CSS类
        if (isCompleted) {
            item.classList.add('completed');
        } else if (isCurrent) {
            item.classList.add('current');
        }

        // 添加天数标识
        const dayBadge = plan.day ? `<div class="day-badge">第${plan.day}天</div>` : '';
        
        // 添加状态标记
        let statusMark = '';
        if (isCompleted) {
            statusMark = '<div class="plan-status completed"></div>';
        } else if (isCurrent) {
            statusMark = '<div class="plan-status next"></div>';
        }

        item.innerHTML = `
            ${dayBadge}
            ${statusMark}
            <div class="timeline-header-item">
                <span class="timeline-time">${plan.time}</span>
                <span class="timeline-type ${plan.type}">${this.getTypeText(plan.type)}</span>
            </div>
            <div class="timeline-title">${plan.title}</div>
            <div class="timeline-description">${plan.description}</div>
            <div class="timeline-location">
                <i class="fas fa-map-marker-alt"></i>
                <span>${plan.location}</span>
            </div>
        `;

        // 添加点击事件
        item.addEventListener('click', (e) => {
            this.togglePlanActions(index);
        });

        return item;
    }

    // 获取类型文本
    getTypeText(type) {
        const typeMap = {
            'transport': '交通',
            'activity': '游玩',
            'food': '餐食',
            'accommodation': '住宿'
        };
        return typeMap[type] || type;
    }

    // 获取行程数据
    getTripData() {
        const tripData = {
            'shanghai-japan-3days': [
                {
                    time: '08:00',
                    type: 'transport',
                    title: '上海浦东机场出发',
                    description: '乘坐国际航班前往日本东京成田机场',
                    location: '上海浦东国际机场',
                    coordinates: { lat: 31.1443, lng: 121.8083 },
                    day: 1
                },
                {
                    time: '12:00',
                    type: 'transport',
                    title: '抵达东京成田机场',
                    description: '办理入境手续，提取行李',
                    location: '东京成田国际机场',
                    coordinates: { lat: 35.7720, lng: 140.3928 },
                    day: 1
                },
                {
                    time: '14:00',
                    type: 'transport',
                    title: '前往酒店',
                    description: '乘坐机场快线前往市区酒店',
                    location: '东京市区',
                    coordinates: { lat: 35.6762, lng: 139.6503 },
                    day: 1
                },
                {
                    time: '15:30',
                    type: 'accommodation',
                    title: '酒店入住',
                    description: '办理入住手续，放置行李',
                    location: '东京希尔顿酒店',
                    coordinates: { lat: 35.6586, lng: 139.7454 },
                    day: 1
                },
                {
                    time: '17:00',
                    type: 'activity',
                    title: '浅草寺游览',
                    description: '参观东京最古老的寺庙，体验传统文化',
                    location: '浅草寺',
                    coordinates: { lat: 35.7148, lng: 139.7967 },
                    day: 1
                },
                {
                    time: '19:00',
                    type: 'food',
                    title: '晚餐 - 寿司料理',
                    description: '品尝正宗日本寿司',
                    location: '银座寿司店',
                    coordinates: { lat: 35.6719, lng: 139.7639 },
                    day: 1
                }
            ],
            'beijing-korea-2days': [
                {
                    time: '09:00',
                    type: 'transport',
                    title: '北京首都机场出发',
                    description: '乘坐国际航班前往韩国首尔仁川机场',
                    location: '北京首都国际机场',
                    coordinates: { lat: 40.0799, lng: 116.6031 },
                    day: 1
                },
                {
                    time: '12:30',
                    type: 'transport',
                    title: '抵达首尔仁川机场',
                    description: '办理入境手续，提取行李',
                    location: '首尔仁川国际机场',
                    coordinates: { lat: 37.4602, lng: 126.4407 },
                    day: 1
                },
                {
                    time: '14:00',
                    type: 'accommodation',
                    title: '酒店入住',
                    description: '办理入住手续，放置行李',
                    location: '首尔明洞酒店',
                    coordinates: { lat: 37.5665, lng: 126.9780 },
                    day: 1
                },
                {
                    time: '15:30',
                    type: 'activity',
                    title: '明洞购物',
                    description: '在明洞商业区购物，体验韩国时尚',
                    location: '明洞商业区',
                    coordinates: { lat: 37.5636, lng: 126.9834 },
                    day: 1
                },
                {
                    time: '18:00',
                    type: 'food',
                    title: '晚餐 - 韩式烤肉',
                    description: '品尝正宗韩式烤肉',
                    location: '明洞烤肉店',
                    coordinates: { lat: 37.5636, lng: 126.9834 },
                    day: 1
                }
            ]
        };
        
        return tripData[this.currentTrip] || [];
    }

    // 更新当前时间
    updateCurrentTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('currentTime').textContent = timeString;
    }

    // 检查位置权限
    checkLocationPermission() {
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then(result => {
                this.locationPermission = result.state === 'granted';
                if (result.state === 'denied') {
                    this.showPermissionModal();
                }
            });
        }
    }

    // 请求位置权限
    requestLocationPermission() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.locationPermission = true;
                this.hidePermissionModal();
                this.getCurrentLocation();
            },
            (error) => {
                console.error('位置权限被拒绝:', error);
                this.locationPermission = false;
                this.hidePermissionModal();
            }
        );
    }

    // 获取当前位置
    getCurrentLocation() {
        if (!this.locationPermission) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                this.updateLocationDisplay();
            },
            (error) => {
                console.error('获取位置失败:', error);
                // 使用模拟位置
                this.refreshMockLocation();
            }
        );
    }

    // 更新位置显示
    updateLocationDisplay() {
        if (this.currentLocation) {
            document.getElementById('locationCoordinates').textContent = 
                `坐标: ${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}`;
            this.reverseGeocode();
        }
    }

    // 反向地理编码
    reverseGeocode() {
        // 模拟反向地理编码
        const mockAddresses = [
            '上海市浦东新区浦东国际机场',
            '东京都成田市成田国际机场',
            '东京都新宿区新宿王子大酒店',
            '东京都台东区浅草寺',
            '东京都中央区银座',
            '北京市朝阳区首都国际机场',
            '首尔特别市仁川国际机场',
            '首尔特别市中区明洞'
        ];
        
        const randomAddress = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
        document.getElementById('locationAddress').textContent = randomAddress;
        document.getElementById('currentLocation').textContent = randomAddress;
    }

    // 刷新模拟位置
    refreshMockLocation() {
        // 模拟位置数据
        const mockLocations = [
            { lat: 31.1443, lng: 121.8083 }, // 上海浦东机场
            { lat: 35.7720, lng: 140.3928 }, // 东京成田机场
            { lat: 35.6586, lng: 139.7454 }, // 东京希尔顿酒店
            { lat: 35.7148, lng: 139.7967 }, // 浅草寺
            { lat: 35.6719, lng: 139.7639 }, // 银座
            { lat: 40.0799, lng: 116.6031 }, // 北京首都机场
            { lat: 37.4602, lng: 126.4407 }, // 首尔仁川机场
            { lat: 37.5665, lng: 126.9780 }  // 首尔明洞
        ];
        
        this.currentLocation = mockLocations[Math.floor(Math.random() * mockLocations.length)];
        this.updateLocationDisplay();
    }

    // 开始模拟位置监控
    startMockLocationMonitoring() {
        // 每30秒更新一次位置
        setInterval(() => {
            this.refreshMockLocation();
            this.checkLocationProximity();
        }, 30000);
    }

    // 检查位置接近度
    checkLocationProximity() {
        const tripData = this.getTripData();
        const currentPlan = tripData[this.currentPlanIndex];
        
        if (!currentPlan || !currentPlan.coordinates || !this.currentLocation) {
            return;
        }

        const distance = this.calculateDistance(
            this.currentLocation.lat,
            this.currentLocation.lng,
            currentPlan.coordinates.lat,
            currentPlan.coordinates.lng
        );

        // 如果距离小于500米，认为已到达目的地
        if (distance < 0.5) {
            this.arriveAtDestination();
        }
    }

    // 计算距离
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 地球半径（公里）
        const dLat = this.deg2rad(lat2 - lat1);
        const dLng = this.deg2rad(lng2 - lng1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // 到达目的地
    arriveAtDestination() {
        const tripData = this.getTripData();
        const currentPlan = tripData[this.currentPlanIndex];
        
        if (currentPlan) {
            this.showModal(
                '到达目的地',
                `您已到达 ${currentPlan.location}\n${currentPlan.title}`,
                () => {
                    this.markPlanCompleted();
                }
            );
        }
    }

    // 标记计划完成
    markPlanCompleted() {
        this.completedPlans.add(this.currentPlanIndex);
        this.updateProgressDisplay();
        
        const tripData = this.getTripData();
        const completedPlan = tripData[this.currentPlanIndex];
        
        if (completedPlan) {
            this.showCompletionAnimation(completedPlan.title);
            this.startNextPlan();
        }
    }

    // 开始下一个计划
    startNextPlan() {
        const tripData = this.getTripData();
        this.currentPlanIndex++;
        
        if (this.currentPlanIndex < tripData.length) {
            const nextPlan = tripData[this.currentPlanIndex];
            this.showModal(
                '下一个计划',
                `即将开始：${nextPlan.title}\n时间：${nextPlan.time}\n地点：${nextPlan.location}`,
                () => {
                    this.generateTimeline();
                }
            );
        } else {
            this.showModal(
                '旅行完成',
                '恭喜您完成了所有计划！\n祝您旅途愉快！',
                () => {
                    window.location.href = 'index.html';
                }
            );
        }
    }

    // 显示完成动画
    showCompletionAnimation(planTitle) {
        const animation = document.createElement('div');
        animation.className = 'completion-animation';
        animation.innerHTML = `
            <div class="completion-content">
                <div class="completion-icon">🎉</div>
                <div class="completion-text">计划完成！</div>
                <div class="completion-plan">${planTitle}</div>
            </div>
        `;
        
        document.body.appendChild(animation);
        
        setTimeout(() => {
            document.body.removeChild(animation);
        }, 3000);
    }

    // 创建计划操作按钮
    createPlanActions() {
        const overlay = document.querySelector('.plan-actions-overlay');
        overlay.innerHTML = `
            <div class="plan-actions">
                <button class="plan-action-btn navigation" title="导航">
                    <i class="fas fa-route"></i>
                </button>
                <button class="plan-action-btn taxi" title="打车">
                    <i class="fas fa-taxi"></i>
                </button>
                <button class="plan-action-btn complete" title="标记完成">
                    <i class="fas fa-check"></i>
                </button>
                <button class="plan-action-btn comment" title="评论">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        `;

        // 绑定事件
        overlay.querySelector('.navigation').addEventListener('click', () => {
            this.showNavigation();
        });

        overlay.querySelector('.taxi').addEventListener('click', () => {
            this.openTaxi();
        });

        overlay.querySelector('.complete').addEventListener('click', () => {
            this.markPlanCompleted();
        });

        overlay.querySelector('.comment').addEventListener('click', () => {
            this.showComments();
        });
    }

    // 显示计划操作
    showPlanActions(index) {
        this.currentActionPlanIndex = index;
        const overlay = document.querySelector('.plan-actions-overlay');
        overlay.classList.add('show');
    }

    // 隐藏所有计划操作
    hideAllPlanActions() {
        const overlay = document.querySelector('.plan-actions-overlay');
        overlay.classList.remove('show');
        this.currentActionPlanIndex = undefined;
    }

    // 切换计划操作
    togglePlanActions(index) {
        if (this.currentActionPlanIndex === index) {
            this.hideAllPlanActions();
        } else {
            this.hideAllPlanActions();
            this.showPlanActions(index);
        }
    }

    // 显示导航
    showNavigation() {
        const tripData = this.getTripData();
        const currentPlan = tripData[this.currentActionPlanIndex || this.currentPlanIndex];
        
        if (!currentPlan) {
            this.showModal('提示', '没有当前计划');
            return;
        }

        document.getElementById('routeOrigin').textContent = '当前位置';
        document.getElementById('routeDestination').textContent = currentPlan.location;
        document.getElementById('mapModalTitle').textContent = `导航到 ${currentPlan.location}`;
        
        this.showMapModal();
        this.hideAllPlanActions();
    }

    // 打开打车
    openTaxi() {
        const tripData = this.getTripData();
        const currentPlan = tripData[this.currentActionPlanIndex || this.currentPlanIndex];
        
        if (!currentPlan) {
            this.showModal('提示', '没有当前计划');
            return;
        }

        this.showModal(
            '打车',
            `即将打开滴滴打车\n出发地：当前位置\n目的地：${currentPlan.location}\n请手动输入具体地址`,
            () => {
                // 这里应该打开滴滴打车应用或网页
                alert('模拟打开滴滴打车应用');
            }
        );
        this.hideAllPlanActions();
    }

    // 显示评论
    showComments() {
        const tripData = this.getTripData();
        const currentPlan = tripData[this.currentActionPlanIndex || this.currentPlanIndex];
        
        if (!currentPlan) {
            this.showModal('提示', '没有当前计划');
            return;
        }

        document.getElementById('commentPlanInfo').innerHTML = `
            <h4>${currentPlan.title}</h4>
            <p>${currentPlan.description}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${currentPlan.location}</p>
        `;

        this.loadComments(this.currentActionPlanIndex || this.currentPlanIndex);
        document.getElementById('commentModal').style.display = 'flex';
        this.hideAllPlanActions();
    }

    // 加载评论
    loadComments(index) {
        const planComments = this.comments[this.currentTrip]?.[index] || [];
        const commentsList = document.getElementById('commentsList');
        const commentsCount = document.getElementById('commentsCount');
        const averageRating = document.getElementById('averageRating');

        commentsCount.textContent = planComments.length;
        
        if (planComments.length > 0) {
            const totalRating = planComments.reduce((sum, comment) => sum + comment.rating, 0);
            const avgRating = (totalRating / planComments.length).toFixed(1);
            averageRating.textContent = avgRating;
        } else {
            averageRating.textContent = '0.0';
        }

        commentsList.innerHTML = '';

        if (planComments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">暂无评论，快来分享您的体验吧！</div>';
            return;
        }

        planComments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-item';
            commentElement.innerHTML = `
                <div class="comment-header">
                    <div class="comment-author">${comment.author}</div>
                    <div class="comment-time">${comment.time}</div>
                </div>
                <div class="comment-rating">
                    ${this.generateStars(comment.rating)}
                </div>
                <div class="comment-content">${comment.content}</div>
                ${comment.images.length > 0 ? `
                    <div class="comment-images">
                        ${comment.images.map(img => `
                            <div class="comment-image" onclick="tripApp.showImageModal('${img}')">
                                <img src="${img}" alt="评论图片">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
            commentsList.appendChild(commentElement);
        });
    }

    // 生成星级
    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star ${i <= rating ? 'filled' : ''}"></i>`;
        }
        return stars;
    }

    // 设置评分
    setRating(rating) {
        this.currentRating = rating;
        this.updateRatingDisplay();
    }

    // 更新评分显示
    updateRatingDisplay() {
        const stars = document.querySelectorAll('#ratingStars i');
        const ratingText = document.getElementById('ratingText');
        
        stars.forEach((star, index) => {
            if (index < this.currentRating) {
                star.className = 'fas fa-star';
            } else {
                star.className = 'far fa-star';
            }
        });

        const ratingTexts = ['点击星星评分', '很差', '一般', '还行', '不错', '很棒'];
        ratingText.textContent = ratingTexts[this.currentRating];
    }

    // 显示图片模态框
    showImageModal(imageSrc) {
        document.getElementById('imageModalImg').src = imageSrc;
        document.getElementById('imageModal').style.display = 'flex';
    }

    // 提交评论
    submitComment() {
        const content = document.getElementById('commentInput').value.trim();
        
        if (!content) {
            alert('请输入评论内容');
            return;
        }

        if (this.currentRating === 0) {
            alert('请选择评分');
            return;
        }

        const comment = {
            author: '小青蛙',
            content: content,
            rating: this.currentRating,
            time: new Date().toLocaleString('zh-CN'),
            images: this.selectedImages
        };

        const planIndex = this.currentActionPlanIndex || this.currentPlanIndex;
        
        if (!this.comments[this.currentTrip]) {
            this.comments[this.currentTrip] = {};
        }
        
        if (!this.comments[this.currentTrip][planIndex]) {
            this.comments[this.currentTrip][planIndex] = [];
        }
        
        this.comments[this.currentTrip][planIndex].push(comment);

        // 清空表单
        document.getElementById('commentInput').value = '';
        this.currentRating = 0;
        this.selectedImages = [];
        this.updateRatingDisplay();
        document.getElementById('imagePreview').innerHTML = '';

        // 重新加载评论
        this.loadComments(planIndex);
    }

    // 处理图片上传
    handleImageUpload(files) {
        this.selectedImages = [];
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';

        Array.from(files).forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.selectedImages.push(e.target.result);
                this.updateImagePreview();
            };
            reader.readAsDataURL(file);
        });
    }

    // 更新图片预览
    updateImagePreview() {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';

        this.selectedImages.forEach((imageSrc, index) => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'image-preview-item';
            imgContainer.innerHTML = `
                <img src="${imageSrc}" alt="预览图片">
                <button class="remove-image" onclick="tripApp.removeImage(${index})">&times;</button>
            `;
            preview.appendChild(imgContainer);
        });
    }

    // 移除图片
    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.updateImagePreview();
    }

    // 开始计划提醒
    startPlanReminders() {
        const tripData = this.getTripData();
        
        tripData.forEach((plan, index) => {
            const planTime = this.parseTime(plan.time);
            const now = new Date();
            const reminderTime = new Date();
            reminderTime.setHours(planTime.hours, planTime.minutes, 0, 0);
            
            // 如果时间还没到，设置提醒
            if (reminderTime > now) {
                const delay = reminderTime.getTime() - now.getTime();
                const timeoutId = setTimeout(() => {
                    this.showPlanReminder(plan, index);
                }, delay);
                this.reminderTimeouts.push(timeoutId);
            }
        });
    }

    // 解析时间
    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return { hours, minutes };
    }

    // 显示计划提醒
    showPlanReminder(plan, index) {
        this.showModal(
            '计划提醒',
            `时间到了！\n${plan.time} - ${plan.title}\n地点：${plan.location}\n描述：${plan.description}`,
            () => {
                this.currentPlanIndex = index;
                this.generateTimeline();
            }
        );
    }

    // 显示地图模态框
    showMapModal() {
        document.getElementById('mapModal').style.display = 'flex';
    }

    // 隐藏地图模态框
    hideMapModal() {
        document.getElementById('mapModal').style.display = 'none';
    }

    // 隐藏评论模态框
    hideCommentModal() {
        document.getElementById('commentModal').style.display = 'none';
    }

    // 打开高德地图导航
    openAmapNavigation() {
        const origin = this.currentLocation ? 
            `${this.currentLocation.lat},${this.currentLocation.lng}` : '';
        const destination = document.getElementById('routeDestination').textContent;
        
        const url = `https://uri.amap.com/navigation?from=${origin}&to=${destination}&mode=car&policy=1&src=mypage&coordinate=gaode&callnative=0`;
        
        window.open(url, '_blank');
        this.hideMapModal();
    }

    // 显示模态框
    showModal(title, message, onConfirm = null) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').textContent = message;
        document.getElementById('modal').style.display = 'flex';
        
        document.getElementById('modalConfirm').onclick = () => {
            if (onConfirm) {
                onConfirm();
            }
            this.hideModal();
        };
        
        document.getElementById('modalCancel').style.display = 'none';
    }

    // 隐藏模态框
    hideModal() {
        document.getElementById('modal').style.display = 'none';
    }

    // 显示权限请求模态框
    showPermissionModal() {
        document.getElementById('permissionModal').style.display = 'flex';
    }

    // 隐藏权限请求模态框
    hidePermissionModal() {
        document.getElementById('permissionModal').style.display = 'none';
    }

    // 清理资源
    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        this.reminderTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
    }
}

// 初始化旅行应用
let tripApp;
document.addEventListener('DOMContentLoaded', () => {
    tripApp = new TripApp();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (tripApp) {
        tripApp.destroy();
    }
}); 