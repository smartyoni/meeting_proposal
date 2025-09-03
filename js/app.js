// 메인 애플리케이션 로직
class ProposalApp {
    constructor() {
        this.propertyCount = 0;
        this.currentTab = 'input'; // 현재 활성 탭 (모바일용)
        this.init();
        this.registerServiceWorker();
    }

    // 앱 초기화
    init() {
        this.createInitialProperties();
        this.loadSavedData();
        this.setupEventListeners();
        this.updatePreview();
        this.updateSavedProposalsList();
        console.log('매물 제안서 앱 초기화 완료');
    }

    // 초기 매물 입력 폼 생성 (기본 3개)
    createInitialProperties() {
        const container = document.getElementById('propertyContainer');
        container.innerHTML = '';
        
        for (let i = 0; i < CONFIG.app.defaultPropertyCount; i++) {
            this.addProperty();
        }
    }

    // 매물 추가
    addProperty() {
        if (this.propertyCount >= CONFIG.app.maxPropertyCount) {
            alert(`최대 ${CONFIG.app.maxPropertyCount}개까지만 추가할 수 있습니다.`);
            return;
        }

        this.propertyCount++;
        const container = document.getElementById('propertyContainer');
        
        const propertyDiv = document.createElement('div');
        propertyDiv.className = 'property-item fade-in';
        propertyDiv.setAttribute('data-property-id', this.propertyCount);
        
        propertyDiv.innerHTML = `
            <h4>🏠 매물 ${this.propertyCount}</h4>
            ${this.propertyCount > 1 ? '<button type="button" class="btn-remove" onclick="removeProperty(' + this.propertyCount + ')">×</button>' : ''}
            <textarea 
                id="property-${this.propertyCount}" 
                placeholder="매물 정보를 입력하세요."
                onchange="updatePreview()"
                oninput="autoSave()"
            ></textarea>
        `;
        
        container.appendChild(propertyDiv);
        
        // 스크롤을 새로 추가된 매물로 이동
        propertyDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        this.updatePreview();
    }

    // 매물 제거
    removeProperty(propertyId) {
        const propertyElement = document.querySelector(`[data-property-id="${propertyId}"]`);
        if (propertyElement) {
            propertyElement.remove();
            this.updatePreview();
            this.autoSave();
        }
    }

    // 미리보기 업데이트
    updatePreview() {
        this.updateCustomerInfo();
        this.updateProperties();
    }

    // 고객 정보 미리보기 업데이트
    updateCustomerInfo() {
        const customerName = document.getElementById('customerName').value || '고객명';
        const meetingDateValue = document.getElementById('meetingDate').value;
        const requirements = document.getElementById('customerRequirements').value || '고객 희망 조건이 여기에 표시됩니다.';

        // 날짜 시간 포맷팅
        let formattedDate = '일시 미입력';
        if (meetingDateValue) {
            const date = new Date(meetingDateValue);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            
            formattedDate = `${year}. ${month}. ${day}. ${hours}:${minutes}`;
        }

        document.getElementById('preview-customerName').textContent = customerName;
        document.getElementById('preview-meetingDate').textContent = formattedDate;
        document.getElementById('preview-requirements').textContent = requirements;
    }

    // 매물 정보 미리보기 업데이트
    updateProperties() {
        const container = document.getElementById('preview-properties');
        
        container.innerHTML = '';
        
        // 모든 매물 정보 처리
        const propertyElements = document.querySelectorAll('[id^="property-"]');
        let propertyIndex = 1;
        
        propertyElements.forEach(textarea => {
            const content = textarea.value.trim();
            if (!content) return;
            
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 2) return;
            
            // 매물 정보 파싱
            const propertyInfo = this.parsePropertyInfo(lines);
            
            if (propertyInfo.title) {
                // 매물 미리보기 생성
                const propertyDiv = document.createElement('div');
                propertyDiv.className = 'property-preview';
                
                let propertyHtml = `
                    <h3>${propertyIndex}. ${propertyInfo.title}</h3>
                    <div class="property-details">${propertyInfo.details}</div>
                `;
                
                // 부동산 정보가 있으면 매물 아래에 바로 표시
                if (propertyInfo.realtorInfo) {
                    propertyHtml += `
                        <div class="realtor-info property-realtor-info">
                            <strong>📞 문의:</strong> ${propertyInfo.realtorInfo}
                        </div>
                    `;
                }
                
                propertyDiv.innerHTML = propertyHtml;
                container.appendChild(propertyDiv);
                propertyIndex++;
            }
        });
    }

    // 매물 정보 파싱
    parsePropertyInfo(lines) {
        if (lines.length < 2) return { title: '', details: '', realtorInfo: '' };
        
        // 첫 번째 줄은 헤더로 건너뛰고, 두 번째 줄을 제목으로 사용
        const title = lines[1].replace(/^➡️/, '').trim();
        
        // 마지막 줄을 부동산 정보로 분리
        const lastLine = lines[lines.length - 1];
        let realtorInfo = '';
        let detailLines = lines.slice(2); // 3번째 줄부터
        
        // 마지막 줄이 연락처 정보인지 확인 (전화번호나 사무소명 포함)
        if (lastLine.includes('중개사') || lastLine.includes('공인') || lastLine.match(/\d{2,3}-\d{3,4}-\d{4}/)) {
            realtorInfo = lastLine.replace(/^➡️문\s*의\s*:\s*/, '').trim();
            detailLines = lines.slice(2, -1); // 마지막 줄 제외
        }
        
        // 상세 정보를 체크박스 스타일로 변환
        const details = this.formatDetailsWithIcons(detailLines);
        
        return {
            title,
            details,
            realtorInfo
        };
    }

    // 매물 상세 정보를 아이콘과 함께 포맷팅
    formatDetailsWithIcons(detailLines) {
        return detailLines.map(line => {
            const cleanLine = line.replace(/^➡️/, '').trim();
            let className = 'detail-item';
            
            // 항목별로 다른 아이콘 적용
            if (cleanLine.includes('전세:') || cleanLine.includes('매매:') || cleanLine.includes('월세:')) {
                className += ' price';
            } else if (cleanLine.includes('정 보:') || cleanLine.includes('면적:')) {
                className += ' info';
            } else if (cleanLine.includes('특 징:') || cleanLine.includes('향:')) {
                className += ' feature';
            } else if (cleanLine.includes('공개비고:') || cleanLine.includes('비고:')) {
                className += ' note';
            }
            
            return `<div class="${className}">${cleanLine}</div>`;
        }).join('');
    }

    // 자동 저장
    autoSave() {
        if (!CONFIG.app.storage.autoSave) return;
        
        try {
            const customerData = {
                name: document.getElementById('customerName').value,
                meetingDate: document.getElementById('meetingDate').value,
                requirements: document.getElementById('customerRequirements').value
            };
            
            const propertyData = [];
            document.querySelectorAll('[id^="property-"]').forEach(textarea => {
                if (textarea.value.trim()) {
                    propertyData.push(textarea.value);
                }
            });
            
            firebaseManager.saveToLocalStorage({ customer: customerData, properties: propertyData });
        } catch (error) {
            console.error('자동 저장 실패:', error);
        }
    }

    // 저장된 데이터 불러오기
    loadSavedData() {
        try {
            const savedData = firebaseManager.loadFromLocalStorage();
            
            if (savedData.customer) {
                const { name, meetingDate, requirements } = savedData.customer;
                if (name) document.getElementById('customerName').value = name;
                if (meetingDate) document.getElementById('meetingDate').value = meetingDate;
                if (requirements) document.getElementById('customerRequirements').value = requirements;
            }
            
            if (savedData.properties && savedData.properties.length > 0) {
                // 기존 매물 폼 제거
                document.getElementById('propertyContainer').innerHTML = '';
                this.propertyCount = 0;
                
                // 저장된 매물 데이터로 폼 재생성
                savedData.properties.forEach(propertyText => {
                    this.addProperty();
                    const lastPropertyTextarea = document.querySelector(`#property-${this.propertyCount}`);
                    if (lastPropertyTextarea) {
                        lastPropertyTextarea.value = propertyText;
                    }
                });
            }
            
            console.log('저장된 데이터 불러오기 완료');
        } catch (error) {
            console.error('데이터 불러오기 실패:', error);
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 모바일 탭 전환 이벤트는 전역 함수로 처리됨
        
        // 폼 입력 이벤트
        ['customerName', 'meetingDate', 'customerRequirements'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updatePreview();
                    this.autoSave();
                });
            }
        });

        // 페이지 언로드 시 자동 저장
        window.addEventListener('beforeunload', () => {
            this.autoSave();
        });

        // 주기적 자동 저장 (30초마다)
        setInterval(() => {
            this.autoSave();
        }, 30000);
    }

    // PDF 다운로드
    async downloadAsPDF() {
        await this.downloadImage('pdf');
    }

    // PNG 다운로드
    async downloadAsPNG() {
        await this.downloadImage('png');
    }

    // JPEG 다운로드
    async downloadAsJPG() {
        await this.downloadImage('jpg');
    }

    // 통합 이미지 다운로드 함수
    async downloadImage(format) {
        const reportElement = document.getElementById('report-container');
        
        // 부동산 정보 포함 여부 확인
        const includeRealtorInfo = document.getElementById('includeRealtorInfo').checked;
        const propertyRealtorInfoElements = document.querySelectorAll('.property-realtor-info');
        const originalDisplays = [];
        
        try {
            // 다운로드 중 표시
            const downloadBtn = document.querySelector(`.${format}-btn`);
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = '생성 중...';
            downloadBtn.disabled = true;
            
            // 부동산 정보 포함하지 않는 경우 각 매물별 부동산 정보 임시 숨김
            if (!includeRealtorInfo) {
                propertyRealtorInfoElements.forEach((element, index) => {
                    originalDisplays[index] = element.style.display;
                    element.style.display = 'none';
                });
            }
            
            // HTML2Canvas로 이미지 생성
            const canvas = await html2canvas(reportElement, {
                scale: 2, // 고해상도
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            
            // 파일명 생성
            const customerName = document.getElementById('customerName').value || '고객';
            const today = new Date().toISOString().split('T')[0];
            const filename = `${CONFIG.app.download.filename}_${customerName}_${today}.${format}`;
            
            if (format === 'pdf') {
                // PDF 생성 (jsPDF 필요 - 나중에 구현)
                alert('PDF 다운로드는 준비 중입니다. JPG 또는 PNG를 이용해주세요.');
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
                return;
            }
            
            // 이미지 형식에 따른 변환
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            const quality = format === 'jpg' ? CONFIG.app.download.quality : 1.0;
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                // 버튼 상태 복원
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
                
                // Firebase Storage에 업로드 (활성화된 경우)
                if (CONFIG.firebase.enabled) {
                    firebaseManager.uploadImage(blob, filename);
                }
                
                console.log(`${format.toUpperCase()} 다운로드 완료:`, filename);
                
            }, mimeType, quality);
            
        } catch (error) {
            console.error('다운로드 실패:', error);
            alert('다운로드 중 오류가 발생했습니다. 다시 시도해 주세요.');
            
            // 버튼 상태 복원
            const downloadBtn = document.querySelector(`.${format}-btn`);
            downloadBtn.textContent = downloadBtn.textContent.replace('생성 중...', originalText);
            downloadBtn.disabled = false;
        } finally {
            // 각 매물별 부동산 정보 원래 상태로 복원
            if (!includeRealtorInfo) {
                propertyRealtorInfoElements.forEach((element, index) => {
                    element.style.display = originalDisplays[index] || 'block';
                });
            }
        }
    }

    // 전체 필드 초기화
    resetAllFields() {
        // 확인 대화상자
        if (!confirm('모든 입력 내용을 초기화하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        // 고객 정보 초기화
        document.getElementById('customerName').value = '';
        document.getElementById('meetingDate').value = '';
        document.getElementById('customerRequirements').value = '';

        // 매물 정보 초기화
        document.getElementById('propertyContainer').innerHTML = '';
        this.propertyCount = 0;

        // 기본 1개 매물 다시 생성
        this.createInitialProperties();

        // 로컬 스토리지 초기화
        localStorage.removeItem(CONFIG.app.storage.customerData);
        localStorage.removeItem(CONFIG.app.storage.propertyData);

        // 미리보기 업데이트
        this.updatePreview();

        console.log('모든 필드가 초기화되었습니다.');
        
        // 성공 메시지 표시 (선택사항)
        setTimeout(() => {
            alert('✅ 모든 내용이 초기화되었습니다.');
        }, 100);
    }

    // Service Worker 등록
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then((registration) => {
                        console.log('✅ Service Worker 등록 성공:', registration.scope);
                        
                        // 업데이트 확인
                        registration.addEventListener('updatefound', () => {
                            console.log('🔄 새 버전 발견');
                            const newWorker = registration.installing;
                            
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // 새 버전 사용 가능 알림
                                    this.showUpdateAvailable();
                                }
                            });
                        });
                    })
                    .catch((error) => {
                        console.error('❌ Service Worker 등록 실패:', error);
                    });

                // 앱 설치 프롬프트 처리
                this.setupInstallPrompt();
            });
        } else {
            console.log('❌ Service Worker를 지원하지 않는 브라우저입니다.');
        }
    }

    // 앱 설치 프롬프트 설정
    setupInstallPrompt() {
        let deferredPrompt;

        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('💾 앱 설치 프롬프트 준비됨');
            e.preventDefault();
            deferredPrompt = e;
            
            // 설치 버튼 표시 (필요시)
            this.showInstallButton(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA 앱이 설치되었습니다!');
            deferredPrompt = null;
            
            // 설치 완료 메시지
            setTimeout(() => {
                alert('🏠 매물 제안서 앱이 홈 화면에 설치되었습니다!');
            }, 1000);
        });
    }

    // 업데이트 알림 표시
    showUpdateAvailable() {
        if (confirm('🔄 새 버전이 사용 가능합니다.\n지금 업데이트하시겠습니까?')) {
            window.location.reload();
        }
    }

    // 설치 버튼 표시 (옵션)
    showInstallButton(prompt) {
        // 간단한 설치 안내 (필요시 UI에 버튼 추가 가능)
        console.log('📱 홈 화면에 앱을 추가할 수 있습니다.');
        
        // 자동으로 설치 프롬프트 표시 (옵션)
        // prompt.prompt();
    }

    // PWA 설치 상태 확인
    checkInstallStatus() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('📱 PWA 모드로 실행 중');
            return true;
        } else if (window.navigator.standalone === true) {
            console.log('🍎 iOS 홈 화면에서 실행 중');
            return true;
        }
        console.log('🌐 브라우저 모드로 실행 중');
        return false;
    }

    // 제안서 저장
    saveProposal() {
        const customerName = document.getElementById('customerName').value;
        const meetingDate = document.getElementById('meetingDate').value;
        
        if (!customerName) {
            alert('고객명을 입력해주세요.');
            return;
        }

        const proposalData = {
            id: Date.now(),
            customerName: customerName,
            meetingDate: meetingDate,
            customerRequirements: document.getElementById('customerRequirements').value,
            properties: this.collectPropertiesData(),
            savedAt: new Date().toLocaleString('ko-KR')
        };

        const savedProposals = this.getSavedProposals();
        savedProposals.unshift(proposalData);
        
        // 최대 50개까지만 저장
        if (savedProposals.length > 50) {
            savedProposals.splice(50);
        }

        localStorage.setItem('savedProposals', JSON.stringify(savedProposals));
        
        this.updateSavedProposalsList();
        alert(`"${customerName}" 고객님의 제안서가 저장되었습니다.`);
    }

    // 저장된 제안서 목록 가져오기
    getSavedProposals() {
        try {
            const saved = localStorage.getItem('savedProposals');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('저장된 제안서 불러오기 실패:', error);
            return [];
        }
    }

    // 매물 데이터 수집
    collectPropertiesData() {
        const properties = [];
        const container = document.getElementById('propertyContainer');
        const propertyForms = container.querySelectorAll('.property-form');
        
        propertyForms.forEach((form, index) => {
            const propertyData = {
                address: form.querySelector(`#address${index + 1}`)?.value || '',
                type: form.querySelector(`#type${index + 1}`)?.value || '',
                area: form.querySelector(`#area${index + 1}`)?.value || '',
                price: form.querySelector(`#price${index + 1}`)?.value || '',
                deposit: form.querySelector(`#deposit${index + 1}`)?.value || '',
                monthlyRent: form.querySelector(`#monthlyRent${index + 1}`)?.value || '',
                maintenanceFee: form.querySelector(`#maintenanceFee${index + 1}`)?.value || '',
                realtorName: form.querySelector(`#realtorName${index + 1}`)?.value || '',
                realtorPhone: form.querySelector(`#realtorPhone${index + 1}`)?.value || '',
                realtorAddress: form.querySelector(`#realtorAddress${index + 1}`)?.value || ''
            };
            properties.push(propertyData);
        });
        
        return properties;
    }

    // 제안서 불러오기
    loadProposal(proposalId) {
        const savedProposals = this.getSavedProposals();
        const proposal = savedProposals.find(p => p.id === proposalId);
        
        if (!proposal) {
            alert('제안서를 찾을 수 없습니다.');
            return;
        }

        // 기본 정보 설정
        document.getElementById('customerName').value = proposal.customerName || '';
        document.getElementById('meetingDate').value = proposal.meetingDate || '';
        document.getElementById('customerRequirements').value = proposal.customerRequirements || '';

        // 기존 매물 폼 초기화
        const container = document.getElementById('propertyContainer');
        container.innerHTML = '';
        this.propertyCount = 0;

        // 저장된 매물 데이터로 폼 생성
        if (proposal.properties && proposal.properties.length > 0) {
            proposal.properties.forEach((property, index) => {
                this.addProperty();
                const form = container.querySelector(`.property-form:nth-child(${index + 1})`);
                
                form.querySelector(`#address${index + 1}`).value = property.address || '';
                form.querySelector(`#type${index + 1}`).value = property.type || '';
                form.querySelector(`#area${index + 1}`).value = property.area || '';
                form.querySelector(`#price${index + 1}`).value = property.price || '';
                form.querySelector(`#deposit${index + 1}`).value = property.deposit || '';
                form.querySelector(`#monthlyRent${index + 1}`).value = property.monthlyRent || '';
                form.querySelector(`#maintenanceFee${index + 1}`).value = property.maintenanceFee || '';
                form.querySelector(`#realtorName${index + 1}`).value = property.realtorName || '';
                form.querySelector(`#realtorPhone${index + 1}`).value = property.realtorPhone || '';
                form.querySelector(`#realtorAddress${index + 1}`).value = property.realtorAddress || '';
            });
        } else {
            // 저장된 매물이 없으면 기본 1개 생성
            this.addProperty();
        }

        this.updatePreview();
        alert(`"${proposal.customerName}" 고객님의 제안서가 불러와졌습니다.`);
    }

    // 제안서 삭제
    deleteProposal(proposalId) {
        const savedProposals = this.getSavedProposals();
        const proposal = savedProposals.find(p => p.id === proposalId);
        
        if (!proposal) {
            alert('제안서를 찾을 수 없습니다.');
            return;
        }

        if (confirm(`"${proposal.customerName}" 고객님의 제안서를 삭제하시겠습니까?`)) {
            const filteredProposals = savedProposals.filter(p => p.id !== proposalId);
            localStorage.setItem('savedProposals', JSON.stringify(filteredProposals));
            this.updateSavedProposalsList();
            alert('제안서가 삭제되었습니다.');
        }
    }

    // 저장된 제안서 목록 업데이트
    updateSavedProposalsList() {
        const listContainer = document.getElementById('savedProposalsList');
        const savedProposals = this.getSavedProposals();
        
        if (savedProposals.length === 0) {
            listContainer.innerHTML = '<div class="empty-list">저장된 제안서가 없습니다.</div>';
            return;
        }

        let html = '';
        savedProposals.forEach(proposal => {
            const shortDate = proposal.meetingDate ? 
                new Date(proposal.meetingDate).toLocaleDateString('ko-KR') : '미지정';
            
            html += `
                <div class="saved-proposal-item">
                    <div class="proposal-info" onclick="app.loadProposal(${proposal.id})">
                        <h4>${proposal.customerName || '이름 없음'}</h4>
                        <p>미팅일시: ${shortDate} | 저장: ${proposal.savedAt}</p>
                    </div>
                    <div class="proposal-actions">
                        <button class="btn-load" onclick="app.loadProposal(${proposal.id})">불러오기</button>
                        <button class="btn-delete" onclick="app.deleteProposal(${proposal.id})">삭제</button>
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
    }
}

// 전역 함수들 (HTML에서 직접 호출)
let app;

// 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app = new ProposalApp();
});

// 탭 전환 (모바일)
function switchTab(tab) {
    const inputSection = document.getElementById('input-section');
    const previewSection = document.getElementById('preview-section');
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    // 탭 버튼 상태 업데이트
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    
    // 섹션 표시/숨김
    if (tab === 'input') {
        inputSection.classList.add('active');
        previewSection.classList.remove('active');
    } else {
        inputSection.classList.remove('active');
        previewSection.classList.add('active');
        // 미리보기 탭으로 전환 시 미리보기 업데이트
        if (app) {
            app.updatePreview();
        }
    }
    
    if (app) {
        app.currentTab = tab;
    }
}

// 매물 추가
function addProperty() {
    if (app) {
        app.addProperty();
    }
}

// 매물 제거
function removeProperty(propertyId) {
    if (app) {
        app.removeProperty(propertyId);
    }
}

// 미리보기 업데이트
function updatePreview() {
    if (app) {
        app.updatePreview();
    }
}

// PDF 다운로드
function downloadAsPDF() {
    if (app) {
        app.downloadAsPDF();
    }
}

// PNG 다운로드
function downloadAsPNG() {
    if (app) {
        app.downloadAsPNG();
    }
}

// JPG 다운로드
function downloadAsJPG() {
    if (app) {
        app.downloadAsJPG();
    }
}

// 전체 초기화
function resetAllFields() {
    if (app) {
        app.resetAllFields();
    }
}

// 레거시 지원
function downloadAsImage() {
    downloadAsJPG();
}

// 제안서 저장
function saveProposal() {
    if (app) {
        app.saveProposal();
    }
}

// 사이드바 토글
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        // 목록 업데이트
        if (app) {
            app.updateSavedProposalsList();
        }
    }
}