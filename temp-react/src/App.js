import "./App.css";
import React, { useState, useEffect, useMemo, useRef } from "react";
import logoImg from "./assets/logo.png";
import kakaologoImg from "./assets/kakao_logo.png";
import { loadKakaoMaps } from "./lib/kakaoMap";
import { fetchStores, fetchLunchbox, fetchMyStores } from "./api/stores";
import { applyLunchbox, fetchMyApplications } from "./api/applications";
import {
  registerFood,
  fetchMyRegistrations,
  fetchRegistrationApplicants,
  respondToApplicant,
} from "./api/registrations";
import { fetchMyProfile, updateMyProfile, uploadAvatar, fetchMyStats, deleteAccount } from "./api/profile";
import { fetchFavorites, addFavorite, removeFavorite } from "./api/favorites";
import { fetchNotificationSettings, updateNotificationSettings } from "./api/notifications";
import { fetchMyVerification, submitVerification, cancelVerification } from "./api/verification";
import { submitInquiry } from "./api/support";
import { logout as clearAuthToken } from "./api/auth";
import { getAdminToken } from "./api/adminClient";
import { adminLogin, adminLogout, fetchPendingVerifications, respondToVerification } from "./api/adminVerifications";

// ────────────────── 공용 부품 ────────────────────────//

//로고
function Logo({ size = 22 }) {
  return (
    <div className="logo">
      <img src={logoImg} alt="한끼잇다 로고" className="logo__icon" style={{ height: size + 10 }} />
      <span className="logo__text" style={{ fontSize: size }}>
        한끼<span className="logo__text--green">잇다</span>
      </span>
    </div>
  );
}

//프로필 사진
function AvatarPlaceholder({ avatarUrl, verified }) {
  return (
    <div
      className="avatar-placeholder"
      style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    >
      {verified && (
        <span className="avatar-placeholder__badge" title="소속 인증 완료">
          ✓
        </span>
      )}
    </div>
  );
}

// 헤더
function Header({ onNavigate, active, verified = false, avatarUrl }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const items = [
    { key: "list", label: "도시락 조회", icon: "🔍" },
    { key: "register", label: "식품 등록", icon: "📋", locked: !verified },
    { key: "mypage", label: "마이페이지", icon: "👤" },
  ];

  return (
    <div className="header">
      <div className="header__logo-link" onClick={() => onNavigate("home")}>
        <Logo />
      </div>

      <div className="header__right">
        <div className="header__logo-link" onClick={() => onNavigate("mypage")}>
          <AvatarPlaceholder avatarUrl={avatarUrl} verified={verified} />
        </div>
        <div className="header__menu" ref={ref}>
          <button className="header__menu-btn" onClick={() => setOpen((v) => !v)} aria-label="메뉴 열기">
            <span className="header__menu-bar" />
            <span className="header__menu-bar" />
            <span className="header__menu-bar" />
          </button>
          {open && (
            <div className="header__dropdown">
              {items.map((it) => (
                <div
                  key={it.key}
                  className={
                    "header__dropdown-item" + (active === it.key ? " header__dropdown-item--active" : "")
                  }
                  onClick={() => {
                    setOpen(false);
                    onNavigate(it.key);
                  }}
                >
                  <span className="header__dropdown-icon">{it.icon}</span>
                  {it.label}
                  {it.locked && (
                    <span className="header__dropdown-lock" title="소속 인증이 필요해요">
                      🔒
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 검색창
function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <div className="search-bar__box">
        <span className="search-bar__icon">🔍</span>
        <input
          className="search-bar__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="지역, 제공처명을 검색하세요"
        />
        {value && (
          <button
            type="button"
            className="search-bar__clear"
            aria-label="검색어 지우기"
            onClick={() => onChange("")}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// 지도 기본 중심 좌표 (부산시청)
const DEFAULT_MAP_CENTER = { lat: 35.1796, lng: 129.0756 };

// 지도 (카카오맵 SDK 연동) — REACT_APP_KAKAO_MAP_KEY가 설정되어 있어야 정상 동작합니다.
function MapArea({ stores, loading, error, onSelectStore }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [ready, setReady] = useState(false);
  const [sdkError, setSdkError] = useState(null);

  // 지도 SDK 로드 + 최초 1회 지도 생성
  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng),
          level: 5,
        });
        setReady(true);
      })
      .catch((err) => {
        if (!cancelled) setSdkError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 매장 목록(검색 결과 포함)이 바뀔 때마다 마커를 다시 그림
  useEffect(() => {
    if (!ready || !window.kakao || !mapRef.current) return;
    const kakao = window.kakao;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!stores || stores.length === 0) return;

    const bounds = new kakao.maps.LatLngBounds();

    stores.forEach((store) => {
      if (store.lat == null || store.lng == null) return;
      const position = new kakao.maps.LatLng(store.lat, store.lng);
      const marker = new kakao.maps.Marker({ position, map: mapRef.current, title: store.name });
      kakao.maps.event.addListener(marker, "click", () => onSelectStore && onSelectStore(store));
      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (markersRef.current.length > 0) {
      mapRef.current.setBounds(bounds);
    }
  }, [stores, ready, onSelectStore]);

  if (sdkError) {
    return (
      <div className="map-area map-area--placeholder">
        <span>🗺️ 지도를 불러오지 못했습니다.</span>
        <span className="map-area__hint">{sdkError}</span>
        <span className="map-area__hint">.env의 REACT_APP_KAKAO_MAP_KEY 설정을 확인해주세요.</span>
      </div>
    );
  }

  return (
    <div className="map-area">
      <div ref={containerRef} className="map-area__canvas" />
      {!ready && <div className="map-area__banner">지도를 불러오는 중...</div>}
      {ready && loading && <div className="map-area__banner">매장 정보를 불러오는 중...</div>}
      {ready && !loading && error && <div className="map-area__banner">{error}</div>}
      {ready && !loading && !error && stores && stores.length === 0 && (
        <div className="map-area__banner">검색 결과가 없어요.</div>
      )}
    </div>
  );
}

/*────────────────── 화면: 홈 (메뉴바) ─────────────────────────*/

function HomeScreen({
  onNavigate,
  query,
  setQuery,
  verified,
  avatarUrl,
  stores,
  storesLoading,
  storesError,
  onSelectStore,
}) {
  // "지역, 제공처명" 검색어로 매장 목록을 클라이언트에서 필터링합니다.
  const filteredStores = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) => (s.name || "").toLowerCase().includes(q) || (s.address || "").toLowerCase().includes(q)
    );
  }, [stores, query]);

  return (
    <div className="home-screen">
      <Header onNavigate={onNavigate} active="home" verified={verified} avatarUrl={avatarUrl} />
      <SearchBar value={query} onChange={setQuery} />
      <div className="home-screen__map-wrap">
        <MapArea stores={filteredStores} loading={storesLoading} error={storesError} onSelectStore={onSelectStore} />
      </div>
    </div>
  );
}

/*────────────────── 로그인 화면 ─────────────────────────*/

// 여기 onNavigate를 props로 받도록 추가함 (전에는 괄호 안이 비어있었음)
function LoginScreen({ onNavigate }) {
  return (
    <div className="login-screen">
      {/* 배경 사진 */}
      <div className="login-screen__bg" />
      {/* 아래로 갈수록 크림색으로 흐려지는 그라데이션 (버튼 영역 가독성용) */}
      <div className="login-screen__overlay" />

      {/* 실제 콘텐츠 (로고 + 로그인 버튼) */}
      <div className="login-screen__content">
        <Logo size={48} />

        <div className="login-screen__actions">
          {/* 여기 onClick 추가함 (전에는 아예 없었음) */}
          <button className="btn btn--kakao btn--full" onClick={() => onNavigate("home")}>
            <img src={kakaologoImg} alt="" className="btn--kakao__icon" /> 카카오 로그인
          </button>
          <p className="login-screen__footnote">
            소중한 마음이 모여 누군가의 하루를 든든하게 채웁니다.
          </p>
          <button className="login-screen__admin-link" onClick={() => onNavigate("admin-login")}>
            관리자이신가요?
          </button>
        </div>
      </div>
    </div>
  );
}

/*────────────────── 화면: 관리자 로그인 / 소속 인증 심사 ─────────────────*/
/* 일반 사용자 화면(.app-frame, 모바일 폭 고정)과 분리된 넓은 레이아웃을 씁니다.
   실제 배포 시에는 서버 라우팅에서 이 두 화면을 "/admin" 경로로 연결해주세요
   (App 컴포넌트 하단에서 최초 진입 시 location.pathname을 확인합니다). */

function AdminLoginScreen({ onLoginSuccess }) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await adminLogin(password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login">
      <Logo size={40} />
      <div className="admin-login__title">관리자 로그인</div>
      <p className="admin-login__desc">소속 인증 신청을 검토하려면 관리자 비밀번호를 입력하세요.</p>
      <form onSubmit={handleSubmit} className="admin-login__form">
        <input
          type="password"
          className="text-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="관리자 비밀번호"
          autoFocus
        />
        {error && <p className="admin-login__error">{error}</p>}
        <button
          type="submit"
          className={"btn btn--primary btn--full" + (password.trim() && !submitting ? "" : " btn--disabled")}
          disabled={!password.trim() || submitting}
        >
          {submitting ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}

function AdminVerificationsScreen({ onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPendingVerifications()
      .then((data) => {
        if (!cancelled) setItems(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRespond = async (id, decision) => {
    setRespondingId(id);
    try {
      await respondToVerification(id, decision);
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (err) {
      alert(err.message || "처리에 실패했습니다.");
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="header">
        <div className="header__logo-link">
          <Logo />
        </div>
        <div className="header__right">
          <button className="btn-text" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </div>

      <div className="admin-page__body">
        <div className="admin-page__section-title">소속 인증 심사</div>
        {loading && <p className="empty-state">불러오는 중...</p>}
        {!loading && error && <p className="empty-state">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="empty-state">대기 중인 인증 신청이 없어요.</p>
        )}
        {!loading &&
          !error &&
          items.map((it) => (
            <div className="admin-item" key={it.id}>
              <div className="admin-item__top">
                <span className="admin-item__name">{it.name || "이름 없음"}</span>
                <span className="admin-item__org">{it.org}</span>
              </div>
              <div className="admin-item__meta">
                제출일 {it.submittedAt}
                {it.documentUrl && (
                  <>
                    {" · "}
                    <a href={it.documentUrl} target="_blank" rel="noreferrer" className="admin-item__doc">
                      서류 보기
                    </a>
                  </>
                )}
              </div>
              <div className="admin-item__actions">
                <button
                  className="btn btn--outline"
                  disabled={respondingId === it.id}
                  onClick={() => handleRespond(it.id, "reject")}
                >
                  반려
                </button>
                <button
                  className="btn btn--primary"
                  disabled={respondingId === it.id}
                  onClick={() => handleRespond(it.id, "approve")}
                >
                  {respondingId === it.id ? "처리 중..." : "승인"}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/*────────────────── 공용 부품: 매장 정보 카드 / 배지 / 태그 입력 ─────────────────*/

// 위치(핀) 배지 — 사진 위에 얹히는 파란 마커
function PinBadge() {
  return <span className="pin-badge">📍</span>;
}

// 알러지 등 강조용 배지
function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

// 매장 정보 카드 (사진 + 이름/영업시간/주소/전화번호)
// onToggleFavorite을 넘기면 카드 오른쪽에 찜하기 버튼이 표시됩니다.
function StoreCard({ store, isFavorite, onToggleFavorite }) {
  return (
    <div className="info-card">
      <div
        className="info-card__photo"
        style={store.photoUrl ? { backgroundImage: `url(${store.photoUrl})` } : undefined}
      >
        <PinBadge />
      </div>
      <div className="info-card__body">
        <div className="info-card__name">{store.name}</div>
        <div className="info-card__meta">
          <span className="info-card__icon">🕒</span>
          {store.hours}
        </div>
        <div className="info-card__meta">
          <span className="info-card__icon">📍</span>
          {store.address}
        </div>
        <div className="info-card__meta">
          <span className="info-card__icon">📞</span>
          <a className="info-card__phone" href={`tel:${store.phone}`}>
            {store.phone}
          </a>
        </div>
      </div>
      {onToggleFavorite && (
        <button
          type="button"
          className={"info-card__favorite" + (isFavorite ? " info-card__favorite--active" : "")}
          aria-label={isFavorite ? "찜 해제" : "찜하기"}
          onClick={onToggleFavorite}
        >
          ♥
        </button>
      )}
    </div>
  );
}

// 메뉴 + 알러지 정보 카드 (신청 화면용)
function MenuCard({ items, allergies }) {
  return (
    <div className="menu-card">
      <div className="menu-card__top">
        <div className="menu-card__photo" />
        <ul className="menu-card__list">
          {items.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
      <div className="menu-card__divider" />
      <div className="menu-card__allergy-row">
        <span className="menu-card__allergy-label">알러지 주의 식품</span>
        {allergies.map((a) => (
          <Badge key={a}>{a}</Badge>
        ))}
      </div>
    </div>
  );
}

// 태그 입력 그리드 (메뉴/알러지 식품을 "+" 버튼으로 추가) — 등록 화면용
function TagInputGrid({ tags, onAdd, onRemove, placeholder }) {
  const handleAddClick = () => {
    const value = window.prompt(placeholder);
    if (value && value.trim()) onAdd(value.trim());
  };

  return (
    <div className="tag-grid">
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} className="tag-chip">
          {tag}
          <button
            type="button"
            className="tag-chip__remove"
            onClick={() => onRemove(i)}
            aria-label={`${tag} 삭제`}
          >
            ×
          </button>
        </span>
      ))}
      <button type="button" className="tag-slot" onClick={handleAddClick}>
        +
      </button>
    </div>
  );
}

/*────────────────── 화면: 신청 화면 (헤더의 "도시락 조회") ─────────────────*/

function ApplicationScreen({ onNavigate, verified, avatarUrl, store, favorites, onToggleFavorite }) {
  const [pickupTime, setPickupTime] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [lunchbox, setLunchbox] = useState({ menuItems: [], allergyItems: [] });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 선택된 매장의 현재 나눔 가능한 도시락(메뉴/알러지) 정보를 불러옵니다.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchLunchbox(store.id)
      .then((data) => {
        if (!cancelled) setLunchbox(data || { menuItems: [], allergyItems: [] });
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const canSubmit = !!store && pickupTime.trim() !== "" && agreed && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await applyLunchbox({ storeId: store.id, registrationId: lunchbox.registrationId, pickupTime });
      alert("신청이 완료되었습니다.");
      onNavigate("home");
    } catch (err) {
      alert(err.message || "신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 지도에서 매장을 선택하지 않고 이 화면으로 바로 들어온 경우를 위한 안내
  if (!store) {
    return (
      <div className="apply-screen">
        <Header onNavigate={onNavigate} active="list" verified={verified} avatarUrl={avatarUrl} />
        <div className="gate-screen">
          <div className="gate-screen__icon">🍱</div>
          <div className="gate-screen__title">먼저 지도에서 매장을 선택해주세요</div>
          <p className="gate-screen__desc">홈 화면 지도에서 매장 마커를 누르면 도시락 정보를 확인할 수 있어요.</p>
          <button className="btn btn--primary btn--full" onClick={() => onNavigate("home")}>
            지도로 이동
          </button>
        </div>
      </div>
    );
  }

  const isFavorite = favorites.some((f) => f.id === store.id);

  return (
    <div className="apply-screen">
      <Header onNavigate={onNavigate} active="list" verified={verified} avatarUrl={avatarUrl} />

      <div className="apply-screen__body">
        <StoreCard store={store} isFavorite={isFavorite} onToggleFavorite={() => onToggleFavorite(store)} />

        {loading && <p className="empty-state">도시락 정보를 불러오는 중...</p>}
        {!loading && loadError && <p className="empty-state">{loadError}</p>}
        {!loading && !loadError && (
          <MenuCard items={lunchbox.menuItems || []} allergies={lunchbox.allergyItems || []} />
        )}

        <label className="field-label" htmlFor="pickup-time">
          수령 시간을 입력하세요.
        </label>
        <input
          id="pickup-time"
          className="text-input"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
          placeholder="예) 13:20"
        />

        <label className="checkbox-row">
          <input
            type="checkbox"
            className="checkbox-row__box"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="checkbox-row__text">
            알레르기 유발 식품 정보를 충분히 확인하였으며, 사전에 고지된
            알레르기 정보와 관련하여 발생한 피해에 대해서는 책임을 묻지
            않겠습니다.
          </span>
        </label>
      </div>

      <div className="apply-screen__actions">
        <button className="btn btn--outline" onClick={() => onNavigate("home")}>
          취소하기
        </button>
        <button
          className={"btn btn--primary" + (canSubmit ? "" : " btn--disabled")}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? "신청 중..." : "신청 하기"}
        </button>
      </div>
    </div>
  );
}

/*────────────────── 화면: 잉여 식품 등록 (헤더의 "식품 등록") ─────────────────*/

function RegisterScreen({ onNavigate, verified, avatarUrl }) {
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [quantity, setQuantity] = useState("");
  const [allergyItems, setAllergyItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // 소속 인증을 마친 사용자가 관리하는 매장 목록 (한 계정이 여러 매장을 관리할 수 있음)
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState(null);

  useEffect(() => {
    if (!verified) return;
    let cancelled = false;
    setStoreLoading(true);
    setStoreError(null);
    fetchMyStores()
      .then((data) => {
        if (cancelled) return;
        const list = data || [];
        setStores(list);
        if (list.length > 0) setSelectedStoreId(list[0].id);
      })
      .catch((err) => {
        if (!cancelled) setStoreError(err.message);
      })
      .finally(() => {
        if (!cancelled) setStoreLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [verified]);

  const store = stores.find((s) => s.id === selectedStoreId) || null;
  const canSubmit = !!selectedStoreId && menuItems.length > 0 && quantity.trim() !== "" && !submitting;

  const handlePhotoPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await registerFood({ storeId: selectedStoreId, menuItems, quantity, allergyItems, photoFile });
      alert("등록이 완료되었습니다.");
      onNavigate("home");
    } catch (err) {
      alert(err.message || "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 소속 인증을 받은 사용자만 식품 등록 기능을 사용할 수 있음
  if (!verified) {
    return (
      <div className="register-screen">
        <Header onNavigate={onNavigate} active="register" verified={verified} avatarUrl={avatarUrl} />
        <div className="gate-screen">
          <div className="gate-screen__icon">🔒</div>
          <div className="gate-screen__title">소속 인증이 필요한 기능이에요</div>
          <p className="gate-screen__desc">
            잉여 식품 등록은 소속(매장/단체)이 인증된 사용자만 이용할 수 있어요.
            <br />
            마이페이지에서 소속 인증을 먼저 완료해주세요.
          </p>
          <button className="btn btn--primary btn--full" onClick={() => onNavigate("verify")}>
            소속 인증하러 가기
          </button>
          <button className="btn-text" onClick={() => onNavigate("mypage")}>
            마이페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="register-screen">
      <Header onNavigate={onNavigate} active="register" verified={verified} avatarUrl={avatarUrl} />

      <div className="register-screen__body">
        {storeLoading && <p className="empty-state">매장 정보를 불러오는 중...</p>}
        {!storeLoading && storeError && <p className="empty-state">{storeError}</p>}

        {!storeLoading && !storeError && stores.length > 1 && (
          <div className="store-picker">
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                className={"store-picker__item" + (s.id === selectedStoreId ? " store-picker__item--active" : "")}
                onClick={() => setSelectedStoreId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {!storeLoading && !storeError && store && <StoreCard store={store} />}

        <div className="register-card">
          <div
            className="upload-box"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={photoPreview ? { backgroundImage: `url(${photoPreview})` } : undefined}
          >
            <PinBadge />
            {!photoPreview && <span className="upload-box__icon">🖼️</span>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoPick}
          />

          <label className="section-label">■ 메뉴를 입력하세요.</label>
          <TagInputGrid
            tags={menuItems}
            onAdd={(v) => setMenuItems((prev) => [...prev, v])}
            onRemove={(i) => setMenuItems((prev) => prev.filter((_, idx) => idx !== i))}
            placeholder="메뉴명을 입력하세요"
          />

          <label className="section-label">■ 수량을 입력하세요.</label>
          <input
            className="text-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="예) 5개"
          />

          <label className="section-label">■ 알러지 식품을 입력해주세요.</label>
          <TagInputGrid
            tags={allergyItems}
            onAdd={(v) => setAllergyItems((prev) => [...prev, v])}
            onRemove={(i) => setAllergyItems((prev) => prev.filter((_, idx) => idx !== i))}
            placeholder="알러지 유발 식품을 입력하세요"
          />
        </div>
      </div>

      <div className="register-screen__actions">
        <button className="btn btn--outline" onClick={() => onNavigate("home")}>
          취소하기
        </button>
        <button
          className={"btn btn--primary" + (canSubmit ? "" : " btn--disabled")}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? "등록 중..." : "등록 하기"}
        </button>
      </div>
    </div>
  );
}

/*────────────────── 하위 화면 공용 상단바 (뒤로가기 + 제목) ─────────────────*/

function SubPageHeader({ title, onBack }) {
  return (
    <div className="subheader">
      <button className="subheader__back" onClick={onBack} aria-label="뒤로가기">
        ←
      </button>
      <span className="subheader__title">{title}</span>
      <span className="subheader__spacer" />
    </div>
  );
}

// 온/오프 토글 스위치
function ToggleSwitch({ checked, onChange, label, desc }) {
  return (
    <label className="toggle-row">
      <span className="toggle-row__text">
        <span className="toggle-row__label">{label}</span>
        {desc && <span className="toggle-row__desc">{desc}</span>}
      </span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="switch__track" />
      </span>
    </label>
  );
}

// 상태 배지 (신청/등록 내역용)
function StatusBadge({ status }) {
  const tone =
    status === "수령완료" || status === "등록됨" || status === "수락됨"
      ? "status-badge--done"
      : status === "취소됨" || status === "마감됨" || status === "거절됨"
      ? "status-badge--muted"
      : "status-badge--pending";
  return <span className={"status-badge " + tone}>{status}</span>;
}

/*────────────────── 화면: 마이페이지 (헤더의 "마이페이지") ─────────────────*/
/* 참고 사이트/앱의 마이페이지 구성(프로필+통계+메뉴+로그아웃)을 참고하여
   임의로 구성한 화면입니다. */

function MyPageScreen({ onNavigate, profile, verification, stats, onLogout }) {
  const menuGroups = [
    {
      title: "내 활동",
      items: [
        { key: "history-apply", icon: "📦", label: "신청 내역" },
        { key: "history-register", icon: "🍱", label: "등록 내역" },
        { key: "favorites", icon: "❤️", label: "찜한 매장" },
      ],
    },
    {
      title: "설정",
      items: [
        { key: "notifications", icon: "🔔", label: "알림 설정" },
        { key: "account", icon: "👤", label: "계정 관리" },
        { key: "support", icon: "❓", label: "고객센터" },
      ],
    },
  ];

  return (
    <div className="mypage-screen">
      <Header onNavigate={onNavigate} active="mypage" verified={verification.verified} avatarUrl={profile.avatar} />

      <div className="mypage-screen__body">
        <div className="mypage-profile">
          <div
            className="mypage-profile__avatar"
            style={profile.avatar ? { backgroundImage: `url(${profile.avatar})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          />
          <div className="mypage-profile__info">
            <div className="mypage-profile__name-row">
              <span className="mypage-profile__name">{profile.name || "이름을 설정해주세요"}</span>
              {verification.verified && (
                <span className="verify-badge" title="소속 인증 완료">
                  ✓ 인증됨
                </span>
              )}
              {!verification.verified && verification.status === "pending" && (
                <span className="verify-badge verify-badge--pending" title="소속 인증 심사 중">
                  ⏳ 심사중
                </span>
              )}
            </div>
            <div className="mypage-profile__email">{profile.email || "이메일을 등록해주세요"}</div>
            {verification.verified ? (
              <div className="mypage-profile__org">{verification.org} 소속으로 인증되었습니다</div>
            ) : verification.status === "pending" ? (
              <button className="mypage-profile__verify-btn" onClick={() => onNavigate("verify")}>
                ⏳ 인증 심사 진행 중
              </button>
            ) : (
              <button className="mypage-profile__verify-btn" onClick={() => onNavigate("verify")}>
                🏷️ 소속 인증하기
              </button>
            )}
          </div>
          <button className="mypage-profile__edit" onClick={() => onNavigate("profile-edit")}>
            프로필 수정
          </button>
        </div>

        <div className="mypage-stats">
          {stats.map((s) => (
            <div className="mypage-stats__item" key={s.label}>
              <div className="mypage-stats__value">{s.value}</div>
              <div className="mypage-stats__label">{s.label}</div>
            </div>
          ))}
        </div>

        {menuGroups.map((group) => (
          <div className="mypage-menu" key={group.title}>
            <div className="mypage-menu__title">{group.title}</div>
            {group.items.map((item) => (
              <div className="mypage-menu__item" key={item.label} onClick={() => onNavigate(item.key)}>
                <span className="mypage-menu__icon">{item.icon}</span>
                <span className="mypage-menu__label">{item.label}</span>
                <span className="mypage-menu__chevron">›</span>
              </div>
            ))}
          </div>
        ))}

        <button className="mypage-logout" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
}

/*────────────────── 화면: 프로필 수정 ─────────────────*/

function ProfileEditScreen({ onNavigate, profile, onSave }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarPick = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), avatarFile });
      alert("프로필이 저장되었습니다.");
      onNavigate("mypage");
    } catch (err) {
      alert(err.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="subpage">
      <SubPageHeader title="프로필 수정" onBack={() => onNavigate("mypage")} />
      <div className="subpage__body">
        <div className="profile-edit__avatar-row">
          <div
            className="profile-edit__avatar"
            style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            {!avatarPreview && <span className="upload-box__icon">🙂</span>}
          </div>
          <button className="btn-text" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            사진 변경
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarPick} />
        </div>

        <label className="field-label" htmlFor="profile-name">
          이름
        </label>
        <input
          id="profile-name"
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름을 입력하세요"
        />

        <label className="field-label" htmlFor="profile-email">
          이메일
        </label>
        <input
          id="profile-email"
          type="email"
          className="text-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일을 입력하세요"
        />

        <label className="field-label" htmlFor="profile-phone">
          전화번호
        </label>
        <input
          id="profile-phone"
          className="text-input"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="전화번호를 입력하세요"
        />
      </div>

      <div className="subpage__actions">
        <button className="btn btn--outline" onClick={() => onNavigate("mypage")}>
          취소
        </button>
        <button className="btn btn--primary" disabled={!name.trim() || saving} onClick={handleSave}>
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
}

/*────────────────── 화면: 소속 인증 ─────────────────*/

function VerifyScreen({ onNavigate, verification, onVerify, onUnverify }) {
  const [org, setOrg] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unverifying, setUnverifying] = useState(false);
  const fileInputRef = useRef(null);

  const canSubmit = org.trim() !== "" && !submitting;

  const handleFilePick = (e) => {
    const picked = e.target.files && e.target.files[0];
    if (picked) {
      setFile(picked);
      setFileName(picked.name);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await onVerify({ org: org.trim(), documentFile: file });
      if (result && result.status === "pending") {
        alert("소속 인증 신청이 접수되었습니다. 담당자 심사 후 승인되면 식품 등록 기능을 사용할 수 있어요.");
      } else {
        alert("소속 인증이 완료되었습니다. 이제 식품 등록 기능을 사용할 수 있어요.");
      }
      onNavigate("mypage");
    } catch (err) {
      alert(err.message || "인증 신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnverify = async () => {
    setUnverifying(true);
    try {
      await onUnverify();
      setOrg("");
      setFile(null);
      setFileName("");
    } catch (err) {
      alert(err.message || "처리에 실패했습니다.");
    } finally {
      setUnverifying(false);
    }
  };

  // 1) 인증 승인 완료
  if (verification.verified) {
    return (
      <div className="subpage">
        <SubPageHeader title="소속 인증" onBack={() => onNavigate("mypage")} />
        <div className="subpage__body">
          <div className="verify-done">
            <div className="verify-done__badge">✓</div>
            <div className="verify-done__title">인증이 완료되었어요</div>
            <div className="verify-done__org">{verification.org}</div>
            <p className="gate-screen__desc">
              소속 인증이 완료되어 잉여 식품 등록 기능을 사용할 수 있습니다.
            </p>
            <button className="btn-text" disabled={unverifying} onClick={handleUnverify}>
              {unverifying ? "처리 중..." : "인증 해제하기"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2) 심사 대기 중 — 백엔드가 POST /api/verifications 응답으로 status: "pending"을 내려준 경우
  if (verification.status === "pending") {
    return (
      <div className="subpage">
        <SubPageHeader title="소속 인증" onBack={() => onNavigate("mypage")} />
        <div className="subpage__body">
          <div className="verify-done verify-done--pending">
            <div className="verify-done__badge verify-done__badge--pending">⏳</div>
            <div className="verify-done__title">인증 심사 중이에요</div>
            <div className="verify-done__org">{verification.org}</div>
            <p className="gate-screen__desc">
              담당자가 제출하신 소속 정보를 확인하고 있어요. 승인되면 식품 등록 기능이
              자동으로 열립니다.
            </p>
            <button className="btn-text" disabled={unverifying} onClick={handleUnverify}>
              {unverifying ? "처리 중..." : "신청 취소하기"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3) 미인증 상태 (최초 신청 또는 반려 후 재신청)
  return (
    <div className="subpage">
      <SubPageHeader title="소속 인증" onBack={() => onNavigate("mypage")} />
      <div className="subpage__body">
        {verification.status === "rejected" && (
          <p className="verify-rejected">이전 신청이 반려되었어요. 정보를 다시 확인하고 재신청해주세요.</p>
        )}
        <p className="verify-intro">
          매장·기관 등 소속을 인증하면 인증 마크가 부여되고, 잉여 식품 등록 기능을
          사용할 수 있어요.
        </p>

        <label className="field-label" htmlFor="verify-org">
          소속(매장/기관)명
        </label>
        <input
          id="verify-org"
          className="text-input"
          value={org}
          onChange={(e) => setOrg(e.target.value)}
          placeholder="예) 스타벅스 코엑스몰점"
        />

        <label className="field-label">인증 서류 (선택)</label>
        <div className="upload-box upload-box--row" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
          <span className="upload-box__icon">📎</span>
          <span>{fileName || "사업자등록증, 재직증명서 등을 첨부해주세요"}</span>
        </div>
        <input ref={fileInputRef} type="file" hidden onChange={handleFilePick} />
      </div>

      <div className="subpage__actions">
        <button className="btn btn--outline" onClick={() => onNavigate("mypage")}>
          취소
        </button>
        <button
          className={"btn btn--primary" + (canSubmit ? "" : " btn--disabled")}
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitting ? "신청 중..." : "인증 신청하기"}
        </button>
      </div>
    </div>
  );
}

/*────────────────── 화면: 신청 내역 ─────────────────*/

function ApplicationsHistoryScreen({ onNavigate }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyApplications()
      .then((data) => {
        if (!cancelled) setHistory(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="subpage">
      <SubPageHeader title="신청 내역" onBack={() => onNavigate("mypage")} />
      <div className="subpage__body">
        {loading && <p className="empty-state">불러오는 중...</p>}
        {!loading && error && <p className="empty-state">{error}</p>}
        {!loading && !error && history.length === 0 && (
          <p className="empty-state">아직 신청한 도시락이 없어요.</p>
        )}
        {!loading &&
          !error &&
          history.map((h) => (
            <div className="history-card" key={h.id}>
              <div className="history-card__top">
                <span className="history-card__title">{h.store}</span>
                <StatusBadge status={h.status} />
              </div>
              <div className="history-card__meta">
                {h.date} · 수령 {h.time}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/*────────────────── 화면: 등록 내역 ─────────────────*/

function RegistrationsHistoryScreen({ onNavigate, onSelectRegistration }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyRegistrations()
      .then((data) => {
        if (!cancelled) setHistory(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="subpage">
      <SubPageHeader title="등록 내역" onBack={() => onNavigate("mypage")} />
      <div className="subpage__body">
        {loading && <p className="empty-state">불러오는 중...</p>}
        {!loading && error && <p className="empty-state">{error}</p>}
        {!loading && !error && history.length === 0 && (
          <p className="empty-state">아직 등록한 식품이 없어요.</p>
        )}
        {!loading &&
          !error &&
          history.map((h) => (
            <div
              className="history-card history-card--clickable"
              key={h.id}
              onClick={() => onSelectRegistration(h)}
            >
              <div className="history-card__top">
                <span className="history-card__title">{h.menu}</span>
                <StatusBadge status={h.status} />
              </div>
              <div className="history-card__meta">
                {h.date} · 수량 {h.quantity}
                {typeof h.applicantCount === "number" && ` · 신청 ${h.applicantCount}건`}
              </div>
              <span className="history-card__link">신청자 관리 ›</span>
            </div>
          ))}
      </div>
    </div>
  );
}

/*────────────────── 화면: 등록건 신청자 관리 (등록 내역 항목 클릭 시) ─────────────────*/

function RegistrationApplicantsScreen({ onNavigate, registration }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondingId, setRespondingId] = useState(null);

  useEffect(() => {
    if (!registration) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRegistrationApplicants(registration.id)
      .then((data) => {
        if (!cancelled) setApplicants(data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [registration]);

  const handleRespond = async (applicationId, decision) => {
    setRespondingId(applicationId);
    try {
      await respondToApplicant(registration.id, applicationId, decision);
      setApplicants((prev) =>
        prev.map((a) => (a.id === applicationId ? { ...a, status: decision === "accept" ? "수락됨" : "거절됨" } : a))
      );
    } catch (err) {
      alert(err.message || "처리에 실패했습니다.");
    } finally {
      setRespondingId(null);
    }
  };

  // 등록 내역에서 항목을 고르지 않고 바로 이 화면으로 들어온 경우
  if (!registration) {
    return (
      <div className="subpage">
        <SubPageHeader title="신청자 관리" onBack={() => onNavigate("history-register")} />
        <div className="subpage__body">
          <p className="empty-state">등록 내역에서 관리할 항목을 먼저 선택해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subpage">
      <SubPageHeader title="신청자 관리" onBack={() => onNavigate("history-register")} />
      <div className="subpage__body">
        <div className="history-card">
          <div className="history-card__top">
            <span className="history-card__title">{registration.menu}</span>
            <StatusBadge status={registration.status} />
          </div>
          <div className="history-card__meta">
            {registration.date} · 수량 {registration.quantity}
          </div>
        </div>

        {loading && <p className="empty-state">불러오는 중...</p>}
        {!loading && error && <p className="empty-state">{error}</p>}
        {!loading && !error && applicants.length === 0 && (
          <p className="empty-state">아직 신청한 사람이 없어요.</p>
        )}
        {!loading &&
          !error &&
          applicants.map((a) => (
            <div className="applicant-card" key={a.id}>
              <div className="applicant-card__top">
                <span className="applicant-card__name">{a.applicantName}</span>
                <StatusBadge status={a.status} />
              </div>
              <div className="applicant-card__meta">수령 희망 시간 · {a.pickupTime}</div>
              {a.status === "대기중" && (
                <div className="applicant-card__actions">
                  <button
                    className="btn btn--outline"
                    disabled={respondingId === a.id}
                    onClick={() => handleRespond(a.id, "reject")}
                  >
                    거절
                  </button>
                  <button
                    className="btn btn--primary"
                    disabled={respondingId === a.id}
                    onClick={() => handleRespond(a.id, "accept")}
                  >
                    {respondingId === a.id ? "처리 중..." : "수락"}
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

/*────────────────── 화면: 찜한 매장 ─────────────────*/

function FavoritesScreen({ onNavigate, favorites, onRemoveFavorite }) {
  return (
    <div className="subpage">
      <SubPageHeader title="찜한 매장" onBack={() => onNavigate("mypage")} />
      <div className="subpage__body">
        {favorites.length === 0 ? (
          <p className="empty-state">찜한 매장이 없어요.</p>
        ) : (
          favorites.map((f) => (
            <div className="favorite-card" key={f.id}>
              <div className="favorite-card__photo" />
              <div className="favorite-card__info">
                <div className="favorite-card__name">{f.name}</div>
                <div className="favorite-card__address">{f.address}</div>
              </div>
              <button
                className="favorite-card__remove"
                aria-label={`${f.name} 찜 해제`}
                onClick={() => onRemoveFavorite(f.id)}
              >
                ♥
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/*────────────────── 화면: 알림 설정 ─────────────────*/

function NotificationSettingsScreen({ onNavigate, notifSettings, onToggle }) {
  return (
    <div className="subpage">
      <SubPageHeader title="알림 설정" onBack={() => onNavigate("mypage")} />
      <div className="subpage__body">
        <ToggleSwitch
          label="픽업 시간 알림"
          desc="수령 시간이 다가오면 알려드려요"
          checked={notifSettings.pickup}
          onChange={(v) => onToggle("pickup", v)}
        />
        <ToggleSwitch
          label="새 도시락 등록 알림"
          desc="찜한 매장에 새 도시락이 올라오면 알려드려요"
          checked={notifSettings.newListing}
          onChange={(v) => onToggle("newListing", v)}
        />
        <ToggleSwitch
          label="마케팅 정보 수신"
          desc="이벤트, 혜택 소식을 받아볼 수 있어요"
          checked={notifSettings.marketing}
          onChange={(v) => onToggle("marketing", v)}
        />
      </div>
    </div>
  );
}

/*────────────────── 화면: 계정 관리 ─────────────────*/

function AccountScreen({ onNavigate, profile, verification, onDeleteAccount }) {
  const [deleting, setDeleting] = useState(false);

  const handleWithdraw = async () => {
    if (!window.confirm("정말 회원 탈퇴하시겠어요? 이 작업은 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    try {
      await onDeleteAccount();
      onNavigate("login");
    } catch (err) {
      alert(err.message || "회원 탈퇴에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="subpage">
      <SubPageHeader title="계정 관리" onBack={() => onNavigate("mypage")} />
      <div className="subpage__body">
        <div className="account-row">
          <span className="account-row__label">로그인 방식</span>
          <span className="account-row__value">💬 카카오 연동됨</span>
        </div>
        <div className="account-row">
          <span className="account-row__label">이메일</span>
          <span className="account-row__value">{profile.email || "미등록"}</span>
        </div>
        <div className="account-row">
          <span className="account-row__label">전화번호</span>
          <span className="account-row__value">{profile.phone || "미등록"}</span>
        </div>
        <div className="account-row">
          <span className="account-row__label">소속 인증</span>
          <span className="account-row__value">
            {verification.verified
              ? `✓ ${verification.org}`
              : verification.status === "pending"
              ? "⏳ 심사중"
              : "미인증"}
          </span>
        </div>

        <button className="mypage-menu__item mypage-menu__item--plain" onClick={() => onNavigate("profile-edit")}>
          <span className="mypage-menu__label">프로필 정보 수정</span>
          <span className="mypage-menu__chevron">›</span>
        </button>

        <button className="account-danger" disabled={deleting} onClick={handleWithdraw}>
          {deleting ? "처리 중..." : "회원 탈퇴"}
        </button>
      </div>
    </div>
  );
}

/*────────────────── 화면: 고객센터 ─────────────────*/

function SupportScreen({ onNavigate }) {
  const faqs = [
    {
      q: "도시락은 어떻게 신청하나요?",
      a: "홈 화면 지도에서 매장을 선택한 뒤 '도시락 조회' 화면에서 수령 시간을 입력하고 신청하기를 누르면 됩니다.",
    },
    {
      q: "식품 등록은 아무나 할 수 있나요?",
      a: "식품 등록은 소속(매장/단체)이 인증된 사용자만 이용할 수 있어요. 마이페이지에서 소속 인증을 먼저 진행해주세요.",
    },
    {
      q: "수령 시간에 못 갈 것 같아요.",
      a: "마이페이지 > 신청 내역에서 신청 상태를 확인하고, 매장에 미리 연락해 조율해주세요.",
    },
    {
      q: "알레르기 정보는 어디서 확인하나요?",
      a: "각 도시락 신청 화면의 '알러지 주의 식품' 항목에서 확인할 수 있습니다.",
    },
  ];

  const [openIndex, setOpenIndex] = useState(null);
  const [sending, setSending] = useState(false);

  const handleInquiry = async () => {
    const message = window.prompt("문의하실 내용을 입력해주세요.");
    if (!message || !message.trim()) return;
    setSending(true);
    try {
      await submitInquiry(message.trim());
      alert("문의가 접수되었습니다. 빠르게 답변드릴게요!");
    } catch (err) {
      alert(err.message || "문의 접수에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="subpage">
      <SubPageHeader title="고객센터" onBack={() => onNavigate("mypage")} />
      <div className="subpage__body">
        <div className="faq-list">
          {faqs.map((f, i) => (
            <div className="faq-item" key={f.q}>
              <button
                className="faq-item__question"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span>{f.q}</span>
                <span className="faq-item__chevron">{openIndex === i ? "−" : "+"}</span>
              </button>
              {openIndex === i && <div className="faq-item__answer">{f.a}</div>}
            </div>
          ))}
        </div>

        <button className="btn btn--primary btn--full" disabled={sending} onClick={handleInquiry}>
          {sending ? "접수 중..." : "1:1 문의하기"}
        </button>
      </div>
    </div>
  );
}

/*────────────────── 앱 뼈대  ─────────────────────────*/

// 마이페이지 상단 통계 3칸의 기본값 (백엔드 응답이 오기 전까지 표시)
const EMPTY_STATS = [
  { label: "신청한 도시락", value: 0 },
  { label: "등록한 식품", value: 0 },
  { label: "나눔 참여일", value: 0 },
];

export default function App() {
  // "/admin" 경로로 접속하면 관리자 화면(소속 인증 심사)으로 바로 진입합니다.
  const [page, setPage] = useState(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      return getAdminToken() ? "admin" : "admin-login";
    }
    return "login";
  });
  const [query, setQuery] = useState("");

  // 프로필 (마이페이지 > 프로필 수정에서 편집) — 로그인 후 GET /api/users/me 로 채워집니다.
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", avatar: null });

  // 소속 인증 상태 — verified === true 인 사용자만 "식품 등록"을 사용할 수 있음
  // status: "none" | "pending" | "approved" | "rejected" — 심사가 필요한 서비스라면
  // 신청 직후 status가 "pending"으로 오고, 관리자가 승인하면 verified가 true로 바뀝니다.
  const [verification, setVerification] = useState({ verified: false, org: "", status: "none" });

  // 활동 통계 (마이페이지 상단)
  const [stats, setStats] = useState(EMPTY_STATS);

  // 찜한 매장
  const [favorites, setFavorites] = useState([]);

  // 알림 설정
  const [notifSettings, setNotifSettings] = useState({
    pickup: true,
    newListing: true,
    marketing: false,
  });

  // 지도에 표시할 매장 목록
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState(null);

  // 지도에서 선택한 매장 (도시락 신청 화면에서 사용)
  const [selectedStore, setSelectedStore] = useState(null);

  // 등록 내역에서 선택한 등록건 (신청자 관리 화면에서 사용)
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  // 로그인 직후 1회, 내 정보(프로필/인증상태/통계/찜/알림설정)를 백엔드에서 불러옵니다.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (page === "login" || bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    fetchMyProfile()
      .then((data) => {
        if (!data) return;
        setProfile((p) => ({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          avatar: data.avatarUrl || p.avatar,
        }));
      })
      .catch((err) => console.error("프로필 조회 실패:", err));

    fetchMyVerification()
      .then(
        (data) =>
          data &&
          setVerification({
            verified: !!data.verified,
            org: data.org || "",
            status: data.status || (data.verified ? "approved" : "none"),
          })
      )
      .catch((err) => console.error("소속 인증 상태 조회 실패:", err));

    fetchMyStats()
      .then((data) => {
        if (!data) return;
        setStats([
          { label: "신청한 도시락", value: data.applicationCount || 0 },
          { label: "등록한 식품", value: data.registrationCount || 0 },
          { label: "나눔 참여일", value: data.activeDays || 0 },
        ]);
      })
      .catch((err) => console.error("활동 통계 조회 실패:", err));

    fetchFavorites()
      .then((data) => setFavorites(data || []))
      .catch((err) => console.error("찜한 매장 조회 실패:", err));

    fetchNotificationSettings()
      .then((data) => data && setNotifSettings(data))
      .catch((err) => console.error("알림 설정 조회 실패:", err));
  }, [page]);

  // 지도용 매장 목록은 한 번만 불러오고, 검색은 클라이언트에서 필터링합니다.
  useEffect(() => {
    if (page === "login" || stores.length > 0 || storesLoading) return;
    setStoresLoading(true);
    setStoresError(null);
    fetchStores({})
      .then((data) => setStores(data || []))
      .catch((err) => setStoresError(err.message))
      .finally(() => setStoresLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSelectStore = (store) => {
    setSelectedStore(store);
    setPage("list");
  };

  const handleSelectRegistration = (registration) => {
    setSelectedRegistration(registration);
    setPage("registration-applicants");
  };

  const handleToggleNotif = async (key, value) => {
    const next = { ...notifSettings, [key]: value };
    setNotifSettings(next); // 낙관적 업데이트
    try {
      await updateNotificationSettings(next);
    } catch (err) {
      console.error("알림 설정 저장 실패:", err);
    }
  };

  const handleRemoveFavorite = async (storeId) => {
    const prev = favorites;
    setFavorites((list) => list.filter((f) => f.id !== storeId));
    try {
      await removeFavorite(storeId);
    } catch (err) {
      console.error("찜 해제 실패:", err);
      setFavorites(prev);
    }
  };

  const handleToggleFavorite = async (store) => {
    const isFav = favorites.some((f) => f.id === store.id);
    if (isFav) {
      handleRemoveFavorite(store.id);
      return;
    }
    setFavorites((list) => [...list, store]);
    try {
      await addFavorite(store.id);
    } catch (err) {
      console.error("찜하기 실패:", err);
      setFavorites((list) => list.filter((f) => f.id !== store.id));
    }
  };

  const handleSaveProfile = async ({ name, email, phone, avatarFile }) => {
    let avatarUrl = profile.avatar;
    if (avatarFile) {
      try {
        const res = await uploadAvatar(avatarFile);
        if (res && res.avatarUrl) avatarUrl = res.avatarUrl;
      } catch (err) {
        console.error("프로필 사진 업로드 실패:", err);
      }
    }
    const updated = await updateMyProfile({ name, email, phone });
    setProfile({
      name: (updated && updated.name) || name,
      email: (updated && updated.email) || email,
      phone: (updated && updated.phone) || phone,
      avatar: avatarUrl,
    });
  };

  // 소속 인증 신청. 백엔드가 즉시 승인(verified: true)하거나, 심사 절차가 있다면
  // status: "pending"을 내려줄 수 있습니다 — 어느 쪽이든 그대로 반영합니다.
  const handleVerify = async ({ org, documentFile }) => {
    const result = await submitVerification({ org, documentFile });
    const next = {
      verified: !!(result && result.verified),
      org: (result && result.org) || org,
      status: (result && result.status) || (result && result.verified ? "approved" : "pending"),
    };
    setVerification(next);
    return next;
  };

  const handleUnverify = async () => {
    await cancelVerification();
    setVerification({ verified: false, org: "", status: "none" });
  };

  const handleDeleteAccount = async () => {
    await deleteAccount();
    clearAuthToken();
    bootstrappedRef.current = false;
  };

  const handleLogout = () => {
    clearAuthToken();
    bootstrappedRef.current = false;
    setProfile({ name: "", email: "", phone: "", avatar: null });
    setVerification({ verified: false, org: "", status: "none" });
    setFavorites([]);
    setStats(EMPTY_STATS);
    setSelectedStore(null);
    setSelectedRegistration(null);
    setPage("login");
  };

  const screens = {
    login: <LoginScreen onNavigate={setPage} />,
    home: (
      <HomeScreen
        onNavigate={setPage}
        query={query}
        setQuery={setQuery}
        verified={verification.verified}
        avatarUrl={profile.avatar}
        stores={stores}
        storesLoading={storesLoading}
        storesError={storesError}
        onSelectStore={handleSelectStore}
      />
    ),
    list: (
      <ApplicationScreen
        onNavigate={setPage}
        verified={verification.verified}
        avatarUrl={profile.avatar}
        store={selectedStore}
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
      />
    ),
    register: <RegisterScreen onNavigate={setPage} verified={verification.verified} avatarUrl={profile.avatar} />,
    mypage: (
      <MyPageScreen
        onNavigate={setPage}
        profile={profile}
        verification={verification}
        stats={stats}
        onLogout={handleLogout}
      />
    ),
    "profile-edit": <ProfileEditScreen onNavigate={setPage} profile={profile} onSave={handleSaveProfile} />,
    verify: (
      <VerifyScreen
        onNavigate={setPage}
        verification={verification}
        onVerify={handleVerify}
        onUnverify={handleUnverify}
      />
    ),
    "history-apply": <ApplicationsHistoryScreen onNavigate={setPage} />,
    "history-register": (
      <RegistrationsHistoryScreen onNavigate={setPage} onSelectRegistration={handleSelectRegistration} />
    ),
    "registration-applicants": (
      <RegistrationApplicantsScreen onNavigate={setPage} registration={selectedRegistration} />
    ),
    favorites: (
      <FavoritesScreen onNavigate={setPage} favorites={favorites} onRemoveFavorite={handleRemoveFavorite} />
    ),
    notifications: (
      <NotificationSettingsScreen onNavigate={setPage} notifSettings={notifSettings} onToggle={handleToggleNotif} />
    ),
    account: (
      <AccountScreen
        onNavigate={setPage}
        profile={profile}
        verification={verification}
        onDeleteAccount={handleDeleteAccount}
      />
    ),
    support: <SupportScreen onNavigate={setPage} />,
    "admin-login": <AdminLoginScreen onLoginSuccess={() => setPage("admin")} />,
    admin: (
      <AdminVerificationsScreen
        onLogout={() => {
          adminLogout();
          setPage("login");
        }}
      />
    ),
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        {screens[page] || <div className="coming-soon">다음 단계에서 제작 예정</div>}
      </div>
    </div>
  );
}