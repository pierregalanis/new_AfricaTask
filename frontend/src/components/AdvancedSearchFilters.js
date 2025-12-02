import React, { useState } from 'react';
import { Search, Filter, X, DollarSign, Star, MapPin, SlidersHorizontal } from 'lucide-react';

const AdvancedSearchFilters = ({ onFilterChange, language = 'en' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    minRating: 0,
    maxDistance: 50,
    sortBy: 'rating',
    searchQuery: ''
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const cleared = {
      priceMin: '',
      priceMax: '',
      minRating: 0,
      maxDistance: 50,
      sortBy: 'rating',
      searchQuery: ''
    };
    setFilters(cleared);
    onFilterChange(cleared);
  };

  const hasActiveFilters = filters.priceMin || filters.priceMax || filters.minRating > 0 || filters.maxDistance < 50 || filters.searchQuery;

  return (
    <div className="bg-white dark:bg-gray-800/70 rounded-lg shadow-md p-4 mb-6">
      {/* Search Bar */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={language === 'en' ? 'Search by skill or keyword...' : 'Rechercher par compétence...'}
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            hasActiveFilters 
              ? 'bg-emerald-600 text-white' 
              : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>{language === 'en' ? 'Filters' : 'Filtres'}</span>
          {hasActiveFilters && (
            <span className="bg-white dark:bg-gray-800/70 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded-full">
              •
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {isOpen && (
        <div className="border-t pt-4 space-y-4 animate-fadeIn">
          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'en' ? 'Sort By' : 'Trier par'}
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="rating">{language === 'en' ? 'Highest Rated' : 'Mieux notés'}</option>
              <option value="price-low">{language === 'en' ? 'Price: Low to High' : 'Prix: Croissant'}</option>
              <option value="price-high">{language === 'en' ? 'Price: High to Low' : 'Prix: Décroissant'}</option>
              <option value="distance">{language === 'en' ? 'Nearest First' : 'Plus proches'}</option>
              <option value="reviews">{language === 'en' ? 'Most Reviews' : 'Plus d\'avis'}</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                {language === 'en' ? 'Price Range (CFA/hr)' : 'Tarif (CFA/hr)'}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin}
                  onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax}
                  onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Star className="w-4 h-4 inline mr-1 fill-yellow-400 text-yellow-400" />
                {language === 'en' ? 'Minimum Rating' : 'Note minimale'}
              </label>
              <select
                value={filters.minRating}
                onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="0">{language === 'en' ? 'Any rating' : 'Tous'}</option>
                <option value="3">3.0+ ⭐⭐⭐</option>
                <option value="3.5">3.5+ ⭐⭐⭐</option>
                <option value="4">4.0+ ⭐⭐⭐⭐</option>
                <option value="4.5">4.5+ ⭐⭐⭐⭐</option>
              </select>
            </div>
          </div>

          {/* Max Distance */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              {language === 'en' ? 'Maximum Distance' : 'Distance maximale'}: {filters.maxDistance} km
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={filters.maxDistance}
              onChange={(e) => handleFilterChange('maxDistance', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 km</span>
              <span>100 km</span>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              <span>{language === 'en' ? 'Clear All Filters' : 'Effacer les filtres'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchFilters;
