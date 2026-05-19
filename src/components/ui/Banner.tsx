import React from 'react';
import { X } from 'lucide-react';

interface BannerProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  visible: boolean;
  onClose: () => void;
}

const Banner: React.FC<BannerProps> = ({ message, type = 'info', visible, onClose }) => {
  if (!visible) return null;

  const getStyles = () => {
    switch (type) {
      case 'error': return 'bg-red-600 text-white';
      case 'warning': return 'bg-yellow-500 text-black';
      default: return 'bg-blue-600 text-white';
    }
  };

  return (
    <div className={`w-full py-3 px-4 ${getStyles()} flex items-center justify-between`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="hover:opacity-70 transition-opacity">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Banner;
