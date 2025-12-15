
try:
    import imageio_ffmpeg
    print(f"FFmpeg path: {imageio_ffmpeg.get_ffmpeg_exe()}")
except ImportError:
    print("imageio-ffmpeg not installed")
except Exception as e:
    print(f"Error: {e}")
