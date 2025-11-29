export const translations = {
  en: {
    // Landing Page
    appName: 'AfricaTask',
    tagline: 'Connect with trusted local service providers across Africa',
    getStarted: 'Get Started',
    becomeTasker: 'Become a Tasker',
    howItWorks: 'How It Works',
    features: 'Features',
    
    // Auth
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    phone: 'Phone Number',
    address: 'Address',
    city: 'City',
    selectRole: 'I am a...',
    client: 'Client (Need services)',
    tasker: 'Tasker (Provide services)',
    selectLanguage: 'Preferred Language',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: "Don't have an account?",
    
    // Dashboard
    dashboard: 'Dashboard',
    myTasks: 'My Tasks',
    findTasks: 'Find Tasks',
    myApplications: 'My Applications',
    myProfile: 'My Profile',
    logout: 'Logout',
    
    // Tasks
    postTask: 'Post a Task',
    taskTitle: 'Task Title',
    description: 'Description',
    category: 'Category',
    subcategory: 'Subcategory',
    budget: 'Budget (CFA)',
    estimatedHours: 'Estimated Hours',
    taskDate: 'Task Date',
    location: 'Location',
    posted: 'Posted',
    assigned: 'Assigned',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    
    // Applications
    apply: 'Apply',
    proposedRate: 'Proposed Rate',
    message: 'Message',
    applications: 'Applications',
    accept: 'Accept',
    reject: 'Reject',
    
    // Reviews
    reviews: 'Reviews',
    rating: 'Rating',
    leaveReview: 'Leave a Review',
    
    // Payment
    payment: 'Payment',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    orangeMoney: 'Orange Money',
    wave: 'Wave',
    paypal: 'PayPal',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    filter: 'Filter',
    back: 'Back',
    loading: 'Loading...',
  },
  fr: {
    // Landing Page
    appName: 'AfricaTask',
    tagline: 'Connectez-vous avec des prestataires de services locaux de confiance à travers l\'Afrique',
    getStarted: 'Commencer',
    becomeTasker: 'Devenir un Tasker',
    howItWorks: 'Comment ça marche',
    features: 'Fonctionnalités',
    
    // Auth
    login: 'Connexion',
    register: 'S\'inscrire',
    email: 'Email',
    password: 'Mot de passe',
    fullName: 'Nom complet',
    phone: 'Numéro de téléphone',
    address: 'Adresse',
    city: 'Ville',
    selectRole: 'Je suis un...',
    client: 'Client (Besoin de services)',
    tasker: 'Tasker (Fournir des services)',
    selectLanguage: 'Langue préférée',
    alreadyHaveAccount: 'Vous avez déjà un compte?',
    dontHaveAccount: "Vous n'avez pas de compte?",
    
    // Dashboard
    dashboard: 'Tableau de bord',
    myTasks: 'Mes tâches',
    findTasks: 'Trouver des tâches',
    myApplications: 'Mes candidatures',
    myProfile: 'Mon profil',
    logout: 'Déconnexion',
    
    // Tasks
    postTask: 'Publier une tâche',
    taskTitle: 'Titre de la tâche',
    description: 'Description',
    category: 'Catégorie',
    subcategory: 'Sous-catégorie',
    budget: 'Budget (CFA)',
    estimatedHours: 'Heures estimées',
    taskDate: 'Date de la tâche',
    location: 'Emplacement',
    posted: 'Publié',
    assigned: 'Assigné',
    inProgress: 'En cours',
    completed: 'Terminé',
    cancelled: 'Annulé',
    
    // Applications
    apply: 'Postuler',
    proposedRate: 'Taux proposé',
    message: 'Message',
    applications: 'Candidatures',
    accept: 'Accepter',
    reject: 'Refuser',
    
    // Reviews
    reviews: 'Avis',
    rating: 'Évaluation',
    leaveReview: 'Laisser un avis',
    
    // Payment
    payment: 'Paiement',
    paymentMethod: 'Méthode de paiement',
    cash: 'Espèces',
    orangeMoney: 'Orange Money',
    wave: 'Wave',
    paypal: 'PayPal',
    
    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    submit: 'Soumettre',
    edit: 'Modifier',
    delete: 'Supprimer',
    search: 'Rechercher',
    filter: 'Filtrer',
    back: 'Retour',
    loading: 'Chargement...',
  },
};

export const t = (key, lang = 'fr') => {
  return translations[lang]?.[key] || key;
};
