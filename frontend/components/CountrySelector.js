// components/CountrySelector.js
'use client';

import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const countries = [
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+1', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: '+351', name: 'Portugal', flag: '🇵🇹' },
  { code: '+34', name: 'Espanha', flag: '🇪🇸' },
  { code: '+258', name: 'Moçambique', flag: '🇲🇿' },
  { code: '+244', name: 'Angola', flag: '🇦🇴' },
  { code: '+238', name: 'Cabo Verde', flag: '🇨🇻' },
  { code: '+44', name: 'Reino Unido', flag: '🇬🇧' },
  { code: '+33', name: 'França', flag: '🇫🇷' },
  { code: '+49', name: 'Alemanha', flag: '🇩🇪' },
  { code: '+39', name: 'Itália', flag: '🇮🇹' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
  { code: '+27', name: 'África do Sul', flag: '🇿🇦' },
  { code: '+91', name: 'Índia', flag: '🇮🇳' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+81', name: 'Japão', flag: '🇯🇵' }
];

const CountrySelector = ({ selectedCountry, onCountryChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.includes(searchTerm)
  );

  const handleSelect = (country) => {
    onCountryChange(country);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedCountryData = countries.find(c => c.code === selectedCountry) || countries[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm flex items-center justify-between"
      >
        <div className="flex items-center">
          <span className="mr-2 text-lg">{selectedCountryData.flag}</span>
          <span className="mr-2">{selectedCountryData.code}</span>
          <span className="text-blue-200 text-sm">{selectedCountryData.name}</span>
        </div>
        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-2xl backdrop-blur-lg">
          <div className="p-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                type="text"
                placeholder="Buscar país..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleSelect(country)}
                className="w-full px-4 py-3 text-left hover:bg-white/10 flex items-center transition-colors"
              >
                <span className="mr-3 text-lg">{country.flag}</span>
                <span className="mr-3 text-white font-mono">{country.code}</span>
                <span className="text-blue-200">{country.name}</span>
              </button>
            ))}
          </div>
          
          {filteredCountries.length === 0 && (
            <div className="p-4 text-center text-blue-300">
              Nenhum país encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CountrySelector;