// Firebase 연동 모듈 (향후 확장용)
class FirebaseManager {
    constructor() {
        this.enabled = CONFIG.firebase.enabled;
        this.db = null;
        this.auth = null;
        
        if (this.enabled) {
            this.initialize();
        }
    }
    
    // Firebase 초기화
    async initialize() {
        try {
            // Firebase SDK 로드 (CDN 방식)
            if (typeof firebase === 'undefined') {
                console.log('Firebase SDK 로드 중...');
                await this.loadFirebaseSDK();
            }
            
            // Firebase 설정
            const firebaseConfig = {
                apiKey: CONFIG.firebase.apiKey,
                authDomain: CONFIG.firebase.authDomain,
                projectId: CONFIG.firebase.projectId,
                storageBucket: CONFIG.firebase.storageBucket,
                messagingSenderId: CONFIG.firebase.messagingSenderId,
                appId: CONFIG.firebase.appId
            };
            
            // Firebase 앱 초기화
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            this.storage = firebase.storage();
            
            console.log('Firebase 초기화 완료');
            
        } catch (error) {
            console.error('Firebase 초기화 실패:', error);
            this.enabled = false;
        }
    }
    
    // Firebase SDK 동적 로드
    loadFirebaseSDK() {
        return new Promise((resolve, reject) => {
            const scripts = [
                'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js',
                'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js',
                'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js',
                'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js'
            ];
            
            let loadedCount = 0;
            
            scripts.forEach(src => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => {
                    loadedCount++;
                    if (loadedCount === scripts.length) {
                        resolve();
                    }
                };
                script.onerror = () => reject(new Error(`Failed to load ${src}`));
                document.head.appendChild(script);
            });
        });
    }
    
    // 데이터 저장
    async saveProposal(data) {
        if (!this.enabled || !this.db) {
            return this.saveToLocalStorage(data);
        }
        
        try {
            const docRef = await this.db.collection('proposals').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Firebase에 저장 완료:', docRef.id);
            return docRef.id;
            
        } catch (error) {
            console.error('Firebase 저장 실패:', error);
            return this.saveToLocalStorage(data);
        }
    }
    
    // 로컬 스토리지에 저장 (백업 방식)
    saveToLocalStorage(data) {
        try {
            localStorage.setItem(CONFIG.app.storage.customerData, JSON.stringify(data.customer || {}));
            localStorage.setItem(CONFIG.app.storage.propertyData, JSON.stringify(data.properties || []));
            console.log('로컬 스토리지에 저장 완료');
            return 'local_' + Date.now();
        } catch (error) {
            console.error('로컬 스토리지 저장 실패:', error);
            return null;
        }
    }
    
    // 데이터 불러오기
    async loadProposal(id) {
        if (!this.enabled || !this.db || id.startsWith('local_')) {
            return this.loadFromLocalStorage();
        }
        
        try {
            const doc = await this.db.collection('proposals').doc(id).get();
            if (doc.exists) {
                return doc.data();
            }
        } catch (error) {
            console.error('Firebase 불러오기 실패:', error);
        }
        
        return this.loadFromLocalStorage();
    }
    
    // 로컬 스토리지에서 불러오기
    loadFromLocalStorage() {
        try {
            const customerData = JSON.parse(localStorage.getItem(CONFIG.app.storage.customerData) || '{}');
            const propertyData = JSON.parse(localStorage.getItem(CONFIG.app.storage.propertyData) || '[]');
            
            return {
                customer: customerData,
                properties: propertyData
            };
        } catch (error) {
            console.error('로컬 스토리지 불러오기 실패:', error);
            return { customer: {}, properties: [] };
        }
    }
    
    // 이미지 업로드 (Storage)
    async uploadImage(imageBlob, filename) {
        if (!this.enabled || !this.storage) {
            return null;
        }
        
        try {
            const storageRef = this.storage.ref();
            const imageRef = storageRef.child(`proposals/${filename}`);
            
            const snapshot = await imageRef.put(imageBlob);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            console.log('이미지 업로드 완료:', downloadURL);
            return downloadURL;
            
        } catch (error) {
            console.error('이미지 업로드 실패:', error);
            return null;
        }
    }
}

// 전역 Firebase 매니저 인스턴스
const firebaseManager = new FirebaseManager();