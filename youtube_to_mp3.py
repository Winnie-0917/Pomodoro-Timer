import yt_dlp
import os
import shutil
import time
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

def download_youtube_mp3(video_url):
    output_folder = "upload"
    
    # 確保 upload 資料夾存在
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # 使用臨時檔名下載，避免檔案鎖定問題
    # 下載完成後再重命名為 1.mp3
    temp_save_path = os.path.join(output_folder, "temp.%(ext)s")
    final_mp3_path = os.path.join(output_folder, "1.mp3")
    
    # 嘗試刪除舊的 1.mp3（如果存在且未被鎖定）
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
    
    # 使用臨時檔名下載
    save_path = temp_save_path

    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': save_path, # 固定使用 1.mp3 作為檔名
        'quiet': False,
        'noplaylist': True,  # 只下載單個視頻，不允許播放列表
        'extract_flat': False,  # 確保提取完整信息
        'no_warnings': False,  # 顯示警告以便調試
    }


    print(f"正在下載: {video_url}")
    print(f"預計存檔名稱: {output_folder}/1.mp3")

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

        # 臨時檔名（可能是 temp.webm 或 temp.m4a，之後轉為 temp.mp3）
        temp_mp3_path = os.path.join(output_folder, "temp.mp3")
        
        # 檢查臨時檔案是否存在
        if not os.path.exists(temp_mp3_path):
            raise RuntimeError(f'Download finished but expected temp mp3 not found at {temp_mp3_path}')
        
        # 如果最終檔案存在且被鎖定，先嘗試刪除
        if os.path.exists(final_mp3_path):
            try:
                os.remove(final_mp3_path)
            except PermissionError:
                # 如果無法刪除，使用重命名策略
                backup_path = os.path.join(output_folder, f"1_backup_{int(time.time())}.mp3")
                try:
                    if os.path.exists(backup_path):
                        os.remove(backup_path)
                    os.rename(final_mp3_path, backup_path)
                except:
                    pass
        
        # 將臨時檔案重命名為最終檔名
        try:
            os.rename(temp_mp3_path, final_mp3_path)
        except Exception as e:
            # 如果重命名失敗，嘗試複製
            shutil.copy2(temp_mp3_path, final_mp3_path)
            os.remove(temp_mp3_path)
        
        if not os.path.exists(final_mp3_path):
            raise RuntimeError(f'Failed to create final mp3 at {final_mp3_path}')

        print(f"成功！檔案已儲存於 '{final_mp3_path}'")
        return final_mp3_path

    except Exception as e:
        # Print traceback for server logs and re-raise
        traceback.print_exc()
        raise


