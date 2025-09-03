// 앱 설정 파일
const CONFIG = {
    // Firebase 설정 (나중에 활성화)
    firebase: {
        enabled: false, // true로 변경하면 Firebase 기능 활성화
        apiKey: "추후-입력",
        authDomain: "추후-입력",
        projectId: "추후-입력",
        storageBucket: "추후-입력",
        messagingSenderId: "추후-입력",
        appId: "추후-입력"
    },
    
    // 앱 기본 설정
    app: {
        title: "미팅 매물 제안서",
        version: "1.0.0",
        defaultPropertyCount: 3, // 기본 매물 개수
        maxPropertyCount: 10,    // 최대 매물 개수
        
        // 다운로드 설정
        download: {
            quality: 0.9,        // JPEG 품질 (0.1 ~ 1.0)
            format: 'jpeg',      // 다운로드 형식
            filename: '매물제안서' // 기본 파일명
        },
        
        // 로컬 스토리지 키
        storage: {
            customerData: 'proposal_customer_data',
            propertyData: 'proposal_property_data',
            autoSave: true       // 자동 저장 여부
        }
    }
};