import os
import cv2
import numpy as np

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "videos")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_video(filename: str, width: int, height: int, fps: int, duration_sec: int, camera_label: str, bg_color: tuple):
    file_path = os.path.join(OUTPUT_DIR, filename)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(file_path, fourcc, fps, (width, height))

    total_frames = int(fps * duration_sec)
    for i in range(total_frames):
        # Create background
        frame = np.full((height, width, 3), bg_color, dtype=np.uint8)
        
        # Grid lines to mimic CCTV layout
        for y in range(0, height, 80):
            cv2.line(frame, (0, y), (width, y), (40, 50, 60), 1)
        for x in range(0, width, 100):
            cv2.line(frame, (x, 0), (x, height), (40, 50, 60), 1)

        # Draw a moving "Person / Subject" square
        t = i / total_frames
        cx = int(150 + t * (width - 300))
        cy = int(height / 2 + np.sin(t * np.pi * 4) * 50)
        
        # Bounding box
        cv2.rectangle(frame, (cx - 30, cy - 70), (cx + 30, cy + 70), (0, 255, 128), 2)
        cv2.putText(frame, "PERSON 0.89", (cx - 35, cy - 75), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 128), 1)

        # CCTV timestamp and camera watermark overlay
        timestamp_text = f"{camera_label} | 2026-09-20 {21:02d}:42:{int(13 + i/fps):02d} | FRAME {i:04d}"
        cv2.rectangle(frame, (10, 10), (width - 10, 45), (10, 15, 25), -1)
        cv2.putText(frame, timestamp_text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (220, 230, 242), 2)

        # REC red dot
        if (i // (fps // 2)) % 2 == 0:
            cv2.circle(frame, (width - 30, 28), 6, (0, 0, 255), -1)

        out.write(frame)

    out.release()
    print(f"Generated synthetic CCTV clip: {file_path}")

if __name__ == "__main__":
    generate_video("cam01.mp4", 1280, 720, 15, 20, "CAM-01 [MAIN GATE - Dahua-Spec]", (20, 25, 35))
    generate_video("cam02.mp4", 960, 540, 10, 20, "CAM-02 [STORAGE AREA - Hikvision-Spec]", (25, 20, 30))
    generate_video("cam03.mp4", 1920, 1080, 25, 20, "CAM-03 [LOADING BAY - CP Plus-Spec]", (15, 30, 25))
