import React, { useEffect, useState, useRef } from 'react';
import './OutputPanel.css';
import { ReactComponent as DownloadIcon } from '../assets/icons/ic_download.svg';
import { ReactComponent as CopyIcon } from '../assets/icons/ic_copy.svg';
import { ReactComponent as ScreenshotIcon } from '../assets/icons/ic_screenshot.svg';
import { ReactComponent as AddImageIcon } from '../assets/icons/ic_addtogallery.svg';
import { ReactComponent as ListIcon } from '../assets/icons/ic_list.svg';
import { ReactComponent as EmbedIcon } from '../assets/icons/ic_embed.svg';
import { ReactComponent as PrevUpIcon } from '../assets/icons/ic_prev_up.svg';
import { ReactComponent as NextDownIcon } from '../assets/icons/ic_next_down.svg';
import { ReactComponent as MoreIcon } from '../assets/icons/ic_more_vert.svg';
import ConfirmationModal from './ConfirmationModal';
import VideoRowMenu from './VideoRowMenu';
import { deleteJob, checkJobStatus } from '../services/api';

function OutputPanel({
  jobs,
  currentVideo,
  onVideoSelect,
  viewMode,
  theme,
  onToggleView,
  onJobDeleted,
  onImageAdded
}) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'failed'
  const [currentEmbedIndex, setCurrentEmbedIndex] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [openMenuJobId, setOpenMenuJobId] = useState(null);
  const menuButtonRefs = useRef({});
  const videoRef = useRef(null);

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `screenshot-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Error capturing frame:', error);
      alert('Unable to capture frame. This may be a cross-origin issue.');
    }
  };

  const captureFrameToGallery = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        try {
          const formData = new FormData();
          formData.append('file', blob, `frame-${Date.now()}.png`);

          const response = await fetch('http://localhost:8000/api/custom-images/upload', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            const newImage = await response.json();
            if (onImageAdded) {
              onImageAdded(newImage);
            }
          } else {
            console.error('Failed to upload frame to gallery');
            alert('Failed to add frame to gallery');
          }
        } catch (error) {
          console.error('Error uploading frame:', error);
          alert('Failed to add frame to gallery: ' + error.message);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error capturing frame:', error);
      alert('Unable to capture frame. This may be a cross-origin issue.');
    }
  };

  // Auto-select first completed video
  useEffect(() => {
    if (!selectedJob && jobs.length > 0) {
      const firstCompleted = jobs.find(job => job.status === 'completed');
      if (firstCompleted) {
        setSelectedJob(firstCompleted);
        onVideoSelect(firstCompleted);
      }
    }
  }, [jobs, selectedJob, onVideoSelect]);

  // Filter jobs based on selected status
  const filteredJobs = jobs.filter(job => {
    if (statusFilter === 'completed' && job.status !== 'completed') return false;
    if (statusFilter === 'failed' && job.status !== 'failed') return false;
    return true;
  });

  // Get completed jobs for embed mode
  const completedJobs = jobs.filter(job => job.status === 'completed');

  const handleVideoClick = (job) => {
    setSelectedJob(job);
    onVideoSelect(job);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Pending', className: 'status-pending' },
      uploading: { label: 'Uploading', className: 'status-uploading' },
      generating: { label: 'Generating', className: 'status-generating' },
      downloading: { label: 'Downloading', className: 'status-downloading' },
      completed: { label: 'Completed', className: 'status-completed' },
      failed: { label: 'Failed', className: 'status-failed' },
    };

    const statusInfo = statusMap[status] || statusMap.pending;

    return (
      <span className={`status-badge ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const downloadVideo = (job) => {
    if (job.videoUrl) {
      // Extract job_id and filename from videoUrl (e.g., /videos/{job-id}/video.mp4)
      const urlParts = job.videoUrl.split('/');
      const jobId = urlParts[urlParts.length - 2]; // Get job-id
      const filename = urlParts[urlParts.length - 1]; // Get filename

      // Use the download endpoint
      const link = document.createElement('a');
      link.href = `http://localhost:8000/api/download/${jobId}/${filename}`;
      link.download = `video-${job.id}.mp4`;

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt);
    alert('Prompt copied to clipboard!');
  };

  const handleNextEmbed = () => {
    if (currentEmbedIndex < completedJobs.length - 1) {
      const nextIndex = currentEmbedIndex + 1;
      setCurrentEmbedIndex(nextIndex);
      setSelectedJob(completedJobs[nextIndex]);
      onVideoSelect(completedJobs[nextIndex]);
    }
  };

  const handlePrevEmbed = () => {
    if (currentEmbedIndex > 0) {
      const prevIndex = currentEmbedIndex - 1;
      setCurrentEmbedIndex(prevIndex);
      setSelectedJob(completedJobs[prevIndex]);
      onVideoSelect(completedJobs[prevIndex]);
    }
  };

  const handleMoreClick = (e, job) => {
    e.stopPropagation(); // Prevent video selection when clicking more
    setOpenMenuJobId(job.id);
  };

  const handleCloseMenu = () => {
    setOpenMenuJobId(null);
  };

  const handleDownloadClick = (job) => {
    downloadVideo(job);
    setOpenMenuJobId(null); // Close menu
  };

  const handleCopyPromptClick = (job) => {
    copyPrompt(job.prompt);
    setOpenMenuJobId(null); // Close menu
  };

  const handleDeleteClick = (job) => {
    setJobToDelete(job);
    setShowDeleteConfirmation(true);
    setOpenMenuJobId(null); // Close menu
  };

  const handleCheckStatusClick = async (job) => {
    setOpenMenuJobId(null); // Close menu
    try {
      const result = await checkJobStatus(job.id);
      if (result.status === 'completed') {
        // Notify parent to refresh jobs list
        if (onJobDeleted) {
          onJobDeleted(null); // Trigger refresh without deletion
        }
      } else if (result.status === 'failed') {
        alert('Job failed: ' + result.message);
      } else {
        alert(result.message || 'Job is still processing');
      }
    } catch (error) {
      console.error('Failed to check job status:', error);
      alert('Failed to check status: ' + error.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (jobToDelete) {
      try {
        await deleteJob(jobToDelete.id);

        // Clear selected job if it's the one being deleted
        if (selectedJob?.id === jobToDelete.id) {
          setSelectedJob(null);
        }

        // Notify parent component to refresh jobs list
        if (onJobDeleted) {
          onJobDeleted(jobToDelete.id);
        }

        setShowDeleteConfirmation(false);
        setJobToDelete(null);
      } catch (error) {
        console.error('Failed to delete job:', error);
        alert('Failed to delete video: ' + error.message);
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
    setJobToDelete(null);
  };

  return (
    <div className="output-panel-new">
      {/* View toggle button - absolute positioned top right */}
      <button
        className="view-toggle-btn"
        onClick={onToggleView}
        title={viewMode === 'list' ? 'Big embed view' : 'List view'}
      >
        {viewMode === 'list' ? <EmbedIcon /> : <ListIcon />}
      </button>

      {/* Main content area */}
      <div className={`output-content ${viewMode === 'list' ? 'list-mode' : ''}`}>
        {viewMode === 'embed' ? (
          /* Big Embed Mode */
          <div className="embed-view">
            {selectedJob && selectedJob.status === 'completed' ? (
              <>
                {/* Previous button at top */}
                {completedJobs.length > 1 && currentEmbedIndex > 0 && (
                  <button
                    className="nav-btn-top"
                    onClick={handlePrevEmbed}
                    title="Previous video"
                  >
                    <PrevUpIcon />
                  </button>
                )}

                <div className="embed-video-container">
                  <video
                    ref={videoRef}
                    key={selectedJob.id}
                    controls
                    loop
                    crossOrigin="anonymous"
                    className="embed-video-player"
                  >
                    <source src={`http://localhost:8000${selectedJob.videoUrl}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                <div className="embed-info">
                  <div className="embed-actions">
                    <button className="embed-btn" onClick={() => downloadVideo(selectedJob)} title="Download video file">
                      <DownloadIcon />
                    </button>
                    <button className="embed-btn" onClick={() => copyPrompt(selectedJob.prompt)} title="Copy prompt">
                      <CopyIcon />
                    </button>
                    <button className="embed-btn" onClick={captureFrame} title="Download current frame as file">
                      <ScreenshotIcon />
                    </button>
                    <button className="embed-btn" onClick={captureFrameToGallery} title="Save current frame to gallery">
                      <AddImageIcon />
                    </button>
                  </div>

                  <div className="embed-meta">
                    <span className="embed-date">
                      {new Date(selectedJob.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Next button at bottom */}
                {completedJobs.length > 1 && currentEmbedIndex < completedJobs.length - 1 && (
                  <button
                    className="nav-btn-bottom"
                    onClick={handleNextEmbed}
                    title="Next video"
                  >
                    <NextDownIcon />
                  </button>
                )}
              </>
            ) : (
              <div className="embed-placeholder">
                <div className="placeholder-icon">▶</div>
                <p>No completed videos yet. Start generating!</p>
              </div>
            )}
          </div>
        ) : (
          /* List Mode - Big embed at top, then scrollable list below */
          <div className="list-view">
            {/* Big embed at top */}
            {selectedJob && selectedJob.status === 'completed' ? (
              <div className="list-embed-section">
                <div className="embed-video-container">
                  <video
                    ref={videoRef}
                    key={selectedJob.id}
                    controls
                    loop
                    crossOrigin="anonymous"
                    className="embed-video-player"
                  >
                    <source src={`http://localhost:8000${selectedJob.videoUrl}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>

                <div className="embed-info">
                  <div className="embed-actions">
                    <button className="embed-btn" onClick={() => downloadVideo(selectedJob)} title="Download video file">
                      <DownloadIcon />
                    </button>
                    <button className="embed-btn" onClick={() => copyPrompt(selectedJob.prompt)} title="Copy prompt">
                      <CopyIcon />
                    </button>
                    <button className="embed-btn" onClick={captureFrame} title="Download current frame as file">
                      <ScreenshotIcon />
                    </button>
                    <button className="embed-btn" onClick={captureFrameToGallery} title="Save current frame to gallery">
                      <AddImageIcon />
                    </button>
                  </div>

                  <div className="embed-meta">
                    <span className="embed-date">
                      {new Date(selectedJob.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="embed-placeholder">
                <div className="placeholder-icon">▶</div>
                <p>No completed videos yet. Start generating!</p>
              </div>
            )}

            {/* Filter chips */}
            <div className="list-header">
              <div className="filter-chips">
                <button
                  className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </button>
                <button
                  className={`filter-chip ${statusFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('completed')}
                >
                  Success
                </button>
                <button
                  className={`filter-chip ${statusFilter === 'failed' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('failed')}
                >
                  Failed
                </button>
              </div>
            </div>

            {/* Video list */}
            <div className="video-list">
              {filteredJobs.length === 0 ? (
                <div className="empty-list">
                  <p>No videos match the filter</p>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`video-list-item ${selectedJob?.id === job.id ? 'selected' : ''}`}
                    onClick={() => job.status === 'completed' && handleVideoClick(job)}
                  >
                    <div className="list-item-thumbnail">
                      {job.status === 'completed' && job.thumbnailUrl ? (
                        <img src={`http://localhost:8000${job.thumbnailUrl}`} alt="Thumbnail" />
                      ) : (
                        <div className="thumbnail-placeholder">
                          {getStatusBadge(job.status)}
                        </div>
                      )}
                    </div>

                    <div className="list-item-info">
                      <div className="list-item-prompt">{job.prompt.substring(0, 80)}...</div>
                      <div className="list-item-meta">
                        {getStatusBadge(job.status)}
                        {job.cost && (
                          <span className="list-item-cost">${job.cost.toFixed(2)}</span>
                        )}
                        <span className="list-item-date">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <button
                      ref={(el) => (menuButtonRefs.current[job.id] = el)}
                      className="list-item-more-btn"
                      onClick={(e) => handleMoreClick(e, job)}
                      title="More options"
                    >
                      <MoreIcon />
                    </button>

                    {openMenuJobId === job.id && (
                      <VideoRowMenu
                        onDownload={() => handleDownloadClick(job)}
                        onCopyPrompt={() => handleCopyPromptClick(job)}
                        onDelete={() => handleDeleteClick(job)}
                        onCheckStatus={() => handleCheckStatusClick(job)}
                        showCheckStatus={job.status === 'generating'}
                        onClose={handleCloseMenu}
                        triggerRef={{ current: menuButtonRefs.current[job.id] }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirmation && (
        <ConfirmationModal
          title="Delete Video"
          message={`Are you sure you want to delete this video? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
}

export default OutputPanel;
