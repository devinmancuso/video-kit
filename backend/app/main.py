from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app.api import generate, jobs, custom_images, env

app = FastAPI(title="Fight Video Generator API", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for videos and custom images
base_path = os.getenv("DATA_PATH", "../data")
videos_path = f"{base_path}/videos"
custom_images_path = f"{base_path}/custom-images"
os.makedirs(videos_path, exist_ok=True)
os.makedirs(custom_images_path, exist_ok=True)
app.mount("/videos", StaticFiles(directory=videos_path), name="videos")
app.mount("/custom-images", StaticFiles(directory=custom_images_path), name="custom_images")

# Include routers
app.include_router(generate.router, prefix="/api", tags=["generate"])
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(custom_images.router, prefix="/api", tags=["custom-images"])
app.include_router(env.router, prefix="/api", tags=["env"])


@app.get("/")
async def root():
    return {
        "message": "Fight Video Generator API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/api/download/{job_id}/{filename}")
async def download_video(job_id: str, filename: str):
    """Download endpoint that forces file download with proper headers"""
    file_path = os.path.join(videos_path, job_id, filename)

    if not os.path.exists(file_path):
        return {"error": "File not found"}, 404

    return FileResponse(
        path=file_path,
        filename=f"video-{job_id}.mp4",
        media_type="video/mp4",
        headers={
            "Content-Disposition": f"attachment; filename=video-{job_id}.mp4"
        }
    )
