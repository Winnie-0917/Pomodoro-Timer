import yt_dlp
import os
import shutil
import time
import traceback

def find_ffmpeg():
    """
    Try to locate ffmpeg executable. Return full path to ffmpeg (or ffmpeg.exe) if found, else None.
    Search order:
    - system PATH via shutil.which
    - script directory (same folder as this file)
    - current working directory
    """
    # 1) system PATH (Linux/Windows)
    p = shutil.which('ffmpeg') or shutil.which('ffmpeg.exe')
    if p:
        return p

    # 2) script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Check for both 'ffmpeg' (Linux) and 'ffmpeg.exe' (Windows)
    for name in ['ffmpeg', 'ffmpeg.exe']:
        candidate = os.path.join(script_dir, name)
        if os.path.exists(candidate) and os.access(candidate, os.X_OK):
            return candidate

    # 3) current working directory
    for name in ['ffmpeg', 'ffmpeg.exe']:
        cwd_candidate = os.path.join(os.getcwd(), name)
        if os.path.exists(cwd_candidate) and os.access(cwd_candidate, os.X_OK):
            return cwd_candidate

    return None

def download_youtube_mp3(video_url):
    output_folder = "upload"
    cookie_filename = "cookies.txt"
    
    # --- [新增功能] 處理 Cookies ---
    # 檢查環境變數是否有 YOUTUBE_COOKIES，若有則寫入檔案
    cookies_env = os.environ.get('YOUTUBE_COOKIES')
    if cookies_env:
        try:
            with open(cookie_filename, 'w', encoding='utf-8') as f:
                f.write(cookies_env)
            print(f"已從環境變數成功建立 {cookie_filename}")
        except Exception as e:
            print(f"警告：無法建立 Cookies 檔案: {e}")
    else:
        print("警告：未檢測到 YOUTUBE_COOKIES 環境變數，下載可能會因驗證失敗。")
    # -----------------------------

    # 確保 upload 資料夾存在
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # 使用臨時檔名下載，避免檔案鎖定問題
    temp_save_path = os.path.join(output_folder, "temp.%(ext)s")
    final_mp3_path = os.path.join(output_folder, "1.mp3")
    
    # 嘗試刪除舊的 1.mp3
    if os.path.exists(final_mp3_path):
        try:
            os.remove(final_mp3_path)
            print(f"已刪除舊檔案: {final_mp3_path}")
        except PermissionError:
            # 如果檔案被鎖定，嘗試重命名為備份檔
            backup_path = os.path.join(output_folder, f"1_backup_{int(time.time())}.mp3")
            try:
                os.rename(final_mp3_path, backup_path)
                print(f"已將舊檔案重命名為: {backup_path}")
            except Exception as e:
                print(f"警告：無法處理舊檔案 {final_mp3_path}: {e}")
        except Exception as e:
            print(f"警告：無法刪除舊檔案 {final_mp3_path}: {e}")
    
    save_path = temp_save_path

    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': save_path,
        'quiet': False,
        'noplaylist': True,
        'extract_flat': False,
        'no_warnings': False,
        # --- [新增設定] 指定 Cookie 檔案 ---
        'cookiefile': cookie_filename if os.path.exists(cookie_filename) else None,
        # --------------------------------
    }

    print(f"正在下載: {video_url}")
    print(f"預計存檔名稱: {output_folder}/1.mp3")

    ffmpeg_path = find_ffmpeg()
    if not ffmpeg_path:
        # 在 Render 上，通常需要在 Build 階段安裝 ffmpeg，這裡提供更清楚的錯誤提示
        raise RuntimeError('ffmpeg not found. Make sure ffmpeg is installed on the system (PATH) or in the project folder.')
    
    ffmpeg_dir = os.path.dirname(ffmpeg_path)
    ydl_opts['ffmpeg_location'] = ffmpeg_dir
    print(f"使用 FFmpeg 路徑: {ffmpeg_path}")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])

        # 臨時檔名處理 (temp.mp3)
        temp_mp3_path = os.path.join(output_folder, "temp.mp3")
        
        if not os.path.exists(temp_mp3_path):
            raise RuntimeError(f'Download finished but expected temp mp3 not found at {temp_mp3_path}')
        
        # 再次檢查最終檔案是否被佔用
        if os.path.exists(final_mp3_path):
            try:
                os.remove(final_mp3_path)
            except PermissionError:
                backup_path = os.path.join(output_folder, f"1_backup_{int(time.time())}.mp3")
                try:
                    if os.path.exists(backup_path): os.remove(backup_path)
                    os.rename(final_mp3_path, backup_path)
                except:
                    pass
        
        # 重命名
        try:
            os.rename(temp_mp3_path, final_mp3_path)
        except Exception as e:
            shutil.copy2(temp_mp3_path, final_mp3_path)
            os.remove(temp_mp3_path)
        
        if not os.path.exists(final_mp3_path):
            raise RuntimeError(f'Failed to create final mp3 at {final_mp3_path}')

        print(f"成功！檔案已儲存於 '{final_mp3_path}'")
        
        # --- [清理] 刪除生成的 cookies 檔案 (可選) ---
        if os.path.exists(cookie_filename):
            try:
                os.remove(cookie_filename)
            except:
                pass
        # ------------------------------------------

        return final_mp3_path

    except Exception as e:
        traceback.print_exc()
        raise