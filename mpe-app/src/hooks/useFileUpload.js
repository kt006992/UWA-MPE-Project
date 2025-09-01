import { useState } from 'react';

export default function useFileUpload(selectedTopButton) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const reset = () => { setSelectedFile(null); setIsFileUploaded(false); };

  const handleFileChange = (files) => {
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setIsFileUploaded(false);
      const el = document.getElementById('file-upload');
      if (el) el.value = '';
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) throw new Error('No file selected');
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('degree', selectedTopButton);
    setIsUploading(true);
    try {
      const resp = await fetch('http://127.0.0.1:5000/upload', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error(await resp.text());
      setIsFileUploaded(true);
      return true;
    } finally {
      setIsUploading(false);
    }
  };

  return { selectedFile, isFileUploaded, isUploading, handleFileChange, uploadFile, reset, setSelectedFile, setIsFileUploaded };
}
