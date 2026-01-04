import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ImageGallery from './components/ImageGallery';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import ApiKeyModal from './components/ApiKeyModal';
import { generateVideo, getJobs } from './services/api';

function App() {
  const [jobs, setJobs] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const [viewMode, setViewMode] = useState('list'); // 'embed' or 'list'
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const galleryRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load jobs on mount and poll for updates
  useEffect(() => {
    loadJobs();
    // Poll for job updates every 10 seconds
    const interval = setInterval(loadJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const data = await getJobs();
      setJobs(data);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  const handleGenerate = async (formData) => {
    setIsGenerating(true);
    try {
      const job = await generateVideo(formData);
      setJobs(prevJobs => [job, ...prevJobs]);
      await loadJobs(); // Refresh jobs list
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate video: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVideoSelect = (job) => {
    setCurrentVideo(job);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'list' ? 'embed' : 'list');
  };

  const handleImageSelect = (image) => {
    setSelectedImage(image);
  };

  const handleJobDeleted = (jobId) => {
    // Remove job from the list or just refresh
    if (jobId) {
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
    }
    loadJobs(); // Refresh jobs list
  };

  const handleImageAdded = (newImage) => {
    // Notify the gallery to add the new image
    if (galleryRef.current) {
      galleryRef.current.addImage(newImage);
    }
  };

  return (
    <div className="app">
      <div className="main-container">
        <ImageGallery
          ref={galleryRef}
          selectedImage={selectedImage}
          onImageSelect={handleImageSelect}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenApiKey={() => setShowApiKeyModal(true)}
        />

        <InputPanel
          jobs={jobs}
          selectedImage={selectedImage}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />

        <OutputPanel
          jobs={jobs}
          currentVideo={currentVideo}
          onVideoSelect={handleVideoSelect}
          viewMode={viewMode}
          theme={theme}
          onToggleView={toggleViewMode}
          onJobDeleted={handleJobDeleted}
          onImageAdded={handleImageAdded}
        />
      </div>

      {showApiKeyModal && (
        <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />
      )}
    </div>
  );
}

export default App;
