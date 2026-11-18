import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ==================== 系統與 Firebase 專屬常數 ====================
const LIFF_ID = '2012650134-fNn1I0l8';
const ADMIN_USER_ID = 'U5e88b1121f054ba725948e898394016e';

// 綁定你的 Firebase 專案 (hairisland-e6a6f) - 免安裝 npm 套件直連雲端
const FIREBASE_PROJECT_ID = 'hairisland-e6a6f';
const FIREBASE_API_KEY = 'AIzaSyC2snKdfx82eFdOUxobdSrlqZHm1LpLU9k';
const FIRESTORE_DOC_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/hairisland/store_data?key=${FIREBASE_API_KEY}`;

// ⚠️ 請確保此處網址與你 GAS「管理部署作業」複製出來的網頁應用程式網址完全相同！
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwWZ8-2wsQKYF7ujbs1Kga2zMVzz4vLLCcyat0MYmLETc5LJKVIbhulF-6wBpLFjyvU/exec';

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
  const todayObj = new Date();
  const todayStr = useMemo(() => {
    const y = todayObj.getFullYear();
    const m = String(todayObj.getMonth() + 1).padStart(2, '0');
    const d = String(todayObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [currentView, setCurrentView] = useState('customer');
  const [adminTab, setAdminTab] = useState('appointments');

  const [liffProfile, setLiffProfile] = useState({ userId: '', displayName: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);

  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbError, setDbError] = useState('');

  // 客戶端表單狀態
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(DEFAULT_SERVICES[0].id);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 客戶端月曆狀態
  const [calYear, setCalYear] = useState(todayObj.getFullYear());
  const [calMonth, setCalMonth] = useState(todayObj.getMonth());

  // 後台訂單月曆狀態 (Tab 1)
  const [adminCalYear, setAdminCalYear] = useState(todayObj.getFullYear());
  const [adminCalMonth, setAdminCalMonth] = useState(todayObj.getMonth());
  const [adminSelectedDate, setAdminSelectedDate] = useState(todayStr);
  const [showAllAdminOrders, setShowAllAdminOrders] = useState(false);

  // 後台時段管理與服務設定狀態 (Tab 2 & Tab 3)
  const [scheduleDate, setScheduleDate] = useState(todayStr);
  const [editingService, setEditingService] = useState({ id: '', name: '', price: '', duration: 60 });

  // ==================== Firebase Firestore 直連讀寫核心 ====================
  const fetchFromFirebase = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${FIRESTORE_DOC_URL}&t=${Date.now()}`);
      if (res.status === 404) {
        setDbError('');
        setIsSyncing(false);
        return null;
      }
      if (!res.ok) {
        setDbError('請確認已在 Firebase 後台開啟「Firestore Database」並設為「測試模式 (Test mode)」');
        setIsSyncing(false);
        return null;
      }
      const doc = await res.json();
      setDbError('');
      if (doc && doc.fields) {
        const parsedServices = doc.fields.services?.stringValue
          ? JSON.parse(doc.fields.services.stringValue)
          : DEFAULT_SERVICES;
        const parsedAppointments = doc.fields.appointments?.stringValue
          ? JSON.parse(doc.fields.appointments.stringValue)
          : [];
        const parsedAvailability = doc.fields.availability?.stringValue
          ? JSON.parse(doc.fields.availability.stringValue)
          : {};

        setServices(parsedServices);
        setAppointments(parsedAppointments);
        setAvailability(parsedAvailability);
        return {
          services: parsedServices,
          appointments: parsedAppointments,
          availability: parsedAvailability
        };
      }
    } catch (err) {
      console.error('Firebase 讀取錯誤:', err);
    } finally {
      setIsSyncing(false);
    }
    return null;
  }, []);

  const saveToFirebase = async (nextServices, nextAppointments, nextAvailability) => {
    setIsSyncing(true);
    try {
      const body = {
        fields: {
          services: { stringValue: JSON.stringify(nextServices) },
          appointments: { stringValue: JSON.stringify(nextAppointments) },
          availability: { stringValue: JSON.stringify(nextAvailability) },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      };

      const res = await fetch(FIRESTORE_DOC_URL, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        setDbError('寫入失敗：請確認 Firebase Firestore 已啟用並設為測試模式');
      } else {
        setDbError('');
      }
    } catch (err) {
      console.error('Firebase 寫入失敗:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // ==================== LINE 與 Google 日曆背景全自動同步 API ====================
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

  // 統一發送指令給 GAS 背景執行（使用 text/plain 確保瀏覽器不阻擋跨網域請求）
  const postToGAS = async (payloadObj) => {
    try {
      await fetch(GAS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payloadObj)
      });
    } catch (e) {
      console.warn('GAS 背景呼叫略過:', e);
    }
  };

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
        console.warn('LIFF 傳訊略過:', e);
      }
    }

    await postToGAS({
      action: 'sendBookingPendingMsg',
      appointment,
      serviceName: serviceObj.name,
      servicePrice: serviceObj.price,
      duration: serviceObj.duration
    });
  };

  // 點擊「✓ 確認預約」：由背景 GAS 自動寫入 Google 日曆並發送 LINE 確認通知
  const sendBookingConfirmedMsg = async (appointment, serviceObj) => {
    await postToGAS({
      action: 'sendBookingConfirmedMsg',
      appointment,
      serviceName: serviceObj ? serviceObj.name : appointment.serviceName || '專屬美髮服務'
    });
  };

  // 點擊「取消」或「刪除紀錄」：由背景 GAS 自動從 Google 日曆刪除該行程並發送 LINE 取消通知
  const sendBookingCancelledMsg = async (appointment, serviceObj) => {
    await postToGAS({
      action: 'cancelBooking',
      appointment,
      serviceName: serviceObj ? serviceObj.name : appointment.serviceName || '專屬美髮服務'
    });
  };

  const sendReminderMsg = async (appointment, serviceObj) => {
    await postToGAS({
      action: 'sendReminderMsg',
      appointment,
      serviceName: serviceObj ? serviceObj.name : appointment.serviceName || '專屬美髮服務'
    });
    alert(`✅ 已發送明日預約提醒通知！`);
  };

  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }

    initLiff();
    fetchFromFirebase();

    const timer = setInterval(() => {
      fetchFromFirebase();
    }, 6000);
    return () => clearInterval(timer);
  }, [fetchFromFirebase]);

  const selectedService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || services[0];
  }, [services, selectedServiceId]);

  // ==================== 時段與連續空檔檢核邏輯 ====================
  const getUnavailableSlotsForDate = (dateStr, ignoreAppointmentId = null, customAptList = appointments, customAvl = availability) => {
    const blocked = new Set(customAvl[dateStr] || []);

    customAptList.forEach((apt) => {
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

  const isSlotBookable = (dateStr, startTime, durationMinutes, ignoreAppointmentId = null, customAptList = appointments, customAvl = availability) => {
    const startMin = timeToMinutes(startTime);
    const endMin = startMin + durationMinutes;
    if (endMin > CLOSING_MINUTES) return false;

    const requiredSlots = getOccupiedSlots(startTime, durationMinutes);
    const unavailableSet = getUnavailableSlotsForDate(dateStr, ignoreAppointmentId, customAptList, customAvl);

    for (const slot of requiredSlots) {
      if (unavailableSet.has(slot)) return false;
    }
    return true;
  };

  const hasAvailableSlotOnDate = (dateStr, durationMinutes) => {
    return DAILY_TIME_SLOTS.some((slot) => isSlotBookable(dateStr, slot, durationMinutes));
  };

  // 客戶端月曆陣列
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

  // 後台訂單月曆陣列
  const adminCalendarDays = useMemo(() => {
    const firstDay = new Date(adminCalYear, adminCalMonth, 1).getDay();
    const totalDays = new Date(adminCalYear, adminCalMonth + 1, 0).getDate();

    const grid = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(adminCalMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${adminCalYear}-${mStr}-${dStr}`;

      const dayApts = appointments.filter((a) => a.date === dateStr && a.status !== 'cancelled');
      const pendingCount = dayApts.filter((a) => a.status === 'pending').length;
      const confirmedCount = dayApts.filter((a) => a.status === 'confirmed' || a.status === 'completed').length;
      const blockedList = availability[dateStr] || [];
      const isFullDayClosed = blockedList.length >= DAILY_TIME_SLOTS.length;

      grid.push({
        day: d,
        dateStr,
        totalCount: dayApts.length,
        pendingCount,
        confirmedCount,
        isFullDayClosed
      });
    }
    return grid;
  }, [adminCalYear, adminCalMonth, appointments, availability]);

  const validatePhone = (val) => {
    const clean = val.replace(/[-\s]/g, '');
    return /^09\d{8}$/.test(clean);
  };

  // ==================== 客戶送出預約 ====================
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

    setIsSubmitting(true);

    const latestCloud = await fetchFromFirebase();
    const currentAptList = latestCloud ? latestCloud.appointments : appointments;
    const currentAvl = latestCloud ? latestCloud.availability : availability;
    const currentSrvList = latestCloud ? latestCloud.services : services;

    const stillAvailable = isSlotBookable(
      selectedDate,
      selectedTime,
      selectedService.duration,
      null,
      currentAptList,
      currentAvl
    );

    if (!stillAvailable) {
      alert('抱歉！您選擇的時段剛剛已被其他貴賓預約，請重新選擇時段。');
      setSelectedTime('');
      setIsSubmitting(false);
      return;
    }

    const endTime = minutesToTime(timeToMinutes(selectedTime) + selectedService.duration);

    const newAppointment = {
      id: `apt_${Date.now()}`,
      liffUserId: liffProfile.userId || 'web_guest',
      customerName: customerName.trim(),
      phone: phone.trim(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      date: selectedDate,
      time: selectedTime,
      endTime: endTime,
      status: 'pending',
      remark: remark.trim(),
      createdAt: new Date().toLocaleString('zh-TW')
    };

    const nextAppointments = [...currentAptList, newAppointment];
    setAppointments(nextAppointments);

    await saveToFirebase(currentSrvList, nextAppointments, currentAvl);
    await sendBookingPendingMsg(newAppointment, selectedService);

    setIsSubmitting(false);
    setSelectedTime('');
    setRemark('');
    setCurrentView('my_bookings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==================== 後台管理操作邏輯（全自動寫入/刪除 Google 日曆） ====================
  const releaseSlotsForAppointment = (targetApt, nextAppointmentsList, currentAvl) => {
    const srv = services.find((s) => s.id === targetApt.serviceId);
    const dur = srv ? srv.duration : 60;
    const targetSlots = getOccupiedSlots(targetApt.time, dur);

    const otherActiveSlots = new Set();
    nextAppointmentsList.forEach((item) => {
      if (item.id !== targetApt.id && item.date === targetApt.date && (item.status === 'confirmed' || item.status === 'pending')) {
        const s = services.find((srvItem) => srvItem.id === item.serviceId);
        const d = s ? s.duration : 60;
        getOccupiedSlots(item.time, d).forEach((slot) => otherActiveSlots.add(slot));
      }
    });

    const prevBlocked = currentAvl[targetApt.date] || [];
    const updatedBlocked = prevBlocked.filter(
      (slot) => !targetSlots.includes(slot) || otherActiveSlots.has(slot)
    );

    return {
      ...currentAvl,
      [targetApt.date]: updatedBlocked
    };
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

    await saveToFirebase(services, nextAppointments, nextAvailability);
    await sendBookingConfirmedMsg({ ...apt, status: 'confirmed' }, srv);
    alert(`✅ 已確認「${apt.customerName}」的預約，已自動寫入 Google 日曆並鎖定該時段！`);
  };

  const handleChangeAppointmentStatus = async (apt, newStatus) => {
    if (apt.status === newStatus) return;

    if (newStatus === 'cancelled') {
      const isConfirmed = window.confirm(
        `確定要取消「${apt.customerName}」於 ${apt.date} (${apt.time}) 的預約嗎？\n\n確認後將同步釋出時段、刪除 Google 日曆行程，並發送 LINE 取消通知給客人。`
      );
      if (!isConfirmed) return;
    }

    const srv = services.find((s) => s.id === apt.serviceId);

    const nextAppointments = appointments.map((item) =>
      item.id === apt.id ? { ...item, status: newStatus } : item
    );

    let nextAvailability = { ...availability };

    if (newStatus === 'cancelled') {
      nextAvailability = releaseSlotsForAppointment(apt, nextAppointments, availability);
    }

    setAppointments(nextAppointments);
    setAvailability(nextAvailability);
    await saveToFirebase(services, nextAppointments, nextAvailability);

    if (newStatus === 'cancelled') {
      await sendBookingCancelledMsg({ ...apt, status: 'cancelled' }, srv);
      alert(`🌿 已取消「${apt.customerName}」的預約，已自動從 Google 日曆刪除該行程並釋出時段！`);
    }
  };

  const handleDeleteAppointment = async (id) => {
    const targetApt = appointments.find((item) => item.id === id);
    const nextAppointments = appointments.filter((item) => item.id !== id);
    let nextAvailability = { ...availability };

    if (targetApt) {
      nextAvailability = releaseSlotsForAppointment(targetApt, nextAppointments, availability);
    }

    setAppointments(nextAppointments);
    setAvailability(nextAvailability);
    await saveToFirebase(services, nextAppointments, nextAvailability);
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
    await saveToFirebase(services, appointments, nextAvailability);
  };

  const handleToggleFullDayClosed = async (dateStr) => {
    const currentBlocked = availability[dateStr] || [];
    const isAllClosed = currentBlocked.length >= DAILY_TIME_SLOTS.length;
    const nextAvailability = {
      ...availability,
      [dateStr]: isAllClosed ? [] : [...DAILY_TIME_SLOTS]
    };
    setAvailability(nextAvailability);
    await saveToFirebase(services, appointments, nextAvailability);
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
    await saveToFirebase(nextServices, appointments, availability);
  };

  const handleDeleteService = async (id) => {
    if (services.length <= 1) {
      alert('請至少保留一項服務品項');
      return;
    }
    const nextServices = services.filter((s) => s.id !== id);
    setServices(nextServices);
    if (selectedServiceId === id) setSelectedServiceId(nextServices[0].id);
    await saveToFirebase(nextServices, appointments, availability);
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

  const filteredAdminAppointments = useMemo(() => {
    if (showAllAdminOrders || !adminSelectedDate) {
      return sortedAppointments;
    }
    return sortedAppointments.filter((apt) => apt.date === adminSelectedDate);
  }, [sortedAppointments, adminSelectedDate, showAllAdminOrders]);

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
        
        {dbError && isAdmin && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900">
            ⚠️ {dbError}
          </div>
        )}

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
                後台 ({sortedAppointments.filter((a) => a.status !== 'cancelled').length})
              </button>
            )}
          </div>
        </header>

        {/* ==================== VIEW 1: 客戶端預約介面 ==================== */}
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
                  <li>・預約送出後為「待確認」狀態，設計師確認後將通知您。</li>
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
                {isSubmitting ? '雲端同步傳送中...' : '確認預約'}
              </button>
            </form>
          </div>
        )}

        {/* ==================== 我的預約訂單 ==================== */}
        {currentView === 'my_bookings' && (
          <div className="bg-white rounded-2xl p-6 border border-[#E6DFD5] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2C2520]">我的預約紀錄</h2>
              <button
                type="button"
                onClick={fetchFromFirebase}
                className="text-xs px-3 py-1 rounded-full bg-[#F2ECE4] text-[#5C4938] font-semibold"
              >
                {isSyncing ? '同步中...' : '🔄 立即刷新'}
              </button>
            </div>
            {customerAppointments.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#8C7A6B]">尚無您的預約紀錄</div>
            ) : (
              <div className="space-y-3">
                {customerAppointments.map((apt) => {
                  const srv = services.find((s) => s.id === apt.serviceId);
                  const srvName = srv ? srv.name : apt.serviceName || '美髮服務';
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
                        服務項目：{srv ? `${srv.name} ($${srv.price})` : srvName}
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

        {/* ==================== VIEW 2: 設計師後台管理介面 ==================== */}
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
                1. 月曆訂單 ({sortedAppointments.filter((a) => a.status !== 'cancelled').length})
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

            {/* ---------- Tab 1: 後台月曆訂單檢視 ---------- */}
            {adminTab === 'appointments' && (
              <div className="space-y-4">
                
                {/* 上半部：後台互動月曆 */}
                <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-[#2C2520]">選擇日期查看訂單</h2>
                      <p className="text-[11px] text-[#8C7A6B]">
                        確認時自動寫入 Google 日曆，取消時自動刪除
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchFromFirebase}
                      className="text-xs px-3 py-1.5 rounded-full bg-[#F2ECE4] text-[#5C4938] font-semibold hover:bg-[#E6DFD5]"
                    >
                      {isSyncing ? '同步中...' : '🔄 立即刷新'}
                    </button>
                  </div>

                  {/* 月份切換列 */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (adminCalMonth === 0) {
                          setAdminCalYear(adminCalYear - 1);
                          setAdminCalMonth(11);
                        } else {
                          setAdminCalMonth(adminCalMonth - 1);
                        }
                      }}
                      className="w-8 h-8 rounded-full border border-[#E6DFD5] flex items-center justify-center text-[#5C4938] hover:bg-[#FAF6F1]"
                    >
                      ‹
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold tracking-wider text-[#2C2520]">
                        {adminCalYear} 年 {adminCalMonth + 1} 月
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAdminCalYear(todayObj.getFullYear());
                          setAdminCalMonth(todayObj.getMonth());
                          setAdminSelectedDate(todayStr);
                          setShowAllAdminOrders(false);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded bg-[#EAE3DA] text-[#3A2E26] font-semibold"
                      >
                        今天
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (adminCalMonth === 11) {
                          setAdminCalYear(adminCalYear + 1);
                          setAdminCalMonth(0);
                        } else {
                          setAdminCalMonth(adminCalMonth + 1);
                        }
                      }}
                      className="w-8 h-8 rounded-full border border-[#E6DFD5] flex items-center justify-center text-[#5C4938] hover:bg-[#FAF6F1]"
                    >
                      ›
                    </button>
                  </div>

                  {/* 星期標頭 */}
                  <div className="grid grid-cols-7 text-center text-xs text-[#8C7A6B] font-medium mb-2">
                    <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
                  </div>

                  {/* 後台月曆網格 */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {adminCalendarDays.map((item, idx) => {
                      if (!item) return <div key={`admin-empty-${idx}`} />;
                      const isSelected = !showAllAdminOrders && adminSelectedDate === item.dateStr;
                      const isToday = item.dateStr === todayStr;

                      return (
                        <button
                          type="button"
                          key={item.dateStr}
                          onClick={() => {
                            setAdminSelectedDate(item.dateStr);
                            setShowAllAdminOrders(false);
                          }}
                          className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all border relative ${
                            isSelected
                              ? 'bg-[#3A2E26] text-white border-[#3A2E26] shadow-sm'
                              : isToday
                              ? 'bg-[#FAF6F1] text-[#2C2520] border-[#8C6D53] font-bold'
                              : 'bg-[#FDFCFB] text-[#2C2520] border-[#E6DFD5] hover:border-[#8C6D53]'
                          }`}
                        >
                          <span className="text-sm font-semibold leading-none">{item.day}</span>

                          {item.totalCount > 0 ? (
                            <span
                              className={`mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                isSelected
                                  ? 'bg-white text-[#3A2E26]'
                                  : item.pendingCount > 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.totalCount} 筆
                            </span>
                          ) : item.isFullDayClosed ? (
                            <span
                              className={`mt-1 text-[9px] font-medium ${
                                isSelected ? 'text-rose-200' : 'text-[#A66A6A]'
                              }`}
                            >
                              店休
                            </span>
                          ) : (
                            <span className="mt-1 text-[9px] text-transparent select-none">-</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 下半部：當日訂單列表 */}
                <div className="bg-white rounded-2xl p-5 border border-[#E6DFD5] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[#2C2520]">
                        {showAllAdminOrders
                          ? `全部預約訂單 (${filteredAdminAppointments.length})`
                          : `📅 ${adminSelectedDate} 訂單 (${filteredAdminAppointments.length})`}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!showAllAdminOrders && adminSelectedDate && (
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleDate(adminSelectedDate);
                            setAdminTab('schedule');
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-[#FAF6F1] border border-[#E6DFD5] text-[#5C4938] font-semibold"
                        >
                          ⚙️ 管時段
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAllAdminOrders(!showAllAdminOrders)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EAE3DA] text-[#3A2E26] font-semibold"
                      >
                        {showAllAdminOrders ? '只看選取日' : '顯示全部'}
                      </button>
                    </div>
                  </div>

                  {filteredAdminAppointments.length === 0 ? (
                    <div className="text-center py-10 bg-[#FAF8F5] rounded-xl border border-[#EFE9E0] text-xs text-[#8C7A6B]">
                      {showAllAdminOrders
                        ? '目前尚無任何預約訂單'
                        : `${adminSelectedDate} 當日尚無預約訂單`}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAdminAppointments.map((apt) => {
                        const srv = services.find((s) => s.id === apt.serviceId);
                        const srvName = srv ? srv.name : apt.serviceName || apt.serviceId;
                        return (
                          <div
                            key={apt.id}
                            className="p-4 rounded-xl border border-[#E6DFD5] bg-[#FAF8F5] space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-[#2C2520]">
                                ⏰ {apt.time} - {apt.endTime}
                                {showAllAdminOrders && (
                                  <span className="ml-2 text-xs font-normal text-[#7D7168]">
                                    ({apt.date})
                                  </span>
                                )}
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
                                {apt.status === 'pending'
                                  ? '待確認'
                                  : apt.status === 'confirmed'
                                  ? '已確認'
                                  : apt.status === 'completed'
                                  ? '已完成'
                                  : '已取消'}
                              </span>
                            </div>

                            <div className="text-[#3A2E26] font-semibold">
                              👤 {apt.customerName}（
                              <a href={`tel:${apt.phone}`} className="underline">
                                {apt.phone}
                              </a>
                              ）
                            </div>
                            <div className="text-[#5C4938]">
                              💇 服務：{srv ? `${srv.name} ($${srv.price} / ${srv.duration}分)` : srvName}
                            </div>
                            {apt.remark && <div className="text-[#7D7168]">💬 備註：{apt.remark}</div>}

                            <div className="pt-2 flex flex-wrap gap-2 border-t border-[#EAE3DA]">
                              {apt.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAppointment(apt)}
                                  className="flex-1 py-2 px-3 rounded-lg bg-[#3A2E26] text-white font-semibold hover:bg-[#2C2520]"
                                >
                                  ✓ 確認預約 (自動寫入日曆)
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

                              {apt.status !== 'cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => sendReminderMsg(apt, srv)}
                                  className="py-2 px-3 rounded-lg bg-[#8C6D53] text-white font-semibold"
                                >
                                  🔔 提醒
                                </button>
                              )}

                              {apt.status !== 'cancelled' ? (
                                <button
                                  type="button"
                                  onClick={() => handleChangeAppointmentStatus(apt, 'cancelled')}
                                  className="py-2 px-3 rounded-lg bg-rose-100 text-rose-700 font-semibold"
                                >
                                  取消 (同步刪日曆)
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAppointment(apt.id)}
                                  className="py-2 px-3 rounded-lg bg-gray-200 text-gray-600 font-semibold"
                                >
                                  刪除紀錄
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---------- Tab 2: 行事曆與時段管理 ---------- */}
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

            {/* ---------- Tab 3: 服務品項設定 ---------- */}
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
}
