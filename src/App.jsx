import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ==================== 系統環境常數 ====================
const LIFF_ID = '2012650134-fNn1I0l8';
const ADMIN_USER_ID = 'U5e88b1121f054ba725948e898394016e';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzz6sxxZ-pArV_MJ2yypT6gUuMaZQEmXXM597ayfQcJIlWuYvAYISavd4MGR4cytpw0/exec';

// 營業時段：11:00 至 19:00
const DAILY_TIME_SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30'
];
const CLOSING_MINUTES = 19 * 60; // 19:00

const DEFAULT_SERVICES = [
  { id: 'srv_1', name: '質感剪髮', price: 600, duration: 60 },
  { id: 'srv_2', name: '精油頭皮養護', price: 1200, duration: 60 },
  { id: 'srv_3', name: '精油頭皮養護 + 質感剪髮', price: 1600, duration: 90 },
  { id: 'srv_4', name: '深層結構護髮', price: 1500, duration: 90 },
  { id: 'srv_5', name: '經典質感染髮', price: 2200, duration: 150 },
  { id: 'srv_6', name: '日系溫塑燙髮', price: 2800, duration: 180 }
];

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (totalMinutes) => {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
};

const getOccupiedSlots = (startTime, duration) => {
  const slots = [];
  const startMin = timeToMinutes(startTime);
  const steps = Math.ceil(duration / 30);
  for (let i = 0; i < steps; i++) {
    slots.push(minutesToTime(startMin + i * 30));
  }
  return slots;
};

export default function App() {
  const [currentView, setCurrentView] = useState('customer');
  const [adminTab, setAdminTab] = useState('appointments');

  const [liffProfile, setLiffProfile] = useState({ userId: '', displayName: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);

  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(DEFAULT_SERVICES[0].id);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayObj = new Date();
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());

  const [scheduleDate, setScheduleDate] = useState(() => {
    const y = todayObj.getFullYear();
    const m = String(todayObj.getMonth() + 1).padStart(2, '0');
    const d = String(todayObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [editingService, setEditingService] = useState({ id: '', name: '', price: '', duration: 60 });

  // 統一套用從雲端抓回來的最新資料
  const applyCloudData = useCallback((data) => {
    if (data?.services?.length) {
      setServices(data.services);
      localStorage.setItem('hi_services', JSON.stringify(data.services));
    }
    if (Array.isArray(data?.appointments)) {
      setAppointments(data.appointments);
      localStorage.setItem('hi_appointments', JSON.stringify(data.appointments));
    }
    if (data?.availability) {
      setAvailability(data.availability);
      localStorage.setItem('hi_availability', JSON.stringify(data.availability));
    }
  }, []);

  // 從 GAS 拉取最新資料庫（加上時間戳記防止手機瀏覽器快取）
  const fetchCloudDB = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${GAS_URL}?action=getDatabase&t=${Date.now()}`);
      const data = await res.json();
      applyCloudData(data);
    } catch (e) {
      console.error('讀取雲端資料庫失敗:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [applyCloudData]);

  // 通用 POST 請求函式（使用 text/plain 避開 CORS 預檢並直接解析回傳的最新資料庫）
  const postToGas = async (payload) => {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      applyCloudData(data);
      return data;
    } catch (err) {
      console.error('GAS 同步失敗:', err);
      return null;
    }
  };

  // 1. 初始化 LIFF
  const initLiff = async () => {
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
        setLiffProfile({ userId: profile.userId, displayName: profile.displayName });
        setCustomerName(profile.displayName);
        if (profile.userId === ADMIN_USER_ID) {
          setIsAdmin(true);
        }
      } else {
        window.liff.login();
      }
    } catch (err) {
      console.error('LIFF 初始化失敗:', err);
    }
  };

  // 2. 客戶端送出預約後，發送「預約待確認」並由後端原子化寫入
  const sendBookingPendingMsg = async (appointment, serviceObj) => {
    if (window.liff && window.liff.isInClient()) {
      try {
        await window.liff.sendMessages([
          {
            type: 'text',
            text: `🌿【髮嶼 Hair Island｜預約待確認】\n親愛的 ${appointment.customerName} 您好，已收到您的預約申請：\n\n・服務項目：${serviceObj.name} ($${serviceObj.price})\n・預計時長：${serviceObj.duration} 分鐘\n・預約日期：${appointment.date}\n・預約時段：${appointment.time} - ${appointment.endTime}\n・備註事項：${appointment.remark || '無'}\n\n設計師確認檔期後將發送「預約成功」通知給您！`
          }
        ]);
      } catch (e) {
        console.warn('LIFF 聊天室傳訊略過:', e);
      }
    }

    await postToGas({
      action: 'createBooking',
      appointment,
      serviceName: serviceObj.name,
      servicePrice: serviceObj.price,
      duration: serviceObj.duration
    });
  };

  // 3. 後台設計師點擊確認後，發送「預約已確認」
  const sendBookingConfirmedMsg = async (appointment, serviceObj, updatedAppointments, updatedAvailability) => {
    await postToGas({
      action: 'sendBookingConfirmedMsg',
      appointment,
      serviceName: serviceObj ? serviceObj.name : '專屬美髮服務',
      appointments: updatedAppointments,
      availability: updatedAvailability
    });
  };

  // 4. 後台觸發前一日提醒
  const sendReminderMsg = async (appointment, serviceObj) => {
    await postToGas({
      action: 'sendReminderMsg',
      appointment,
      serviceName: serviceObj ? serviceObj.name : '專屬美髮服務'
    });
    alert(`✅ 已透過 LINE 向「${appointment.customerName}」發送明日預約提醒！`);
  };

  // 後台管理設定同步
  const syncDatabase = async (nextServices, nextAppointments, nextAvailability) => {
    localStorage.setItem('hi_services', JSON.stringify(nextServices));
    localStorage.setItem('hi_appointments', JSON.stringify(nextAppointments));
    localStorage.setItem('hi_availability', JSON.stringify(nextAvailability));

    await postToGas({
      action: 'syncDatabase',
      services: nextServices,
      appointments: nextAppointments,
      availability: nextAvailability
    });
  };

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }

    initLiff();

    const localSrv = localStorage.getItem('hi_services');
    const localApt = localStorage.getItem('hi_appointments');
    const localAvl = localStorage.getItem('hi_availability');
    if (localSrv) setServices(JSON.parse(localSrv));
    if (localApt) setAppointments(JSON.parse(localApt));
    if (localAvl) setAvailability(JSON.parse(localAvl));

    fetchCloudDB();
  }, [fetchCloudDB]);

  // 每次切換到「後台」或「我的訂單」時，自動向雲端拉取最新預約資料
  useEffect(() => {
    if (currentView === 'admin' || currentView === 'my_bookings') {
      fetchCloudDB();
    }
  }, [currentView, fetchCloudDB]);

  const selectedService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || services[0];
  }, [services, selectedServiceId]);

  const getUnavailableSlotsForDate = (dateStr, ignoreAppointmentId = null) => {
    const blocked = new Set(availability[dateStr] || []);

    appointments.forEach((apt) => {
      if (apt.id === ignoreAppointmentId) return;
      if (apt.date === dateStr && (apt.status === 'confirmed' || apt.status === 'pending')) {
        const srv = services.find((s) => s.id === apt.serviceId);
        const dur = srv ? srv.duration : 60;
        const occupied = getOccupiedSlots(apt.time, dur);
        occupied.forEach((slot) => blocked.add(slot));
      }
    });

    return blocked;
  };

  const isSlotBookable = (dateStr, startTime, durationMinutes, ignoreAppointmentId = null) => {
    const startMin = timeToMinutes(startTime);
    const endMin = startMin + durationMinutes;
    if (endMin > CLOSING_MINUTES) return false;

    const requiredSlots = getOccupiedSlots(startTime, durationMinutes);
    const unavailableSet = getUnavailableSlotsForDate(dateStr, ignoreAppointmentId);

    for (const slot of requiredSlots) {
      if (unavailableSet.has(slot)) return false;
    }
    return true;
  };

  const hasAvailableSlotOnDate = (dateStr, durationMinutes) => {
    return DAILY_TIME_SLOTS.some((slot) => isSlotBookable(dateStr, slot, durationMinutes));
  };

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const todayMidnight = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

    const grid = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(calMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${calYear}-${mStr}-${dStr}`;
      const cellDate = new Date(calYear, calMonth, d);
      const isPast = cellDate < todayMidnight;

      const duration = selectedService ? selectedService.duration : 60;
      const canBook = !isPast && hasAvailableSlotOnDate(dateStr, duration);

      const blockedList = availability[dateStr] || [];
      const isFullDayClosed = blockedList.length >= DAILY_TIME_SLOTS.length;

      grid.push({
        day: d,
        dateStr,
        isPast,
        canBook,
        isFullDayClosed
      });
    }
    return grid;
  }, [calYear, calMonth, selectedService, availability, appointments, services]);

  const validatePhone = (val) => {
    const clean = val.replace(/[-\s]/g, '');
    return /^09\d{8}$/.test(clean);
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('請輸入您的姓名');
      return;
    }
    if (!validatePhone(phone)) {
      setPhoneError('請輸入正確的台灣手機號碼格式（如 0912-345-678）');
      return;
    }
    setPhoneError('');

    if (!selectedDate || !selectedTime) {
      alert('請選擇預約日期與時段');
      return;
    }

    const stillAvailable = isSlotBookable(selectedDate, selectedTime, selectedService.duration);
    if (!stillAvailable) {
      alert('抱歉！您選擇的時段剛剛已被預約或時長不足，請重新選擇時段。');
      setSelectedTime('');
      return;
    }

    setIsSubmitting(true);
    const endTime = minutesToTime(timeToMinutes(selectedTime) + selectedService.duration);

    const newAppointment = {
      id: `apt_${Date.now()}`,
      liffUserId: liffProfile.userId || 'web_guest',
      customerName: customerName.trim(),
      phone: phone.trim(),
      serviceId: selectedService.id,
      date: selectedDate,
      time: selectedTime,
      endTime: endTime,
      status: 'pending',
      remark: remark.trim()
    };

    // 先樂觀更新本地畫面，再由 sendBookingPendingMsg 觸發後端 createBooking 安全附加至雲端
    const nextAppointments = [...appointments, newAppointment];
    setAppointments(nextAppointments);
    localStorage.setItem('hi_appointments', JSON.stringify(nextAppointments));

    await sendBookingPendingMsg(newAppointment, selectedService);

    setIsSubmitting(false);
    setSelectedTime('');
    setRemark('');
    setCurrentView('my_bookings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmAppointment = async (apt) => {
    const srv = services.find((s) => s.id === apt.serviceId);
    const dur = srv ? srv.duration : 60;
    const occupiedSlots = getOccupiedSlots(apt.time, dur);

    const nextAppointments = appointments.map((item) =>
      item.id === apt.id ? { ...item, status: 'confirmed' } : item
    );

    const prevBlocked = availability[apt.date] || [];
    const mergedBlocked = Array.from(new Set([...prevBlocked, ...occupiedSlots])).sort();
    const nextAvailability = {
      ...availability,
      [apt.date]: mergedBlocked
    };

    setAppointments(nextAppointments);
    setAvailability(nextAvailability);

    await sendBookingConfirmedMsg({ ...apt, status: 'confirmed' }, srv, nextAppointments, nextAvailability);
    alert(`✅ 已確認「${apt.customerName}」的預約，已鎖定日曆並發送 LINE 確認通知！`);
  };

  const handleChangeAppointmentStatus = async (apt, newStatus) => {
    const srv = services.find((s) => s.id === apt.serviceId);
    const dur = srv ? srv.duration : 60;
    const occupiedSlots = getOccupiedSlots(apt.time, dur);

    const nextAppointments = appointments.map((item) =>
      item.id === apt.id ? { ...item, status: newStatus } : item
    );

    let nextAvailability = { ...availability };
    if (newStatus === 'cancelled' && apt.status === 'confirmed') {
      const prevBlocked = availability[apt.date] || [];
      nextAvailability[apt.date] = prevBlocked.filter((s) => !occupiedSlots.includes(s));
    }

    setAppointments(nextAppointments);
    setAvailability(nextAvailability);
    await syncDatabase(services, nextAppointments, nextAvailability);
  };

  const handleToggleBlockedSlot = async (dateStr, slot) => {
    const currentBlocked = availability[dateStr] || [];
    const isBlocked = currentBlocked.includes(slot);
    const nextBlocked = isBlocked
      ? currentBlocked.filter((s) => s !== slot)
      : [...currentBlocked, slot].sort();

    const nextAvailability = {
      ...availability,
      [dateStr]: nextBlocked
    };
    setAvailability(nextAvailability);
    await syncDatabase(services, appointments, nextAvailability);
  };

  const handleToggleFullDayClosed = async (dateStr) => {
    const currentBlocked = availability[dateStr] || [];
    const isAllClosed = currentBlocked.length >= DAILY_TIME_SLOTS.length;
    const nextAvailability = {
      ...availability,
      [dateStr]: isAllClosed ? [] : [...DAILY_TIME_SLOTS]
    };
    setAvailability(nextAvailability);
    await syncDatabase(services, appointments, nextAvailability);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!editingService.name.trim() || !editingService.price) return;

    let nextServices;
    if (editingService.id) {
      nextServices = services.map((s) =>
        s.id === editingService.id
          ? { ...editingService, price: Number(editingService.price), duration: Number(editingService.duration) }
          : s
      );
    } else {
      const newSrv = {
        id: `srv_${Date.now()}`,
        name: editingService.name.trim(),
        price: Number(editingService.price),
        duration: Number(editingService.duration)
      };
      nextServices = [...services, newSrv];
    }

    setServices(nextServices);
    setEditingService({ id: '', name: '', price: '', duration: 60 });
    await syncDatabase(nextServices, appointments, availability);
  };

  const handleDeleteService = async (id) => {
    if (services.length <= 1) {
      alert('請至少保留一項服務品項');
      return;
    }
    const nextServices = services.filter((s) => s.id !== id);
    setServices(nextServices);
    if (selectedServiceId === id) setSelectedServiceId(nextServices[0].id);
    await syncDatabase(nextServices, appointments, availability);
  };

  const handleSecretAdminTrigger = () => {
    const next = logoClickCount + 1;
    setLogoClickCount(next);
    if (next >= 5) {
      setIsAdmin(true);
      setCurrentView('admin');
      setLogoClickCount(0);
    }
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dtA = `${a.date} ${a.time}`;
      const dtB = `${b.date} ${b.time}`;
      return dtA.localeCompare(dtB);
    });
  }, [appointments]);

  const customerAppointments = useMemo(() => {
    return sortedAppointments.filter(
      (a) =>
        (liffProfile.userId && a.liffUserId === liffProfile.userId) ||
        (customerName && a.customerName === customerName)
    );
  }, [sortedAppointments, liffProfile.userId, customerName]);

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#2C2520] font-sans pb-16 selection:bg-[#8C6D53] selection:text-white">
      <div className="max-w-md mx-auto px-5 pt-6">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div
            onClick={handleSecretAdminTrigger}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-12 h-12 rounded-full bg-[#3A2E26] text-[#F7F4EF] flex flex-col items-center justify-center shadow-sm border border-[#C8B9A6]">
              <span className="text-sm font-serif tracking-widest font-semibold">髮嶼</span>
              <span className="text-[7px] tracking-widest text-[#D5C7B8] uppercase">Hair Island</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-[#2C2520]">髮嶼 HAIR ISLAND</h1>
              <p className="text-xs text-[#7D7168] tracking-wide">極簡木質・專屬頭皮養護與美髮</p>
            </div>
          </div>

          <div className="flex bg-[#EAE3DA] p-1 rounded-full text-xs font-medium">
            <button
              type="button"
              onClick={() => setCurrentView('customer')}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                currentView === 'customer'
                  ? 'bg-white text-[#2C2520] shadow-sm font-semibold'
                  : 'text-[#7D7168]'
              }`}
            >
              預約
            </button>
            <button
              type="button"
              onClick={() => setCurrentView('my_bookings')}
              className={`px-3.5 py-1.5 rounded-full transition-all ${
                currentView === 'my_bookings'
                  ? 'bg-white text-[#2C2520] shadow-sm font-semibold'
                  : 'text-[#7D7168]'
              }`}
            >
              我的訂單
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setCurrentView('admin')}
                className={`px-3 py-1.5 rounded-full transition-all ${
                  currentView === 'admin'
                    ? 'bg-[#3A2E26] text-white shadow-sm font-semibold'
                    : 'text-[#5C4938]'
                }`}
              >
                後台
              </button>
            )}
          </div>
        </header>

        {/* VIEW 1: 客戶端預約介面 */}
        {currentView === 'customer' && (
          <div className="space-y-6">
            <section className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-[#E6DFD5] shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-widest uppercase text-[#8C6D53]">
                  ONLINE RESERVATION
                </span>
                {liffProfile.displayName && (
                  <span className="text-xs bg-[#F2ECE4] text-[#5C4938] px-2.5 py-1 rounded-full font-medium">
                    Hi, {liffProfile.displayName} 貴賓
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-[#2C2520] leading-snug mb-2">
                留一段靜謐時光，<br />給需要深度放鬆的自己。
              </h2>
              <p className="text-xs text-[#7D7168] leading-relaxed mb-5">
                選擇服務與日期，系統將依據服務時長自動為您篩選尚可預約的空檔。
              </p>

              <div className="bg-[#FAF8F5] rounded-xl p-4 border border-[#EFE9E0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#3A2E26] tracking-wide">預約須知</span>
                  <span className="text-[11px] text-[#8C6D53] bg-[#EFE9E0] px-2 py-0.5 rounded">
                    預約前請詳閱
                  </span>
                </div>
                <ul className="text-xs text-[#60564F] space-y-1.5 leading-relaxed">
                  <li>・全店採一對一專屬預約制，營業時間為 11:00 - 19:00。</li>
                  <li>・預約送出後為「待確認」狀態，設計師確認後將透過 LINE 通知。</li>
                  <li>・當日保留 10 分鐘，如需更改或取消請提前於官方 LINE 告知。</li>
                </ul>
              </div>
            </section>

            {/* Step 1: 聯絡資訊 */}
            <section className="bg-white rounded-2xl p-6 border border-[#E6DFD5] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#2C2520]">Step 1. 聯絡資訊</h3>
                <span className="text-[11px] text-[#8C6D53] font-medium">自動帶入 LINE 暱稱</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#5C4938] mb-1.5">
                    貴賓姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="請輸入您的姓名"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#D8CFC4] bg-[#FDFCFB] text-sm text-[#2C2520] focus:outline-none focus:border-[#8C6D53]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#5C4938] mb-1.5">
                    聯絡電話 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="0912-345-678"
                    className={`w-full h-11 px-3.5 rounded-xl border ${
                      phoneError ? 'border-red-400' : 'border-[#D8CFC4]'
                    } bg-[#FDFCFB] text-sm text-[#2C2520] focus:outline-none focus:border-[#8C6D53]`}
                  />
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>
              </div>
            </section>

            {/* Step 2: 服務選擇 */}
            <section className="bg-white rounded-2xl p-6 border border-[#E6DFD5] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#2C2520]">Step 2. 服務選擇</h3>
                <span className="text-[11px] text-[#8C6D53] bg-[#F2ECE4] px-2.5 py-0.5 rounded-full font-medium">
                  自動計算所需時段
                </span>
              </div>

              <div className="space-y-2.5">
                {services.map((srv) => {
                  const isSelected = selectedService?.id === srv.id;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => {
                        setSelectedServiceId(srv.id);
                        setSelectedTime('');
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-[#5C4938] bg-[#FAF6F1] shadow-sm'
                          : 'border-[#E6DFD5] bg-white hover:border-[#C8B9A6]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? 'border-[#3A2E26] bg-[#3A2E26] text-white'
                              : 'border-[#C8B9A6] bg-white'
                          }`}
                        >
                          {isSelected && <span className="text-[10px]">✓</span>}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#2C2520]">{srv.name}</div>
                          <div className="text-xs text-[#8C7A6B]">預估時長：{srv.duration} 分鐘</div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-[#5C4938]">NT$ {srv.price}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Step 3: 日期與時間選擇 */}
            <section className="bg-white rounded-2xl p-6 border border-[#E6DFD5] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[#2C2520]">Step 3. 日期與時間</h3>
                <span className="text-[11px] text-[#8C6D53] font-medium">
                  營業時間 11:00 - 19:00
                </span>
              </div>

              <div className="flex items-center justify-between mb-4 px-2">
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalYear(calYear - 1);
                      setCalMonth(11);
                    } else {
                      setCalMonth(calMonth - 1);
                    }
                  }}
                  className="w-8 h-8 rounded-full border border-[#E6DFD5] flex items-center justify-center text-[#5C4938] hover:bg-[#FAF6F1]"
                >
                  ‹
                </button>
                <span className="text-base font-bold tracking-wider text-[#2C2520]">
                  {calYear} 年 {calMonth + 1} 月
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalYear(calYear + 1);
                      setCalMonth(0);
                    } else {
                      setCalMonth(calMonth + 1);
                    }
                  }}
                  className="w-8 h-8 rounded-full border border-[#E6DFD5] flex items-center justify-center text-[#5C4938] hover:bg-[#FAF6F1]"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 text-center text-xs text-[#8C7A6B] font-medium mb-2">
                <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center mb-6">
                {calendarDays.map((item, idx) => {
                  if (!item) return <div key={`empty-${idx}`} />;
                  const isSelected = selectedDate === item.dateStr;

                  if (item.isPast) {
                    return (
                      <div
                        key={item.dateStr}
                        className="h-14 rounded-xl flex flex-col items-center justify-center text-[#D0C8C0] bg-transparent cursor-not-allowed select-none"
                      >
                        <span className="text-sm">{item.day}</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={item.dateStr}
                      disabled={!item.canBook}
                      onClick={() => {
                        setSelectedDate(item.dateStr);
                        setSelectedTime('');
                      }}
                      className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all border ${
                        isSelected
                          ? 'bg-[#3A2E26] text-white border-[#3A2E26] shadow-sm'
                          : item.canBook
                          ? 'bg-[#FDFCFB] text-[#2C2520] border-[#E6DFD5] hover:border-[#8C6D53]'
                          : 'bg-[#F5EBEB] text-[#A66A6A] border-transparent cursor-not-allowed'
                      }`}
                    >
                      <span className="text-sm font-semibold leading-none">{item.day}</span>
                      <span
                        className={`text-[9px] mt-1 font-medium ${
                          isSelected
                            ? 'text-[#E6DFD5]'
                            : item.canBook
                            ? 'text-[#4F775E]'
                            : 'text-[#A66A6A]'
                        }`}
                      >
                        {item.isFullDayClosed ? '店休' : item.canBook ? '可預約' : '已額滿'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-[#EFE9E0] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[#3A2E26]">
                    選擇起始時段（服務需時 {selectedService?.duration} 分鐘）
                  </span>
                  {selectedDate && (
                    <span className="text-xs text-[#8C6D53] font-medium">{selectedDate}</span>
                  )}
                </div>

                {!selectedDate ? (
                  <div className="bg-[#FAF8F5] rounded-xl py-4 text-center text-xs text-[#8C7A6B]">
                    請先點選上方月曆中「可預約」的日期
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {DAILY_TIME_SLOTS.map((slot) => {
                      const bookable = isSlotBookable(
                        selectedDate,
                        slot,
                        selectedService ? selectedService.duration : 60
                      );
                      const isSelected = selectedTime === slot;

                      return (
                        <button
                          type="button"
                          key={slot}
                          disabled={!bookable}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                            isSelected
                              ? 'bg-[#3A2E26] text-white border-[#3A2E26] shadow-sm'
                              : bookable
                              ? 'bg-white text-[#2C2520] border-[#D8CFC4] hover:border-[#8C6D53]'
                              : 'bg-[#F2EFEA] text-[#C2B9B0] border-transparent line-through cursor-not-allowed'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Step 4: 備註與送出 */}
            <form
              onSubmit={handleCreateAppointment}
              className="bg-white rounded-2xl p-6 border border-[#E6DFD5] shadow-sm space-y-4"
            >
              <h3 className="text-base font-bold text-[#2C2520]">Step 4. 備註與確認送出</h3>

              <div>
                <label className="block text-xs font-semibold text-[#5C4938] mb-1.5">
                  備註事項（選填）
                </label>
                <textarea
                  rows="3"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="例如：近期是否有染燙紀錄、希望加強頭皮放鬆等..."
                  className="w-full p-3.5 rounded-xl border border-[#D8CFC4] bg-[#FDFCFB] text-sm text-[#2C2520] focus:outline-none focus:border-[#8C6D53] resize-none"
                />
              </div>

              {selectedDate && selectedTime && selectedService && (
                <div className="bg-[#FAF6F1] p-4 rounded-xl border border-[#E6DFD5] text-xs space-y-1 text-[#4A3E35]">
                  <div className="font-bold text-[#2C2520] mb-1">📌 您的預約明細預覽：</div>
                  <div>・預約項目：{selectedService.name} (NT$ {selectedService.price})</div>
                  <div>
                    ・預約時段：{selectedDate} {selectedTime} -{' '}
                    {minutesToTime(timeToMinutes(selectedTime) + selectedService.duration)}（共{' '}
                    {selectedService.duration} 分鐘）
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !selectedDate || !selectedTime}
                className={`w-full h-12 rounded-xl text-sm font-bold tracking-wider transition-all ${
                  isSubmitting || !selectedDate || !selectedTime
                    ? 'bg-[#C8B9A6] text-white cursor-not-allowed'
                    : 'bg-[#3A2E26] text-white hover:bg-[#2C2520] shadow-md'
                }`}
              >
                {isSubmitting ? '檢核時段並傳送預約中...' : '確認預約'}
              </button>
            </form>
          </div>
        )}

        {/* 我的預約訂單 */}
        {currentView === 'my_bookings' && (
          <div className="bg-white rounded-2xl p-6 border border-[#E6DFD5] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2C2520]">我的預約紀錄</h2>
              <button
                type="button"
                onClick={fetchCloudDB}
                className="text-xs px-3 py-1 rounded-full bg-[#F2ECE4] text-[#5C4938] font-semibold"
              >
                {isSyncing ? '同步中...' : '🔄 重新整理'}
              </button>
            </div>
            {customerAppointments.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#8C7A6B]">尚無您的預約紀錄</div>
            ) : (
              <div className="space-y-3">
                {customerAppointments.map((apt) => {
                  const srv = services.find((s) => s.id === apt.serviceId);
                  const statusBadge = {
                    pending: { label: '待設計師確認', cls: 'bg-amber-100 text-amber-800' },
                    confirmed: { label: '已確認預約', cls: 'bg-emerald-100 text-emerald-800' },
                    completed: { label: '已完成服務', cls: 'bg-stone-200 text-stone-700' },
                    cancelled: { label: '已取消', cls: 'bg-rose-100 text-rose-700' }
                  }[apt.status] || { label: apt.status, cls: 'bg-gray-100' };

                  return (
                    <div
                      key={apt.id}
                      className="p-4 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#2C2520]">
                          {apt.date} ({apt.time} - {apt.endTime})
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="text-[#5C4938] font-medium">
                        服務項目：{srv ? `${srv.name} ($${srv.price})` : '美髮服務'}
                      </div>
                      <div className="text-[#7D7168]">預約貴賓：{apt.customerName} ({apt.phone})</div>
                      {apt.remark && <div className="text-[#7D7168]">備註：{apt.remark}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: 設計師後台管理介面 */}
        {currentView === 'admin' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 bg-[#EAE3DA] p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAdminTab('appointments')}
                className={`py-2 rounded-lg transition-all ${
                  adminTab === 'appointments' ? 'bg-[#3A2E26] text-white shadow-sm' : 'text-[#5C4938]'
                }`}
              >
                1. 訂單管理 ({sortedAppointments.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('schedule')}
                className={`py-2 rounded-lg transition-all ${
                  adminTab === 'schedule' ? 'bg-[#3A2E26] text-white shadow-sm' : 'text-[#5C4938]'
                }`}
              >
                2. 時段與店休
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('services')}
                className={`py-2 rounded-lg transition-all ${
                  adminTab === 'services' ? 'bg-[#3A2E26] text-white shadow-sm' : 'text-[#5C4938]'
                }`}
              >
                3. 服務設定
              </button>
            </div>

            {adminTab === 'appointments' && (
              <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#2C2520]">預約訂單管理</h2>
                  <button
                    type="button"
                    onClick={fetchCloudDB}
                    className="text-xs px-3 py-1 rounded-full bg-[#F2ECE4] text-[#5C4938] font-semibold hover:bg-[#E6DFD5]"
                  >
                    {isSyncing ? '同步中...' : '🔄 重新整理'}
                  </button>
                </div>

                {sortedAppointments.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[#8C7A6B]">目前尚無預約訂單</div>
                ) : (
                  <div className="space-y-3">
                    {sortedAppointments.map((apt) => {
                      const srv = services.find((s) => s.id === apt.serviceId);
                      return (
                        <div
                          key={apt.id}
                          className="p-4 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-[#2C2520]">
                              📅 {apt.date}｜{apt.time} - {apt.endTime}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-semibold ${
                                apt.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : apt.status === 'confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : apt.status === 'completed'
                                  ? 'bg-stone-200 text-stone-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {apt.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="text-[#3A2E26] font-semibold">
                            👤 {apt.customerName}（{apt.phone}）
                          </div>
                          <div className="text-[#5C4938]">
                            💇 服務：{srv ? `${srv.name} ($${srv.price} / ${srv.duration}分)` : apt.serviceName || apt.serviceId}
                          </div>
                          {apt.remark && <div className="text-[#7D7168]">💬 備註：{apt.remark}</div>}

                          <div className="pt-2 flex flex-wrap gap-2 border-t border-[#EAE3DA]">
                            {apt.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleConfirmAppointment(apt)}
                                className="flex-1 py-2 px-3 rounded-lg bg-[#3A2E26] text-white font-semibold hover:bg-[#2C2520]"
                              >
                                ✓ 確認預約 (鎖定日曆+推播)
                              </button>
                            )}

                            {apt.status === 'confirmed' && (
                              <button
                                type="button"
                                onClick={() => handleChangeAppointmentStatus(apt, 'completed')}
                                className="py-2 px-3 rounded-lg bg-stone-600 text-white font-semibold"
                              >
                                標記完成
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => sendReminderMsg(apt, srv)}
                              className="py-2 px-3 rounded-lg bg-[#8C6D53] text-white font-semibold"
                            >
                              🔔 一鍵發送提醒
                            </button>

                            {apt.status !== 'cancelled' && (
                              <button
                                type="button"
                                onClick={() => handleChangeAppointmentStatus(apt, 'cancelled')}
                                className="py-2 px-3 rounded-lg bg-rose-100 text-rose-700 font-semibold"
                              >
                                取消
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {adminTab === 'schedule' && (
              <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-[#2C2520]">行事曆與時段鎖定管理</h2>
                  <p className="text-xs text-[#7D7168] mt-1">
                    點選特定日期與時段，即可手動將其標記為「店休/不開放 (blockedSlots)」。
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-[#D8CFC4] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleFullDayClosed(scheduleDate)}
                    className="h-10 px-3.5 rounded-xl bg-[#F5EBEB] text-[#A66A6A] text-xs font-bold"
                  >
                    切換整日店休
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2">
                  {DAILY_TIME_SLOTS.map((slot) => {
                    const isBlocked = (availability[scheduleDate] || []).includes(slot);
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => handleToggleBlockedSlot(scheduleDate, slot)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                          isBlocked
                            ? 'bg-[#F5EBEB] text-[#A66A6A] border-[#E8CACA]'
                            : 'bg-[#EEF5F0] text-[#3B6E4C] border-[#CBE0D2]'
                        }`}
                      >
                        <div>{slot}</div>
                        <div className="text-[10px] mt-0.5">{isBlocked ? '不開放' : '開放中'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {adminTab === 'services' && (
              <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-sm space-y-5">
                <h2 className="text-base font-bold text-[#2C2520]">服務品項、價格與時長設定</h2>

                <form
                  onSubmit={handleSaveService}
                  className="bg-[#FAF8F5] p-4 rounded-xl border border-[#E6DFD5] space-y-3"
                >
                  <div className="text-xs font-bold text-[#5C4938]">
                    {editingService.id ? '✏️ 編輯服務項目' : '＋ 新增服務項目'}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="品項名稱（如：深層結構護髮）"
                    value={editingService.name}
                    onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg border border-[#D8CFC4] text-xs bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      required
                      placeholder="價格 (NT$)"
                      value={editingService.price}
                      onChange={(e) => setEditingService({ ...editingService, price: e.target.value })}
                      className="h-10 px-3 rounded-lg border border-[#D8CFC4] text-xs bg-white"
                    />
                    <select
                      value={editingService.duration}
                      onChange={(e) =>
                        setEditingService({ ...editingService, duration: Number(e.target.value) })
                      }
                      className="h-10 px-3 rounded-lg border border-[#D8CFC4] text-xs bg-white"
                    >
                      {[30, 60, 90, 120, 150, 180, 210, 240].map((min) => (
                        <option key={min} value={min}>
                          所需時間：{min} 分鐘
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 h-9 rounded-lg bg-[#3A2E26] text-white text-xs font-semibold"
                    >
                      {editingService.id ? '儲存更新' : '確認新增'}
                    </button>
                    {editingService.id && (
                      <button
                        type="button"
                        onClick={() => setEditingService({ id: '', name: '', price: '', duration: 60 })}
                        className="px-4 h-9 rounded-lg bg-stone-200 text-stone-700 text-xs font-semibold"
                      >
                        取消
                      </button>
                    )}
                  </div>
                </form>

                <div className="space-y-2">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      className="p-3.5 rounded-xl border border-[#E6DFD5] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#2C2520] text-sm">{srv.name}</div>
                        <div className="text-[#7D7168]">
                          價格：NT$ {srv.price}｜時長：{srv.duration} 分鐘
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingService(srv)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#F2ECE4] text-[#5C4938] font-semibold"
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(srv.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold"
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
