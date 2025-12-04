# Pomodoro Timer

一個極簡風格的番茄鐘計時器，支援 YouTube 背景音樂轉換與播放功能。

## 功能特色

- ⏱️ **番茄鐘計時器**
  - 預設 25 分鐘工作 / 5 分鐘休息
  - 可自訂時間：工作 25、深度 50、休息 5 分鐘
  - 圓形進度環顯示剩餘時間
  - 自動切換工作/休息模式

- 🎵 **背景音樂功能**
  - 自動播放預設背景音樂（default.mp3）
  - 支援 YouTube URL 轉換為 MP3
  - 自動循環播放
  - 音量控制與靜音功能

- 🎨 **視覺設計**
  - 極簡風格介面
  - 動態漸層背景
  - 粒子動畫效果
  - 流暢的按鈕懸停效果

## 技術架構

### 前端
- HTML5 / CSS3 / JavaScript
- Web Audio API 音訊控制
- Canvas 動畫效果

### 後端
- Flask (Python)
- yt-dlp (YouTube 下載)
- FFmpeg (音訊轉換)

## 安裝與使用

### 前置需求

1. Python 3.7+
2. FFmpeg（已包含在專案中：`ffmpeg.exe`）

### 安裝步驟

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd Pomodoro-Timer
   ```

2. **安裝 Python 依賴**
   ```bash
   pip install -r requirements.txt
   ```

3. **確認 FFmpeg**
   - 確保專案已包含 `ffmpeg.exe`
   - 或確保 FFmpeg 在系統 PATH 中

### 啟動伺服器

```bash
python server.py
```

伺服器將在 `http://localhost:5000` 啟動。

### 使用方式

1. **開啟瀏覽器**
   - 訪問 `http://localhost:5000`
   - 或直接打開 `index.html`（需確保伺服器正在運行）

2. **使用計時器**
   - 點擊「開始」啟動計時
   - 點擊「暫停」暫停計時
   - 點擊「重設」重置為預設時間
   - 使用快速按鈕切換時間（工作 25、深度 50、休息 5）

3. **載入背景音樂**
   - 在輸入框中貼上 YouTube 單個視頻 URL
   - 點擊「載入」按鈕
   - 系統會自動下載並轉換為 MP3
   - 轉換完成後自動播放

4. **音量控制**
   - 使用滑桿調整音量（0-100%）
   - 點擊音量圖示切換靜音/取消靜音

## 專案結構

```
Pomodoro-Timer/
├── index.html          # 主頁面
├── index.css           # 樣式表
├── index.js            # 前端邏輯
├── server.py           # Flask 伺服器
├── youtube_to_mp3.py   # YouTube 下載轉換
├── requirements.txt    # Python 依賴
├── default.mp3         # 預設背景音樂
├── ffmpeg.exe          # FFmpeg 執行檔(請自行下載)
├── upload/             # 下載的 MP3 存放目錄
└── README.md           # 說明文件
```

## 注意事項

- ⚠️ **只支援單個視頻 URL**，不支援播放列表
- ⚠️ 首次載入 YouTube 音樂需要一些時間（下載與轉換）
- ⚠️ 轉換的 MP3 檔案會保存在 `upload/` 資料夾中
- ⚠️ 請確保伺服器正在運行才能使用 YouTube 轉換功能

## 開發說明

### 環境變數

.../ffmpeg/bin

### 除錯模式

伺服器預設啟用除錯模式，可在 `server.py` 中修改：

```python
app.run(host='0.0.0.0', port=5000, debug=True)
```

### 依賴套件

- `Flask>=2.0` - Web 框架
- `flask-cors>=4.0.0` - CORS 支援
- `yt-dlp>=2023.12.1` - YouTube 下載


