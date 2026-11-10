import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

const ImageUploader = ({ 
  onImageSelected, 
  selectedFile = null,
  label = 'Upload Dermoscopic Image', 
  description = 'PNG, JPG, JPEG or WEBP up to 15MB' 
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileDetails, setFileDetails] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (selectedFile) {
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      setFileDetails({
        name: selectedFile.name,
        size: (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB'
      });
      return () => URL.revokeObjectURL(objectUrl);
    } else if (preview && !selectedFile) {
      setPreview(null);
      setFileDetails(null);
    }
  }, [selectedFile]);

  const handleFile = (file) => {
    setError(null);
    if (!file) return;

    // Check type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid dermoscopic image file (JPEG, PNG, WEBP).');
      return;
    }

    // Check size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setError('Image file exceeds the 15MB limit.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setFileDetails({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    });
    onImageSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileDetails(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    onImageSelected(null);
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/bmp"
        className="hidden"
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
            flex flex-col items-center justify-center
            ${dragOver 
              ? 'border-brand-500 bg-brand-50/50 scale-[0.99]' 
              : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50/70 bg-white'}
          `}
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-3">
            <UploadCloud className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 mb-1">{label}</h4>
          <p className="text-xs text-slate-500 mb-3">{description}</p>
          <span className="inline-flex items-center text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-200 transition-colors">
            Browse File
          </span>
        </div>
      ) : (
        <div className="relative border border-slate-200 bg-white rounded-2xl p-4 shadow-sm">
          <div className="relative aspect-video max-h-64 w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center group">
            <img 
              src={preview} 
              alt="Dermoscopy Preview" 
              className="max-h-full max-w-full object-contain" 
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/70 text-white hover:bg-rose-600 transition-colors shadow-md"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-2 truncate">
              <ImageIcon className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span className="font-medium truncate max-w-xs">{fileDetails?.name}</span>
            </div>
            <span className="text-slate-400 font-medium">{fileDetails?.size}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2.5 flex items-center space-x-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

