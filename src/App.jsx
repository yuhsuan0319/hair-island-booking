// 1. 處理瀏覽器點擊測試的 GET 請求
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({'status': 'success', 'message': 'Hair Island Booking System is running!'}))
                       .setMimeType(ContentService.MimeType.JSON);
}

// 2. 接收外部或表單觸發，自動推播訊息給管理者的核心函式
function sendLineNotification(targetUserId, clientName, serviceItem, appointmentTime) {
  var CHANNEL_ACCESS_TOKEN = "EFC8arpJuVDqQR34qBK8Ae5SlxRFHaW13caLcJUbS2TOaGObt9C5Ra7xsHYdauHW6p8jQu6RFPz7X+0LIZmWccZZJDb3XVFPjvm5wGRyzVLI+hYrl3b8FLAbBt1Bq7inI1FrXEvMYkhh/scnbAsu6wdB04t89/1O/w1cDnyilFU=";
  var url = "https://api.line.me/v2/bot/message/push";
  
  // 組合要推播給你的美髮預約通知內容
  var notificationText = "📢 【髮嶼 HAIR ISLAND】新預約通知\n\n" +
                         "👤 客戶姓名：" + clientName + "\n" +
                         "💇 預約服務：" + serviceItem + "\n" +
                         "⏰ 預約時間：" + appointmentTime + "\n\n" +
                         "請至管理後台或 Google 試算表確認詳情！";
  
  var payload = {
    "to": targetUserId,
    "messages": [
      {
        "type": "text",
        "text": notificationText
      }
    ]
  };
  
  var options = {
    "method": "post",
    "headers": {
      "Content-Type": "application/json; charset=UTF-8",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
    },
    "payload": JSON.stringify(payload)
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (error) {
    Logger.log("推播失敗: " + error.toString());
  }
}

// 3. 測試手動推播按鈕（點擊執行此函式可以立刻讓你的手機響起通知！）
function testPushNotification() {
  var myAdminId = "U5e88b1121f054ba725948e898394016e";
  sendLineNotification(myAdminId, "測試客戶 (王小明)", "精油頭皮養護 + 質感剪髮", "2026/11/20 下午 2:00");
}
