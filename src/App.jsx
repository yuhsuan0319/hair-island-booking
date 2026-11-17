// 1. 處理瀏覽器點擊或驗證的 GET 請求
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({'status': 'success', 'message': 'Hair Island Booking System is running!'}))
                       .setMimeType(ContentService.MimeType.JSON);
}

// 2. 當 LINE 收到訊息或預約時，自動觸發並推播給管理者
function doPost(e) {
  var CHANNEL_ACCESS_TOKEN = "EFC8arpJuVDqQR34qBK8Ae5SlxRFHaW13caLcJUbS2TOaGObt9C5Ra7xsHYdauHW6p8jQu6RFPz7X+0LIZmWccZZJDb3XVFPjvm5wGRyzVLI+hYrl3b8FLAbBt1Bq7inI1FrXEvMYkhh/scnbAsu6wdB04t89/1O/w1cDnyilFU=";
  var adminUserId = "U5e88b1121f054ba725948e898394016e"; // 你的管理員 ID
  
  try {
    var contents = JSON.parse(e.postData.contents);
    var event = contents.events[0];
    
    // 取得傳訊息者的資訊
    var userMessage = "";
    if (event.type === "message" && event.message.type === "text") {
      userMessage = event.message.text;
    } else {
      userMessage = "傳送了其他內容（如圖片/貼圖/按鈕點擊）";
    }
    
    // 準備推播給管理者的通知內容
    var url = "https://api.line.me/v2/bot/message/push";
    var notificationText = "📢 【髮嶼 HAIR ISLAND】收到新的客戶訊息！\n\n" +
                           "💬 訊息內容：" + userMessage + "\n\n" +
                           "請至 LINE 官方帳號後台回覆客戶！";
    
    var payload = {
      "to": adminUserId,
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
    
    // 發送推播通知到你的手機
    UrlFetchApp.fetch(url, options);
    
  } catch (error) {
    Logger.log("錯誤: " + error.toString());
  }
  
  return ContentService.createTextOutput(JSON.stringify({'status': 'success'}))
                       .setMimeType(ContentService.MimeType.JSON);
}
