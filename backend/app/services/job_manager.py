import json
import os
import asyncio
from datetime import datetime
from typing import Optional, Dict, List
from pathlib import Path
import cv2

from app.services.kie_client import KieClient
from app.models.job import JobResponse


class JobManager:
    """Manages video generation jobs and their state."""

    def __init__(self):
        # Use local path when running outside Docker
        self.base_path = os.getenv("DATA_PATH", "../data")
        self.jobs_file = f"{self.base_path}/jobs.json"
        self.kie_client = KieClient()
        self._ensure_jobs_file()

    def _ensure_jobs_file(self):
        """Ensure jobs.json file exists."""
        if not os.path.exists(self.jobs_file):
            os.makedirs(os.path.dirname(self.jobs_file), exist_ok=True)
            with open(self.jobs_file, 'w') as f:
                json.dump({}, f)

    async def _load_jobs(self) -> Dict:
        """Load all jobs from storage."""
        try:
            with open(self.jobs_file, 'r') as f:
                return json.load(f)
        except:
            return {}

    async def _save_jobs(self, jobs: Dict):
        """Save all jobs to storage."""
        with open(self.jobs_file, 'w') as f:
            json.dump(jobs, f, indent=2)

    def _calculate_cost(self, model: str, duration: int) -> float:
        """Calculate estimated cost for a generation based on model and duration."""
        if model == "sora2":
            # Kie.ai Sora 2 API: $0.15 per 10-second video
            base_cost_per_10_sec = 0.15
            return (duration / 10.0) * base_cost_per_10_sec
        else:
            # Runway or other models - rough estimate
            return duration * 0.05

    async def create_job(
        self,
        job_id: str,
        model: str,
        fighter1: Optional[str],
        fighter2: Optional[str],
        prompt: str,
        image_source: str,
        options: Dict,
        video_params: Dict
    ) -> JobResponse:
        """Create a new job."""
        now = datetime.utcnow().isoformat()

        # Calculate estimated cost
        duration = video_params.get("duration", 5)
        estimated_cost = self._calculate_cost(model, duration)

        job = JobResponse(
            id=job_id,
            model=model,
            fighter1=fighter1,
            fighter2=fighter2,
            prompt=prompt,
            imageSource=image_source,
            status="pending",
            options=options,
            videoParams=video_params,
            cost=estimated_cost,
            createdAt=now,
            updatedAt=now,
        )

        # Save to storage
        jobs = await self._load_jobs()
        jobs[job_id] = job.model_dump()
        await self._save_jobs(jobs)

        return job

    async def get_job(self, job_id: str) -> Optional[JobResponse]:
        """Get a job by ID."""
        jobs = await self._load_jobs()
        job_data = jobs.get(job_id)

        if not job_data:
            return None

        return JobResponse(**job_data)

    async def get_all_jobs(self) -> List[JobResponse]:
        """Get all jobs, sorted by most recent activity first."""
        jobs = await self._load_jobs()
        job_list = [JobResponse(**job_data) for job_data in jobs.values()]

        # Sort by updatedAt (most recent activity first), fallback to createdAt
        job_list.sort(key=lambda x: x.updatedAt or x.createdAt, reverse=True)
        return job_list

    async def update_job(self, job_id: str, updates: Dict):
        """Update a job's data."""
        jobs = await self._load_jobs()

        if job_id not in jobs:
            return False

        jobs[job_id].update(updates)
        jobs[job_id]["updatedAt"] = datetime.utcnow().isoformat()
        await self._save_jobs(jobs)
        return True

    async def delete_job(self, job_id: str) -> bool:
        """Delete a job and its video files."""
        jobs = await self._load_jobs()

        if job_id not in jobs:
            return False

        # Delete video files
        video_dir = f"{self.base_path}/videos/{job_id}"
        if os.path.exists(video_dir):
            import shutil
            shutil.rmtree(video_dir)

        # Remove from jobs
        del jobs[job_id]
        await self._save_jobs(jobs)
        return True

    def _extract_first_frame(self, video_path: str, output_path: str) -> bool:
        """Extract the first frame from a video and save as thumbnail."""
        try:
            # Open video file
            video = cv2.VideoCapture(video_path)

            # Read first frame
            success, frame = video.read()

            if success:
                # Save frame as JPEG
                cv2.imwrite(output_path, frame)
                video.release()
                return True

            video.release()
            return False

        except Exception as e:
            print(f"Error extracting first frame: {e}")
            return False

    async def start_generation(self, job_id: str, image_path: Optional[str] = None):
        """Start the video generation process (runs in background)."""
        # Run in background
        asyncio.create_task(self._generation_workflow(job_id, image_path))

    async def _generation_workflow(self, job_id: str, image_path: Optional[str] = None):
        """
        Complete workflow for generating a video:
        1. Upload image (if provided)
        2. Submit generation request
        3. Poll for completion
        4. Download video
        """
        try:
            image_url = None

            # Step 1: Upload image
            if image_path and os.path.exists(image_path):
                await self.update_job(job_id, {"status": "uploading"})
                image_url = await self.kie_client.upload_file(image_path)

            # Step 2: Submit generation request
            await self.update_job(job_id, {"status": "generating"})

            job = await self.get_job(job_id)
            task_id = await self.kie_client.generate_video(
                prompt=job.prompt,
                image_url=image_url,
                duration=job.videoParams.get("duration", 5),
                quality=job.videoParams.get("quality", "720p"),
                aspect_ratio=job.videoParams.get("aspectRatio", "16:9"),
                model=job.model
            )

            await self.update_job(job_id, {"kieTaskId": task_id})

            # Step 3: Poll for completion
            await self._poll_until_complete(job_id, task_id)

        except Exception as e:
            await self.update_job(job_id, {
                "status": "failed",
                "error": str(e)
            })

    async def _poll_until_complete(self, job_id: str, task_id: str):
        """Poll Kie.ai until the video is ready."""
        max_attempts = 20  # 10 minutes max (30s * 20)
        attempt = 0

        while attempt < max_attempts:
            try:
                job = await self.get_job(job_id)
                status_data = await self.kie_client.get_task_status(task_id, model=job.model)
                state = status_data.get("state")

                if state == "success":
                    # Download video
                    await self.update_job(job_id, {"status": "downloading"})

                    # Parse video URL based on model
                    job = await self.get_job(job_id)
                    if job.model == "sora2":
                        # Sora 2 response format
                        result_json_str = status_data.get("resultJson", "{}")
                        result_json = json.loads(result_json_str)
                        result_urls = result_json.get("resultUrls", [])
                        if not result_urls:
                            raise Exception("No video URL in Sora 2 response")
                        video_url = result_urls[0]
                        thumbnail_url = None  # Sora 2 doesn't provide thumbnails
                    else:
                        # Runway response format
                        video_url = status_data["videoInfo"]["videoUrl"]
                        thumbnail_url = status_data["videoInfo"]["imageUrl"]

                    # Save to local storage
                    video_dir = f"{self.base_path}/videos/{job_id}"
                    os.makedirs(video_dir, exist_ok=True)

                    video_path = f"{video_dir}/video.mp4"
                    await self.kie_client.download_video(video_url, video_path)

                    # Extract first frame as thumbnail
                    thumbnail_path = f"{video_dir}/thumbnail.jpg"
                    thumbnail_success = self._extract_first_frame(video_path, thumbnail_path)
                    local_thumbnail_url = f"/videos/{job_id}/thumbnail.jpg" if thumbnail_success else None

                    # Save metadata
                    metadata = {
                        "kieVideoUrl": video_url,
                        "kieThumbnailUrl": thumbnail_url,
                        "generateTime": status_data.get("generateTime"),
                    }
                    with open(f"{video_dir}/metadata.json", 'w') as f:
                        json.dump(metadata, f, indent=2)

                    # Update job as completed
                    await self.update_job(job_id, {
                        "status": "completed",
                        "videoUrl": f"/videos/{job_id}/video.mp4",
                        "thumbnailUrl": local_thumbnail_url,
                        "completedAt": datetime.utcnow().isoformat()
                    })
                    return

                elif state == "fail":
                    await self.update_job(job_id, {
                        "status": "failed",
                        "error": "Video generation failed on Kie.ai"
                    })
                    return

                # Still processing, wait and retry
                await asyncio.sleep(30)
                attempt += 1

            except Exception as e:
                await self.update_job(job_id, {
                    "status": "failed",
                    "error": f"Polling error: {str(e)}"
                })
                return

        # Timeout
        await self.update_job(job_id, {
            "status": "failed",
            "error": "Generation timeout (exceeded 10 minutes)"
        })

    async def update_job_status(self, job_id: str):
        """Manually update a job's status from Kie.ai."""
        job = await self.get_job(job_id)

        if not job or not job.kieTaskId:
            return

        if job.status in ["pending", "uploading", "generating"]:
            try:
                status_data = await self.kie_client.get_task_status(job.kieTaskId, model=job.model)
                # Status mapping would go here if needed
            except:
                pass

    async def check_and_recover_job(self, job_id: str) -> dict:
        """
        Check a stuck job's status on Kie.ai and recover if complete.
        Returns status information about the recovery attempt.
        """
        job = await self.get_job(job_id)
        if not job or not job.kieTaskId:
            return {"success": False, "message": "Job not found or has no task ID"}

        try:
            status_data = await self.kie_client.get_task_status(job.kieTaskId, model=job.model)
            state = status_data.get("state")

            if state == "success":
                # Download video and complete the job
                await self.update_job(job_id, {"status": "downloading"})

                # Parse video URL based on model
                if job.model == "sora2":
                    result_json_str = status_data.get("resultJson", "{}")
                    result_json = json.loads(result_json_str)
                    result_urls = result_json.get("resultUrls", [])
                    if not result_urls:
                        await self.update_job(job_id, {
                            "status": "failed",
                            "error": "No video URL in response"
                        })
                        return {"success": False, "message": "No video URL in response"}
                    video_url = result_urls[0]
                else:
                    video_url = status_data["videoInfo"]["videoUrl"]

                # Save to local storage
                video_dir = f"{self.base_path}/videos/{job_id}"
                os.makedirs(video_dir, exist_ok=True)

                video_path = f"{video_dir}/video.mp4"
                await self.kie_client.download_video(video_url, video_path)

                # Extract first frame as thumbnail
                thumbnail_path = f"{video_dir}/thumbnail.jpg"
                thumbnail_success = self._extract_first_frame(video_path, thumbnail_path)
                local_thumbnail_url = f"/videos/{job_id}/thumbnail.jpg" if thumbnail_success else None

                # Update job as completed
                await self.update_job(job_id, {
                    "status": "completed",
                    "videoUrl": f"/videos/{job_id}/video.mp4",
                    "thumbnailUrl": local_thumbnail_url,
                    "completedAt": datetime.utcnow().isoformat()
                })

                return {"success": True, "message": "Job recovered and completed", "status": "completed"}

            elif state == "fail":
                fail_msg = status_data.get("failMsg", "Unknown error")
                await self.update_job(job_id, {
                    "status": "failed",
                    "error": f"Generation failed: {fail_msg}"
                })
                return {"success": False, "message": f"Job failed: {fail_msg}", "status": "failed"}

            else:
                # Still processing
                return {
                    "success": True,
                    "message": f"Job is still processing (state: {state})",
                    "status": "generating"
                }

        except Exception as e:
            return {"success": False, "message": f"Error checking status: {str(e)}"}
