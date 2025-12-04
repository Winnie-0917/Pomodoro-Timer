import yt_dlp
import os
import shutil
import traceback

def find_ffmpeg():
    """
    Try to locate ffmpeg executable. Return full path to ffmpeg.exe (or ffmpeg) if found, else None.
    Search order:
    - system PATH via shutil.which
    - script directory (same folder as this file)
    - current working directory
    """
    # 1) system PATH
    p = shutil.which('ffmpeg') or shutil.which('ffmpeg.exe')
    if p:
        return p

    # 2) script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.join(script_dir, 'ffmpeg.exe')
    if os.path.exists(candidate):
        return candidate

    # 3) current working directory
    cwd_candidate = os.path.join(os.getcwd(), 'ffmpeg.exe')
    if os.path.exists(cwd_candidate):
        return cwd_candidate

    return None

def get_next_number(folder_path):
    """
    檢查資料夾中現有的 mp3 檔案，找出最大的數字編號，並回傳下一個編號。
    如果資料夾是空的，回傳 1。
    """
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        return 1

    max_num = 0
    # 掃描資料夾內所有檔案
    for filename in os.listdir(folder_path):
        if filename.endswith(".mp3"):
            # 取得檔名 (不含副檔名)
            name_part = os.path.splitext(filename)[0]
            # 檢查檔名是否純為數字
            if name_part.isdigit():
                num = int(name_part)
                if num > max_num:
                    max_num = num
    
    return max_num + 1

def download_youtube_mp3(video_url):
    output_folder = "upload"
    
    # 取得下一個編號
    next_num = get_next_number(output_folder)
    
    # 設定存檔路徑格式: mp3/編號.副檔名 (例如 mp3/1.webm，之後會被轉為 mp3/1.mp3)
    save_path = os.path.join(output_folder, f"{next_num}.%(ext)s")

    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': save_path, # 使用我們設定好的編號路徑
        'quiet': False,
        'noplaylist': True,  # 只下載單個視頻，不允許播放列表
        'extract_flat': False,  # 確保提取完整信息
        'no_warnings': False,  # 顯示警告以便調試
    }


    print(f"正在下載: {video_url}")
    print(f"預計存檔名稱: {output_folder}/{next_num}.mp3")

    # Locate ffmpeg; if found, pass its directory to yt-dlp via 'ffmpeg_location'
    ffmpeg_path = find_ffmpeg()
    if not ffmpeg_path:
        raise RuntimeError('ffmpeg not found. Please place ffmpeg.exe in project folder or install it and ensure it is on PATH.')
    ffmpeg_dir = os.path.dirname(ffmpeg_path)

    # If ffmpeg exists, inform yt-dlp of its location
    ydl_opts['ffmpeg_location'] = ffmpeg_dir

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])

        mp3_path = os.path.join(output_folder, f"{next_num}.mp3")
        if not os.path.exists(mp3_path):
            raise RuntimeError(f'Download finished but expected mp3 not found at {mp3_path}')

        print(f"成功！檔案已儲存於 '{mp3_path}'")
        return mp3_path

    except Exception as e:
        # Print traceback for server logs and re-raise
        traceback.print_exc()
        raise


