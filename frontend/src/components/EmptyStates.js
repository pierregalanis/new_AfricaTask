import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Inbox, FileQuestion, Search, Calendar, 
  AlertCircle, CheckCircle, Briefcase, Users,
  MessageCircle, Star, Package
} from 'lucide-react';

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  actionLink, 
  onAction,
  illustration 
}) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {illustration ? (
      <div className="text-8xl mb-6">{illustration}</div>
    ) : (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-6">
        <Icon className="w-16 h-16 text-gray-400" />
      </div>
    )}
    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6 leading-relaxed">{description}</p>
    {(actionLabel && (actionLink || onAction)) && (
      actionLink ? (
        <Link
          to={actionLink}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          {actionLabel}
        </Link>
      ) : (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          {actionLabel}
        </button>
      )
    )}
  </div>
);

// Predefined Empty States
export const NoTasksFound = ({ language = 'en' }) => (
  <EmptyState
    icon={Briefcase}
    illustration="📋"
    title={language === 'en' ? 'No Tasks Yet' : 'Aucune tâche pour le moment'}
    description={
      language === 'en'
        ? 'Start by creating your first task or browse available taskers to get help with your to-do list.'
        : 'Commencez par créer votre première tâche ou parcourez les taskers disponibles.'
    }
    actionLabel={language === 'en' ? 'Browse Services' : 'Parcourir les services'}
    actionLink="/services"
  />
);

export const NoBookingsFound = ({ language = 'en', userRole = 'client' }) => (
  <EmptyState
    icon={Calendar}
    illustration="📅"
    title={language === 'en' ? 'No Bookings Yet' : 'Aucune réservation'}
    description={
      language === 'en'
        ? userRole === 'client'
          ? 'You haven\'t booked any services yet. Start by browsing our talented taskers!'
          : 'You don\'t have any bookings yet. Complete your profile to start receiving requests!'
        : userRole === 'client'
          ? 'Vous n\'avez pas encore réservé de services. Commencez par parcourir nos taskers!'
          : 'Vous n\'avez pas encore de réservations. Complétez votre profil!'
    }
    actionLabel={language === 'en' ? (userRole === 'client' ? 'Find Taskers' : 'Complete Profile') : (userRole === 'client' ? 'Trouver des taskers' : 'Compléter le profil')}
    actionLink={userRole === 'client' ? '/services' : '/tasker/services'}
  />
);

export const NoReviewsFound = ({ language = 'en' }) => (
  <EmptyState
    icon={Star}
    illustration="⭐"
    title={language === 'en' ? 'No Reviews Yet' : 'Aucun avis pour le moment'}
    description={
      language === 'en'
        ? 'This tasker hasn\'t received any reviews yet. Be the first to book and review!'
        : 'Ce tasker n\'a pas encore reçu d\'avis. Soyez le premier à réserver!'
    }
  />
);

export const NoMessagesFound = ({ language = 'en' }) => (
  <EmptyState
    icon={MessageCircle}
    illustration="💬"
    title={language === 'en' ? 'No Messages' : 'Aucun message'}
    description={
      language === 'en'
        ? 'Start a conversation by booking a service or accepting a task.'
        : 'Commencez une conversation en réservant un service.'
    }
  />
);

export const NoNotificationsFound = ({ language = 'en' }) => (
  <EmptyState
    icon={CheckCircle}
    illustration="🔔"
    title={language === 'en' ? 'All Caught Up!' : 'Tout est à jour!'}
    description={
      language === 'en'
        ? 'You have no new notifications. We\'ll let you know when something important happens.'
        : 'Vous n\'avez pas de nouvelles notifications.'
    }
  />
);

export const NoSearchResults = ({ language = 'en', query }) => (
  <EmptyState
    icon={Search}
    illustration="🔍"
    title={language === 'en' ? 'No Results Found' : 'Aucun résultat trouvé'}
    description={
      language === 'en'
        ? `We couldn't find anything matching "${query}". Try adjusting your filters or search terms.`
        : `Nous n'avons rien trouvé pour "${query}". Essayez d'ajuster vos filtres.`
    }
  />
);

export const ErrorState = ({ language = 'en', onRetry }) => (
  <EmptyState
    icon={AlertCircle}
    illustration="⚠️"
    title={language === 'en' ? 'Oops! Something Went Wrong' : 'Oups! Une erreur s\'est produite'}
    description={
      language === 'en'
        ? 'We\'re having trouble loading this content. Please try again.'
        : 'Nous avons du mal à charger ce contenu. Veuillez réessayer.'
    }
    actionLabel={language === 'en' ? 'Try Again' : 'Réessayer'}
    onAction={onRetry}
  />
);

export const NoEarningsFound = ({ language = 'en' }) => (
  <EmptyState
    icon={Package}
    illustration="💰"
    title={language === 'en' ? 'No Earnings Yet' : 'Aucun revenu pour le moment'}
    description={
      language === 'en'
        ? 'Complete tasks and mark them as paid to start tracking your earnings.'
        : 'Complétez des tâches et marquez-les comme payées pour suivre vos revenus.'
    }
  />
);

export const NoFavorites = ({ onBrowse }) => (
  <EmptyState
    illustration="❤️"
    title="No Favorites Yet"
    description="Start adding your favorite taskers to quickly find and book them again!"
    actionLabel="Browse Taskers"
    onAction={onBrowse}
  />
);

export default EmptyState;
