import React, { useState, useEffect } from 'react';

const ADMIN_USER_ID = 'U5e88b1121f054ba725948e898394016e';
const LIFF_ID = '2012650134-fNn1I0l8';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzz6sxxZ-pArV_MJ2yypT6gUuMaZQEmXXM597ayfQcJIlWuYvAYISavd4MGR4cytpw0/exec';

// 預設系統設定（可在手機後台隨時修改並同步至雲端）
const DEFAULT_CONFIG = {
  brandSub: 'ONLINE BOOKING',
  heroTitle1: '留一段時間，',
  heroTitle2: '給質感與放鬆的自己。',
  heroDesc: '選擇日期與服務，尚可預約的時間會清楚顯示。',
  igUrl: 'https://instagram.com',
  fbUrl: 'https://facebook.com',
  lineUrl: 'https://line.me/R/ti/p/@992nilsd',
  notices: [
    '本店採完全預約制，提供專屬一對一服務',
    '染燙或特殊造型需求歡迎先至官方 LINE 傳圖討論',
    '當天保留 10 分鐘；無故未到 2 次將不再提供預約',
    '若需同時施作多項深度養護，系統皆可直接複選',
    '有任何問題請到官方 LINE 傳訊息討論 😊'
  ],
  services: [
    { id: 's1', name: '質感剪髮', price: '$600 起' },
    { id: 's2', name: '精油頭皮養護', price: '$1,200 起' },
    { id: 's3', name: '深層結構護髮', price: '$1,500 起' },
    { id: 's4', name: '經典質感染髮', price: '$2,200 起' },
    { id: 's5', name: '日系溫塑燙髮', price: '$2,800 起' },
    { id: 's6', name: '深度放鬆洗護專案', price: '$800' }
  ],
  defaultSlots: ['10:00', '11:30', '13:30', '15:00', '16:30', '18:00', '19:30'],
  // 單日特殊設定：status 可為 'open'(自訂時段), 'closed'(店休), 'full'(額滿)
  dateOverrides: {
    '2026-11-18': { status: 'full', slots: [] },
    '2026-11-19': { status: 'full', slots: [] },
    '2026-11-21': { status: 'full', slots: [] },
    '2026-11-25': { status: 'full', slots: [] },
    '2026-11-30': { status: 'closed', slots: [] }
  },
  locationName: '髮嶼 HAIR ISLAND',
  locationAddress: '台南市善化區',
  locationNote: '（專屬預約制質感沙龍）',
  mapQuery: '台南市善化區'
};

export default function App() {
  // LIFF 與使用者狀態
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  // 導覽分頁：'book' (我要預約) | 'my' (我的預約) | 'admin' (後台管理)
  const [activeTab, setActiveTab] = useState('book');

  // 系統設定與預約紀錄
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [bookedSlotsMap, setBookedSlotsMap] = useState({}); // { '2026-11-20': ['10:00'] }
  const [myBookings, setMyBookings] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 月曆狀態 (預設顯示 2026 年 11 月或當月)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // 客戶表單選擇狀態
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [phone, setPhone] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 後台管理編輯狀態
  const [adminEditDate, setAdminEditDate] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [savingAdmin, setSavingAdmin] = useState(false);

  // 1. 初始化 LIFF 並從 GAS 讀取後台設定與已預約時段
  useEffect(() => {
    const initApp = async () => {
      try {
        if (!window.liff) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        await window.liff.init({ liffId: LIFF_ID });
        if (window.liff.isLoggedIn()) {
          const profile = await window.liff.getProfile();
          setUserName(profile.displayName);
          setUserId(profile.userId);
          if (profile.userId === ADMIN_USER_ID) {
            setIsAdmin(true);
          }
        } else {
          window.liff.login();
        }
      } catch (err) {
        console.error('LIFF 初始化失敗:', err);
      }

      // 讀取本地或雲端設定
      const savedLocal = localStorage.getItem('hair_island_config');
      if (savedLocal) {
        try { setConfig(JSON.parse(savedLocal)); } catch (e) {}
      }
      const savedMyBookings = localStorage.getItem('hair_island_my_bookings');
      if (savedMyBookings) {
        try { setMyBookings(JSON.parse(savedMyBookings)); } catch (e) {}
      }

      try {
        const res = await fetch(`${GAS_URL}?action=getInitData`);
        const data = await res.json();
        if (data && data.config) {
          setConfig(data.config);
          localStorage.setItem('hair_island_config', JSON.stringify(data.config));
        }
        if (data && data.bookedSlots) {
          setBookedSlotsMap(data.bookedSlots);
        }
      } catch (err) {
        console.log('使用預設或本地設定檔');
      } finally {
        setLoadingConfig(false);
      }
    };

    initApp();
  }, []);

  // 連點 5 下 Logo 可開啟管理員模式（方便在電腦上測試後台）
  const handleLogoClick = () => {
    const next = logoClicks + 1;
    setLogoClicks(next);
    if (next >= 5) {
      setIsAdmin(true);
      setActiveTab('admin');
      setLogoClicks(0);
    }
  };

  // 計算某個日期的狀態與剩餘可用時段
  const getDateStatusAndSlots = (dateStr) => {
    const override = config.dateOverrides?.[dateStr];
    const booked = bookedSlotsMap[dateStr] || [];

    if (override?.status === 'closed') {
      return { status: 'closed', availableSlots: [] };
    }
    if (override?.status === 'full') {
      return { status: 'full', availableSlots: [] };
    }

    const baseSlots = override?.status === 'open' && override.slots
      ? override.slots
      : config.defaultSlots;

    const availableSlots = baseSlots.filter((s) => !booked.includes(s));

    if (availableSlots.length === 0) {
      return { status: 'full', availableSlots: [] };
    }
    return { status: 'available', availableSlots };
  };

  // 產生月曆格子
  const generateCalendarDays = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mStr}-${dStr}`;

      const dateObj = new Date(currentYear, currentMonth, d, 23, 59, 59);
      const isPast = dateObj < new Date();

      const { status, availableSlots } = getDateStatusAndSlots(dateStr);
      days.push({ day: d, dateStr, isPast, status, availableSlots });
    }
    return days;
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const toggleService = (serviceName) => {
    if (selectedServices.includes(serviceName)) {
      setSelectedServices(selectedServices.filter((s) => s !== serviceName));
    } else {
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  // 送出預約
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      alert('請先點選月曆選擇預約日期與時段！');
      return;
    }
    if (selectedServices.length === 0) {
      alert('請至少勾選一項服務！');
      return;
    }
    if (!userName.trim()) {
      alert('請填寫您的姓名！');
      return;
    }
    if (!phone.trim()) {
      alert('請填寫您的聯絡電話！');
      return;
    }

    setIsSubmitting(true);
    const serviceStr = selectedServices.join('、');
    const finalRemark = remark.trim() || '無';

    const newBookingRecord = {
      id: Date.now(),
      clientName: userName,
      userId: userId,
      phone: phone,
      serviceItem: serviceStr,
      appointmentDate: selectedDate,
      appointmentTime: selectedTime,
      remark: finalRemark
    };

    // 1. 傳送至 GAS 後端紀錄並推播通知管理員
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createBooking',
          ...newBookingRecord,
          fullTimeText: `${selectedDate} ${selectedTime}`
        })
      });
    } catch (err) {
      console.error('傳送 GAS 失敗:', err);
    }

    // 2. 若在 LINE 內開啟，自動將預約明細傳回官方帳號聊天室
    if (window.liff && window.liff.isInClient()) {
      try {
        await window.liff.sendMessages([
          {
            type: 'text',
            text: `✨【髮嶼 HAIR ISLAND 預約成功】✨\n👤 姓名：${userName}\n📞 電話：${phone}\n📅 日期：${selectedDate}\n⏰ 時間：${selectedTime}\n💇 服務：${serviceStr}\n💬 備註：${finalRemark}`
          }
        ]);
      } catch (err) {
        console.log('LIFF 傳訊略過:', err);
      }
    }

    // 3. 更新本地已預約時段與「我的預約」列表
    const updatedBooked = {
      ...bookedSlotsMap,
      [selectedDate]: [...(bookedSlotsMap[selectedDate] || []), selectedTime]
    };
    setBookedSlotsMap(updatedBooked);

    const updatedMy = [newBookingRecord, ...myBookings];
    setMyBookings(updatedMy);
    localStorage.setItem('hair_island_my_bookings', JSON.stringify(updatedMy));

    setIsSubmitting(false);
    setSelectedTime('');
    setSelectedServices([]);
    setRemark('');
    setActiveTab('my');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ================= 後台管理儲存函式 =================
  const handleSaveConfig = async (newConfig) => {
    setSavingAdmin(true);
    setConfig(newConfig);
    localStorage.setItem('hair_island_config', JSON.stringify(newConfig));
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveConfig',
          config: newConfig
        })
      });
      alert('✅ 設定已成功儲存並同步更新！');
    } catch (e) {
      alert('已儲存在本機！');
    }
    setSavingAdmin(false);
  };

  const setDateOverrideStatus = (dateStr, status) => {
    const prev = config.dateOverrides?.[dateStr] || { slots: [...config.defaultSlots] };
    const updated = {
      ...config,
      dateOverrides: {
        ...config.dateOverrides,
        [dateStr]: { ...prev, status, slots: prev.slots?.length ? prev.slots : [...config.defaultSlots] }
      }
    };
    setConfig(updated);
  };

  const toggleDateSlot = (dateStr, slot) => {
    const prev = config.dateOverrides?.[dateStr] || { status: 'open', slots: [...config.defaultSlots] };
    const currentSlots = prev.slots || [...config.defaultSlots];
    const nextSlots = currentSlots.includes(slot)
      ? currentSlots.filter((s) => s !== slot)
      : [...currentSlots, slot].sort();

    const updated = {
      ...config,
      dateOverrides: {
        ...config.dateOverrides,
        [dateStr]: { status: 'open', slots: nextSlots }
      }
    };
    setConfig(updated);
  };

  const calendarDays = generateCalendarDays();
  const currentSelectedDateInfo = selectedDate ? getDateStatusAndSlots(selectedDate) : null;

  // 所有可選的半小時時段池（供後台勾選開放時段）
  const allHalfHourPool = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f6efea', color: '#2c2523', fontFamily: '-apple-system, BlinkMacSystemFont, "Noto Sans TC", "Segoe UI", sans-serif', paddingBottom: '60px', boxSizing: 'border-box' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background-color: #f6efea; }
        input, textarea, button { font-family: inherit; }
      `}</style>

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '20px 18px' }}>
        
        {/* 頂部 Header：品牌 Logo 與 雙分頁切換器 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div onClick={handleLogoClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#fff', border: '1px solid #e5dcd6', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#9e8576', letterSpacing: '1px', lineHeight: '1.1' }}>HI</span>
              <span style={{ fontSize: '8px', color: '#b5a195', transform: 'scale(0.85)' }}>HAIR ISLAND</span>
            </div>
            <span style={{ fontSize: '19px', fontWeight: '700', color: '#2c2523', letterSpacing: '0.5px' }}>髮嶼</span>
          </div>

          <div style={{ display: 'flex', backgroundColor: '#ebe3dd', padding: '4px', borderRadius: '30px', gap: '2px' }}>
            <button
              onClick={() => setActiveTab('book')}
              style={{
                border: 'none',
                backgroundColor: activeTab === 'book' ? '#ffffff' : 'transparent',
                color: activeTab === 'book' ? '#2c2523' : '#8c827c',
                padding: '8px 16px',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: activeTab === 'book' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              我要預約
            </button>
            <button
              onClick={() => setActiveTab('my')}
              style={{
                border: 'none',
                backgroundColor: activeTab === 'my' ? '#ffffff' : 'transparent',
                color: activeTab === 'my' ? '#2c2523' : '#8c827c',
                padding: '8px 16px',
                borderRadius: '24px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: activeTab === 'my' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              我的預約
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                style={{
                  border: 'none',
                  backgroundColor: activeTab === 'admin' ? '#2c2523' : 'transparent',
                  color: activeTab === 'admin' ? '#ffffff' : '#8c827c',
                  padding: '8px 12px',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ⚙️ 後台
              </button>
            )}
          </div>
        </div>

        {/* ==================== 分頁 1：我要預約 ==================== */}
        {activeTab === 'book' && (
          <>
            {/* 主視覺標語區 */}
            <div style={{ marginBottom: '24px', paddingLeft: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#b56c75', letterSpacing: '1.8px', marginBottom: '8px' }}>
                {config.brandSub}
              </div>
              <h1 style={{ fontSize: '30px', fontWeight: '800', color: '#261f1d', margin: '0 0 12px 0', lineHeight: '1.35', letterSpacing: '0.5px' }}>
                {config.heroTitle1}<br />
                {config.heroTitle2}
              </h1>
              <p style={{ fontSize: '14px', color: '#7d736e', margin: '0 0 18px 0' }}>
                {config.heroDesc}
              </p>

              {/* 社群圓形按鈕 (IG / FB / LINE) */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <a href={config.igUrl} target="_blank" rel="noreferrer" style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#ffffff', border: '1px solid #e6ded8', display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', color: '#5c524d', fontSize: '15px', fontWeight: '700', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  IG
                </a>
                <a href={config.fbUrl} target="_blank" rel="noreferrer" style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#ffffff', border: '1px solid #e6ded8', display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', color: '#5c524d', fontSize: '16px', fontWeight: '700', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  f
                </a>
                <a href={config.lineUrl} target="_blank" rel="noreferrer" style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#ffffff', border: '1px solid #e6ded8', display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', color: '#5c524d', fontSize: '11px', fontWeight: '800', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  LINE
                </a>
              </div>
            </div>

            {/* 卡片 1：預約須知 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px 22px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: '#261f1d' }}>預約須知</h2>
                <span style={{ backgroundColor: '#eaf3f0', color: '#2e6f5e', fontSize: '12px', fontWeight: '600', padding: '5px 12px', borderRadius: '20px' }}>
                  預約前請詳閱
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: '#4a4340', lineHeight: '1.6' }}>
                {config.notices.map((note, idx) => (
                  <div key={idx}>・{note}</div>
                ))}
              </div>
            </div>

            {/* 卡片 2：1. 選擇日期 & 2. 選擇時間 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px 22px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#261f1d' }}>1. 選擇日期</h2>
                <span style={{ backgroundColor: '#eaf3f0', color: '#2e6f5e', fontSize: '12px', fontWeight: '600', padding: '5px 12px', borderRadius: '20px' }}>
                  {selectedDate ? `已選 ${selectedDate}` : '請選擇日期'}
                </span>
              </div>

              {/* 月份切換器 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 8px' }}>
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e6ded8', backgroundColor: '#fff', color: '#8c827c', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  ‹
                </button>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#261f1d', letterSpacing: '1px' }}>
                  {currentYear} 年 {currentMonth + 1} 月
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e6ded8', backgroundColor: '#fff', color: '#8c827c', fontSize: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  ›
                </button>
              </div>

              {/* 星期標題 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '13px', color: '#8c827c', marginBottom: '10px', fontWeight: '500' }}>
                <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
              </div>

              {/* 月曆日期網格 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: '8px', columnGap: '4px', textAlign: 'center', marginBottom: '28px' }}>
                {calendarDays.map((item, idx) => {
                  if (!item) return <div key={`empty-${idx}`} />;

                  const isSelected = selectedDate === item.dateStr;
                  const isDisabled = item.isPast || item.status === 'closed' || item.status === 'full';

                  let bg = 'transparent';
                  let border = 'none';
                  let textColor = '#261f1d';
                  let badgeText = '';

                  if (item.isPast) {
                    textColor = '#d0c8c2';
                  } else if (item.status === 'closed') {
                    bg = '#f4e6e8';
                    textColor = '#9e5863';
                    badgeText = '店休';
                  } else if (item.status === 'full') {
                    bg = '#f4e6e8';
                    textColor = '#9e5863';
                    badgeText = '額滿';
                  }

                  if (isSelected) {
                    bg = '#2c2523';
                    textColor = '#ffffff';
                  }

                  return (
                    <div
                      key={item.dateStr}
                      onClick={() => {
                        if (!isDisabled) {
                          setSelectedDate(item.dateStr);
                          setSelectedTime('');
                        }
                      }}
                      style={{
                        height: '52px',
                        borderRadius: '12px',
                        backgroundColor: bg,
                        border: border,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: isDisabled ? 'default' : 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: isSelected || !isDisabled ? '600' : '400', color: textColor, lineHeight: '1.2' }}>
                        {item.day}
                      </span>
                      {badgeText && (
                        <span style={{ fontSize: '10px', color: isSelected ? '#fff' : '#9e5863', marginTop: '2px', fontWeight: '600' }}>
                          {badgeText}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 2. 選擇時間 */}
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 14px 0', color: '#261f1d' }}>2. 選擇時間</h2>
              {!selectedDate ? (
                <div style={{ backgroundColor: '#f5f1ed', borderRadius: '14px', padding: '16px 18px', color: '#8c827c', fontSize: '14px' }}>
                  點選月曆日期後查看剩餘時段
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {currentSelectedDateInfo?.availableSlots.map((slot) => {
                    const active = selectedTime === slot;
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => setSelectedTime(slot)}
                        style={{
                          padding: '12px 0',
                          borderRadius: '12px',
                          border: active ? '1px solid #2c2523' : '1px solid #e0d8d0',
                          backgroundColor: active ? '#2c2523' : '#ffffff',
                          color: active ? '#ffffff' : '#2c2523',
                          fontSize: '15px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 卡片 3：3. 預約資料（服務複選＋姓名電話備註） */}
            <form onSubmit={handleSubmitBooking} style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px 22px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#261f1d' }}>3. 預約資料</h2>
                <span style={{ backgroundColor: '#eaf3f0', color: '#2e6f5e', fontSize: '12px', fontWeight: '600', padding: '5px 12px', borderRadius: '20px' }}>
                  服務可複選
                </span>
              </div>

              {/* 服務項目複選卡片清單 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {config.services.map((srv) => {
                  const checked = selectedServices.includes(srv.name);
                  return (
                    <div
                      key={srv.id}
                      onClick={() => toggleService(srv.name)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 18px',
                        borderRadius: '16px',
                        border: checked ? '1.5px solid #9e5863' : '1px solid #e6ded8',
                        backgroundColor: checked ? '#fcf8f9' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '8px',
                            border: checked ? 'none' : '1.5px solid #9e948e',
                            backgroundColor: checked ? '#9e5863' : '#ffffff',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: '#ffffff',
                            fontSize: '14px',
                            fontWeight: '700'
                          }}
                        >
                          {checked ? '✓' : ''}
                        </div>
                        <span style={{ fontSize: '16px', fontWeight: '600', color: '#261f1d' }}>{srv.name}</span>
                      </div>
                      <span style={{ fontSize: '15px', fontWeight: '600', color: '#a86470' }}>{srv.price}</span>
                    </div>
                  );
                })}
              </div>

              {/* 姓名欄位（自動帶入 LINE 名稱，亦可修改） */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#7d736e', marginBottom: '8px', fontWeight: '500' }}>姓名</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="您的姓名"
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '14px', border: '1px solid #e6ded8', fontSize: '15px', color: '#261f1d', outline: 'none' }}
                />
              </div>

              {/* 電話欄位 */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#7d736e', marginBottom: '8px', fontWeight: '500' }}>電話</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx-xxx-xxx"
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '14px', border: '1px solid #e6ded8', fontSize: '15px', color: '#261f1d', outline: 'none' }}
                />
              </div>

              {/* 備註欄位 */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', color: '#7d736e', marginBottom: '8px', fontWeight: '500' }}>備註</label>
                <textarea
                  rows="3"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="想做的髮型款式、頭皮狀況或特殊需求等"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '14px', border: '1px solid #e6ded8', fontSize: '15px', color: '#261f1d', outline: 'none', resize: 'none' }}
                />
              </div>

              {/* 動態狀態提示條 */}
              <div style={{ backgroundColor: '#f5f1ed', borderRadius: '14px', padding: '14px 18px', marginBottom: '14px', fontSize: '14px', color: '#4a4340', fontWeight: '500' }}>
                {selectedServices.length === 0
                  ? '請至少勾選一項服務'
                  : !selectedDate || !selectedTime
                  ? `已選 ${selectedServices.length} 項服務，請選擇上方預約日期與時間`
                  : `預約：${selectedDate} (${selectedTime})・共 ${selectedServices.length} 項服務`}
              </div>

              {/* 確認預約按鈕 */}
              <button
                type="submit"
                disabled={isSubmitting || selectedServices.length === 0 || !selectedDate || !selectedTime}
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: (selectedServices.length === 0 || !selectedDate || !selectedTime) ? '#96938f' : '#2c2523',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '600',
                  letterSpacing: '1px',
                  cursor: (selectedServices.length === 0 || !selectedDate || !selectedTime) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {isSubmitting ? '預約傳送中...' : '確認預約'}
              </button>
            </form>

            {/* 卡片 4：LOCATION 店鋪位置與 Google 地圖 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#b56c75', letterSpacing: '1.5px', marginBottom: '6px' }}>
                LOCATION
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 12px 0', color: '#261f1d' }}>
                {config.locationName}
              </h2>
              <div style={{ fontSize: '15px', color: '#6e655f', lineHeight: '1.6', marginBottom: '16px' }}>
                <div>{config.locationAddress}</div>
                <div>{config.locationNote}</div>
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.mapQuery)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#221e1d',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '10px 20px',
                  borderRadius: '24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '18px'
                }}
              >
                開啟 Google 地圖
              </a>

              <div style={{ width: '100%', height: '240px', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e6ded8' }}>
                <iframe
                  title="salon-map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(config.mapQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            </div>
          </>
        )}

        {/* ==================== 分頁 2：我的預約 ==================== */}
        {activeTab === 'my' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '28px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 8px 0', color: '#261f1d' }}>
              我的預約紀錄
            </h2>
            <p style={{ fontSize: '13px', color: '#8c827c', margin: '0 0 20px 0' }}>
              {userName ? `貴賓 ${userName} 您好，以下為您的預約資訊：` : '以下為您近期的預約申請紀錄：'}
            </p>

            {myBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#faf7f5', borderRadius: '16px', color: '#8c827c', fontSize: '14px' }}>
                目前尚無預約紀錄
                <div style={{ marginTop: '16px' }}>
                  <button
                    onClick={() => setActiveTab('book')}
                    style={{ backgroundColor: '#2c2523', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    前往立即預約
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {myBookings.map((item) => (
                  <div key={item.id} style={{ padding: '18px', borderRadius: '16px', backgroundColor: '#faf7f5', border: '1px solid #ebe3dd', lineHeight: '1.8', fontSize: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700', fontSize: '16px', color: '#2c2523' }}>📅 {item.appointmentDate} ({item.appointmentTime})</span>
                      <span style={{ backgroundColor: '#eaf3f0', color: '#2e6f5e', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '12px' }}>已送出預約</span>
                    </div>
                    <div>💇 預約服務：<strong>{item.serviceItem}</strong></div>
                    <div>👤 預約姓名：{item.clientName} ({item.phone})</div>
                    <div>💬 備註事項：{item.remark}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== 分頁 3：管理員專屬後台設定 ==================== */}
        {activeTab === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 區塊 A：單日排班與空檔設定 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 6px 0' }}>⚙️ 1. 調整每日營業狀態與空檔時段</h2>
              <p style={{ fontSize: '13px', color: '#8c827c', margin: '0 0 16px 0' }}>
                選擇日期後，可將當天設為「店休」、「額滿」，或自由勾選當天有空的時段。
              </p>

              <input
                type="date"
                value={adminEditDate}
                onChange={(e) => setAdminEditDate(e.target.value)}
                style={{ width: '100%', height: '46px', padding: '0 14px', borderRadius: '12px', border: '1px solid #dcd6cd', fontSize: '15px', marginBottom: '16px' }}
              />

              {adminEditDate && (
                <div style={{ backgroundColor: '#faf7f5', padding: '16px', borderRadius: '14px', border: '1px solid #ebe3dd' }}>
                  <div style={{ fontWeight: '700', marginBottom: '10px', fontSize: '14px' }}>
                    設定 {adminEditDate} 狀態：
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {[
                      { key: 'open', label: '正常營業 (自訂空檔)' },
                      { key: 'full', label: '標示額滿' },
                      { key: 'closed', label: '標示店休' }
                    ].map((st) => {
                      const currentSt = config.dateOverrides?.[adminEditDate]?.status || 'open';
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => setDateOverrideStatus(adminEditDate, st.key)}
                          style={{
                            flex: 1,
                            padding: '10px 6px',
                            borderRadius: '10px',
                            border: currentSt === st.key ? 'none' : '1px solid #dcd6cd',
                            backgroundColor: currentSt === st.key ? '#2c2523' : '#ffffff',
                            color: currentSt === st.key ? '#ffffff' : '#2c2523',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          {st.label}
                        </button>
                      );
                    })}
                  </div>

                  {(config.dateOverrides?.[adminEditDate]?.status || 'open') === 'open' && (
                    <>
                      <div style={{ fontSize: '13px', color: '#6e655f', marginBottom: '10px' }}>
                        點選開啟或關閉 {adminEditDate} 可預約的時段（深色代表開放）：
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {allHalfHourPool.map((slot) => {
                          const activeSlots = config.dateOverrides?.[adminEditDate]?.slots || config.defaultSlots;
                          const isOpen = activeSlots.includes(slot);
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => toggleDateSlot(adminEditDate, slot)}
                              style={{
                                padding: '8px 0',
                                borderRadius: '8px',
                                border: isOpen ? 'none' : '1px solid #dcd6cd',
                                backgroundColor: isOpen ? '#2e6f5e' : '#ffffff',
                                color: isOpen ? '#ffffff' : '#8c827c',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 區塊 B：預設每日時段管理 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>⚙️ 2. 平常日預設開放時段</h2>
              <p style={{ fontSize: '13px', color: '#8c827c', margin: '0 0 12px 0' }}>點選即可開啟或關閉平常日的固定預約時段：</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {allHalfHourPool.map((slot) => {
                  const isOpen = config.defaultSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        const next = isOpen
                          ? config.defaultSlots.filter((s) => s !== slot)
                          : [...config.defaultSlots, slot].sort();
                        setConfig({ ...config, defaultSlots: next });
                      }}
                      style={{
                        padding: '8px 0',
                        borderRadius: '8px',
                        border: isOpen ? 'none' : '1px solid #dcd6cd',
                        backgroundColor: isOpen ? '#2c2523' : '#ffffff',
                        color: isOpen ? '#ffffff' : '#8c827c',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 區塊 C：服務項目與價格管理 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 14px 0' }}>⚙️ 3. 服務項目與價格設定</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {config.services.map((srv, index) => (
                  <div key={srv.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={srv.name}
                      onChange={(e) => {
                        const updated = [...config.services];
                        updated[index].name = e.target.value;
                        setConfig({ ...config, services: updated });
                      }}
                      style={{ flex: 2, height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #dcd6cd', fontSize: '14px' }}
                    />
                    <input
                      type="text"
                      value={srv.price}
                      onChange={(e) => {
                        const updated = [...config.services];
                        updated[index].price = e.target.value;
                        setConfig({ ...config, services: updated });
                      }}
                      style={{ flex: 1, height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #dcd6cd', fontSize: '14px' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.services.filter((_, i) => i !== index);
                        setConfig({ ...config, services: updated });
                      }}
                      style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: 'none', backgroundColor: '#f4e6e8', color: '#9e5863', fontWeight: '600', cursor: 'pointer' }}
                    >
                      刪除
                    </button>
                  </div>
                ))}
              </div>

              {/* 新增服務項目 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="新服務名稱"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  style={{ flex: 2, height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #dcd6cd', fontSize: '14px' }}
                />
                <input
                  type="text"
                  placeholder="$價格"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  style={{ flex: 1, height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #dcd6cd', fontSize: '14px' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newServiceName.trim()) return;
                    setConfig({
                      ...config,
                      services: [...config.services, { id: `s_${Date.now()}`, name: newServiceName, price: newServicePrice || '$500 起' }]
                    });
                    setNewServiceName('');
                    setNewServicePrice('');
                  }}
                  style={{ height: '40px', padding: '0 14px', borderRadius: '8px', border: 'none', backgroundColor: '#eaf3f0', color: '#2e6f5e', fontWeight: '700', cursor: 'pointer' }}
                >
                  ＋新增
                </button>
              </div>
            </div>

            {/* 區塊 D：預約須知與地址設定 */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '22px', padding: '24px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 12px 0' }}>⚙️ 4. 預約須知與店鋪地址</h2>
              <label style={{ display: 'block', fontSize: '13px', color: '#6e655f', marginBottom: '6px' }}>預約須知（每行一條）：</label>
              <textarea
                rows="5"
                value={config.notices.join('\n')}
                onChange={(e) => setConfig({ ...config, notices: e.target.value.split('\n') })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #dcd6cd', fontSize: '14px', marginBottom: '14px', lineHeight: '1.6' }}
              />

              <label style={{ display: 'block', fontSize: '13px', color: '#6e655f', marginBottom: '6px' }}>店鋪地址：</label>
              <input
                type="text"
                value={config.locationAddress}
                onChange={(e) => setConfig({ ...config, locationAddress: e.target.value, mapQuery: e.target.value })}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #dcd6cd', fontSize: '14px', marginBottom: '10px' }}
              />

              <label style={{ display: 'block', fontSize: '13px', color: '#6e655f', marginBottom: '6px' }}>地址補充說明：</label>
              <input
                type="text"
                value={config.locationNote}
                onChange={(e) => setConfig({ ...config, locationNote: e.target.value })}
                style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid #dcd6cd', fontSize: '14px' }}
              />
            </div>

            {/* 儲存後台設定按鈕 */}
            <button
              type="button"
              disabled={savingAdmin}
              onClick={() => handleSaveConfig(config)}
              style={{ width: '100%', height: '52px', borderRadius: '14px', border: 'none', backgroundColor: '#2e6f5e', color: '#ffffff', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 14px rgba(46,111,94,0.25)' }}
            >
              {savingAdmin ? '同步儲存中...' : '💾 儲存並發布所有後台設定'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
