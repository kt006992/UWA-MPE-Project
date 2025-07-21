"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf'; 
import './mpe.css'; // Import separated CSS styles

const Page = () => {
  // Define Hooks and state variables
  const [selectedTopButton, setSelectedTopButton] = useState("6-degree");
  const [selectedButton, setSelectedButton] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false); // New: Track whether file has been uploaded successfully
  const [isDragging, setIsDragging] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // New: Track upload status
  const imageContainerRef = useRef(null);
  const buttonContainerRef = useRef(null);

  // Define file upload function
  const handleFileChange = (files) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      console.log("Selected file:", file.name);

      // Reset upload status
      setIsFileUploaded(false);
      // Clear generated images array
      setGeneratedImages([]);
      // Reset other related states
      setIsLoading(false);
      setIsExporting(false);
    }

    // Clear input element to ensure onChange triggers when selecting the same file again
    const fileInput = document.getElementById('file-upload');
    fileInput.value = '';
  };

  const onDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer.files;
    handleFileChange(files);
  };

  // Send file to backend for upload
  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('degree', selectedTopButton);

    setIsUploading(true); // Start uploading

    try {
      const response = await fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload file');
      
      // Enable function buttons after successful upload
      setIsFileUploaded(true);
      toast.success("File uploaded successfully!");
      console.log("File uploaded successfully");
    } catch (error) {
      toast.error("Error uploading file");
      console.error("Error uploading file:", error);
      setIsFileUploaded(false); // Ensure buttons remain disabled on upload failure
    } finally {
      setIsUploading(false); // End uploading
    }
  };

  // Define image generation function
  const generateImage = async (endpoint) => {
    setIsLoading(true);
    setGeneratedImages([]); // Clear previously generated images

    try {
      const response = await fetch(`http://127.0.0.1:5000/${endpoint}`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to generate image');
      
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setGeneratedImages(prevImages => [...prevImages, imageUrl]); 
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  useEffect(() => {
    if (generatedImages.length > 0) {
      buttonContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [generatedImages]);

  // Define button click events
  const handleTopButtonClick = (label) => {
    setSelectedTopButton(label);
    setSelectedButton(null);
    setSelectedFile(null);
    setIsFileUploaded(false); // Reset upload status
    setGeneratedImages([]);
  };

  const handleFunctionalButtonClick = (label, endpoint) => {
    // Check if file has been uploaded
    if (!isFileUploaded) {
      toast.error('Please upload a file first.');
      return;
    }
    
    setSelectedButton(label);
    generateImage(endpoint);
  };

  // Define function to export images as PDF
  const exportImagesToPDF = () => {
    if (!selectedButton || generatedImages.length === 0) {
      toast.error('No images available for export.');
      return; 
    }

    setIsExporting(true);
    toast.info('Exporting PDF, please wait...', {
      position: "top-center",
      autoClose: false, 
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });

    const doc = new jsPDF(); // Create PDF document
  
    generatedImages.forEach((image, index) => {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        const imgWidth = img.width;
        const imgHeight = img.height;
        const pageWidth = doc.internal.pageSize.getWidth(); // Get PDF page width
        const pageHeight = doc.internal.pageSize.getHeight(); // Get PDF page height
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight); // Calculate ratio to fit page
  
        const newWidth = imgWidth * ratio;
        const newHeight = imgHeight * ratio;
  
        if (index > 0) doc.addPage(); // Add new page
        doc.addImage(image, 'JPEG', (pageWidth - newWidth) / 2, (pageHeight - newHeight) / 2, newWidth, newHeight); // Add image maintaining aspect ratio
        if (index === generatedImages.length - 1) {
          const fileName = `${selectedButton.replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`; // Replace special characters
          doc.save(fileName);
          setIsExporting(false);
          toast.dismiss(); 
          toast.success('PDF has been exported successfully!');
        }
      };
    });
  };

  // Define button content
  const topButtonLabels = [
    { label: "6-degree" },
    { label: "12-degree" },
    { label: "10^2" },
    { label: "Export as PDF", onClick: exportImagesToPDF }
  ];

  const bottomButtonLabels = [
    { label: "Individual time-point plots", endpoint: "generate_scatter_plots" },
    { label: "Pointwise Regression Plot", endpoint: "generate_regression_plot" },
    { label: "Longitudinal point-wise changes against baseline", endpoint: "generate_change_monitor_plots" },
    { label: "Longitudinal change in number of loci", endpoint: "generate_time_point_bar" },
    { label: "Longitudinal change of loci counts against baseline", endpoint: "generate_change_monitor_bar" }
  ];

  // Main structure design of the webpage
  return (
    <div className="page-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          {/* Left side buttons */}
          <div className="top-buttons">
            {topButtonLabels.slice(0, -1).map(({ label }) => (
              <button
                key={label}
                className={`top-button ${selectedTopButton === label ? 'selected' : ''}`}
                onClick={() => handleTopButtonClick(label)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right side export button */}
          <div className="export-button-container">
            <button
              className="export-button"
              onClick={exportImagesToPDF}
              disabled={generatedImages.length === 0} 
            >
              Export as PDF
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="main-content">
        <div className="content-container">
          <div className="content-panel">
            <div
              className={`file-drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="file-input"
                onChange={(e) => handleFileChange(e.target.files)}
                multiple
              />
              <label
                htmlFor="file-upload"
                className="file-label"
              >
                <span className="file-icon">+</span>
                <span className="file-text">Drop or import file here</span>
              </label>

              {selectedFile && (
                <div className="selected-file">
                  Selected file: {selectedFile.name}
                  {isFileUploaded && <span className="upload-status"> ✓ Uploaded</span>}
                </div>
              )}

              <div className="upload-button-container">
                <button
                  className="upload-button"
                  onClick={uploadFile}
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </div>

            <div ref={buttonContainerRef} className="function-buttons">
              {bottomButtonLabels.map(({ label, endpoint }) => (
                <button
                  key={label}
                  className={`function-button ${selectedButton === label ? 'selected' : ''} ${!isFileUploaded ? 'disabled' : ''}`}
                  onClick={() => handleFunctionalButtonClick(label, endpoint)}
                  disabled={!selectedTopButton || !isFileUploaded}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Image generation area */}
            <div ref={imageContainerRef} className="image-container">
              {isLoading && (
                <div className="loading-container">
                  <div className="loader"></div>
                  <p className="loading-text">Image generating......</p> 
                </div>
              )}
              {generatedImages.map((image, index) => (
                <img 
                  key={index}
                  src={image} 
                  alt={`Generated Plot ${index + 1}`} 
                  className={`generated-image ${
                    selectedButton && ['Pointwise Regression Plot', 'Longitudinal change in number of loci', 'Longitudinal change of loci counts against baseline'].includes(selectedButton) 
                      ? 'half-width' 
                      : 'full-width'
                  } ${isLoading ? 'hidden' : 'visible'}`}
                  onLoad={() => {
                    setIsLoading(false);
                    buttonContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
      <ToastContainer 
        position="top-center" 
        autoClose={1500} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
      />
    </div>
  );
};

export default Page;