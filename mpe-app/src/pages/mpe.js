"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import jsPDF from 'jspdf'; 
import './mpe.css'; // 导入分离的CSS样式

const Page = () => {
  // 定义 Hooks 和状态变量
  const [selectedTopButton, setSelectedTopButton] = useState("6-degree");
  const [selectedButton, setSelectedButton] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const imageContainerRef = useRef(null);
  const buttonContainerRef = useRef(null);

  // 定义上传文件的函数
  const handleFileChange = (files) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      console.log("Selected file:", file.name);

      // 清空生成的图片数组
      setGeneratedImages([]);

      // 重置其他相关状态
      setIsLoading(false);
      setIsExporting(false);
    }

    // 清空输入元素以确保重新选择相同文件时触发onChange
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

  // 发送文件到后端上传
  const uploadFile = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('degree', selectedTopButton);

    try {
      const response = await fetch('http://127.0.0.1:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload file');
      
      toast.success("File uploaded successfully!");
      console.log("File uploaded successfully");
    } catch (error) {
      toast.error("Error uploading file");
      console.error("Error uploading file:", error);
    }
  };

  // 定义生成图片的函数
  const generateImage = async (endpoint) => {
    setIsLoading(true);
    setGeneratedImages([]); // 清空之前生成的图片

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

  // 定义按钮触发事件
  const handleTopButtonClick = (label) => {
    setSelectedTopButton(label);
    setSelectedButton(null);
    setSelectedFile(null);
    setGeneratedImages([]);
  };

  const handleFunctionalButtonClick = (label, endpoint) => {
    // 检查是否已上传文件
    if (!selectedFile) {
      toast.error('Please select and upload a file first.');
      return;
    }
    
    setSelectedButton(label);
    generateImage(endpoint);
  };

  // 定义导出图片为PDF文件的函数
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

    const doc = new jsPDF(); // 创建PDF文档
  
    generatedImages.forEach((image, index) => {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        const imgWidth = img.width;
        const imgHeight = img.height;
        const pageWidth = doc.internal.pageSize.getWidth(); // 获取PDF页面宽度
        const pageHeight = doc.internal.pageSize.getHeight(); // 获取PDF页面高度
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight); // 计算适合页面的比例
  
        const newWidth = imgWidth * ratio;
        const newHeight = imgHeight * ratio;
  
        if (index > 0) doc.addPage(); // 添加新页面
        doc.addImage(image, 'JPEG', (pageWidth - newWidth) / 2, (pageHeight - newHeight) / 2, newWidth, newHeight); // 添加图片保持比例
        if (index === generatedImages.length - 1) {
          const fileName = `${selectedButton.replace(/[^a-zA-Z0-9 ]/g, '')}.pdf`; // 替换特殊字符
          doc.save(fileName);
          setIsExporting(false);
          toast.dismiss(); 
          toast.success('PDF has been exported successfully!');
        }
      };
    });
  };

  // 定义按钮的内容
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

  // 网页的主要结构设计
  return (
    <div className="page-container">
      {/* 头部 */}
      <header className="header">
        <div className="header-content">
          {/* 左侧按钮 */}
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

          {/* 右侧导出按钮 */}
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
      
      {/* 主体内容 */}
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
                </div>
              )}

              <div className="upload-button-container">
                <button
                  className="upload-button"
                  onClick={uploadFile}
                >
                  Upload File
                </button>
              </div>
            </div>

            <div ref={buttonContainerRef} className="function-buttons">
              {bottomButtonLabels.map(({ label, endpoint }) => (
                <button
                  key={label}
                  className={`function-button ${selectedButton === label ? 'selected' : ''} ${!selectedFile ? 'disabled' : ''}`}
                  onClick={() => handleFunctionalButtonClick(label, endpoint)}
                  disabled={!selectedTopButton || !selectedFile}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* 图片生成区域 */}
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