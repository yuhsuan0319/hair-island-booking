import React, { useState, useMemo } from 'react';
import { 
  Calendar, Clock, User, Phone, CheckCircle2, AlertCircle, 
  Sparkles, ShieldCheck, BellRing, Settings, Scissors, 
  Plus, Trash2, Edit3, Lock, Unlock, MessageSquare, 
  ChevronLeft, ChevronRight, LogOut, Check, X, Info
} from 'lucide-react';

// ==========================================
// 1. 初始模擬資料庫 (對應 Firestore Schema)
// ==========================================
const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getFutureDateStr = (daysToAdd) => {
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const INITIAL_SERVICES = [
  { id: 'srv-1', name: '島嶼深層頭皮養護 SPA', price: 1800, duration: 90, desc: '溫和淨化毛囊角質，搭配肩頸溫感精油舒壓與草本蒸氣護理' },
  { id: 'srv-2', name: '質感結構剪髮＋木質調洗髮', price: 1000, duration: 60, desc: '依頭型與落髮流向精準剪裁，含鬆弛感芳療洗髮' },
  { id: 'srv-3', name: '植萃溫和染髮（含結構護髮）', price: 3200, duration: 150, desc: '低敏植萃染膏，補充髮芯角蛋白，呈現自然霧感染澤' },
  { id: 'srv-4', name: '水質感鬆弛燙髮（含剪髮）', price: 3800, duration: 180, desc: '低溫塑型打造自然波紋，吹乾即可呈現蓬鬆空氣感' },
  { id: 'srv-5', name: '瞬效金緻結構深層護髮', price: 1500, duration: 60, desc: '四劑式分子滲透修護，針對受損與乾燥髮尾重建光澤' }
];

const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-1001',
    liffUserId: 'U89a1b2c3d4e5f6g7h8i9j0',
    customerName: '林知夏',
    phone: '0912-345-678',
    serviceId: 'srv-1',
    date: getFutureDateStr(1),
    time: '13:00',
    endTime: '14:30',
    status: 'confirmed',
    remark: '近期頭皮較敏感，希望力道偏輕柔。'
  },
  {
    id: 'apt-1002',
    liffUserId: 'U11b2c3d4e5f6g7h8i9j0k1',
    customerName: '陳沐恩',
    phone: '0928-888-168',
    serviceId: 'srv-3',
    date: getFutureDateStr(1),
    time: '15:30',
    endTime: '18:00',
    status: 'pending',
    remark: '想染偏冷茶棕色，遮蓋少量白髮。'
  },
  {
    id: 'apt-1003',
    liffUserId: 'U55f6g7h8i9j0k1l2m3n4o5',
    customerName: '張語恬',
    phone: '0933-777-999',
    serviceId: 'srv-2',
    date: getFutureDateStr(2),
    time: '11:00',
    endTime: '12:00',
    status: 'confirmed',
    remark: '修剪瀏海與髮尾層次。'
  }
];

const INITIAL_AVAILABILITY = [
  {
    date: getFutureDateStr(1),
    // 13:00-14:30 為 apt-1001 已確認鎖定；12:00-13:00 為設計師手動午休鎖定
    blockedSlots: ['12:00', '12:30', '13:00', '13:30', '14:00']
  },
  {
    date: getFutureDateStr(2),
    blockedSlots: ['11:00', '11:30', '15:00', '15:30']
  }
];

// 11:00 至 18:30 為可點擊之起始點（營業至 19:00）
const ALL_DAILY_SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30'
];

// ==========================================
// 2. 時段計算輔助函式 (Time Slot Engine)
// ==========================================
const timeToMins = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const minsToTime = (mins) => {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
};

// 根據起始時間與時長，展開所需佔用的所有 30 分鐘時段陣列
const expandRequiredSlots = (startTime, durationMinutes) => {
  const slotsCount = Math.ceil(durationMinutes / 30);
  const startMins = timeToMins(startTime);
  const result = [];
  for (let i = 0; i < slotsCount; i++) {
    result.push(minsToTime(startMins + i * 30));
  }
  return result;
};

export default function App() {
  // --- 模擬資料庫 State ---
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [appointments, setAppointments] = useState(INITIAL_APPOINTMENTS);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY);

  // --- 視圖與權限 State ---
  const [activeView, setActiveView] = useState('customer'); // 'customer' | 'admin'
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminTab, setAdminTab] = useState('appointments'); // 'appointments' | 'schedule' | 'services'

  // --- LINE LIFF 模擬 Profile 與訊息紀錄 ---
  const [liffProfile, setLiffProfile] = useState({
    userId: 'U99x8y7z6w5v4u3t2s1r0',
    displayName: '林宥嘉 (LIFF 訪客)',
    isLoggedIn: true
  });
  const [lineLogs, setLineLogs] = useState([]);
  const [toast, setToast] = useState(null);

  // --- 客戶端預約表單 State ---
  const [customerName, setCustomerName] = useState(liffProfile.displayName);
  const [phone, setPhone] = useState('0918-520-319');
  const [selectedServiceId, setSelectedServiceId] = useState(INITIAL_SERVICES[0].id);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(getFutureDateStr(1));
  const [selectedTime, setSelectedTime] = useState('');
  const [remark, setRemark] = useState('');
  const [bookingSuccessModal, setBookingSuccessModal] = useState(null);

  // --- 後台排班與服務編輯 State ---
  const [scheduleDate, setScheduleDate] = useState(getFutureDateStr(1));
  const [editingService, setEditingService] = useState(null);
  const [newServiceForm, setNewServiceForm] = useState({ name: '', price: '', duration: 60, desc: '' });

  // 顯示通知 Toast
  const showToast = (title, message, type = 'info') => {
    setToast({ title, message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev && prev.title === title ? null : prev));
    }, 4500);
  };

  // ==========================================
  // 3. LINE LIFF & Messaging API 模擬串接函式
  // ==========================================
  const initLiff = () => {
    const mockProfile = {
      userId: 'U99x8y7z6w5v4u3t2s1r0',
      displayName: '蘇郁婷',
      isLoggedIn: true
    };
    setLiffProfile(mockProfile);
    setCustomerName(mockProfile.displayName);
    showToast('LINE LIFF 已同步', `成功載入 LINE 帳號：${mockProfile.displayName}`, 'line');
  };

  const sendBookingPendingMsg = (appt, srv) => {
    const msg = {
      id: `msg-${Date.now()}`,
      type: 'LIFF SendMessages (待確認通知)',
      to: `${appt.customerName} (${appt.liffUserId.slice(0, 8)}...)`,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      content: `【髮嶼 Hair Island｜預約待確認】\n親愛的 ${appt.customerName} 您好，已收到您的預約申請：\n・服務：${srv.name}\n・日期：${appt.date}\n・時段：${appt.time} - ${appt.endTime}\n設計師確認行程後，將透過 LINE 發送正式預約成功通知。`
    };
    setLineLogs((prev) => [msg, ...prev]);
    showToast('LINE 通知已發送', `已向 ${appt.customerName} 發送「預約待確認」訊息`, 'line');
  };

  const sendBookingConfirmedMsg = (appt, srv) => {
    const msg = {
      id: `msg-${Date.now()}`,
      type: 'Messaging API Push (預約已確認)',
      to: `${appt.customerName} (${appt.liffUserId.slice(0, 8)}...)`,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      content: `【髮嶼 Hair Island｜預約已確認】\n親愛的 ${appt.customerName} 您好，您的預約已為您保留：\n・服務：${srv.name} (NT$${srv.price})\n・時間：${appt.date} ${appt.time} - ${appt.endTime}\n期待您的蒞臨，享受專屬的島嶼放鬆時光。`
    };
    setLineLogs((prev) => [msg, ...prev]);
    showToast('LINE 預約確認已推播', `已透過 Webhook 通知 ${appt.customerName} 預約成功`, 'line');
  };

  const sendReminderMsg = (appt, srv) => {
    const msg = {
      id: `msg-${Date.now()}`,
      type: 'Messaging API Push (前一日提醒)',
      to: `${appt.customerName} (${appt.liffUserId.slice(0, 8)}...)`,
      time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
      content: `【髮嶼 Hair Island｜明日預約溫馨提醒】\n親愛的 ${appt.customerName} 您好，提醒您明日 (${appt.date}) ${appt.time} 預約了「${srv.name}」。\n若需微調時間請提前告知，我們明日見！`
    };
    setLineLogs((prev) => [msg, ...prev]);
    showToast('LINE 明日提醒已發送', `已向 ${appt.customerName} 發送前一日溫馨提醒`, 'line');
  };

  // ==========================================
  // 4. 時段可用性與防撞單核心邏輯
  // ==========================================
  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || services[0],
    [services, selectedServiceId]
  );

  // 取得特定日期的所有不可用時段（合併 Availability.blockedSlots 與已確認訂單的佔用時段）
  const getCombinedBlockedSlotsForDate = (dateStr) => {
    const availDoc = availability.find((a) => a.date === dateStr);
    const manualBlocked = availDoc ? availDoc.blockedSlots : [];

    // 找出該日所有 status === 'confirmed' 的訂單，確保即使未同步寫入 blockedSlots 也能嚴密防護
    const confirmedAppts = appointments.filter(
      (apt) => apt.date === dateStr && apt.status === 'confirmed'
    );

    const apptBlocked = [];
    confirmedAppts.forEach((apt) => {
      const srv = services.find((s) => s.id === apt.serviceId);
      const duration = srv ? srv.duration : 60;
      const slots = expandRequiredSlots(apt.time, duration);
      apptBlocked.push(...slots);
    });

    return Array.from(new Set([...manualBlocked, ...apptBlocked]));
  };

  // 判斷單一日期與單一起始時間，是否足夠容納指定時長 (且不跨越 19:00)
  const checkSlotBookable = (dateStr, startTime, durationMinutes) => {
    const startMins = timeToMins(startTime);
    const endMins = startMins + durationMinutes;
    if (endMins > 19 * 60) return { ok: false, reason: '逾打烊時間 (19:00)' };

    const blocked = getCombinedBlockedSlotsForDate(dateStr);
    const neededSlots = expandRequiredSlots(startTime, durationMinutes);

    for (const s of neededSlots) {
      if (blocked.includes(s)) {
        return { ok: false, reason: '時段衝突或已滿' };
      }
    }
    return { ok: true, reason: '可預約' };
  };

  // 判斷某日期在 11:00-19:00 之間是否至少還有一個時段可容納當前選擇的服務
  const checkDateHasAnySlot = (dateStr, durationMinutes) => {
    return ALL_DAILY_SLOTS.some((slot) => checkSlotBookable(dateStr, slot, durationMinutes).ok);
  };

  // 產生月曆格子資料
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = getTodayStr();

    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isPast = dateStr < todayStr;
      const hasAvailableSlot = !isPast && checkDateHasAnySlot(dateStr, selectedService.duration);
      days.push({
        dayNumber: d,
        dateStr,
        isPast,
        hasAvailableSlot
      });
    }
    return days;
  }, [currentMonth, selectedService, availability, appointments]);

  // 驗證台灣手機格式 (支援 09xx-xxx-xxx 或 09xxxxxxxx)
  const isPhoneValid = /^09\d{2}-?\d{3}-?\d{3}$/.test(phone.trim());

  // ==========================================
  // 5. 客戶端送出預約處理 (含 Double Booking 檢核)
  // ==========================================
  const handleCustomerSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showToast('欄位未填寫', '請輸入您的姓名', 'error');
      return;
    }
    if (!isPhoneValid) {
      showToast('電話格式錯誤', '請輸入正確的手機號碼格式（例如：0912-345-678）', 'error');
      return;
    }
    if (!selectedDate || !selectedTime) {
      showToast('未選擇時段', '請先點選欲預約的日期與時間', 'error');
      return;
    }

    // Double Booking 即時檢核
    const check = checkSlotBookable(selectedDate, selectedTime, selectedService.duration);
    if (!check.ok) {
      showToast('時段已被佔用', `無法預約：${check.reason}，請重新選擇其他時段。`, 'error');
      setSelectedTime('');
      return;
    }

    const endMins = timeToMins(selectedTime) + selectedService.duration;
    const endTime = minsToTime(endMins);

    const newAppt = {
      id: `apt-${Date.now().toString().slice(-4)}`,
      liffUserId: liffProfile.userId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      serviceId: selectedService.id,
      date: selectedDate,
      time: selectedTime,
      endTime,
      status: 'pending',
      remark: remark.trim()
    };

    setAppointments((prev) => [...prev, newAppt]);
    sendBookingPendingMsg(newAppt, selectedService);
    setBookingSuccessModal({ appt: newAppt, service: selectedService });
    setSelectedTime('');
    setRemark('');
  };

  // ==========================================
  // 6. 設計師後台管理操作處理
  // ==========================================
  // 確認訂單 -> 將所需時長寫入 Availability.blockedSlots 並發送 LINE 確認通知
  const handleConfirmAppointment = (appt) => {
    const srv = services.find((s) => s.id === appt.serviceId) || { name: '美髮服務', duration: 60, price: 0 };
    const slotsToLock = expandRequiredSlots(appt.time, srv.duration);

    // 確認前再次檢查是否與已鎖定時段衝突
    const currentBlocked = getCombinedBlockedSlotsForDate(appt.date);
    const conflict = slotsToLock.some((s) => currentBlocked.includes(s));
    if (conflict) {
      showToast('時段衝突警告', `該時段 (${appt.time}-${appt.endTime}) 與現有排程或店休重疊，請先協調或調整時段！`, 'error');
      return;
    }

    // 1. 更新訂單狀態為 confirmed
    setAppointments((prev) =>
      prev.map((item) => (item.id === appt.id ? { ...item, status: 'confirmed' } : item))
    );

    // 2. 將時段轉化為 blockedSlots 寫入 Availability
    setAvailability((prev) => {
      const existing = prev.find((a) => a.date === appt.date);
      if (existing) {
        const merged = Array.from(new Set([...existing.blockedSlots, ...slotsToLock])).sort();
        return prev.map((a) => (a.date === appt.date ? { ...a, blockedSlots: merged } : a));
      } else {
        return [...prev, { date: appt.date, blockedSlots: slotsToLock }];
      }
    });

    // 3. 觸發 LINE Messaging API 發送確認訊息
    sendBookingConfirmedMsg(appt, srv);
  };

  const handleUpdateApptStatus = (apptId, newStatus) => {
    setAppointments((prev) =>
      prev.map((item) => (item.id === apptId ? { ...item, status: newStatus } : item))
    );
    showToast('訂單狀態已更新', `訂單 #${apptId} 已變更為 ${newStatus}`, 'info');
  };

  // 後台 Tab 2：手動切換單一 30 分鐘時段的「店休/開放」
  const toggleManualBlockSlot = (dateStr, slotStr) => {
    setAvailability((prev) => {
      const existing = prev.find((a) => a.date === dateStr);
      if (existing) {
        const exists = existing.blockedSlots.includes(slotStr);
        const updatedSlots = exists
          ? existing.blockedSlots.filter((s) => s !== slotStr)
          : [...existing.blockedSlots, slotStr].sort();
        return prev.map((a) => (a.date === dateStr ? { ...a, blockedSlots: updatedSlots } : a));
      } else {
        return [...prev, { date: dateStr, blockedSlots: [slotStr] }];
      }
    });
  };

  // 後台 Tab 2：一鍵設定整日店休或全開
  const toggleWholeDayOff = (dateStr, lockAll) => {
    setAvailability((prev) => {
      const existing = prev.find((a) => a.date === dateStr);
      const targetSlots = lockAll ? [...ALL_DAILY_SLOTS] : [];
      if (existing) {
        return prev.map((a) => (a.date === dateStr ? { ...a, blockedSlots: targetSlots } : a));
      } else {
        return [...prev, { date: dateStr, blockedSlots: targetSlots }];
      }
    });
    showToast(
      lockAll ? '已設為全日店休' : '已解除全日店休',
      `${dateStr} 時段狀態已更新`,
      'info'
    );
  };

  // 後台 Tab 3：新增或儲存服務項目
  const handleSaveService = (e) => {
    e.preventDefault();
    if (!newServiceForm.name.trim() || !newServiceForm.price) return;

    if (editingService) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === editingService.id
            ? {
                ...s,
                name: newServiceForm.name.trim(),
                price: Number(newServiceForm.price),
                duration: Number(newServiceForm.duration),
                desc: newServiceForm.desc.trim()
              }
            : s
        )
      );
      setEditingService(null);
      showToast('服務項目已更新', `已儲存「${newServiceForm.name}」的設定`, 'info');
    } else {
      const created = {
        id: `srv-${Date.now().toString().slice(-4)}`,
        name: newServiceForm.name.trim(),
        price: Number(newServiceForm.price),
        duration: Number(newServiceForm.duration),
        desc: newServiceForm.desc.trim() || '專屬客製化美髮與頭皮養護服務'
      };
      setServices((prev) => [...prev, created]);
      showToast('新增服務成功', `已新增「${created.name}」`, 'info');
    }
    setNewServiceForm({ name: '', price: '', duration: 60, desc: '' });
  };

  const handleDeleteService = (srvId) => {
    if (services.length <= 1) {
      showToast('無法刪除', '系統至少需保留一項服務項目', 'error');
      return;
    }
    setServices((prev) => prev.filter((s) => s.id !== srvId));
    if (selectedServiceId === srvId) {
      const remaining = services.filter((s) => s.id !== srvId);
      if (remaining[0]) setSelectedServiceId(remaining[0].id);
    }
    showToast('已刪除服務', '該服務項目已從資料庫移除', 'info');
  };

  // ==========================================
  // 7. 視覺渲染 (極簡胡桃木質調風格)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#2C2520] font-sans selection:bg-[#6E5039] selection:text-white pb-16">
      {/* 頂部導覽切換列 (方便預覽切換 Client / Admin 與檢視 LINE Webhook 紀錄) */}
      <div className="sticky top-0 z-40 bg-[#2C2520] text-[#EBE5DC] px-4 py-2.5 shadow-md border-b border-[#4A3C31]">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#38B449] animate-pulse" />
            <span className="text-xs tracking-widest uppercase text-[#C8B9A6]">
              HAIR ISLAND SALON · SPA & LIFF SYSTEM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('customer')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeView === 'customer'
                  ? 'bg-[#C8B9A6] text-[#2C2520] shadow-sm'
                  : 'text-[#C8B9A6] hover:bg-[#3E342D]'
              }`}
            >
              客戶端預約介面 (LIFF View)
            </button>
            <button
              onClick={() => setActiveView('admin')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeView === 'admin'
                  ? 'bg-[#C8B9A6] text-[#2C2520] shadow-sm'
                  : 'text-[#C8B9A6] hover:bg-[#3E342D]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              設計師後台管理 (Admin)
            </button>
          </div>
        </div>
      </div>

      {/* 頂部動態通知 Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-[#2C2520] text-[#F7F4EF] border border-[#6E5039] rounded-2xl p-4 shadow-2xl transition-all duration-300">
          <div className="flex items-start gap-3">
            {toast.type === 'line' ? (
              <div className="w-8 h-8 rounded-xl bg-[#06C755] flex items-center justify-center shrink-0 text-white font-bold text-xs">
                LINE
              </div>
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#C8B9A6] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs leading-relaxed">
              <div className="font-semibold text-sm text-white mb-0.5">{toast.title}</div>
              <div className="text-[#D5CBBF]">{toast.message}</div>
            </div>
            <button onClick={() => setToast(null)} className="text-[#9A8C7E] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW 1: 客戶端預約介面 (Customer Booking)
      ===================================================== */}
      {activeView === 'customer' && (
        <div className="max-w-3xl mx-auto px-4 pt-8">
          {/* 極簡木質調品牌 Header */}
          <header className="bg-[#EFECE6] border border-[#DFD8CE] rounded-3xl p-8 md:p-10 mb-8 relative overflow-hidden shadow-sm">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
              <div className="text-center md:text-left">
                {/* 極簡線條品牌 Logo (結合太陽、椰樹、海鷗、波浪髮絲與美髮剪刀意象) */}
                <div className="inline-flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#2C2520] text-[#EBE5DC] flex items-center justify-center shadow-md border border-[#5A4635]">
                    <svg viewBox="0 0 64 64" className="w-11 h-11 stroke-current fill-none" strokeWidth="1.8">
                      {/* 太陽與海鷗 */}
                      <circle cx="22" cy="20" r="6" />
                      <path d="M38 16 Q42 12 46 16 Q50 12 54 16" strokeLinecap="round" />
                      {/* 椰樹與流線髮絲波浪 */}
                      <path d="M12 44 Q28 34 48 44" strokeLinecap="round" />
                      <path d="M10 51 Q30 41 52 51" strokeLinecap="round" />
                      {/* 隱藏剪刀流線符號 */}
                      <circle cx="46" cy="30" r="3" />
                      <path d="M43 28 L33 22 M43 32 L33 36" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-serif tracking-[0.2em] text-[#2C2520] font-semibold">
                      髮嶼
                    </h1>
                    <p className="text-xs tracking-[0.28em] text-[#7A6855] uppercase mt-1">
                      HAIR ISLAND SALON
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[#5C4E41] leading-relaxed max-w-lg">
                  在溫潤胡桃木與靜謐留白之間，為您預留一段不被打擾的島嶼時光。專注於深層頭皮養護與自然鬆弛感髮型設計。
                </p>
              </div>

              {/* LIFF 綁定狀態小卡 */}
              <div className="bg-[#F7F4EF] border border-[#DFD8CE] rounded-2xl p-4 text-xs w-full md:w-60 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[#5C4E41] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#06C755]" />
                    LINE LIFF 已連線
                  </span>
                  <button
                    type="button"
                    onClick={initLiff}
                    className="text-[11px] text-[#6E5039] underline hover:text-[#2C2520]"
                  >
                    重新取得 Profile
                  </button>
                </div>
                <div className="text-[#7A6855] truncate">UID: {liffProfile.userId}</div>
                <div className="text-[#2C2520] font-medium mt-0.5">暱稱：{liffProfile.displayName}</div>
              </div>
            </div>

            {/* 預約須知 */}
            <div className="mt-6 pt-5 border-t border-[#DFD8CE] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#6E5D4F]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6E5039] shrink-0" />
                <span>營業時間：11:00 - 19:00（全預約制）</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#6E5039] shrink-0" />
                <span>一對一專屬服務，座位保留 15 分鐘</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#6E5039] shrink-0" />
                <span>送出後將由設計師確認並以 LINE 通知</span>
              </div>
            </div>
          </header>

          {/* 預約四步驟表單 */}
          <form onSubmit={handleCustomerSubmit} className="space-y-8">
            {/* STEP 1: 聯絡資訊 */}
            <section className="bg-white/90 border border-[#E5DEC9] rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-7 h-7 rounded-full bg-[#6E5039] text-white text-xs flex items-center justify-center font-medium">
                  01
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-wider text-[#2C2520]">貴賓聯絡資訊</h2>
                  <p className="text-xs text-[#8A7968]">預設帶入您的 LINE 顯示名稱，可直接修改為真實姓名</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-[#5C4E41] mb-2">
                    預約姓名 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#9A8C7E] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="請輸入您的稱呼"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border border-[#DCD3C6] rounded-xl text-sm focus:outline-none focus:border-[#6E5039]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4E41] mb-2">
                    聯絡電話 (台灣手機格式) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#9A8C7E] absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0912-345-678"
                      className={`w-full pl-10 pr-4 py-2.5 bg-[#FAF8F5] border rounded-xl text-sm focus:outline-none ${
                        phone && !isPhoneValid
                          ? 'border-red-400 focus:border-red-500'
                          : 'border-[#DCD3C6] focus:border-[#6E5039]'
                      }`}
                      required
                    />
                  </div>
                  {phone && !isPhoneValid && (
                    <p className="text-[11px] text-red-500 mt-1">請輸入正確的 09 開頭十碼手機號碼</p>
                  )}
                </div>
              </div>
            </section>

            {/* STEP 2: 服務選擇 */}
            <section className="bg-white/90 border border-[#E5DEC9] rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#6E5039] text-white text-xs flex items-center justify-center font-medium">
                    02
                  </span>
                  <div>
                    <h2 className="text-base font-semibold tracking-wider text-[#2C2520]">選擇專屬養護或造型項目</h2>
                    <p className="text-xs text-[#8A7968]">系統將依據您所選服務的預估時長，自動篩選合適的連續空檔</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {services.map((srv) => {
                  const isSelected = srv.id === selectedServiceId;
                  return (
                    <div
                      key={srv.id}
                      onClick={() => {
                        setSelectedServiceId(srv.id);
                        setSelectedTime(''); // 切換服務時重設時間以重新檢核時長
                      }}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#F3EFE6] border-[#6E5039] shadow-sm'
                          : 'bg-[#FAF8F5] border-[#E6DFD3] hover:border-[#C8B9A6]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-[#6E5039] bg-[#6E5039]' : 'border-[#B0A191]'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="font-medium text-sm text-[#2C2520]">{srv.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E5DEC9] text-[#5C4E41]">
                            約 {srv.duration} 分鐘
                          </span>
                        </div>
                        <p className="text-xs text-[#7A6855] pl-6">{srv.desc}</p>
                      </div>
                      <div className="pl-6 sm:pl-0 text-right shrink-0">
                        <span className="text-base font-semibold text-[#6E5039]">
                          NT$ {srv.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* STEP 3: 日期與時間選擇 */}
            <section className="bg-white/90 border border-[#E5DEC9] rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-7 h-7 rounded-full bg-[#6E5039] text-white text-xs flex items-center justify-center font-medium">
                  03
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-wider text-[#2C2520]">選擇預約日期與時段</h2>
                  <p className="text-xs text-[#8A7968]">
                    目前選擇：<strong className="text-[#6E5039]">{selectedService.name}</strong>（需保留連續{' '}
                    <strong className="text-[#6E5039]">{selectedService.duration} 分鐘</strong> 空檔）
                  </p>
                </div>
              </div>

              {/* 月曆控制列 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 px-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                    }
                    className="p-2 rounded-xl hover:bg-[#EFECE6] text-[#5C4E41]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="text-sm font-semibold tracking-widest text-[#2C2520]">
                    {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                    }
                    className="p-2 rounded-xl hover:bg-[#EFECE6] text-[#5C4E41]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 星期標題 */}
                <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-[#8A7968] mb-2">
                  {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                    <div key={d} className="py-1 font-medium">
                      {d}
                    </div>
                  ))}
                </div>

                {/* 日期網格 */}
                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((cell, idx) => {
                    if (!cell) return <div key={`empty-${idx}`} className="h-16" />;

                    const isSelected = cell.dateStr === selectedDate;
                    const disabled = cell.isPast || !cell.hasAvailableSlot;

                    return (
                      <button
                        type="button"
                        key={cell.dateStr}
                        disabled={disabled}
                        onClick={() => {
                          setSelectedDate(cell.dateStr);
                          setSelectedTime('');
                        }}
                        className={`h-16 rounded-2xl border p-1.5 flex flex-col items-center justify-between transition-all ${
                          cell.isPast
                            ? 'bg-[#F2EFE9] border-transparent text-[#BEB5A9] cursor-not-allowed opacity-60'
                            : !cell.hasAvailableSlot
                            ? 'bg-[#F5EFEB] border-[#E8DFD7] text-[#B09B8C] cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#6E5039] border-[#6E5039] text-white shadow-md'
                            : 'bg-[#FAF8F5] border-[#E6DFD3] text-[#2C2520] hover:border-[#6E5039]'
                        }`}
                      >
                        <span className="text-xs font-semibold">{cell.dayNumber}</span>
                        {!cell.isPast && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full leading-none ${
                              !cell.hasAvailableSlot
                                ? 'bg-[#E5D7CE] text-[#8C6D58]'
                                : isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-[#E6EFE6] text-[#3B6E4C]'
                            }`}
                          >
                            {cell.hasAvailableSlot ? '可預約' : '已額滿'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 11:00 ~ 19:00 時段按鈕區 (每 30 分鐘一區間) */}
              {selectedDate && (
                <div className="pt-5 border-t border-[#ECE6DA]">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-medium text-[#5C4E41]">
                      選擇起始時間（{selectedDate} 營業時段 11:00 - 19:00）
                    </span>
                    <span className="text-[11px] text-[#8A7968]">
                      反灰代表已預約、店休，或剩餘連續時間不足 {selectedService.duration} 分鐘
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {ALL_DAILY_SLOTS.map((slot) => {
                      const check = checkSlotBookable(selectedDate, slot, selectedService.duration);
                      const isSelected = selectedTime === slot;
                      return (
                        <button
                          type="button"
                          key={slot}
                          disabled={!check.ok}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2.5 px-2 rounded-xl border text-xs font-medium transition-all flex flex-col items-center justify-center ${
                            !check.ok
                              ? 'bg-[#F2EFE9] border-[#E5DEC9] text-[#BEB5A9] cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-[#6E5039] border-[#6E5039] text-white shadow-sm'
                              : 'bg-[#FAF8F5] border-[#DCD3C6] text-[#2C2520] hover:border-[#6E5039]'
                          }`}
                          title={check.reason}
                        >
                          <span>{slot}</span>
                          {!check.ok && (
                            <span className="text-[9px] no-underline mt-0.5 opacity-80">{check.reason}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedTime && (
                    <div className="mt-4 bg-[#F3EFE6] border border-[#D8CBB8] rounded-2xl p-3.5 flex items-center justify-between text-xs text-[#4A3C31]">
                      <span>
                        已選擇時段：
                        <strong className="ml-1 text-[#2C2520]">
                          {selectedDate} {selectedTime} ～{' '}
                          {minsToTime(timeToMins(selectedTime) + selectedService.duration)}
                        </strong>
                      </span>
                      <span className="text-[#6E5039] font-medium">共計 {selectedService.duration} 分鐘</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* STEP 4: 備註與確認送出 */}
            <section className="bg-white/90 border border-[#E5DEC9] rounded-3xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-7 h-7 rounded-full bg-[#6E5039] text-white text-xs flex items-center justify-center font-medium">
                  04
                </span>
                <div>
                  <h2 className="text-base font-semibold tracking-wider text-[#2C2520]">需求備註與送出預約</h2>
                  <p className="text-xs text-[#8A7968]">如有近期染燙紀錄、頭皮敏感狀況或指定造型需求，歡迎預先填寫</p>
                </div>
              </div>

              <textarea
                rows={3}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="例如：近期頭皮較乾癢、希望討論好整理的鎖骨髮長..."
                className="w-full p-3.5 bg-[#FAF8F5] border border-[#DCD3C6] rounded-2xl text-sm focus:outline-none focus:border-[#6E5039] mb-5"
              />

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-[#2C2520] hover:bg-[#423730] text-[#F7F4EF] font-medium text-sm tracking-widest transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C8B9A6]" />
                確認預約並發送 LINE 通知
              </button>
            </section>
          </form>
        </div>
      )}

      {/* 預約成功彈窗 Modal */}
      {bookingSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F7F4EF] border border-[#D8CBB8] rounded-3xl max-w-md w-full p-7 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#6E5039] text-white flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-center text-[#2C2520] mb-1">
              預約申請已送出（待設計師確認）
            </h3>
            <p className="text-xs text-center text-[#7A6855] mb-5">
              系統已透過 LINE LIFF 傳送「預約待確認」通知至您的聊天室
            </p>

            <div className="bg-white rounded-2xl p-4 border border-[#E5DEC9] space-y-2 text-xs text-[#4A3C31] mb-6">
              <div className="flex justify-between">
                <span className="text-[#8A7968]">預約單號</span>
                <span className="font-mono font-medium">{bookingSuccessModal.appt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A7968]">貴賓姓名</span>
                <span className="font-medium">{bookingSuccessModal.appt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A7968]">預約服務</span>
                <span className="font-medium text-[#6E5039]">{bookingSuccessModal.service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A7968]">預約時段</span>
                <span className="font-medium">
                  {bookingSuccessModal.appt.date} {bookingSuccessModal.appt.time} -{' '}
                  {bookingSuccessModal.appt.endTime}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setBookingSuccessModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#C8B9A6] text-xs font-medium text-[#5C4E41] hover:bg-[#EFECE6]"
              >
                返回預約首頁
              </button>
              <button
                onClick={() => {
                  setBookingSuccessModal(null);
                  setActiveView('admin');
                  setIsAdminAuthenticated(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#6E5039] text-white text-xs font-medium hover:bg-[#593F2C]"
              >
                前往後台審核此單
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEW 2: 設計師後台管理介面 (Admin Dashboard)
      ===================================================== */}
      {activeView === 'admin' && (
        <div className="max-w-5xl mx-auto px-4 pt-8">
          {!isAdminAuthenticated ? (
            /* 後台登入驗證畫面 */
            <div className="max-w-md mx-auto bg-white border border-[#E5DEC9] rounded-3xl p-8 shadow-sm mt-8">
              <div className="w-12 h-12 rounded-2xl bg-[#2C2520] text-[#C8B9A6] flex items-center justify-center mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-[#2C2520] mb-1">髮嶼設計師後台管理登入</h2>
              <p className="text-xs text-[#8A7968] mb-5">
                請輸入管理員通行碼以管理預約訂單、店休時段與價目表（預設測試密碼：8888，或直接點擊快速登入）
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adminPinInput === '8888' || adminPinInput === '') {
                    setIsAdminAuthenticated(true);
                    showToast('後台登入成功', '歡迎回來，髮嶼主理人', 'info');
                  } else {
                    showToast('密碼錯誤', '請輸入預設密碼 8888', 'error');
                  }
                }}
                className="space-y-4"
              >
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="請輸入管理員密碼 (8888)"
                  className="w-full px-4 py-2.5 bg-[#FAF8F5] border border-[#DCD3C6] rounded-xl text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-[#2C2520] text-white text-xs font-medium tracking-wider hover:bg-[#3E342D]"
                  >
                    驗證並進入後台
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminAuthenticated(true);
                      showToast('快速體驗登入', '已進入設計師管理後台', 'info');
                    }}
                    className="px-4 py-3 rounded-xl bg-[#EFECE6] text-[#5C4E41] text-xs font-medium hover:bg-[#E5DEC9]"
                  >
                    一鍵快速登入
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* 後台主控台 */
            <div className="space-y-6">
              {/* 後台頂部導覽與分頁切換 */}
              <div className="bg-white border border-[#E5DEC9] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-[#2C2520]">髮嶼 Hair Island · 設計師管理後台</h2>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#E6EFE6] text-[#3B6E4C] font-medium">
                      Admin 權限已啟用
                    </span>
                  </div>
                  <p className="text-xs text-[#8A7968] mt-1">
                    即時連動 Firestore 資料庫與 LINE Messaging API 推播通知
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAdminTab('appointments')}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      adminTab === 'appointments'
                        ? 'bg-[#6E5039] text-white'
                        : 'bg-[#FAF8F5] text-[#5C4E41] hover:bg-[#EFECE6]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Tab 1: 訂單管理 ({appointments.length})
                  </button>
                  <button
                    onClick={() => setAdminTab('schedule')}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      adminTab === 'schedule'
                        ? 'bg-[#6E5039] text-white'
                        : 'bg-[#FAF8F5] text-[#5C4E41] hover:bg-[#EFECE6]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Tab 2: 行事曆與時段管理
                  </button>
                  <button
                    onClick={() => setAdminTab('services')}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      adminTab === 'services'
                        ? 'bg-[#6E5039] text-white'
                        : 'bg-[#FAF8F5] text-[#5C4E41] hover:bg-[#EFECE6]'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Tab 3: 服務與價格設定
                  </button>
                  <button
                    onClick={() => setIsAdminAuthenticated(false)}
                    className="p-2 rounded-xl text-[#8A7968] hover:text-red-600 hover:bg-red-50"
                    title="登出後台"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ==========================================
                  TAB 1: 訂單管理 (Appointments)
              ========================================== */}
              {adminTab === 'appointments' && (
                <div className="space-y-4">
                  {[...appointments]
                    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
                    .map((appt) => {
                      const srv = services.find((s) => s.id === appt.serviceId) || {
                        name: '已下架服務',
                        price: 0,
                        duration: 60
                      };

                      const statusBadge = {
                        pending: { label: '待確認 (Pending)', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
                        confirmed: { label: '已確認 (Confirmed)', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                        completed: { label: '已完成 (Completed)', cls: 'bg-stone-200 text-stone-700 border-stone-300' },
                        cancelled: { label: '已取消 (Cancelled)', cls: 'bg-rose-100 text-rose-700 border-rose-200' }
                      }[appt.status];

                      return (
                        <div
                          key={appt.id}
                          className="bg-white border border-[#E5DEC9] rounded-3xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                              <span className="text-sm font-semibold text-[#2C2520]">
                                {appt.date} · {appt.time} - {appt.endTime}
                              </span>
                              <span className="text-xs text-[#8A7968] font-mono">#{appt.id}</span>
                            </div>

                            <div className="text-sm font-medium text-[#4A3C31]">
                              貴賓：{appt.customerName}（{appt.phone}）
                              <span className="text-xs text-[#8A7968] ml-2">LINE UID: {appt.liffUserId.slice(0, 10)}...</span>
                            </div>

                            <div className="text-xs text-[#6E5039] font-medium">
                              預約項目：{srv.name}（{srv.duration} 分鐘 / NT$ {srv.price.toLocaleString()}）
                            </div>

                            {appt.remark && (
                              <div className="text-xs text-[#7A6855] bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#ECE6DA] inline-block">
                                備註：{appt.remark}
                              </div>
                            )}
                          </div>

                          {/* 訂單操作按鈕群 */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {appt.status === 'pending' && (
                              <button
                                onClick={() => handleConfirmAppointment(appt)}
                                className="px-4 py-2 rounded-xl bg-[#06C755] hover:bg-[#05b04b] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                確認預約 (鎖定時段＋發送 LINE)
                              </button>
                            )}

                            <button
                              onClick={() => sendReminderMsg(appt, srv)}
                              className="px-3.5 py-2 rounded-xl bg-[#F3EFE6] hover:bg-[#E5DEC9] text-[#5C4E41] text-xs font-medium flex items-center gap-1.5 border border-[#D8CBB8]"
                            >
                              <BellRing className="w-3.5 h-3.5 text-[#6E5039]" />
                              一鍵發送明日提醒
                            </button>

                            {appt.status === 'confirmed' && (
                              <button
                                onClick={() => handleUpdateApptStatus(appt.id, 'completed')}
                                className="px-3 py-2 rounded-xl border border-[#DCD3C6] text-xs text-[#5C4E41] hover:bg-[#FAF8F5]"
                              >
                                標記完成
                              </button>
                            )}

                            {appt.status !== 'cancelled' && (
                              <button
                                onClick={() => handleUpdateApptStatus(appt.id, 'cancelled')}
                                className="px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50"
                              >
                                取消訂單
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* ==========================================
                  TAB 2: 行事曆與時段管理 (Schedule)
              ========================================== */}
              {adminTab === 'schedule' && (
                <div className="bg-white border border-[#E5DEC9] rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#ECE6DA]">
                    <div>
                      <h3 className="text-base font-semibold text-[#2C2520]">視覺化時段鎖定與店休設定</h3>
                      <p className="text-xs text-[#8A7968]">
                        點擊下方任一 30 分鐘區間即可手動切換「開放預約」或「店休/不開放」
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="px-3.5 py-2 bg-[#FAF8F5] border border-[#DCD3C6] rounded-xl text-xs font-medium"
                      />
                      <button
                        onClick={() => toggleWholeDayOff(scheduleDate, true)}
                        className="px-3 py-2 rounded-xl bg-[#2C2520] text-white text-xs hover:bg-[#3E342D]"
                      >
                        設為整日店休
                      </button>
                      <button
                        onClick={() => toggleWholeDayOff(scheduleDate, false)}
                        className="px-3 py-2 rounded-xl border border-[#DCD3C6] text-xs text-[#5C4E41] hover:bg-[#FAF8F5]"
                      >
                        全時段開放
                      </button>
                    </div>
                  </div>

                  {/* 時段狀態矩陣 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-3">
                    {ALL_DAILY_SLOTS.map((slot) => {
                      const availDoc = availability.find((a) => a.date === scheduleDate);
                      const isBlocked = availDoc ? availDoc.blockedSlots.includes(slot) : false;

                      // 檢查該時段是否有對應的已確認訂單
                      const occupyingAppt = appointments.find((apt) => {
                        if (apt.date !== scheduleDate || apt.status !== 'confirmed') return false;
                        const srv = services.find((s) => s.id === apt.serviceId);
                        const slots = expandRequiredSlots(apt.time, srv ? srv.duration : 60);
                        return slots.includes(slot);
                      });

                      const nextSlot = minsToTime(timeToMins(slot) + 30);

                      return (
                        <button
                          key={slot}
                          onClick={() => toggleManualBlockSlot(scheduleDate, slot)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                            occupyingAppt
                              ? 'bg-[#EFECE6] border-[#6E5039] text-[#2C2520]'
                              : isBlocked
                              ? 'bg-stone-800 border-stone-800 text-stone-100'
                              : 'bg-[#FAF8F5] border-[#DCD3C6] text-[#2C2520] hover:border-[#6E5039]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className="text-xs font-semibold">
                              {slot} - {nextSlot}
                            </span>
                            {isBlocked || occupyingAppt ? (
                              <Lock className="w-3.5 h-3.5 opacity-80" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-[#3B6E4C]" />
                            )}
                          </div>

                          {occupyingAppt ? (
                            <div className="text-[11px] text-[#6E5039] font-medium truncate">
                              客約：{occupyingAppt.customerName}
                            </div>
                          ) : isBlocked ? (
                            <div className="text-[11px] text-amber-300">店休 / 已手動鎖定</div>
                          ) : (
                            <div className="text-[11px] text-[#3B6E4C]">開放預約中</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==========================================
                  TAB 3: 服務與價格設定 (Services Setup CRUD)
              ========================================== */}
              {adminTab === 'services' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 左側：新增 / 編輯表單 */}
                  <form
                    onSubmit={handleSaveService}
                    className="bg-white border border-[#E5DEC9] rounded-3xl p-6 shadow-sm space-y-4 h-fit"
                  >
                    <h3 className="text-base font-semibold text-[#2C2520] flex items-center gap-2">
                      {editingService ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingService ? '編輯服務項目' : '新增服務項目'}
                    </h3>

                    <div>
                      <label className="block text-xs text-[#5C4E41] mb-1">品項名稱 *</label>
                      <input
                        type="text"
                        value={newServiceForm.name}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, name: e.target.value })}
                        placeholder="例如：深層木質調精油SPA"
                        className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#DCD3C6] rounded-xl text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[#5C4E41] mb-1">價格 (NT$) *</label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={newServiceForm.price}
                          onChange={(e) => setNewServiceForm({ ...newServiceForm, price: e.target.value })}
                          placeholder="1500"
                          className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#DCD3C6] rounded-xl text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[#5C4E41] mb-1">所需時間 (半小時單位)</label>
                        <select
                          value={newServiceForm.duration}
                          onChange={(e) => setNewServiceForm({ ...newServiceForm, duration: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#DCD3C6] rounded-xl text-xs"
                        >
                          {[30, 60, 90, 120, 150, 180, 210, 240].map((mins) => (
                            <option key={mins} value={mins}>
                              {mins} 分鐘 ({mins / 60} 小時)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-[#5C4E41] mb-1">服務說明</label>
                      <textarea
                        rows={2}
                        value={newServiceForm.desc}
                        onChange={(e) => setNewServiceForm({ ...newServiceForm, desc: e.target.value })}
                        placeholder="簡述服務特色與包含流程..."
                        className="w-full px-3.5 py-2 bg-[#FAF8F5] border border-[#DCD3C6] rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-[#6E5039] text-white text-xs font-medium hover:bg-[#593F2C]"
                      >
                        {editingService ? '儲存修改' : '新增至資料庫'}
                      </button>
                      {editingService && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingService(null);
                            setNewServiceForm({ name: '', price: '', duration: 60, desc: '' });
                          }}
                          className="px-3 py-2.5 rounded-xl border border-[#DCD3C6] text-xs text-[#5C4E41]"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </form>

                  {/* 右側：現有服務列表 */}
                  <div className="lg:col-span-2 space-y-3">
                    {services.map((srv) => (
                      <div
                        key={srv.id}
                        className="bg-white border border-[#E5DEC9] rounded-2xl p-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#2C2520]">{srv.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFECE6] text-[#6E5039]">
                              {srv.duration} 分鐘
                            </span>
                          </div>
                          <p className="text-xs text-[#8A7968] mt-1">{srv.desc}</p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-semibold text-[#6E5039]">
                            NT$ {srv.price.toLocaleString()}
                          </span>
                          <button
                            onClick={() => {
                              setEditingService(srv);
                              setNewServiceForm({
                                name: srv.name,
                                price: srv.price,
                                duration: srv.duration,
                                desc: srv.desc || ''
                              });
                            }}
                            className="p-2 rounded-xl hover:bg-[#EFECE6] text-[#5C4E41]"
                            title="編輯"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(srv.id)}
                            className="p-2 rounded-xl hover:bg-rose-50 text-rose-600"
                            title="刪除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LINE Messaging API / LIFF 觸發紀錄監控面板 */}
              <div className="bg-[#2C2520] text-[#EBE5DC] rounded-3xl p-6 shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06C755]" />
                    <h4 className="text-xs font-semibold tracking-wider uppercase">
                      LINE LIFF & Messaging API Webhook 即時發訊紀錄
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#9A8C7E]">共 {lineLogs.length} 筆推播紀錄</span>
                </div>

                {lineLogs.length === 0 ? (
                  <p className="text-xs text-[#9A8C7E] py-3">
                    尚無發訊紀錄。請嘗試於客戶端送出預約、於後台點擊「確認預約」或「一鍵發送明日提醒」測試觸發。
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {lineLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-[#3A312A] border border-[#52443A] rounded-2xl p-3.5 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[#C8B9A6]">
                          <span className="font-semibold text-[#06C755]">{log.type}</span>
                          <span>
                            對象：{log.to} · {log.time}
                          </span>
                        </div>
                        <pre className="text-[#EBE5DC] whitespace-pre-wrap font-sans leading-relaxed">
                          {log.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
