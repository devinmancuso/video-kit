import React, { useState, useRef } from 'react';
import './InputPanel.css';
import SettingsPopup from './SettingsPopup';
import { ReactComponent as SettingsIcon } from '../assets/icons/ic_settings.svg';
import { ReactComponent as HistoryIcon } from '../assets/icons/ic_history.svg';
import { ReactComponent as CloseIcon } from '../assets/icons/ic_close.svg';

function InputPanel({ jobs, selectedImage, onGenerate, isGenerating }) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('landscape'); // 'portrait' or 'landscape'
  const [duration, setDuration] = useState(10); // 10 or 15
  const [noMusic, setNoMusic] = useState(false);
  const [noCrowd, setNoCrowd] = useState(false);
  const [noCommentators, setNoCommentators] = useState(false);
  const [likeAnime, setLikeAnime] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [historyViewActive, setHistoryViewActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState({});
  const settingsBtnRef = useRef(null);

  const toggleCardExpansion = (jobId) => {
    setExpandedCards(prev => ({
      ...prev,
      [jobId]: !prev[jobId]
    }));
  };

  const handlePromptCardClick = (job) => {
    setPrompt(job.prompt);
    setHistoryViewActive(false);
  };

  const toggleHistoryView = () => {
    if (historyViewActive) {
      // Reset expanded cards and search when closing
      setExpandedCards({});
      setSearchQuery('');
    }
    setHistoryViewActive(!historyViewActive);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    if (!selectedImage) {
      alert('Please select or upload an image');
      return;
    }

    // Build the final prompt with modifiers
    let finalPrompt = prompt.trim();

    if (noMusic) {
      finalPrompt += ' No music.';
    }

    if (noCrowd) {
      finalPrompt += ' No crowd.';
    }

    if (noCommentators) {
      finalPrompt += ' No commentators.';
    }

    if (likeAnime) {
      finalPrompt += ' Filmed like anime.';
    }

    onGenerate({
      model: 'sora2',
      customImageId: selectedImage.id,
      prompt: finalPrompt,
      music: noMusic,
      crowd: noCrowd,
      commentators: noCommentators,
      likeAnime: likeAnime,
      duration,
      aspectRatio: aspectRatio === 'portrait' ? '9:16' : '16:9',
    });
  };

  // Get jobs for history, filtered by search query
  const promptHistory = jobs
    .filter(job => {
      if (searchQuery.trim()) {
        return job.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    })
    .slice(0, 20); // Show last 20

  return (
    <div className="input-panel-new">
      {historyViewActive ? (
        /* History View */
        <div className="history-view">
          <div className="history-header">
            <input
              type="text"
              className="history-search-input"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="history-close-btn"
              onClick={toggleHistoryView}
              title="Close history"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="prompt-history">
            {promptHistory.map((job) => {
              const isExpanded = expandedCards[job.id];
              const isLong = job.prompt.length > 200;
              const truncatedText = isLong && !isExpanded
                ? job.prompt.substring(0, 200)
                : job.prompt;

              return (
                <div
                  key={job.id}
                  className="prompt-card"
                  onClick={() => handlePromptCardClick(job)}
                >
                  <div className="prompt-card-text">
                    {truncatedText}
                    {isLong && !isExpanded && (
                      <button
                        className="prompt-card-more"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardExpansion(job.id);
                        }}
                      >
                        more...
                      </button>
                    )}
                    {isLong && isExpanded && (
                      <button
                        className="prompt-card-more"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCardExpansion(job.id);
                        }}
                      >
                        less
                      </button>
                    )}
                  </div>
                  <div className="prompt-card-meta">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Normal Form View */
        <form onSubmit={handleSubmit} className="input-form">
          {/* History icon button - top right */}
          {promptHistory.length > 0 && (
            <button
              type="button"
              className="history-icon-btn"
              onClick={toggleHistoryView}
              title="View history"
            >
              <HistoryIcon />
            </button>
          )}

          {/* Large prompt textarea - flexes to fill space */}
          <div className="prompt-section-new">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="your next big idea..."
              disabled={isGenerating}
            />
          </div>

          {/* Controls pinned to bottom */}
          <div className="input-controls">
            {/* Generate button and settings */}
            <div className="bottom-row">
              <button
                type="submit"
                className="generate-btn-new"
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>

              <div className="settings-btn-wrapper">
                <button
                  ref={settingsBtnRef}
                  type="button"
                  className="settings-btn"
                  onClick={() => setShowSettingsPopup(!showSettingsPopup)}
                  disabled={isGenerating}
                  title="Settings"
                >
                  <SettingsIcon />
                </button>

                {showSettingsPopup && (
                  <SettingsPopup
                    aspectRatio={aspectRatio}
                    duration={duration}
                    noMusic={noMusic}
                    noCrowd={noCrowd}
                    noCommentators={noCommentators}
                    likeAnime={likeAnime}
                    onAspectRatioChange={setAspectRatio}
                    onDurationChange={setDuration}
                    onToggleMusic={() => setNoMusic(!noMusic)}
                    onToggleCrowd={() => setNoCrowd(!noCrowd)}
                    onToggleCommentators={() => setNoCommentators(!noCommentators)}
                    onToggleLikeAnime={() => setLikeAnime(!likeAnime)}
                    onClose={() => setShowSettingsPopup(false)}
                    triggerRef={settingsBtnRef}
                  />
                )}
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default InputPanel;
