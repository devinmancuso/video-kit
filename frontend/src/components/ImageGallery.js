import React, { useState, useEffect, useRef } from 'react';
import './ImageGallery.css';
import ImageMenu from './ImageMenu';
import { ReactComponent as MoreVertIcon } from '../assets/icons/ic_more_vert.svg';
import { ReactComponent as KeyIcon } from '../assets/icons/ic_key.svg';
import { ReactComponent as LightIcon } from '../assets/icons/ic_light.svg';
import { ReactComponent as NightIcon } from '../assets/icons/ic_night.svg';

function ImageGallery({ selectedImage, onImageSelect, theme, onToggleTheme, onOpenApiKey }) {
  const [customImages, setCustomImages] = useState([]);
  const [menuOpen, setMenuOpen] = useState(null);
  const fileInputRef = useRef(null);
  const menuButtonRefs = useRef({});

  // Load custom images on mount
  useEffect(() => {
    loadCustomImages();
  }, []);

  const loadCustomImages = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/custom-images');
      if (response.ok) {
        const images = await response.json();
        setCustomImages(images);

        // Auto-select first image if none selected
        if (!selectedImage && images.length > 0) {
          onImageSelect(images[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load custom images:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/custom-images/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newImage = await response.json();
        setCustomImages(prev => [newImage, ...prev]);
        onImageSelect(newImage);
      } else {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        alert('Failed to upload image: ' + response.status);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image: ' + error.message);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleImageClick = (image) => {
    onImageSelect(image);
  };

  const handleMenuClick = (e, imageId) => {
    e.stopPropagation();
    setMenuOpen(menuOpen === imageId ? null : imageId);
  };

  const handleDelete = async (image) => {
    try {
      const response = await fetch(`http://localhost:8000/api/custom-images/${image.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCustomImages(prev => prev.filter(img => img.id !== image.id));
        if (selectedImage?.id === image.id) {
          const remaining = customImages.filter(img => img.id !== image.id);
          onImageSelect(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
    setMenuOpen(null);
  };

  return (
    <div className="image-gallery">
      <div className="gallery-scroll-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        {/* Upload button at top */}
        <button
          className="gallery-upload-btn"
          onClick={handleUploadClick}
          title="Upload image"
        >
          +
        </button>

        {/* Vertical scrolling list of thumbnails */}
        <div className="gallery-thumbnails">
          {customImages.map((image) => (
            <div
              key={image.id}
              className={`gallery-thumbnail ${selectedImage?.id === image.id ? 'selected' : ''}`}
              onClick={() => handleImageClick(image)}
            >
              <img
                src={`http://localhost:8000${image.url}`}
                alt={`Custom ${image.id}`}
              />
              <button
                ref={el => menuButtonRefs.current[image.id] = el}
                className="gallery-menu-btn"
                onClick={(e) => handleMenuClick(e, image.id)}
              >
                <MoreVertIcon />
              </button>
              {menuOpen === image.id && (
                <ImageMenu
                  onDelete={() => handleDelete(image)}
                  onClose={() => setMenuOpen(null)}
                  triggerRef={{ current: menuButtonRefs.current[image.id] }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom controls with gradient */}
      <div className="gallery-bottom-controls">
        <button
          className="control-btn"
          onClick={onOpenApiKey}
          title="API Key"
        >
          <KeyIcon />
        </button>
        <button
          className="control-btn"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? <NightIcon /> : <LightIcon />}
        </button>
      </div>
    </div>
  );
}

export default ImageGallery;
