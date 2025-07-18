// 全局函数
function scrollToTripSelector() {
    const tripSelector = document.getElementById('tripSelector');
    if (tripSelector) {
        tripSelector.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// 应用状态管理
class OwlApp {
    constructor() {
        this.currentTrip = null;
        this.currentLocation = null;
        this.currentPlanIndex = 0;
        this.currentActionPlanIndex = undefined;
        this.locationPermission = false;
        this.watchId = null;
        this.reminderTimeouts = [];
        this.completedPlans = new Set(); // 存储已完成的计划索引
        this.comments = {}; // 存储评论数据
        this.currentRating = 0; // 当前选择的评分
        this.selectedImages = []; // 当前选择的图片
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateCurrentTime();
        this.checkLocationPermission();
        this.initSharedComments();
        this.createPlanActions(); // 创建蒙版
        this.initAppData(); // 初始化应用数据
        setInterval(() => this.updateCurrentTime(), 1000);
        // 强制隐藏header发布按钮，防止初始闪现
        const postMomentBtnHeader = document.getElementById('postMomentBtnHeader');
        if (postMomentBtnHeader) postMomentBtnHeader.style.display = 'none';
        // 再同步一次页面状态
        this.switchPage('home');
    }

    // 初始化应用数据
    initAppData() {
        this.loadProfile();
        this.loadMoments();
        this.loadHotTrips();
        this.loadMyTrips();
    }

    bindEvents() {
        // 底部导航事件
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchPage(e.currentTarget.dataset.page);
            });
        });

        // 行程选择 - 使用事件委托，因为元素可能动态加载
        document.addEventListener('click', (e) => {
            if (e.target.closest('.trip-option')) {
                const tripOption = e.target.closest('.trip-option');
                this.selectTrip(tripOption.dataset.trip);
            }
        });

        // 开始行程按钮
        document.addEventListener('click', (e) => {
            if (e.target.id === 'startTripBtn') {
                this.startTrip();
            }
        });

        // 发布动态按钮（header右侧）
        const postMomentBtnHeader = document.getElementById('postMomentBtnHeader');
        if (postMomentBtnHeader) {
            postMomentBtnHeader.addEventListener('click', () => {
                this.showPostMomentModal();
            });
        }

        // 编辑资料按钮（显示弹窗）
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                document.getElementById('editProfileModal').style.display = 'flex';
                // 同步当前资料到弹窗
                document.getElementById('editNicknameDisplay').textContent = document.getElementById('profileName').textContent;
                document.getElementById('editNicknameInput').value = document.getElementById('profileName').textContent;
                document.getElementById('editBioDisplay').textContent = document.getElementById('profileBio').textContent;
                document.getElementById('editBioInput').value = document.getElementById('profileBio').textContent;
                document.getElementById('editAvatarImg').src = document.getElementById('avatarImg').src;
            });
        }

        // 行程标签切换
        const tabBtns = document.querySelectorAll('.tab-btn');
        if (tabBtns.length > 0) {
            tabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.switchTab(e.currentTarget.dataset.tab);
                });
            });
        }

        // 模态框事件
        const editProfileClose = document.getElementById('editProfileClose');
        if (editProfileClose) {
            editProfileClose.addEventListener('click', () => {
                this.hideEditProfileModal();
            });
        }

        // 保存编辑资料
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('profileName').textContent = document.getElementById('editNicknameDisplay').textContent;
                document.getElementById('profileBio').textContent = document.getElementById('editBioDisplay').textContent;
                document.getElementById('avatarImg').src = document.getElementById('editAvatarImg').src;
                document.getElementById('editProfileModal').style.display = 'none';
            });
        }

        // 取消编辑资料
        const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');
        if (cancelEditProfileBtn) {
            cancelEditProfileBtn.addEventListener('click', function() {
                document.getElementById('editProfileModal').style.display = 'none';
            });
        }

        const postMomentClose = document.getElementById('postMomentClose');
        if (postMomentClose) {
            postMomentClose.addEventListener('click', () => {
                this.hidePostMomentModal();
            });
        }

        const publishMomentBtn = document.getElementById('publishMomentBtn');
        if (publishMomentBtn) {
            publishMomentBtn.addEventListener('click', () => {
                this.publishMoment();
            });
        }

        const cancelPostBtn = document.getElementById('cancelPostBtn');
        if (cancelPostBtn) {
            cancelPostBtn.addEventListener('click', () => {
                this.hidePostMomentModal();
            });
        }

        // 头像上传
        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => {
                this.handleAvatarUpload(e.target.files);
            });
        }

        // 动态图片上传
        const momentImageUpload = document.getElementById('momentImageUpload');
        if (momentImageUpload) {
            momentImageUpload.addEventListener('change', (e) => {
                this.handleMomentImageUpload(e.target.files);
            });
        }

        // 刷新位置按钮
        const refreshLocationBtn = document.getElementById('refreshLocationBtn');
        if (refreshLocationBtn) {
            refreshLocationBtn.addEventListener('click', () => {
                this.refreshMockLocation();
            });
        }



        // 权限请求按钮
        const grantPermissionBtn = document.getElementById('grantPermissionBtn');
        if (grantPermissionBtn) {
            grantPermissionBtn.addEventListener('click', () => {
                this.requestLocationPermission();
            });
        }

        const denyPermissionBtn = document.getElementById('denyPermissionBtn');
        if (denyPermissionBtn) {
            denyPermissionBtn.addEventListener('click', () => {
                this.hidePermissionModal();
            });
        }

        // 模态框事件
        const modalClose = document.getElementById('modalClose');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.hideModal();
            });
        }

        const modalConfirm = document.getElementById('modalConfirm');
        if (modalConfirm) {
            modalConfirm.addEventListener('click', () => {
                this.hideModal();
            });
        }

        const modalCancel = document.getElementById('modalCancel');
        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                this.hideModal();
            });
        }

        // 地图模态框事件
        const mapModalClose = document.getElementById('mapModalClose');
        if (mapModalClose) {
            mapModalClose.addEventListener('click', () => {
                this.hideMapModal();
            });
        }

        const openAmapBtn = document.getElementById('openAmapBtn');
        if (openAmapBtn) {
            openAmapBtn.addEventListener('click', () => {
                this.openAmapNavigation();
            });
        }

        // 返回首页按钮
        const backToHomeBtn = document.getElementById('backToHomeBtn');
        if (backToHomeBtn) {
            backToHomeBtn.addEventListener('click', () => {
                this.backToHome();
            });
        }

        // 评论区事件
        const commentModalClose = document.getElementById('commentModalClose');
        if (commentModalClose) {
            commentModalClose.addEventListener('click', () => {
                this.hideCommentModal();
            });
        }

        const submitCommentBtn = document.getElementById('submitCommentBtn');
        if (submitCommentBtn) {
            submitCommentBtn.addEventListener('click', () => {
                this.submitComment();
            });
        }

        // 评分星级事件
        const ratingStars = document.querySelectorAll('#ratingStars i');
        if (ratingStars.length > 0) {
            ratingStars.forEach(star => {
                star.addEventListener('click', (e) => {
                    this.setRating(parseInt(e.target.dataset.rating));
                });
            });
        }

        // 图片上传事件
        const imageUpload = document.getElementById('imageUpload');
        if (imageUpload) {
            imageUpload.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files);
            });
        }

        // 用户主页相关事件
        const userProfileClose = document.getElementById('userProfileClose');
        if (userProfileClose) {
            userProfileClose.addEventListener('click', () => {
                this.hideUserProfileModal();
            });
        }

        const modalFollowBtn = document.getElementById('modalFollowBtn');
        if (modalFollowBtn) {
            modalFollowBtn.addEventListener('click', () => {
                this.toggleModalFollow();
            });
        }

        const modalMessageBtn = document.getElementById('modalMessageBtn');
        if (modalMessageBtn) {
            modalMessageBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // 点击模态框背景关闭
        const userProfileModal = document.getElementById('userProfileModal');
        if (userProfileModal) {
            userProfileModal.addEventListener('click', (e) => {
                if (e.target === userProfileModal) {
                    this.hideUserProfileModal();
                }
            });
        }

        // ESC键关闭用户主页模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('userProfileModal');
                if (modal && modal.style.display === 'flex') {
                    this.hideUserProfileModal();
                }
            }
        });
    }

    // 初始化共享评论数据
    initSharedComments() {
        // 模拟一些共享评论数据
        const sharedComments = {
            'shanghai-japan-3days': {
                0: [
                    {
                        author: '旅行达人小王',
                        content: '浦东机场出发很顺利，航班准时，服务很好！安检也很快速，整体体验很棒。',
                        rating: 5,
                        time: '2024-01-15 10:30',
                        images: ['https://picsum.photos/300/200?random=1']
                    },
                    {
                        author: '背包客小李',
                        content: '机场设施完善，但建议提前2小时到达办理手续。免税店商品种类丰富，可以逛逛。',
                        rating: 4,
                        time: '2024-01-14 15:20',
                        images: []
                    },
                    {
                        author: '商务出行者',
                        content: '机场WiFi信号不错，休息区很舒适，适合商务出行。',
                        rating: 4,
                        time: '2024-01-13 08:45',
                        images: ['https://picsum.photos/300/200?random=7']
                    }
                ],
                1: [
                    {
                        author: '日本通',
                        content: '成田机场入境很顺利，工作人员态度友好，指示牌清晰。',
                        rating: 5,
                        time: '2024-01-15 12:30',
                        images: ['https://picsum.photos/300/200?random=8']
                    },
                    {
                        author: '新手旅行者',
                        content: '第一次来日本，入境手续比想象中简单，有中文指示。',
                        rating: 4,
                        time: '2024-01-14 13:15',
                        images: []
                    }
                ],
                2: [
                    {
                        author: '酒店控',
                        content: '新宿王子大酒店位置绝佳，房间干净整洁，服务很贴心。',
                        rating: 5,
                        time: '2024-01-15 16:00',
                        images: ['https://picsum.photos/300/200?random=9', 'https://picsum.photos/300/200?random=10']
                    },
                    {
                        author: '预算旅行者',
                        content: '酒店性价比不错，虽然房间不大但设施齐全，交通便利。',
                        rating: 4,
                        time: '2024-01-14 17:30',
                        images: []
                    }
                ],
                3: [
                    {
                        author: '美食探索者',
                        content: '新宿的拉面店真的太好吃了！汤底浓郁，面条劲道，强烈推荐！',
                        rating: 5,
                        time: '2024-01-15 19:30',
                        images: ['https://picsum.photos/300/200?random=11']
                    },
                    {
                        author: '拉面爱好者',
                        content: '排队的人很多，但值得等待。建议避开饭点高峰期。',
                        rating: 4,
                        time: '2024-01-14 20:15',
                        images: ['https://picsum.photos/300/200?random=12']
                    }
                ],
                4: [
                    {
                        author: '美食爱好者',
                        content: '浅草寺真的很美，传统文化氛围浓厚，值得一游！求签很有趣，记得买御守。',
                        rating: 5,
                        time: '2024-01-16 18:30',
                        images: ['https://picsum.photos/300/200?random=2', 'https://picsum.photos/300/200?random=3']
                    },
                    {
                        author: '摄影爱好者',
                        content: '拍照的好地方，建议傍晚时分去，光线最美。人流量适中，不会太拥挤。',
                        rating: 4,
                        time: '2024-01-15 19:15',
                        images: ['https://picsum.photos/300/200?random=4']
                    },
                    {
                        author: '文化体验者',
                        content: '可以体验和服拍照，价格合理，工作人员很专业。',
                        rating: 5,
                        time: '2024-01-16 16:45',
                        images: ['https://picsum.photos/300/200?random=13']
                    }
                ],
                5: [
                    {
                        author: '寿司控',
                        content: '银座的寿司真的是一绝！新鲜美味，服务也很棒。虽然价格不便宜但物有所值。',
                        rating: 5,
                        time: '2024-01-16 20:00',
                        images: ['https://picsum.photos/300/200?random=5']
                    },
                    {
                        author: '美食评论家',
                        content: '寿司师傅手艺精湛，食材新鲜，是正宗的江户前寿司。',
                        rating: 5,
                        time: '2024-01-15 21:30',
                        images: ['https://picsum.photos/300/200?random=14']
                    }
                ],
                6: [
                    {
                        author: '购物狂',
                        content: '银座购物体验很棒，品牌齐全，退税方便。建议提前做好购物清单。',
                        rating: 4,
                        time: '2024-01-16 22:00',
                        images: ['https://picsum.photos/300/200?random=15']
                    },
                    {
                        author: '奢侈品爱好者',
                        content: '各大奢侈品牌都有，价格比国内便宜，服务态度很好。',
                        rating: 5,
                        time: '2024-01-15 23:15',
                        images: []
                    }
                ],
                7: [
                    {
                        author: '温泉爱好者',
                        content: '箱根温泉真的很舒服，景色优美，是放松身心的好去处。',
                        rating: 5,
                        time: '2024-01-17 10:00',
                        images: ['https://picsum.photos/300/200?random=16', 'https://picsum.photos/300/200?random=17']
                    },
                    {
                        author: '自然探索者',
                        content: '箱根的自然风光很美，空气清新，适合徒步和拍照。',
                        rating: 4,
                        time: '2024-01-16 11:30',
                        images: ['https://picsum.photos/300/200?random=18']
                    }
                ],
                8: [
                    {
                        author: '日料达人',
                        content: '怀石料理很精致，每道菜都是艺术品，味道也很棒。',
                        rating: 5,
                        time: '2024-01-17 19:00',
                        images: ['https://picsum.photos/300/200?random=19']
                    },
                    {
                        author: '美食摄影师',
                        content: '摆盘精美，拍照很好看，服务很周到，值得体验。',
                        rating: 4,
                        time: '2024-01-16 20:30',
                        images: ['https://picsum.photos/300/200?random=20']
                    }
                ]
            },
            'beijing-korea-2days': {
                0: [
                    {
                        author: '商务旅行者',
                        content: '首都机场出发很方便，航班准时，安检效率高。',
                        rating: 4,
                        time: '2024-01-10 09:00',
                        images: []
                    },
                    {
                        author: '国际旅行者',
                        content: '机场设施现代化，有各种餐饮选择，候机体验不错。',
                        rating: 4,
                        time: '2024-01-09 14:20',
                        images: ['https://picsum.photos/300/200?random=21']
                    }
                ],
                1: [
                    {
                        author: '韩国通',
                        content: '仁川机场入境很顺利，有中文指示，工作人员态度友好。',
                        rating: 5,
                        time: '2024-01-10 12:00',
                        images: ['https://picsum.photos/300/200?random=22']
                    },
                    {
                        author: '新手旅行者',
                        content: '第一次来韩国，入境手续简单，机场设施很完善。',
                        rating: 4,
                        time: '2024-01-09 13:30',
                        images: []
                    }
                ],
                2: [
                    {
                        author: '酒店体验师',
                        content: '首尔威斯汀酒店位置很好，房间宽敞，服务一流。',
                        rating: 5,
                        time: '2024-01-10 15:30',
                        images: ['https://picsum.photos/300/200?random=23']
                    },
                    {
                        author: '商务出行者',
                        content: '酒店商务设施齐全，健身房很好，早餐丰富。',
                        rating: 4,
                        time: '2024-01-09 16:45',
                        images: []
                    }
                ],
                3: [
                    {
                        author: '韩料爱好者',
                        content: '明洞的韩式烤肉太棒了！肉质新鲜，配菜丰富，服务很好。',
                        rating: 5,
                        time: '2024-01-10 19:00',
                        images: ['https://picsum.photos/300/200?random=24']
                    },
                    {
                        author: '美食探索者',
                        content: '正宗的韩式烤肉，小菜种类多，价格合理。',
                        rating: 4,
                        time: '2024-01-09 20:15',
                        images: ['https://picsum.photos/300/200?random=25']
                    }
                ],
                4: [
                    {
                        author: '购物达人',
                        content: '明洞购物天堂！化妆品和服装都很便宜，退税方便，推荐！',
                        rating: 5,
                        time: '2024-01-11 19:30',
                        images: ['https://picsum.photos/300/200?random=6']
                    },
                    {
                        author: '美妆博主',
                        content: '韩国化妆品价格比国内便宜很多，种类齐全，值得购买。',
                        rating: 5,
                        time: '2024-01-10 18:00',
                        images: ['https://picsum.photos/300/200?random=26']
                    },
                    {
                        author: '时尚达人',
                        content: '明洞的服装店很多，款式时尚，价格合理，适合年轻人。',
                        rating: 4,
                        time: '2024-01-11 16:30',
                        images: ['https://picsum.photos/300/200?random=27']
                    }
                ],
                5: [
                    {
                        author: '韩料专家',
                        content: '首尔的韩式料理很正宗，泡菜很开胃，石锅拌饭很香。',
                        rating: 5,
                        time: '2024-01-11 20:30',
                        images: ['https://picsum.photos/300/200?random=28']
                    },
                    {
                        author: '美食评论家',
                        content: '韩式料理口味正宗，服务态度好，环境舒适。',
                        rating: 4,
                        time: '2024-01-10 21:45',
                        images: []
                    }
                ]
            }
        };

        // 将共享评论数据合并到本地评论中
        Object.keys(sharedComments).forEach(tripId => {
            if (!this.comments[tripId]) {
                this.comments[tripId] = {};
            }
            Object.keys(sharedComments[tripId]).forEach(planIndex => {
                if (!this.comments[tripId][planIndex]) {
                    this.comments[tripId][planIndex] = [];
                }
                this.comments[tripId][planIndex] = [
                    ...sharedComments[tripId][planIndex],
                    ...this.comments[tripId][planIndex]
                ];
            });
        });
    }

    // 选择行程
    selectTrip(tripId) {
        // 移除所有选项的active状态
        document.querySelectorAll('.trip-option').forEach(option => {
            option.classList.remove('active');
        });
        
        // 为选中的选项添加active状态
        const selectedOption = document.querySelector(`[data-trip="${tripId}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            this.currentTrip = tripId;
            
            // 添加选择动画效果
            selectedOption.style.transform = 'scale(1.05)';
            setTimeout(() => {
                selectedOption.style.transform = '';
            }, 200);
        }
    }

    // 开始行程
    startTrip() {
        if (!this.currentTrip) {
            this.showModal('提示', '请先选择一个旅游行程');
            return;
        }

        // 跳转到旅行页面
        window.location.href = `trip.html?trip=${this.currentTrip}`;
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
        
        // 更新进度显示
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

        // 获取完成按钮的文本和样式
        const completeBtnText = isCompleted ? '已完成' : '标记完成';
        const completeBtnClass = isCompleted ? 'plan-action-btn complete completed' : 'plan-action-btn complete';

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

    // 获取行程数据（Mock数据）
    getTripData() {
        const tripData = {
            // 上海-日本 3天行程
            'shanghai-japan-3days': [
                // 第一天
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
                },
                // 第二天
                {
                    time: '08:00',
                    type: 'food',
                    title: '早餐 - 酒店自助',
                    description: '在酒店享用丰盛的自助早餐',
                    location: '东京希尔顿酒店',
                    coordinates: { lat: 35.6586, lng: 139.7454 },
                    day: 2
                },
                {
                    time: '09:30',
                    type: 'activity',
                    title: '东京塔观光',
                    description: '登上东京塔俯瞰整个东京市区',
                    location: '东京塔',
                    coordinates: { lat: 35.6586, lng: 139.7454 },
                    day: 2
                },
                {
                    time: '12:00',
                    type: 'food',
                    title: '午餐 - 拉面',
                    description: '品尝正宗日本拉面',
                    location: '新宿拉面店',
                    coordinates: { lat: 35.6895, lng: 139.6917 },
                    day: 2
                },
                {
                    time: '14:00',
                    type: 'activity',
                    title: '新宿购物',
                    description: '在新宿商业区购物体验',
                    location: '新宿商业区',
                    coordinates: { lat: 35.6895, lng: 139.6917 },
                    day: 2
                },
                {
                    time: '18:00',
                    type: 'food',
                    title: '晚餐 - 天妇罗',
                    description: '品尝日本传统天妇罗料理',
                    location: '银座天妇罗店',
                    coordinates: { lat: 35.6719, lng: 139.7639 },
                    day: 2
                },
                // 第三天
                {
                    time: '08:00',
                    type: 'food',
                    title: '早餐 - 日式早餐',
                    description: '体验传统日式早餐',
                    location: '酒店餐厅',
                    coordinates: { lat: 35.6586, lng: 139.7454 },
                    day: 3
                },
                {
                    time: '09:30',
                    type: 'activity',
                    title: '秋叶原电器街',
                    description: '游览日本最大的电器街',
                    location: '秋叶原',
                    coordinates: { lat: 35.6985, lng: 139.7731 },
                    day: 3
                },
                {
                    time: '12:00',
                    type: 'food',
                    title: '午餐 - 咖喱饭',
                    description: '品尝日式咖喱饭',
                    location: '秋叶原咖喱店',
                    coordinates: { lat: 35.6985, lng: 139.7731 },
                    day: 3
                },
                {
                    time: '14:00',
                    type: 'transport',
                    title: '前往机场',
                    description: '乘坐机场快线返回成田机场',
                    location: '东京成田国际机场',
                    coordinates: { lat: 35.7720, lng: 140.3928 },
                    day: 3
                },
                {
                    time: '16:00',
                    type: 'transport',
                    title: '返回上海',
                    description: '乘坐国际航班返回上海',
                    location: '上海浦东国际机场',
                    coordinates: { lat: 31.1443, lng: 121.8083 },
                    day: 3
                }
            ],
            
            // 上海-日本 2天行程
            'shanghai-japan-2days': [
                // 第一天
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
                },
                // 第二天
                {
                    time: '08:00',
                    type: 'food',
                    title: '早餐 - 酒店自助',
                    description: '在酒店享用丰盛的自助早餐',
                    location: '东京希尔顿酒店',
                    coordinates: { lat: 35.6586, lng: 139.7454 },
                    day: 2
                },
                {
                    time: '09:30',
                    type: 'activity',
                    title: '东京塔观光',
                    description: '登上东京塔俯瞰整个东京市区',
                    location: '东京塔',
                    coordinates: { lat: 35.6586, lng: 139.7454 },
                    day: 2
                },
                {
                    time: '12:00',
                    type: 'food',
                    title: '午餐 - 拉面',
                    description: '品尝正宗日本拉面',
                    location: '新宿拉面店',
                    coordinates: { lat: 35.6895, lng: 139.6917 },
                    day: 2
                },
                {
                    time: '14:00',
                    type: 'transport',
                    title: '前往机场',
                    description: '乘坐机场快线返回成田机场',
                    location: '东京成田国际机场',
                    coordinates: { lat: 35.7720, lng: 140.3928 },
                    day: 2
                },
                {
                    time: '16:00',
                    type: 'transport',
                    title: '返回上海',
                    description: '乘坐国际航班返回上海',
                    location: '上海浦东国际机场',
                    coordinates: { lat: 31.1443, lng: 121.8083 },
                    day: 2
                }
            ],
            
            // 北京-韩国 2天行程
            'beijing-korea-2days': [
                // 第一天
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
                    time: '14:30',
                    type: 'transport',
                    title: '前往酒店',
                    description: '乘坐机场快线前往市区酒店',
                    location: '首尔市区',
                    coordinates: { lat: 37.5665, lng: 126.9780 },
                    day: 1
                },
                {
                    time: '16:00',
                    type: 'accommodation',
                    title: '酒店入住',
                    description: '办理入住手续，放置行李',
                    location: '首尔威斯汀酒店',
                    coordinates: { lat: 37.5665, lng: 126.9780 },
                    day: 1
                },
                {
                    time: '18:00',
                    type: 'activity',
                    title: '明洞购物',
                    description: '体验韩国时尚购物天堂',
                    location: '明洞',
                    coordinates: { lat: 37.5636, lng: 126.9834 },
                    day: 1
                },
                {
                    time: '20:00',
                    type: 'food',
                    title: '晚餐 - 韩式烤肉',
                    description: '品尝正宗韩国烤肉',
                    location: '明洞烤肉店',
                    coordinates: { lat: 37.5636, lng: 126.9834 },
                    day: 1
                },
                // 第二天
                {
                    time: '08:00',
                    type: 'food',
                    title: '早餐 - 韩式早餐',
                    description: '品尝传统韩式早餐',
                    location: '首尔威斯汀酒店',
                    coordinates: { lat: 37.5665, lng: 126.9780 },
                    day: 2
                },
                {
                    time: '09:30',
                    type: 'activity',
                    title: '景福宫游览',
                    description: '参观韩国古代宫殿建筑',
                    location: '景福宫',
                    coordinates: { lat: 37.5796, lng: 126.9770 },
                    day: 2
                },
                {
                    time: '12:00',
                    type: 'food',
                    title: '午餐 - 韩式拌饭',
                    description: '品尝正宗韩式拌饭',
                    location: '景福宫附近餐厅',
                    coordinates: { lat: 37.5796, lng: 126.9770 },
                    day: 2
                },
                {
                    time: '14:00',
                    type: 'transport',
                    title: '前往机场',
                    description: '乘坐机场快线返回仁川机场',
                    location: '首尔仁川国际机场',
                    coordinates: { lat: 37.4602, lng: 126.4407 },
                    day: 2
                },
                {
                    time: '16:30',
                    type: 'transport',
                    title: '返回北京',
                    description: '乘坐国际航班返回北京',
                    location: '北京首都国际机场',
                    coordinates: { lat: 40.0799, lng: 116.6031 },
                    day: 2
                }
            ],
            
            // 北京-韩国 3天行程
            'beijing-korea-3days': [
                // 第一天
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
                    time: '14:30',
                    type: 'transport',
                    title: '前往酒店',
                    description: '乘坐机场快线前往市区酒店',
                    location: '首尔市区',
                    coordinates: { lat: 37.5665, lng: 126.9780 },
                    day: 1
                },
                {
                    time: '16:00',
                    type: 'accommodation',
                    title: '酒店入住',
                    description: '办理入住手续，放置行李',
                    location: '首尔威斯汀酒店',
                    coordinates: { lat: 37.5665, lng: 126.9780 },
                    day: 1
                },
                {
                    time: '18:00',
                    type: 'activity',
                    title: '明洞购物',
                    description: '体验韩国时尚购物天堂',
                    location: '明洞',
                    coordinates: { lat: 37.5636, lng: 126.9834 },
                    day: 1
                },
                {
                    time: '20:00',
                    type: 'food',
                    title: '晚餐 - 韩式烤肉',
                    description: '品尝正宗韩国烤肉',
                    location: '明洞烤肉店',
                    coordinates: { lat: 37.5636, lng: 126.9834 },
                    day: 1
                },
                // 第二天
                {
                    time: '08:00',
                    type: 'food',
                    title: '早餐 - 韩式早餐',
                    description: '品尝传统韩式早餐',
                    location: '首尔威斯汀酒店',
                    coordinates: { lat: 37.5665, lng: 126.9780 },
                    day: 2
                },
                {
                    time: '09:30',
                    type: 'activity',
                    title: '景福宫游览',
                    description: '参观韩国古代宫殿建筑',
                    location: '景福宫',
                    coordinates: { lat: 37.5796, lng: 126.9770 },
                    day: 2
                },
                {
                    time: '12:00',
                    type: 'food',
                    title: '午餐 - 韩式拌饭',
                    description: '品尝正宗韩式拌饭',
                    location: '景福宫附近餐厅',
                    coordinates: { lat: 37.5796, lng: 126.9770 },
                    day: 2
                },
                {
                    time: '14:00',
                    type: 'activity',
                    title: '南山塔观光',
                    description: '登上首尔塔俯瞰整个首尔市区',
                    location: '南山首尔塔',
                    coordinates: { lat: 37.5512, lng: 126.9882 },
                    day: 2
                },
                {
                    time: '18:00',
                    type: 'food',
                    title: '晚餐 - 韩式炸鸡',
                    description: '品尝韩国特色炸鸡',
                    location: '弘大炸鸡店',
                    coordinates: { lat: 37.5563, lng: 126.9236 },
                    day: 2
                },
                // 第三天
                {
                    time: '08:00',
                    type: 'food',
                    title: '早餐 - 酒店自助',
                    description: '在酒店享用丰盛的自助早餐',
                    location: '首尔威斯汀酒店',
                    coordinates: { lat: 37.5665, lng: 126.9780 },
                    day: 3
                },
                {
                    time: '09:30',
                    type: 'activity',
                    title: '弘大艺术区',
                    description: '游览弘大艺术区，体验韩国年轻文化',
                    location: '弘大艺术区',
                    coordinates: { lat: 37.5563, lng: 126.9236 },
                    day: 3
                },
                {
                    time: '12:00',
                    type: 'food',
                    title: '午餐 - 韩式冷面',
                    description: '品尝清爽的韩式冷面',
                    location: '弘大冷面店',
                    coordinates: { lat: 37.5563, lng: 126.9236 },
                    day: 3
                },
                {
                    time: '14:00',
                    type: 'transport',
                    title: '前往机场',
                    description: '乘坐机场快线返回仁川机场',
                    location: '首尔仁川国际机场',
                    coordinates: { lat: 37.4602, lng: 126.4407 },
                    day: 3
                },
                {
                    time: '16:30',
                    type: 'transport',
                    title: '返回北京',
                    description: '乘坐国际航班返回北京',
                    location: '北京首都国际机场',
                    coordinates: { lat: 40.0799, lng: 116.6031 },
                    day: 3
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
        const timeElem = document.getElementById('currentTime');
        if (timeElem) {
            timeElem.textContent = timeString;
        }
    }

    // 检查位置权限
    checkLocationPermission() {
        // 简化权限检查，默认不获取真实位置
        this.locationPermission = false;
        // 不自动获取位置，等用户主动点击允许
    }

    // 请求位置权限
    requestLocationPermission() {
        // 模拟位置权限获取成功，直接设置位置信息
        this.locationPermission = true;
        this.currentLocation = {
            lat: 31.1443,
            lng: 121.8083
        };
        this.updateLocationDisplay();
        this.reverseGeocode();
        this.hidePermissionModal();
        
        // 如果已经选择了行程，直接开始
        if (this.currentTrip) {
            this.startTrip();
        }
    }

    // 获取当前位置
    getCurrentLocation() {
        if (!('geolocation' in navigator)) {
            this.showModal('错误', '您的浏览器不支持地理位置功能');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                this.locationPermission = true;
                this.updateLocationDisplay();
                this.reverseGeocode();
            },
            (error) => {
                console.error('获取位置失败:', error);
                this.showModal('位置获取失败', '无法获取您的位置信息，请检查位置权限设置');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    // 更新位置显示
    updateLocationDisplay() {
        if (this.currentLocation) {
            document.getElementById('locationCoordinates').textContent = 
                `坐标: ${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}`;
            document.getElementById('currentLocation').textContent = '已定位';
        }
    }

    // 反向地理编码（Mock）
    reverseGeocode() {
        // 这里应该调用真实的地理编码API
        // 现在使用Mock数据
        const mockAddresses = [
            '上海市浦东新区浦东国际机场',
            '东京都成田市成田国际机场',
            '东京都新宿区希尔顿酒店',
            '东京都台东区浅草寺',
            '东京都中央区银座',
            '北京市顺义区首都国际机场',
            '首尔特别市仁川国际机场',
            '首尔特别市中区威斯汀酒店',
            '首尔特别市中区明洞'
        ];
        
        const randomAddress = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
        document.getElementById('locationAddress').textContent = randomAddress;
    }

    // 刷新模拟位置
    refreshMockLocation() {
        if (!this.locationPermission) return;
        
        // 模拟位置变化
        const latChange = (Math.random() - 0.5) * 0.02; // 约±1公里
        const lngChange = (Math.random() - 0.5) * 0.02;
        
        this.currentLocation = {
            lat: this.currentLocation.lat + latChange,
            lng: this.currentLocation.lng + lngChange
        };
        
        this.updateLocationDisplay();
        this.reverseGeocode();
        
        // 检查是否到达计划地点
        this.checkLocationProximity(this.currentLocation);
    }

    // 模拟位置监控（不真正获取位置）
    startMockLocationMonitoring() {
        if (!this.locationPermission) return;

        // 模拟位置变化，每30秒更新一次位置
        this.mockLocationInterval = setInterval(() => {
            // 模拟位置变化（在当前位置附近随机移动）
            const latChange = (Math.random() - 0.5) * 0.01; // 约±500米
            const lngChange = (Math.random() - 0.5) * 0.01;
            
            const newLocation = {
                lat: this.currentLocation.lat + latChange,
                lng: this.currentLocation.lng + lngChange
            };
            
            // 检查是否到达计划地点
            this.checkLocationProximity(newLocation);
            
            this.currentLocation = newLocation;
            this.updateLocationDisplay();
        }, 30000); // 30秒更新一次
    }

    // 检查位置接近度
    checkLocationProximity(location) {
        const tripData = this.getTripData();
        const currentPlan = tripData[this.currentPlanIndex];
        
        if (!currentPlan || !currentPlan.coordinates) return;

        const distance = this.calculateDistance(
            location.lat, location.lng,
            currentPlan.coordinates.lat, currentPlan.coordinates.lng
        );

        // 如果距离小于500米，认为到达目的地
        if (distance < 0.5) {
            this.arriveAtDestination();
        }
    }

    // 计算距离（公里）
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
        
        this.showModal(
            '到达目的地',
            `您已到达 ${currentPlan.title}，位于 ${currentPlan.location}。请开始执行当前计划。`
        );

        // 标记当前计划为已完成
        this.markPlanCompleted();
    }

    // 标记计划完成
    markPlanCompleted() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        if (this.currentPlanIndex < timelineItems.length) {
            timelineItems[this.currentPlanIndex].classList.remove('current');
            timelineItems[this.currentPlanIndex].classList.add('completed');
        }
        
        this.currentPlanIndex++;
        
        // 更新下一个计划为当前计划
        if (this.currentPlanIndex < timelineItems.length) {
            timelineItems[this.currentPlanIndex].classList.add('current');
        }
    }

    // 开始下一个项目
    startNextPlan() {
        const tripData = this.getTripData();
        const nextPlan = tripData[this.currentPlanIndex];
        
        if (nextPlan) {
            // 标记当前计划为已完成
            this.markPlanCompleted();
            
            // 显示下一个计划信息
            this.showModal(
                '开始下一个项目',
                `时间：${nextPlan.time}\n类型：${this.getTypeText(nextPlan.type)}\n活动：${nextPlan.title}\n地点：${nextPlan.location}\n描述：${nextPlan.description}`
            );
        } else {
            this.showModal('行程完成', '恭喜！您已完成所有计划项目。');
        }
    }

    // 从侧边栏切换计划完成状态
    togglePlanCompleteFromSidebar() {
        if (this.currentActionPlanIndex !== undefined) {
            this.togglePlanComplete(this.currentActionPlanIndex);
        }
    }
    
    // 切换计划完成状态
    togglePlanComplete(index) {
        const tripData = this.getTripData();
        const plan = tripData[index];
        
        if (!plan) return;
        
        if (this.completedPlans.has(index)) {
            // 取消完成状态
            this.completedPlans.delete(index);
            
            // 同时取消该计划之后所有已完成计划的完成状态
            for (let i = index + 1; i < tripData.length; i++) {
                this.completedPlans.delete(i);
            }
            
            this.showModal('计划状态更新', `已取消 ${plan.title} 及之后计划的完成状态`);
        } else {
            // 标记为完成
            this.completedPlans.add(index);
            
            // 同时标记该计划之前所有未完成计划为完成状态
            for (let i = 0; i < index; i++) {
                this.completedPlans.add(i);
            }
            
            // 调整后续计划时间
            this.adjustPlanTimes(index);
            
            // 添加完成动画效果
            this.showCompletionAnimation(plan.title);
            
            this.showModal('🌿 计划完成！', `恭喜！您已完成 ${plan.title} 及之前的所有计划`);
        }
        
        // 重新生成时间线以更新显示
        this.generateTimeline();
        
        // 隐藏操作按钮
        this.hideAllPlanActions();
    }

    // 显示完成动画
    showCompletionAnimation(planTitle) {
        const animation = document.createElement('div');
        animation.className = 'completion-animation';
        animation.innerHTML = `
            <div class="completion-content">
                <div class="completion-icon">🐸</div>
                <div class="completion-text">计划完成！</div>
                <div class="completion-plan">${planTitle}</div>
            </div>
        `;
        document.body.appendChild(animation);
        
        // 3秒后移除动画
        setTimeout(() => {
            animation.remove();
        }, 3000);
    }

    // 调整计划时间
    adjustPlanTimes(completedIndex) {
        const tripData = this.getTripData();
        const completedPlan = tripData[completedIndex];
        
        if (!completedPlan) return;
        
        // 获取当前时间作为完成时间
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // 更新已完成计划的时间
        completedPlan.time = currentTime;
        
        // 保存原始时间（如果还没有保存）
        if (!completedPlan.originalTime) {
            completedPlan.originalTime = completedPlan.time;
        }
        
        // 计算时间差，用于调整后续计划
        const originalTime = this.parseTime(completedPlan.originalTime);
        const currentTimeObj = this.parseTime(currentTime);
        
        // 计算时间差（分钟）
        let timeDiff = (currentTimeObj.hours * 60 + currentTimeObj.minutes) - (originalTime.hours * 60 + originalTime.minutes);
        
        // 如果当前时间早于原计划时间，则不需要调整
        if (timeDiff <= 0) {
            timeDiff = 0;
        }
        
        // 调整后续计划的时间
        let hasLatePlans = false;
        for (let i = completedIndex + 1; i < tripData.length; i++) {
            const plan = tripData[i];
            if (!plan) continue;
            
            // 保存原始时间（如果还没有保存）
            if (!plan.originalTime) {
                plan.originalTime = plan.time;
            }
            
            // 计算新时间
            const planTime = this.parseTime(plan.originalTime);
            const newMinutes = planTime.hours * 60 + planTime.minutes + timeDiff;
            const newHours = Math.floor(newMinutes / 60);
            const remainingMinutes = newMinutes % 60;
            
            // 检查是否超过合理时间（比如晚上11点）
            if (newHours >= 23) {
                hasLatePlans = true;
                break;
            }
            
            plan.time = `${newHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
        }
        
        // 如果有计划时间太晚，提示用户
        if (hasLatePlans) {
            this.showModalWithOptions(
                '时间调整提醒',
                '由于当前计划完成时间较晚，后续部分计划将延后到深夜。建议您考虑删减一些计划项目，以确保行程的舒适性。',
                '继续执行',
                '查看计划',
                () => {
                    // 用户选择继续执行
                    this.showModal('提示', '已保留所有计划，请注意合理安排时间。');
                },
                () => {
                    // 用户选择查看计划
                    this.showPlanAdjustmentModal(completedIndex);
                }
            );
        }
    }

    // 显示计划调整模态框
    showPlanAdjustmentModal(completedIndex) {
        const tripData = this.getTripData();
        const latePlans = [];
        
        // 找出时间过晚的计划
        for (let i = completedIndex + 1; i < tripData.length; i++) {
            const plan = tripData[i];
            if (!plan) continue;
            
            const planTime = this.parseTime(plan.time);
            if (planTime.hours >= 23) {
                latePlans.push({ index: i, plan: plan });
            }
        }
        
        if (latePlans.length === 0) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>计划调整建议</h3>
                    <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>以下计划将延后到深夜，建议考虑删除：</p>
                    <div class="late-plans-list">
                        ${latePlans.map(item => `
                            <div class="late-plan-item">
                                <label>
                                    <input type="checkbox" checked data-index="${item.index}">
                                    <span class="plan-time">${item.plan.time}</span>
                                    <span class="plan-title">${item.plan.title}</span>
                                    <span class="plan-type">${this.getTypeText(item.plan.type)}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                    <p style="margin-top: 1rem; color: #666; font-size: 0.9rem;">
                        取消勾选您想要删除的计划项目
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="window.owlApp.applyPlanAdjustment(${completedIndex})">
                        应用调整
                    </button>
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                        取消
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 应用计划调整
    applyPlanAdjustment(completedIndex) {
        const tripData = this.getTripData();
        const checkboxes = document.querySelectorAll('.late-plans-list input[type="checkbox"]');
        const plansToRemove = [];
        
        // 收集要删除的计划
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                plansToRemove.push(parseInt(checkbox.dataset.index));
            }
        });
        
        // 删除选中的计划（从后往前删除，避免索引变化）
        plansToRemove.sort((a, b) => b - a).forEach(index => {
            tripData.splice(index, 1);
        });
        
        // 重新生成时间线
        this.generateTimeline();
        
        // 关闭模态框
        document.querySelector('.modal').remove();
        
        this.showModal('调整完成', `已删除 ${plansToRemove.length} 个计划项目，行程已优化。`);
    }

    // 创建计划操作按钮
    createPlanActions() {
        // 创建蒙版
        const overlay = document.createElement('div');
        overlay.className = 'plan-actions-overlay';
        document.body.appendChild(overlay);
        
        // 点击蒙版关闭按钮
        overlay.addEventListener('click', () => {
            this.hideAllPlanActions();
        });
    }
    
    // 显示计划操作按钮
    showPlanActions(index) {
        const tripData = this.getTripData();
        const plan = tripData[index];
        
        if (!plan) return;
        
        // 隐藏所有现有的按钮
        this.hideAllPlanActions();
        
        // 获取当前计划项目元素
        const timelineItem = document.querySelector(`[data-index="${index}"]`);
        if (!timelineItem) return;
        
        // 创建按钮容器
        const planActions = document.createElement('div');
        planActions.className = 'plan-actions';
        
        // 获取完成按钮的文本和样式
        const isCompleted = this.completedPlans.has(index);
        const completeBtnText = isCompleted ? '已完成' : '标记完成';
        const completeBtnClass = isCompleted ? 'plan-action-btn complete completed' : 'plan-action-btn complete';
        
        planActions.innerHTML = `
            <button class="plan-action-btn navigation" title="查看路线">
                <i class="fas fa-route"></i>
            </button>
            <button class="plan-action-btn taxi" title="打车">
                <i class="fas fa-taxi"></i>
            </button>
            <button class="plan-action-btn comment" title="评论">
                <i class="fas fa-comments"></i>
            </button>
            <button class="${completeBtnClass}" title="${completeBtnText}">
                <i class="fas fa-check"></i>
            </button>
        `;
        
        // 绑定按钮事件
        const navigationBtn = planActions.querySelector('.navigation');
        const taxiBtn = planActions.querySelector('.taxi');
        const commentBtn = planActions.querySelector('.comment');
        const completeBtn = planActions.querySelector('.complete');
        
        console.log('Buttons found:', {
            navigationBtn: navigationBtn,
            taxiBtn: taxiBtn,
            commentBtn: commentBtn,
            completeBtn: completeBtn
        });
        
        if (navigationBtn) {
            navigationBtn.addEventListener('click', () => {
                console.log('Navigation button clicked');
                this.showNavigationFromSidebar();
            });
        } else {
            console.error('Navigation button not found');
        }
        
        if (taxiBtn) {
            taxiBtn.addEventListener('click', () => {
                console.log('Taxi button clicked');
                this.openTaxiFromSidebar();
            });
        } else {
            console.error('Taxi button not found');
        }
        
        if (commentBtn) {
            commentBtn.addEventListener('click', () => {
                console.log('Comment button clicked');
                this.showCommentsFromSidebar();
            });
        } else {
            console.error('Comment button not found');
        }
        
        if (completeBtn) {
            completeBtn.addEventListener('click', () => {
                console.log('Complete button clicked');
                this.togglePlanCompleteFromSidebar();
            });
        } else {
            console.error('Complete button not found');
        }
        
        // 将按钮添加到计划项目中
        timelineItem.appendChild(planActions);
        
        // 计算最佳位置
        this.adjustPlanActionsPosition(planActions, timelineItem);
        
        // 保存当前选中的计划索引
        this.currentActionPlanIndex = index;
        console.log('currentActionPlanIndex set to:', index);
        
        // 显示蒙版
        const overlay = document.querySelector('.plan-actions-overlay');
        if (overlay) {
            overlay.classList.add('show');
        }
        
        // 延迟显示按钮，确保DOM已更新
        requestAnimationFrame(() => {
            planActions.classList.add('show');
        });
    }
    
    // 调整计划操作按钮的位置
    adjustPlanActionsPosition(planActions, timelineItem) {
        // 由于弹窗现在嵌入在计划项内部，不需要复杂的位置计算
        // 只需要确保弹窗在计划项的右侧内部显示
        
        // 监听窗口大小变化，重新调整位置
        const resizeHandler = () => {
            // 可以在这里添加响应式调整逻辑
        };
        
        // 添加一次性事件监听器
        window.addEventListener('resize', resizeHandler, { once: true });
        
        // 在弹窗关闭时移除事件监听器
        planActions.addEventListener('remove', () => {
            window.removeEventListener('resize', resizeHandler);
        });
    }
    
    // 隐藏所有计划操作按钮
    hideAllPlanActions() {
        const allPlanActions = document.querySelectorAll('.plan-actions');
        const overlay = document.querySelector('.plan-actions-overlay');
        
        // 为每个按钮添加淡出动画
        allPlanActions.forEach(actions => {
            actions.classList.remove('show');
            // 等待动画完成后移除元素
            setTimeout(() => {
                if (actions.parentNode) {
                    actions.remove();
                }
            }, 250);
        });
        
        // 隐藏蒙版
        if (overlay) {
            overlay.classList.remove('show');
        }
        
        // 清除当前选中的计划索引
        this.currentActionPlanIndex = undefined;
        console.log('currentActionPlanIndex cleared');
    }

    // 返回首页
    backToHome() {
        // 显示行程选择，隐藏时间线
        document.getElementById('tripSelector').style.display = 'block';
        document.getElementById('timelineSection').style.display = 'none';
        
        // 隐藏返回首页按钮
        document.getElementById('backToHomeBtn').style.display = 'none';
        
        // 重置状态
        this.currentTrip = null;
        this.currentPlanIndex = 0;
        this.completedPlans.clear();
        this.comments = {};
        this.currentRating = 0;
        
        // 重置所有计划的原始时间
        const tripData = this.getTripData();
        tripData.forEach(plan => {
            if (plan.originalTime) {
                plan.time = plan.originalTime;
                delete plan.originalTime;
            }
        });
        
        // 隐藏所有操作按钮
        this.hideAllPlanActions();
    }

    // 从侧边栏显示评论
    showCommentsFromSidebar() {
        if (this.currentActionPlanIndex !== undefined) {
            this.showComments(this.currentActionPlanIndex);
        }
    }
    
    // 显示评论区
    showComments(index) {
        const tripData = this.getTripData();
        const plan = tripData[index];
        
        if (!plan) return;
        
        // 更新计划信息
        document.getElementById('commentPlanInfo').innerHTML = `
            <h4>${plan.title}</h4>
            <p><strong>时间：</strong>${plan.time}</p>
            <p><strong>类型：</strong>${this.getTypeText(plan.type)}</p>
            <p><strong>地点：</strong>${plan.location}</p>
            <p><strong>描述：</strong>${plan.description}</p>
        `;
        
        // 加载评论
        this.loadComments(index);
        
        // 显示评论区模态框
        document.getElementById('commentModal').style.display = 'block';
        
        // 隐藏计划操作按钮
        this.hideAllPlanActions();
    }

    // 隐藏评论区模态框
    hideCommentModal() {
        document.getElementById('commentModal').style.display = 'none';
        document.getElementById('commentInput').value = '';
        this.currentRating = 0;
        this.selectedImages = [];
        this.updateRatingDisplay();
        this.updateImagePreview();
    }

    // 加载评论
    loadComments(index) {
        const commentsList = document.getElementById('commentsList');
        const tripData = this.getTripData();
        const plan = tripData[index];
        
        if (!plan) return;
        
        // 获取评论数据
        const tripId = this.currentTrip;
        const planComments = this.comments[tripId]?.[index] || [];
        
        // 更新评论统计
        document.getElementById('commentsCount').textContent = planComments.length;
        
        // 计算平均评分
        if (planComments.length > 0) {
            const totalRating = planComments.reduce((sum, comment) => sum + comment.rating, 0);
            const averageRating = (totalRating / planComments.length).toFixed(1);
            document.getElementById('averageRating').textContent = averageRating;
        } else {
            document.getElementById('averageRating').textContent = '0.0';
        }
        
        if (planComments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">暂无评论，快来分享您的体验吧！</div>';
            return;
        }
        
        commentsList.innerHTML = planComments.map(comment => `
            <div class="comment-item">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-time">${comment.time}</span>
                </div>
                <div class="comment-rating">
                    ${this.generateStars(comment.rating)}
                </div>
                <div class="comment-content">${comment.content}</div>
                ${comment.images && comment.images.length > 0 ? `
                    <div class="comment-images">
                        ${comment.images.map(image => `
                            <div class="comment-image" onclick="window.owlApp.showImageModal('${image}')">
                                <img src="${image}" alt="评论图片">
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // 生成星级显示
    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star ${i <= rating ? 'active' : ''}"></i>`;
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
        document.querySelectorAll('#ratingStars i').forEach((star, index) => {
            if (index < this.currentRating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
        
        // 更新评分文本
        const ratingText = document.getElementById('ratingText');
        const ratingDescriptions = {
            0: '',
            1: '很差',
            2: '一般',
            3: '还行',
            4: '不错',
            5: '很棒'
        };
        ratingText.textContent = ratingDescriptions[this.currentRating] || '';
    }

    // 显示图片模态框
    showImageModal(imageSrc) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="image-modal-content">
                <button class="image-modal-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
                <img src="${imageSrc}" alt="大图">
            </div>
        `;
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 提交评论
    submitComment() {
        const content = document.getElementById('commentInput').value.trim();
        
        if (!content) {
            this.showModal('提示', '请输入评论内容');
            return;
        }
        
        if (this.currentRating === 0) {
            this.showModal('提示', '请选择评分');
            return;
        }
        
        // 获取当前评论的计划索引
        const currentPlanIndex = this.getCurrentCommentPlanIndex();
        if (currentPlanIndex === null) return;
        
        // 创建新评论
        const newComment = {
            author: '我',
            content: content,
            rating: this.currentRating,
            time: new Date().toLocaleString('zh-CN'),
            images: [...this.selectedImages]
        };
        
        // 添加到评论列表
        const tripId = this.currentTrip;
        if (!this.comments[tripId]) {
            this.comments[tripId] = {};
        }
        if (!this.comments[tripId][currentPlanIndex]) {
            this.comments[tripId][currentPlanIndex] = [];
        }
        this.comments[tripId][currentPlanIndex].unshift(newComment);
        
        // 重新加载评论
        this.loadComments(currentPlanIndex);
        
        // 清空表单
        document.getElementById('commentInput').value = '';
        this.currentRating = 0;
        this.selectedImages = [];
        this.updateRatingDisplay();
        this.updateImagePreview();
        
        this.showModal('评论成功', '感谢您的分享！');
    }

    // 处理图片上传
    handleImageUpload(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.selectedImages.push(e.target.result);
                    this.updateImagePreview();
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 更新图片预览
    updateImagePreview() {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        
        this.selectedImages.forEach((image, index) => {
            const item = document.createElement('div');
            item.className = 'image-preview-item';
            item.innerHTML = `
                <img src="${image}" alt="预览图片">
                <button class="remove-image" onclick="window.owlApp.removeImage(${index})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(item);
        });
    }

    // 移除图片
    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.updateImagePreview();
    }

    // 获取当前评论的计划索引
    getCurrentCommentPlanIndex() {
        const planInfo = document.getElementById('commentPlanInfo');
        if (!planInfo) return null;
        
        // 这里可以通过计划标题来匹配索引
        // 简化实现，实际应用中可能需要更精确的匹配
        const tripData = this.getTripData();
        for (let i = 0; i < tripData.length; i++) {
            if (planInfo.textContent.includes(tripData[i].title)) {
                return i;
            }
        }
        return null;
    }

    // 开始计划提醒
    startPlanReminders() {
        const tripData = this.getTripData();
        
        tripData.forEach((plan, index) => {
            const planTime = this.parseTime(plan.time);
            const now = new Date();
            const reminderTime = new Date();
            reminderTime.setHours(planTime.hours, planTime.minutes, 0, 0);
            
            // 如果计划时间还没到，设置提醒
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
        const message = plan.type === 'transport' ? 
            `提醒：${plan.title} 即将开始，请提前准备出发。` :
            `提醒：现在是 ${plan.time}，该执行 ${plan.title} 了。`;
            
        this.showModalWithOptions(
            '计划提醒', 
            message,
            '知道了',
            '开始下一个项目',
            () => {
                // 点击"知道了"的处理
                this.hideModal();
            },
            () => {
                // 点击"开始下一个项目"的处理
                this.startNextPlan();
                this.hideModal();
            }
        );
    }

    // 切换计划操作按钮显示
    togglePlanActions(index) {
        // 检查当前计划是否已经有按钮显示
        const timelineItem = document.querySelector(`[data-index="${index}"]`);
        const existingActions = timelineItem?.querySelector('.plan-actions');
        const isVisible = existingActions?.classList.contains('show');
        
        if (isVisible) {
            this.hideAllPlanActions();
        } else {
            this.showPlanActions(index);
        }
    }

    // 从侧边栏显示导航
    showNavigationFromSidebar() {
        console.log('showNavigationFromSidebar called, currentActionPlanIndex:', this.currentActionPlanIndex);
        if (this.currentActionPlanIndex !== undefined) {
            this.showNavigation(this.currentActionPlanIndex);
        } else {
            console.error('currentActionPlanIndex is undefined');
            this.showModal('提示', '无法获取当前计划信息');
        }
    }
    
    // 显示导航
    showNavigation(index) {
        console.log('showNavigation called with index:', index);
        const tripData = this.getTripData();
        const plan = tripData[index];
        
        if (!plan) {
            console.error('Plan not found for index:', index);
            return;
        }
        
        console.log('Plan found:', plan);
        
        const origin = this.currentLocation ? 
            `${this.currentLocation.lat},${this.currentLocation.lng}` : '当前位置';
        const destination = plan.coordinates ? 
            `${plan.coordinates.lat},${plan.coordinates.lng}` : plan.location;
        
        console.log('Origin:', origin, 'Destination:', destination);
        
        // 更新地图模态框内容
        document.getElementById('routeOrigin').textContent = origin;
        document.getElementById('routeDestination').textContent = plan.location;
        
        // 更新模态框标题
        document.getElementById('mapModalTitle').textContent = `路线导航 - ${plan.title}`;
        
        // 显示地图模态框
        this.showMapModal();
        
        // 加载地图
        this.loadMap(origin, destination, plan.location);
    }

    // 从侧边栏打开打车
    openTaxiFromSidebar() {
        if (this.currentActionPlanIndex !== undefined) {
            this.openTaxi(this.currentActionPlanIndex);
        }
    }
    
    // 打开打车
    openTaxi(index) {
        const tripData = this.getTripData();
        const plan = tripData[index];
        
        if (!plan) return;
        
        // 创建打车模态框内容
        const taxiContent = `
            <div class="taxi-info">
                <div class="taxi-route">
                    <div class="route-point">
                        <i class="fas fa-map-marker-alt start"></i>
                        <span>当前位置</span>
                    </div>
                    <div class="route-arrow">
                        <i class="fas fa-arrow-down"></i>
                    </div>
                    <div class="route-point">
                        <i class="fas fa-map-marker-alt end"></i>
                        <span>${plan.location}</span>
                    </div>
                </div>
                <div class="taxi-estimate">
                    <div class="estimate-item">
                        <i class="fas fa-clock"></i>
                        <span>预计时间：15-25分钟</span>
                    </div>
                    <div class="estimate-item">
                        <i class="fas fa-yen-sign"></i>
                        <span>预计费用：¥25-35</span>
                    </div>
                </div>
                <div class="taxi-actions">
                    <button class="btn-primary" onclick="window.owlApp.openDidiTaxi()">
                        <i class="fas fa-taxi"></i>
                        打开滴滴打车
                    </button>
                    <button class="btn-secondary" onclick="window.owlApp.openGaoDeTaxi()">
                        <i class="fas fa-car"></i>
                        打开高德打车
                    </button>
                </div>
            </div>
        `;
        
        // 显示自定义模态框
        this.showCustomModal('打车服务', taxiContent);
    }

    // 显示地图模态框
    showMapModal() {
        console.log('showMapModal called');
        const mapModal = document.getElementById('mapModal');
        console.log('mapModal element:', mapModal);
        if (mapModal) {
            mapModal.style.display = 'block';
            console.log('Map modal display set to block');
        } else {
            console.error('mapModal element not found');
        }
    }

    // 隐藏地图模态框
    hideMapModal() {
        document.getElementById('mapModal').style.display = 'none';
    }

    // 加载地图
    loadMap(origin, destination, destinationName) {
        console.log('loadMap called with:', { origin, destination, destinationName });
        const mapContainer = document.getElementById('mapContainer');
        console.log('mapContainer element:', mapContainer);
        
        if (!mapContainer) {
            console.error('mapContainer element not found');
            return;
        }
        
        // 清空容器
        mapContainer.innerHTML = '';
        
        // 创建地图iframe
        const mapFrame = document.createElement('iframe');
        mapFrame.style.width = '100%';
        mapFrame.style.height = '300px';
        mapFrame.style.border = 'none';
        mapFrame.style.borderRadius = '10px';
        
        // 构建高德地图嵌入URL
        let mapUrl = 'https://uri.amap.com/marker?';
        if (origin && origin !== '当前位置') {
            mapUrl += `position=${origin}&`;
        }
        mapUrl += `position=${destination}&name=${encodeURIComponent(destinationName)}&src=mypage&coordinate=gaode&callnative=0`;
        
        console.log('Map URL:', mapUrl);
        
        mapFrame.src = mapUrl;
        mapContainer.appendChild(mapFrame);
        console.log('Map iframe added to container');
    }
    
    // 打开高德地图导航
    openAmapNavigation() {
        const origin = this.currentLocation ? 
            `${this.currentLocation.lat},${this.currentLocation.lng}` : '';
        const destination = document.getElementById('routeDestination').textContent;
        
        // 构建高德地图URL
        const url = `https://uri.amap.com/navigation?from=${origin}&to=${destination}&mode=car&policy=1&src=mypage&coordinate=gaode&callnative=0`;
        
        window.open(url, '_blank');
        this.hideMapModal();
    }

    // 打开导航
    openNavigation() {
        const tripData = this.getTripData();
        const currentPlan = tripData[this.currentPlanIndex];
        
        if (!currentPlan) {
            this.showModal('提示', '没有当前计划');
            return;
        }

        // 模拟打开高德地图
        const origin = this.currentLocation ? 
            `${this.currentLocation.lat},${this.currentLocation.lng}` : '';
        const destination = currentPlan.coordinates ? 
            `${currentPlan.coordinates.lat},${currentPlan.coordinates.lng}` : '';
        
        const url = `https://uri.amap.com/navigation?from=${origin}&to=${destination}&mode=car&policy=1&src=mypage&coordinate=gaode&callnative=0`;
        
        this.showModal(
            '导航',
            `即将打开高德地图导航到 ${currentPlan.location}\n出发地：当前位置\n目的地：${currentPlan.location}`,
            () => {
                window.open(url, '_blank');
            }
        );
    }

    // 打开滴滴打车
    openDidiTaxi() {
        const destination = document.getElementById('routeDestination').textContent;
        // 模拟打开滴滴打车
        this.showModal(
            '滴滴打车',
            `正在打开滴滴打车应用...\n目的地：${destination}`,
            () => {
                // 这里应该打开滴滴打车应用或网页
                alert('模拟打开滴滴打车应用');
            }
        );
        this.hideModal();
    }
    
    // 打开高德打车
    openGaoDeTaxi() {
        const destination = document.getElementById('routeDestination').textContent;
        // 模拟打开高德打车
        this.showModal(
            '高德打车',
            `正在打开高德打车应用...\n目的地：${destination}`,
            () => {
                // 这里应该打开高德打车应用或网页
                alert('模拟打开高德打车应用');
            }
        );
        this.hideModal();
    }
    
    // 打开打车
    openTaxi() {
        const tripData = this.getTripData();
        const currentPlan = tripData[this.currentPlanIndex];
        
        if (!currentPlan) {
            this.showModal('提示', '没有当前计划');
            return;
        }

        // 模拟打开滴滴打车
        this.showModal(
            '打车',
            `即将打开滴滴打车\n出发地：当前位置\n目的地：${currentPlan.location}\n请手动输入具体地址`,
            () => {
                // 这里应该打开滴滴打车应用或网页
                alert('模拟打开滴滴打车应用');
            }
        );
    }

    // 显示模态框
    showModal(title, message, onConfirm = null) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').textContent = message;
        document.getElementById('modal').style.display = 'block';
        
        // 重置按钮事件
        document.getElementById('modalConfirm').onclick = () => {
            if (onConfirm) {
                onConfirm();
            }
            this.hideModal();
        };
        
        // 隐藏取消按钮
        document.getElementById('modalCancel').style.display = 'none';
    }
    
    // 显示自定义模态框
    showCustomModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modal').style.display = 'block';
        
        // 隐藏默认按钮
        document.getElementById('modalConfirm').style.display = 'none';
        document.getElementById('modalCancel').style.display = 'none';
    }

    // 显示带选项的模态框
    showModalWithOptions(title, message, confirmText, cancelText, onConfirm, onCancel) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').textContent = message;
        document.getElementById('modal').style.display = 'block';
        
        // 设置按钮文本
        document.getElementById('modalConfirm').textContent = confirmText;
        document.getElementById('modalCancel').textContent = cancelText;
        
        // 显示取消按钮
        document.getElementById('modalCancel').style.display = 'block';
        
        // 设置按钮事件
        document.getElementById('modalConfirm').onclick = () => {
            if (onConfirm) {
                onConfirm();
            }
            this.hideModal();
        };
        
        document.getElementById('modalCancel').onclick = () => {
            if (onCancel) {
                onCancel();
            }
            this.hideModal();
        };
    }

    // 隐藏模态框
    hideModal() {
        document.getElementById('modal').style.display = 'none';
    }

    // 显示权限请求弹窗
    showPermissionModal() {
        document.getElementById('permissionModal').style.display = 'block';
    }

    // 隐藏权限请求弹窗
    hidePermissionModal() {
        document.getElementById('permissionModal').style.display = 'none';
    }

    // 清理资源
    destroy() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
        }
        
        if (this.mockLocationInterval) {
            clearInterval(this.mockLocationInterval);
        }
        
        this.reminderTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
    }

    // 页面切换
    switchPage(pageName) {
        // 隐藏所有页面
        document.querySelectorAll('.page-content').forEach(page => {
            page.style.display = 'none';
        });

        // 显示目标页面
        const targetPage = document.getElementById(pageName + 'Page');
        if (targetPage) {
            targetPage.style.display = 'block';
        }

        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

        // 定位信息和header发布动态按钮的显示/隐藏
        const locationInfo = document.getElementById('locationInfo');
        const postMomentBtnHeader = document.getElementById('postMomentBtnHeader');
        if (pageName === 'frogCircle') {
            if (locationInfo) locationInfo.style.display = 'none';
            if (postMomentBtnHeader) postMomentBtnHeader.style.display = 'inline-flex';
            this.loadMoments();
        } else {
            if (locationInfo) locationInfo.style.display = '';
            if (postMomentBtnHeader) postMomentBtnHeader.style.display = 'none';
            if (pageName === 'profile') {
                this.loadProfile();
            } else if (pageName === 'myTrips') {
                this.loadMyTrips();
            }
        }
    }

    // 标签切换
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName + 'Trips').classList.add('active');
    }

    // 加载个人资料
    loadProfile() {
        const profile = JSON.parse(localStorage.getItem('userProfile')) || {
            name: '小青蛙',
            bio: '热爱旅行的小青蛙 🐸',
            avatar: 'https://picsum.photos/100/100?random=1'
        };

        document.getElementById('profileName').textContent = profile.name;
        document.getElementById('profileBio').textContent = profile.bio;
        document.getElementById('avatarImg').src = profile.avatar;
    }

    // 显示编辑资料模态框
    showEditProfileModal() {
        const profile = JSON.parse(localStorage.getItem('userProfile')) || {
            name: '小青蛙',
            bio: '热爱旅行的小青蛙 🐸'
        };

        document.getElementById('editName').value = profile.name;
        document.getElementById('editBio').value = profile.bio;
        document.getElementById('editProfileModal').style.display = 'flex';
    }

    // 隐藏编辑资料模态框
    hideEditProfileModal() {
        document.getElementById('editProfileModal').style.display = 'none';
    }

    // 保存个人资料
    saveProfile() {
        const name = document.getElementById('editName').value.trim();
        const bio = document.getElementById('editBio').value.trim();

        if (!name) {
            alert('请输入昵称');
            return;
        }

        const profile = {
            name: name,
            bio: bio,
            avatar: document.getElementById('avatarImg').src
        };

        localStorage.setItem('userProfile', JSON.stringify(profile));
        this.loadProfile();
        this.hideEditProfileModal();
    }

    // 处理头像上传
    handleAvatarUpload(files) {
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('avatarImg').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    // 加载蛙友圈动态
    loadMoments() {
        const moments = JSON.parse(localStorage.getItem('moments')) || this.getDefaultMoments();
        const momentsList = document.getElementById('momentsList');
        if (!momentsList) {
            console.error('momentsList element not found');
            return;
        }
        momentsList.innerHTML = '';

        moments.forEach(moment => {
            const momentElement = this.createMomentElement(moment);
            momentsList.appendChild(momentElement);
        });
    }

    // 获取默认动态数据
    getDefaultMoments() {
        return [
            {
                id: 1,
                username: '旅行达人小王',
                avatar: 'https://picsum.photos/40/40?random=1',
                content: '🌸 樱花季的日本真的太美了！浅草寺的樱花配上传统建筑，每一帧都是大片！分享几个拍照小技巧：1. 早上8点前光线最好 2. 用樱花做前景 3. 穿浅色衣服更上镜',
                images: ['https://picsum.photos/300/200?random=10', 'https://picsum.photos/300/200?random=11', 'https://picsum.photos/300/200?random=12'],
                time: '2小时前',
                likes: 156,
                comments: 23,
                location: '📍 日本·东京·浅草寺',
                tags: ['#樱花季', '#日本旅行', '#拍照技巧'],
                isLiked: false,
                isFollowed: true,
                userLevel: '金牌旅行家',
                commentsList: [
                    { username: '摄影小白', content: '太美了！请问用的什么相机？', time: '1小时前', likes: 5 },
                    { username: '日本控', content: '浅草寺确实值得一去，建议早上人少的时候去', time: '30分钟前', likes: 3 }
                ]
            },
            {
                id: 2,
                username: '背包客小李',
                avatar: 'https://picsum.photos/40/40?random=2',
                content: '🇰🇷 首尔弘大艺术区探店！发现了一家超有feel的咖啡店，装修风格很ins风，咖啡也很赞。推荐大家来打卡～',
                images: ['https://picsum.photos/300/200?random=13', 'https://picsum.photos/300/200?random=14'],
                time: '5小时前',
                likes: 89,
                comments: 15,
                location: '📍 韩国·首尔·弘大',
                tags: ['#首尔旅行', '#咖啡探店', '#弘大'],
                isLiked: true,
                isFollowed: false,
                userLevel: '资深背包客',
                commentsList: [
                    { username: '咖啡控', content: '求店名！下次去首尔一定要打卡', time: '3小时前', likes: 8 },
                    { username: '韩流迷', content: '弘大真的很多好店，建议多逛逛', time: '2小时前', likes: 4 }
                ]
            },
            {
                id: 3,
                username: '小青蛙',
                avatar: 'https://picsum.photos/40/40?random=3',
                content: '🐸 分享一个超实用的旅行小贴士！记得提前下载离线地图，这样即使没有网络也能导航哦！另外推荐几个必备APP：Google翻译、汇率转换器、当地交通APP',
                images: [],
                time: '1天前',
                likes: 234,
                comments: 31,
                location: '📍 旅行小贴士',
                tags: ['#旅行攻略', '#实用贴士', '#必备APP'],
                isLiked: false,
                isFollowed: true,
                userLevel: '官方账号',
                commentsList: [
                    { username: '新手旅行者', content: '太实用了！请问还有什么推荐的APP吗？', time: '20小时前', likes: 12 },
                    { username: '老司机', content: '离线地图确实很重要，我每次都会提前下载', time: '18小时前', likes: 7 }
                ]
            },
            {
                id: 4,
                username: '美食探索家',
                avatar: 'https://picsum.photos/40/40?random=4',
                content: '🍜 泰国曼谷必吃美食清单！1. 冬阴功汤 2. 泰式炒河粉 3. 芒果糯米饭 4. 青木瓜沙拉 5. 泰式奶茶。每一道都让人回味无穷！',
                images: ['https://picsum.photos/300/200?random=15', 'https://picsum.photos/300/200?random=16', 'https://picsum.photos/300/200?random=17', 'https://picsum.photos/300/200?random=18'],
                time: '2天前',
                likes: 567,
                comments: 45,
                location: '📍 泰国·曼谷',
                tags: ['#泰国美食', '#曼谷旅行', '#美食攻略'],
                isLiked: true,
                isFollowed: true,
                userLevel: '美食达人',
                commentsList: [
                    { username: '吃货小王', content: '看着就流口水了！请问这些店在哪里？', time: '1天前', likes: 15 },
                    { username: '泰式控', content: '冬阴功汤是我的最爱！', time: '1天前', likes: 9 }
                ]
            },
            {
                id: 5,
                username: '摄影大师',
                avatar: 'https://picsum.photos/40/40?random=5',
                content: '📸 富士山日出拍摄攻略！最佳拍摄时间：4-5月，建议凌晨4点到达五合目。器材推荐：广角镜头+三脚架。这张照片是用索尼A7R4拍摄的，后期用Lightroom调色',
                images: ['https://picsum.photos/300/200?random=19'],
                time: '3天前',
                likes: 892,
                comments: 67,
                location: '📍 日本·富士山',
                tags: ['#富士山', '#摄影技巧', '#日出拍摄'],
                isLiked: false,
                isFollowed: true,
                userLevel: '摄影大师',
                commentsList: [
                    { username: '摄影新手', content: '太震撼了！请问具体在哪个位置拍摄的？', time: '2天前', likes: 23 },
                    { username: '器材党', content: 'A7R4确实很强大，请问用的什么镜头？', time: '2天前', likes: 18 }
                ]
            },
            {
                id: 6,
                username: '欧洲游侠',
                avatar: 'https://picsum.photos/40/40?random=6',
                content: '🇫🇷 巴黎铁塔夜景太震撼了！建议傍晚时分去，既能拍到日落又能拍到夜景。记得提前预约，排队时间很长。分享一个小技巧：在夏乐宫拍摄角度最佳！',
                images: ['https://picsum.photos/300/200?random=20', 'https://picsum.photos/300/200?random=21', 'https://picsum.photos/300/200?random=22', 'https://picsum.photos/300/200?random=23', 'https://picsum.photos/300/200?random=24'],
                time: '4天前',
                likes: 723,
                comments: 52,
                location: '📍 法国·巴黎·埃菲尔铁塔',
                tags: ['#巴黎旅行', '#埃菲尔铁塔', '#夜景拍摄', '#欧洲游'],
                isLiked: true,
                isFollowed: false,
                userLevel: '欧洲专家',
                commentsList: [
                    { username: '巴黎迷', content: '夏乐宫确实是最佳拍摄点！请问用的什么相机？', time: '3天前', likes: 18 },
                    { username: '旅行小白', content: '请问需要提前多久预约？', time: '3天前', likes: 12 }
                ]
            },
            {
                id: 7,
                username: '海岛控',
                avatar: 'https://picsum.photos/40/40?random=7',
                content: '🏝️ 马尔代夫的水屋体验太棒了！透明玻璃地板，躺在床上就能看到海底世界。推荐选择日落水屋，性价比最高。记得带防水相机，浮潜时能拍到很多美照！',
                images: ['https://picsum.photos/300/200?random=25', 'https://picsum.photos/300/200?random=26'],
                time: '1周前',
                likes: 445,
                comments: 38,
                location: '📍 马尔代夫·马累',
                tags: ['#马尔代夫', '#海岛度假', '#水屋体验', '#浮潜'],
                isLiked: false,
                isFollowed: true,
                userLevel: '海岛达人',
                commentsList: [
                    { username: '度假控', content: '请问哪个岛的水屋性价比最高？', time: '6天前', likes: 16 },
                    { username: '潜水爱好者', content: '浮潜能看到什么鱼？', time: '5天前', likes: 8 }
                ]
            },
            {
                id: 8,
                username: '文化探索者',
                avatar: 'https://picsum.photos/40/40?random=8',
                content: '🏛️ 罗马斗兽场的历史感太震撼了！建议购买VIP门票，可以进入地下区域。最佳参观时间是早上9点，人少光线好。记得下载语音导览，了解历史背景很重要！',
                images: ['https://picsum.photos/300/200?random=27'],
                time: '1周前',
                likes: 334,
                comments: 29,
                location: '📍 意大利·罗马·斗兽场',
                tags: ['#罗马旅行', '#斗兽场', '#历史文化', '#意大利'],
                isLiked: true,
                isFollowed: false,
                userLevel: '文化学者',
                commentsList: [
                    { username: '历史迷', content: '地下区域有什么特别的？', time: '6天前', likes: 14 },
                    { username: '建筑爱好者', content: '请问建筑结构有什么特点？', time: '5天前', likes: 7 }
                ]
            },
            {
                id: 9,
                username: '滑雪达人',
                avatar: 'https://picsum.photos/40/40?random=9',
                content: '⛷️ 北海道二世谷滑雪场太棒了！粉雪质量超好，适合各种水平的滑雪者。推荐住在滑雪场附近，方便早起抢第一趟缆车。记得租用专业装备，安全第一！',
                images: ['https://picsum.photos/300/200?random=28', 'https://picsum.photos/300/200?random=29', 'https://picsum.photos/300/200?random=30'],
                time: '2周前',
                likes: 289,
                comments: 41,
                location: '📍 日本·北海道·二世谷',
                tags: ['#北海道', '#滑雪', '#二世谷', '#冬季运动'],
                isLiked: false,
                isFollowed: true,
                userLevel: '滑雪专家',
                commentsList: [
                    { username: '滑雪新手', content: '请问适合初学者吗？', time: '1周前', likes: 11 },
                    { username: '装备控', content: '推荐什么品牌的滑雪板？', time: '1周前', likes: 9 }
                ]
            },
            {
                id: 10,
                username: '沙漠探险家',
                avatar: 'https://picsum.photos/40/40?random=10',
                content: '🏜️ 撒哈拉沙漠的星空太美了！建议参加3天2夜的沙漠团，体验骆驼骑行、沙漠露营。晚上看星星，早上看日出，绝对是一生难忘的经历！',
                images: ['https://picsum.photos/300/200?random=31', 'https://picsum.photos/300/200?random=32', 'https://picsum.photos/300/200?random=33', 'https://picsum.photos/300/200?random=34'],
                time: '3周前',
                likes: 678,
                comments: 56,
                location: '📍 摩洛哥·撒哈拉沙漠',
                tags: ['#撒哈拉沙漠', '#沙漠探险', '#星空摄影', '#摩洛哥'],
                isLiked: true,
                isFollowed: true,
                userLevel: '探险家',
                commentsList: [
                    { username: '星空控', content: '请问能看到银河吗？', time: '2周前', likes: 22 },
                    { username: '摄影爱好者', content: '星空拍摄需要什么器材？', time: '2周前', likes: 18 }
                ]
            },
            {
                id: 11,
                username: '城市漫步者',
                avatar: 'https://picsum.photos/40/40?random=11',
                content: '🌃 纽约时代广场的夜景太震撼了！建议晚上8点后去，霓虹灯最亮。记得带三脚架，长曝光拍摄效果更好。推荐在百老汇看一场音乐剧，体验真正的纽约文化！',
                images: ['https://picsum.photos/300/200?random=35'],
                time: '1个月前',
                likes: 456,
                comments: 33,
                location: '📍 美国·纽约·时代广场',
                tags: ['#纽约旅行', '#时代广场', '#夜景拍摄', '#百老汇'],
                isLiked: false,
                isFollowed: false,
                userLevel: '城市探索者',
                commentsList: [
                    { username: '纽约客', content: '推荐看哪部音乐剧？', time: '3周前', likes: 15 },
                    { username: '摄影新手', content: '请问相机参数怎么设置？', time: '3周前', likes: 12 }
                ]
            },
            {
                id: 12,
                username: '温泉爱好者',
                avatar: 'https://picsum.photos/40/40?random=12',
                content: '♨️ 箱根温泉之旅太放松了！推荐住一晚温泉旅馆，体验日式服务。记得提前预约，旺季很难订到。泡温泉时注意时间，不要超过15分钟。',
                images: ['https://picsum.photos/300/200?random=36', 'https://picsum.photos/300/200?random=37'],
                time: '1个月前',
                likes: 234,
                comments: 28,
                location: '📍 日本·箱根',
                tags: ['#箱根温泉', '#日本温泉', '#放松旅行', '#日式体验'],
                isLiked: true,
                isFollowed: false,
                userLevel: '温泉专家',
                commentsList: [
                    { username: '温泉控', content: '推荐哪家温泉旅馆？', time: '3周前', likes: 13 },
                    { username: '日本迷', content: '有什么注意事项吗？', time: '3周前', likes: 8 }
                ]
            }
        ];
    }

    // 创建动态元素
    createMomentElement(moment) {
        const momentDiv = document.createElement('div');
        momentDiv.className = 'moment-item';
        
        // 生成图片网格
        const imageGrid = this.generateImageGrid(moment.images);
        
        // 生成标签
        const tagsHtml = moment.tags ? moment.tags.map(tag => `<span class="moment-tag">${tag}</span>`).join('') : '';
        
        // 生成评论预览
        const commentsPreview = this.generateCommentsPreview(moment.commentsList);
        
        momentDiv.innerHTML = `
            <div class="moment-header">
                <div class="moment-user-section">
                    <img src="${moment.avatar}" alt="头像" class="moment-avatar">
                    <div class="moment-user-info">
                        <div class="moment-username">
                            ${moment.username}
                            ${moment.userLevel ? `<span class="user-level">${moment.userLevel}</span>` : ''}
                        </div>
                        <div class="moment-meta">
                            <span class="moment-time">${moment.time}</span>
                            ${moment.location ? `<span class="moment-location">${moment.location}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="moment-actions-header">
                    ${moment.isFollowed ? '<button class="follow-btn followed">已关注</button>' : '<button class="follow-btn">关注</button>'}
                    <button class="more-btn">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
            </div>
            
            <div class="moment-content">${moment.content}</div>
            
            ${tagsHtml ? `<div class="moment-tags">${tagsHtml}</div>` : ''}
            
            ${imageGrid}
            
            <div class="moment-stats">
                <div class="moment-stat">
                    <i class="fas fa-eye"></i>
                    <span>${Math.floor(moment.likes * 3.5)}</span>
                </div>
            </div>
            
            ${commentsPreview}
            
            <div class="moment-actions">
                <button class="action-btn like-btn ${moment.isLiked ? 'liked' : ''}" data-moment-id="${moment.id}">
                    <i class="${moment.isLiked ? 'fas' : 'far'} fa-heart"></i>
                    <span>${moment.likes}</span>
                </button>
                <button class="action-btn comment-btn" data-moment-id="${moment.id}">
                    <i class="far fa-comment"></i>
                    <span>${moment.comments}</span>
                </button>
                <button class="action-btn share-btn">
                    <i class="fas fa-share"></i>
                    <span>分享</span>
                </button>
                <button class="action-btn collect-btn">
                    <i class="far fa-bookmark"></i>
                    <span>收藏</span>
                </button>
            </div>
        `;
        
        // 绑定事件
        this.bindMomentEvents(momentDiv, moment);
        
        return momentDiv;
    }

    // 生成图片网格
    generateImageGrid(images) {
        if (!images || images.length === 0) return '';
        
        if (images.length === 1) {
            return `<div class="moment-images single">
                <img src="${images[0]}" alt="动态图片" class="moment-image">
            </div>`;
        }
        
        if (images.length === 2) {
            return `<div class="moment-images double">
                <img src="${images[0]}" alt="动态图片" class="moment-image">
                <img src="${images[1]}" alt="动态图片" class="moment-image">
            </div>`;
        }
        
        if (images.length === 3) {
            return `<div class="moment-images triple">
                <img src="${images[0]}" alt="动态图片" class="moment-image">
                <img src="${images[1]}" alt="动态图片" class="moment-image">
                <img src="${images[2]}" alt="动态图片" class="moment-image">
            </div>`;
        }
        
        // 4张或更多图片
        const displayImages = images.slice(0, 4);
        const remainingCount = images.length - 4;
        
        return `<div class="moment-images grid">
            ${displayImages.map((img, index) => `
                <div class="image-container">
                    <img src="${img}" alt="动态图片" class="moment-image">
                    ${index === 3 && remainingCount > 0 ? `<div class="image-overlay">+${remainingCount}</div>` : ''}
                </div>
            `).join('')}
        </div>`;
    }

    // 生成评论预览
    generateCommentsPreview(commentsList) {
        if (!commentsList || commentsList.length === 0) return '';
        
        const previewComments = commentsList.slice(0, 2);
        return `<div class="comments-preview">
            ${previewComments.map(comment => `
                <div class="comment-preview-item">
                    <span class="comment-username">${comment.username}</span>
                    <span class="comment-content">${comment.content}</span>
                </div>
            `).join('')}
            ${commentsList.length > 2 ? `<div class="more-comments">查看全部${commentsList.length}条评论</div>` : ''}
        </div>`;
    }

    // 绑定动态事件
    bindMomentEvents(momentDiv, moment) {
        // 点赞事件
        const likeBtn = momentDiv.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLike(moment.id);
            });
        }

        // 评论事件
        const commentBtn = momentDiv.querySelector('.comment-btn');
        if (commentBtn) {
            commentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showCommentModal(moment.id);
            });
        }

        // 关注事件
        const followBtn = momentDiv.querySelector('.follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleFollow(moment.id);
            });
        }

        // 更多按钮事件（三个小点）
        const moreBtn = momentDiv.querySelector('.more-btn');
        if (moreBtn) {
            moreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showUserProfile(moment);
            });
        }

        // 图片点击事件
        const images = momentDiv.querySelectorAll('.moment-image');
        images.forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showImageModal(img.src);
            });
        });
    }

    // 切换点赞状态
    toggleLike(momentId) {
        const moments = JSON.parse(localStorage.getItem('moments')) || this.getDefaultMoments();
        const moment = moments.find(m => m.id === momentId);
        
        if (moment) {
            moment.isLiked = !moment.isLiked;
            moment.likes += moment.isLiked ? 1 : -1;
            localStorage.setItem('moments', JSON.stringify(moments));
            this.loadMoments();
        }
    }

    // 切换关注状态
    toggleFollow(momentId) {
        const moments = JSON.parse(localStorage.getItem('moments')) || this.getDefaultMoments();
        const moment = moments.find(m => m.id === momentId);
        
        if (moment) {
            moment.isFollowed = !moment.isFollowed;
            localStorage.setItem('moments', JSON.stringify(moments));
            this.loadMoments();
        }
    }

    // 显示评论模态框
    showCommentModal(momentId) {
        // 这里可以实现评论详情页面
        console.log('显示评论模态框:', momentId);
    }

    // 显示用户主页
    showUserProfile(moment) {
        // 生成用户数据
        const userData = this.generateUserProfileData(moment.username);
        
        // 填充用户信息
        document.getElementById('modalUserAvatar').src = moment.avatar;
        document.getElementById('modalUsername').textContent = moment.username;
        document.getElementById('modalUserLevel').textContent = moment.userLevel;
        document.getElementById('modalUserBio').textContent = userData.bio;
        document.getElementById('modalUserMoments').textContent = userData.moments;
        document.getElementById('modalUserFollowers').textContent = userData.followers;
        document.getElementById('modalUserFollowing').textContent = userData.following;
        
        // 生成用户最近动态
        this.generateUserMomentsList(userData.recentMoments);
        
        // 设置关注按钮状态
        const followBtn = document.getElementById('modalFollowBtn');
        if (moment.isFollowed) {
            followBtn.textContent = '已关注';
            followBtn.classList.add('followed');
        } else {
            followBtn.textContent = '关注';
            followBtn.classList.remove('followed');
        }
        
        // 显示模态框
        document.getElementById('userProfileModal').style.display = 'flex';
    }

    // 生成用户主页数据
    generateUserProfileData(username) {
        const userProfiles = {
            '旅行达人小王': {
                bio: '热爱旅行和摄影，去过20+个国家，分享旅行攻略和美照 📸',
                moments: 156,
                followers: 2340,
                following: 89,
                recentMoments: [
                    { content: '🌸 樱花季的日本真的太美了！', time: '2小时前', likes: 156 },
                    { content: '🇰🇷 首尔美食探店分享', time: '1天前', likes: 89 },
                    { content: '📸 富士山日出拍摄攻略', time: '3天前', likes: 234 }
                ]
            },
            '背包客小李': {
                bio: '背包旅行爱好者，喜欢探索小众景点，记录路上的美好时光 🎒',
                moments: 89,
                followers: 567,
                following: 234,
                recentMoments: [
                    { content: '🇰🇷 首尔弘大艺术区探店！', time: '5小时前', likes: 89 },
                    { content: '🏔️ 徒步尼泊尔安娜普尔纳', time: '2天前', likes: 156 },
                    { content: '🌊 巴厘岛冲浪体验', time: '1周前', likes: 78 }
                ]
            },
            '小青蛙': {
                bio: '官方账号，分享旅行小贴士和实用攻略 🐸',
                moments: 234,
                followers: 8900,
                following: 12,
                recentMoments: [
                    { content: '🐸 分享一个超实用的旅行小贴士！', time: '1天前', likes: 234 },
                    { content: '📱 推荐几个必备旅行APP', time: '3天前', likes: 189 },
                    { content: '💡 旅行省钱小技巧', time: '1周前', likes: 345 }
                ]
            },
            '美食探索家': {
                bio: '美食博主，走遍世界寻找美味，分享各地特色美食 🍜',
                moments: 567,
                followers: 12340,
                following: 156,
                recentMoments: [
                    { content: '🍜 泰国曼谷必吃美食清单！', time: '2天前', likes: 567 },
                    { content: '🍣 日本寿司制作技巧', time: '4天前', likes: 234 },
                    { content: '🍕 意大利披萨探店', time: '1周前', likes: 189 }
                ]
            },
            '摄影大师': {
                bio: '专业摄影师，擅长风景和人文摄影，分享拍摄技巧 📷',
                moments: 892,
                followers: 15600,
                following: 89,
                recentMoments: [
                    { content: '📸 富士山日出拍摄攻略！', time: '3天前', likes: 892 },
                    { content: '🌅 日落拍摄技巧分享', time: '5天前', likes: 456 },
                    { content: '📱 手机摄影小技巧', time: '1周前', likes: 234 }
                ]
            }
        };
        
        return userProfiles[username] || {
            bio: '热爱旅行的用户，分享美好时光 ✈️',
            moments: Math.floor(Math.random() * 100) + 50,
            followers: Math.floor(Math.random() * 1000) + 100,
            following: Math.floor(Math.random() * 200) + 50,
            recentMoments: [
                { content: '分享一次美好的旅行经历', time: '1天前', likes: Math.floor(Math.random() * 100) + 50 },
                { content: '发现了一个很棒的地方', time: '3天前', likes: Math.floor(Math.random() * 100) + 30 },
                { content: '旅行中的小确幸', time: '1周前', likes: Math.floor(Math.random() * 100) + 20 }
            ]
        };
    }

    // 生成用户最近动态列表
    generateUserMomentsList(recentMoments) {
        const momentsList = document.getElementById('modalUserMomentsList');
        momentsList.innerHTML = '';
        
        recentMoments.forEach(moment => {
            const momentElement = document.createElement('div');
            momentElement.className = 'modal-moment-item';
            momentElement.innerHTML = `
                <div class="modal-moment-content">${moment.content}</div>
                <div class="modal-moment-meta">
                    <span class="modal-moment-time">${moment.time}</span>
                    <span class="modal-moment-likes">❤️ ${moment.likes}</span>
                </div>
            `;
            momentsList.appendChild(momentElement);
        });
    }

    // 隐藏用户主页模态框
    hideUserProfileModal() {
        const modal = document.getElementById('userProfileModal');
        if (modal) {
            modal.style.display = 'none';
            console.log('用户主页模态框已关闭');
        } else {
            console.error('未找到用户主页模态框元素');
        }
    }

    // 切换模态框中的关注状态
    toggleModalFollow() {
        const followBtn = document.getElementById('modalFollowBtn');
        const isFollowed = followBtn.classList.contains('followed');
        
        if (isFollowed) {
            followBtn.textContent = '关注';
            followBtn.classList.remove('followed');
        } else {
            followBtn.textContent = '已关注';
            followBtn.classList.add('followed');
        }
    }

    // 发送消息
    sendMessage() {
        alert('消息功能开发中...');
    }

    // 显示发布动态模态框
    showPostMomentModal() {
        document.getElementById('postMomentModal').style.display = 'flex';
        document.getElementById('momentContent').value = '';
        document.getElementById('momentImagePreview').innerHTML = '';
    }

    // 隐藏发布动态模态框
    hidePostMomentModal() {
        document.getElementById('postMomentModal').style.display = 'none';
    }

    // 发布动态
    publishMoment() {
        const content = document.getElementById('momentContent').value.trim();
        if (!content) {
            alert('请输入动态内容');
            return;
        }

        const moment = {
            id: Date.now(),
            username: JSON.parse(localStorage.getItem('userProfile'))?.name || '小青蛙',
            avatar: document.getElementById('avatarImg').src,
            content: content,
            images: [], // 这里可以添加图片处理逻辑
            time: '刚刚',
            likes: 0,
            comments: 0,
            location: '📍 旅行分享',
            tags: this.extractTags(content),
            isLiked: false,
            isFollowed: false,
            userLevel: '旅行新手',
            commentsList: []
        };

        const moments = JSON.parse(localStorage.getItem('moments')) || [];
        moments.unshift(moment);
        localStorage.setItem('moments', JSON.stringify(moments));

        this.loadMoments();
        this.hidePostMomentModal();
    }

    // 提取标签
    extractTags(content) {
        const tagRegex = /#([^#\s]+)/g;
        const tags = [];
        let match;
        while ((match = tagRegex.exec(content)) !== null) {
            tags.push(`#${match[1]}`);
        }
        return tags;
    }

    // 处理动态图片上传
    handleMomentImageUpload(files) {
        const preview = document.getElementById('momentImagePreview');
        preview.innerHTML = '';

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '8px';
                img.style.marginRight = '8px';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    // 加载热门行程
    loadHotTrips() {
        // 热门行程页面现在主要显示路线选择器
        // 可以在这里添加其他热门内容，比如推荐行程、用户评价等
        const hotTripsList = document.getElementById('hotTripsList');
        if (!hotTripsList) return;
        hotTripsList.innerHTML = `
            <div class="hot-trips-section">
                <h3>🌟 推荐行程</h3>
                <div class="recommended-trips">
                    <div class="recommended-trip">
                        <div class="trip-badge">🔥 最热门</div>
                        <h4>樱花季日本深度游</h4>
                        <p>春季限定，包含富士山、京都古寺等经典景点，体验日本传统文化与现代都市的完美融合。</p>
                        <div class="trip-highlights">
                            <span>🌸 樱花观赏</span>
                            <span>🏯 古寺探访</span>
                            <span>🍜 美食体验</span>
                        </div>
                    </div>
                    <div class="recommended-trip">
                        <div class="trip-badge">⭐ 高评分</div>
                        <h4>首尔时尚购物游</h4>
                        <p>韩国时尚之都，明洞购物、弘大艺术区、江南时尚街，让你体验最in的韩流文化。</p>
                        <div class="trip-highlights">
                            <span>🛍️ 时尚购物</span>
                            <span>🎨 艺术体验</span>
                            <span>🍖 韩式美食</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 加载我的行程
    loadMyTrips() {
        const myTrips = JSON.parse(localStorage.getItem('myTrips')) || [
            {
                route: '上海 → 日本',
                tripId: 'shanghai-japan-3days', // 新增唯一标识
                status: 'ongoing',
                progress: 60,
                startDate: '2024-01-15',
                endDate: '2024-01-17'
            },
            {
                route: '北京 → 韩国',
                tripId: 'beijing-korea-2days', // 新增唯一标识
                status: 'completed',
                progress: 100,
                startDate: '2024-01-10',
                endDate: '2024-01-11'
            }
        ];

        this.renderMyTrips(myTrips);
    }

    // 渲染我的行程
    renderMyTrips(trips) {
        const ongoingTrips = document.getElementById('ongoingTrips');
        const completedTrips = document.getElementById('completedTrips');

        ongoingTrips.innerHTML = '';
        completedTrips.innerHTML = '';

        trips.forEach(trip => {
            const tripElement = this.createTripElement(trip);
            if (trip.status === 'ongoing') {
                ongoingTrips.appendChild(tripElement);
            } else {
                completedTrips.appendChild(tripElement);
            }
        });
    }

    // 创建行程元素
    createTripElement(trip) {
        const tripDiv = document.createElement('div');
        tripDiv.className = 'trip-item';
        tripDiv.setAttribute('data-trip-id', trip.tripId || ''); // 新增属性
        tripDiv.innerHTML = `
            <div class="trip-item-header">
                <div class="trip-route">${trip.route}</div>
                <div class="trip-status ${trip.status}">
                    ${trip.status === 'ongoing' ? '进行中' : '已完成'}
                </div>
            </div>
            <div class="trip-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${trip.progress}%"></div>
                </div>
            </div>
            <div class="trip-info">
                <span>${trip.startDate} - ${trip.endDate}</span>
                <span>${trip.progress}% 完成</span>
            </div>
        `;
        // 新增：点击跳转到行程详情页
        tripDiv.addEventListener('click', () => {
            if (trip.tripId) {
                window.location.href = `trip.html?trip=${trip.tripId}`;
            } else {
                alert('未找到该行程的详细信息');
            }
        });
        return tripDiv;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.owlApp = new OwlApp();
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (window.owlApp) {
        window.owlApp.destroy();
    }
}); 

// 强制美化"选择图片"按钮
function fixAvatarUploadBtnStyle() {
  const btn = document.querySelector('#editProfileModal .avatar-upload .btn-secondary');
  if (btn) {
    btn.style.background = '#f8f9fa';
    btn.style.color = '#667eea';
    btn.style.border = '2px solid #667eea';
    btn.style.borderRadius = '20px';
    btn.style.fontSize = '0.95rem';
    btn.style.fontWeight = '600';
    btn.style.padding = '0.7rem 1.2rem';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.gap = '0.5rem';
    btn.style.boxShadow = 'none';
    btn.style.width = 'auto';
    btn.style.minWidth = '110px';
    btn.onmouseover = function() {
      btn.style.background = '#667eea';
      btn.style.color = '#fff';
    };
    btn.onmouseout = function() {
      btn.style.background = '#f8f9fa';
      btn.style.color = '#667eea';
    };
  }
}

// 每次弹窗显示时都修正一次
const editProfileBtn = document.getElementById('editProfileBtn');
if (editProfileBtn) {
  editProfileBtn.addEventListener('click', () => {
    setTimeout(fixAvatarUploadBtnStyle, 100); // 弹窗动画后再修正
  });
} 

// 编辑资料页面头像更换
const editAvatarCamera = document.getElementById('editAvatarCamera');
const editAvatarInput = document.getElementById('editAvatarInput');
if (editAvatarCamera && editAvatarInput) {
    editAvatarCamera.addEventListener('click', function() {
        editAvatarInput.click();
    });
    editAvatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('editAvatarImg').src = evt.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
} 

// 可编辑昵称
const editNicknameDisplay = document.getElementById('editNicknameDisplay');
const editNicknameInput = document.getElementById('editNicknameInput');
if (editNicknameDisplay && editNicknameInput) {
    editNicknameDisplay.addEventListener('click', function() {
        editNicknameDisplay.style.display = 'none';
        editNicknameInput.style.display = 'inline-block';
        editNicknameInput.focus();
        editNicknameInput.select();
    });
    function saveNickname() {
        let val = editNicknameInput.value.trim();
        if (!val) val = '小青蛙';
        editNicknameDisplay.textContent = val;
        editNicknameInput.value = val;
        editNicknameDisplay.style.display = 'inline-block';
        editNicknameInput.style.display = 'none';
    }
    editNicknameInput.addEventListener('blur', saveNickname);
    editNicknameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveNickname();
        }
    });
}
// 可编辑简介
const editBioDisplay = document.getElementById('editBioDisplay');
const editBioInput = document.getElementById('editBioInput');
if (editBioDisplay && editBioInput) {
    editBioDisplay.addEventListener('click', function() {
        editBioDisplay.style.display = 'none';
        editBioInput.style.display = 'inline-block';
        editBioInput.focus();
        editBioInput.select();
    });
    function saveBio() {
        let val = editBioInput.value.trim();
        if (!val) val = '热爱旅行的小青蛙 🐸';
        editBioDisplay.textContent = val;
        editBioInput.value = val;
        editBioDisplay.style.display = 'inline-block';
        editBioInput.style.display = 'none';
    }
    editBioInput.addEventListener('blur', saveBio);
    editBioInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveBio();
        }
    });
}
// 保存按钮同步到我的页面
const saveProfileBtn2 = document.getElementById('saveProfileBtn');
if (saveProfileBtn2) {
    saveProfileBtn2.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('profileName').textContent = editNicknameDisplay.textContent;
        document.getElementById('profileBio').textContent = editBioDisplay.textContent;
        document.getElementById('avatarImg').src = document.getElementById('editAvatarImg').src;
        document.getElementById('editProfilePage').style.display = 'none';
        document.getElementById('profilePage').style.display = 'block';
    });
}

// 设置按钮弹窗逻辑
const settingsBtn = document.querySelector('.menu-item i.fa-cog')?.parentElement;
if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
        document.getElementById('settingsModal').style.display = 'flex';
    });
}
const settingsCloseBtn = document.getElementById('settingsCloseBtn');
if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', function() {
        document.getElementById('settingsModal').style.display = 'none';
    });
}
document.getElementById('settingsModal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.style.display = 'none';
    }
});
// 深色模式切换（仅切body类，实际可扩展）
const darkModeSwitch = document.getElementById('darkModeSwitch');
if (darkModeSwitch) {
    darkModeSwitch.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });
}