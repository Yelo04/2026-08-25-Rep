// ────────────────────────────────────────────────────────────────
// 카카오맵 JavaScript SDK 로더
//
// 사용 전 준비물:
// 1) https://developers.kakao.com 에서 애플리케이션 생성
// 2) "제품 설정 > 카카오맵" 활성화, "앱 키 > JavaScript 키" 발급
// 3) "플랫폼 > Web" 에 실제 서비스 도메인(및 localhost:3000) 등록
// 4) .env 파일에 REACT_APP_KAKAO_MAP_KEY=발급받은JavaScript키 추가
//    (.env.example 참고)
// ────────────────────────────────────────────────────────────────

export const KAKAO_MAP_KEY = process.env.REACT_APP_KAKAO_MAP_KEY || "";

let loadPromise = null;

// 카카오맵 SDK 스크립트를 한 번만 로드하고, window.kakao 객체를 resolve합니다.
export function loadKakaoMaps() {
  if (!KAKAO_MAP_KEY) {
    return Promise.reject(new Error("REACT_APP_KAKAO_MAP_KEY가 설정되지 않았습니다."));
  }

  if (window.kakao && window.kakao.maps) {
    return Promise.resolve(window.kakao);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false&libraries=services`;
    script.async = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("카카오맵 SDK를 불러오지 못했습니다."));
    };
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
