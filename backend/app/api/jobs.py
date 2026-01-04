from fastapi import APIRouter, HTTPException
from typing import List

from app.services.job_manager import JobManager
from app.models.job import JobResponse

router = APIRouter()
job_manager = JobManager()


@router.get("/jobs", response_model=List[JobResponse])
async def list_jobs():
    """Get all jobs with their current status."""
    try:
        jobs = await job_manager.get_all_jobs()
        return jobs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """Get status of a specific job."""
    try:
        job = await job_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Update status from Kie.ai if still processing
        if job.status in ["pending", "uploading", "generating"]:
            await job_manager.update_job_status(job_id)
            job = await job_manager.get_job(job_id)

        return job
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its associated video."""
    try:
        success = await job_manager.delete_job(job_id)
        if not success:
            raise HTTPException(status_code=404, detail="Job not found")

        return {"message": "Job deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/check-status")
async def check_and_recover_job(job_id: str):
    """
    Manually check status of a generating job and recover if complete.
    Useful when the server restarts during generation and loses the polling task.
    """
    try:
        job = await job_manager.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.status not in ["pending", "uploading", "generating"]:
            return {"message": "Job is not in a recoverable state", "status": job.status}

        if not job.kieTaskId:
            raise HTTPException(status_code=400, detail="Job has no task ID to check")

        # Check and recover the job
        result = await job_manager.check_and_recover_job(job_id)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
