import React from 'react';
import { X, MessageCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const NotificationToast = ({ notification, onClose, onClick }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'message':
        return <MessageCircle className="w-6 h-6 text-blue-600" />;
      case 'accepted':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-orange-600" />;
    }
  };

  const getBgColor = () => {
    switch (notification.type) {
      case 'message':
        return 'bg-blue-50 border-blue-200';
      case 'accepted':
        return 'bg-green-50 border-green-200';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-orange-50 border-orange-200';
    }
  };

  return (
    <div
      className={`${getBgColor()} border-2 rounded-lg shadow-lg p-4 mb-3 cursor-pointer hover:shadow-xl transition-all animate-slideIn`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm">{notification.title}</h4>
          <p className="text-gray-700 text-sm mt-1">{notification.message}</p>
          {notification.subtitle && (
            <p className="text-gray-500 text-xs mt-1">{notification.subtitle}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
