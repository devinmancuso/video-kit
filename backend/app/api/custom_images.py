from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
import subprocess
from typing import List
import uuid
from datetime import datetime

router = APIRouter()

# Get base path from environment
base_path = os.getenv("DATA_PATH", "../data")
custom_images_path = f"{base_path}/custom-images"

# Ensure directory exists
os.makedirs(custom_images_path, exist_ok=True)


@router.post("/custom-images/upload")
async def upload_custom_image(file: UploadFile = File(...)):
    """Upload a custom image for video generation."""

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(custom_images_path, unique_filename)

    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    return {
        "id": unique_filename,
        "filename": file.filename,
        "url": f"/custom-images/{unique_filename}",
        "uploadedAt": datetime.now().isoformat()
    }


@router.get("/custom-images")
async def list_custom_images():
    """List all uploaded custom images."""

    try:
        files = os.listdir(custom_images_path)
        images = []

        for filename in files:
            # Only include image files
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                file_path = os.path.join(custom_images_path, filename)
                stat = os.stat(file_path)

                images.append({
                    "id": filename,
                    "filename": filename,
                    "url": f"/custom-images/{filename}",
                    "uploadedAt": datetime.fromtimestamp(stat.st_ctime).isoformat()
                })

        # Sort by upload date (newest first)
        images.sort(key=lambda x: x["uploadedAt"], reverse=True)

        return images

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list images: {str(e)}")


@router.delete("/custom-images/{image_id}")
async def delete_custom_image(image_id: str):
    """Delete a custom image."""

    file_path = os.path.join(custom_images_path, image_id)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        os.remove(file_path)
        return {"message": "Image deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")


@router.post("/custom-images/{image_id}/reveal")
async def reveal_in_finder(image_id: str):
    """Reveal an image in Finder (macOS)."""

    file_path = os.path.join(custom_images_path, image_id)
    abs_path = os.path.abspath(file_path)

    if not os.path.exists(abs_path):
        raise HTTPException(status_code=404, detail="Image not found")

    try:
        subprocess.run(["open", "-R", abs_path], check=True)
        return {"message": "File revealed in Finder"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to reveal file: {str(e)}")
