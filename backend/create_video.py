
import cv2
import numpy as np

def create_video_from_image(image_path, output_path, duration=10, fps=25):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image {image_path}")
        return

    height, width, layers = img.shape
    # Ensure even dimensions for video codecs
    if width % 2 != 0: width -= 1
    if height % 2 != 0: height -= 1
    img = cv2.resize(img, (width, height))

    # Define the codec and create VideoWriter object
    # using 'mp4v' or 'avc1' usually works for mp4
    fourcc = cv2.VideoWriter_fourcc(*'mp4v') 
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frames = duration * fps
    for _ in range(frames):
        out.write(img)

    out.release()
    print(f"Video saved to {output_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python create_video.py <image_path> <output_path>")
    else:
        create_video_from_image(sys.argv[1], sys.argv[2])
