import React, { useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import axios from 'axios';

const TaskerPortfolio = ({ portfolio = [], onUpdate, language = 'en' }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError(language === 'en' ? 'Please upload a valid image (JPG, PNG, WEBP)' : 'Veuillez télécharger une image valide (JPG, PNG, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(language === 'en' ? 'Image size must be less than 5MB' : 'La taille de l\'image doit être inférieure à 5 Mo');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/taskers/portfolio`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Call onUpdate to refresh parent data
      if (onUpdate) {
        await onUpdate();
      }
    } catch (err) {
      console.error('Error uploading portfolio image:', err);
      setError(
        language === 'en' 
          ? 'Failed to upload image. Please try again.' 
          : 'Échec du téléchargement de l\'image. Veuillez réessayer.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imagePath) => {
    if (!window.confirm(language === 'en' ? 'Delete this image?' : 'Supprimer cette image ?')) {
      return;
    }

    try {
      await axios.delete(
        `${process.env.REACT_APP_BACKEND_URL}/api/taskers/portfolio/${encodeURIComponent(imagePath)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (onUpdate) {
        await onUpdate();
      }
    } catch (err) {
      console.error('Error deleting portfolio image:', err);
      setError(
        language === 'en' 
          ? 'Failed to delete image. Please try again.' 
          : 'Échec de la suppression de l\'image. Veuillez réessayer.'
      );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <ImageIcon className="w-6 h-6 text-orange-600" />
            <span>{language === 'en' ? 'Portfolio Gallery' : 'Galerie de portfolio'}</span>
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {language === 'en' 
              ? 'Showcase your best work to attract more clients' 
              : 'Montrez vos meilleurs travaux pour attirer plus de clients'}
          </p>
        </div>
        
        {/* Upload Button */}
        <label className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold cursor-pointer transition ${
          uploading ? 'bg-gray-300 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'
        }`}>
          {uploading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>{language === 'en' ? 'Uploading...' : 'Téléchargement...'}</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>{language === 'en' ? 'Add Image' : 'Ajouter une image'}</span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Portfolio Grid */}
      {portfolio && portfolio.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolio.map((image, index) => (
            <div
              key={index}
              className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={`${process.env.REACT_APP_BACKEND_URL}${image}`}
                alt={`Portfolio ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(image);
                }}
                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">
            {language === 'en' 
              ? 'No portfolio images yet' 
              : 'Aucune image de portfolio pour le moment'}
          </p>
          <p className="text-sm text-gray-500">
            {language === 'en' 
              ? 'Upload images to showcase your work' 
              : 'Téléchargez des images pour montrer votre travail'}
          </p>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 bg-white text-black p-2 rounded-full hover:bg-gray-200"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={`${process.env.REACT_APP_BACKEND_URL}${selectedImage}`}
            alt="Portfolio"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default TaskerPortfolio;
