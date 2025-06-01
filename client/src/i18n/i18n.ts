import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      settings: {
        title: 'Settings',
        subtitle: 'Customize your experience and manage your subscription',
        error: 'Error',
        tabs: {
          preferences: 'Preferences',
          billing: 'Billing',
          notifications: 'Notifications',
          security: 'Security'
        },
        preferences: {
          language: 'Language',
          timezone: 'Timezone',
          currency: 'Currency',
          dateFormat: 'Date Format',
          updated: 'Preferences Updated',
          updateSuccess: 'Your preferences have been updated successfully',
          updateError: 'Failed to update preferences'
        },
        billing: {
          currentPlan: 'Current Plan',
          availablePlans: 'Available Plans',
          paymentHistory: 'Payment History',
          yearly: 'Yearly',
          monthly: 'Monthly',
          year: 'year',
          month: 'month',
          current: 'Current',
          selectPlan: 'Select Plan',
          cancel: 'Cancel Subscription',
          cancelScheduled: 'Cancellation Scheduled',
          cancelSuccess: 'Your subscription has been canceled',
          cancelError: 'Failed to cancel subscription',
          paid: 'Paid',
          failed: 'Failed'
        },
        subscription: {
          canceled: 'Subscription Canceled',
          cancelSuccess: 'Your subscription will be canceled at the end of the current period',
          cancelError: 'Failed to cancel subscription',
          createError: 'Failed to create subscription'
        },
        notifications: {
          title: 'Notification Preferences',
          email: 'Email Notifications',
          emailDesc: 'Receive important updates via email',
          sms: 'SMS Notifications',
          smsDesc: 'Receive urgent alerts via SMS',
          push: 'Push Notifications',
          pushDesc: 'Browser notifications',
          marketing: 'Marketing Emails',
          marketingDesc: 'Special offers and news'
        },
        security: {
          title: 'Security Settings',
          autoSave: 'Auto Save',
          autoSaveDesc: 'Automatically save estimates',
          dataProtection: 'All your data is encrypted and protected.'
        }
      }
    }
  },
  es: {
    translation: {
      settings: {
        title: 'Configuración',
        subtitle: 'Personaliza tu experiencia y gestiona tu suscripción',
        error: 'Error',
        tabs: {
          preferences: 'Preferencias',
          billing: 'Facturación',
          notifications: 'Notificaciones',
          security: 'Seguridad'
        },
        preferences: {
          language: 'Idioma',
          timezone: 'Zona Horaria',
          currency: 'Moneda',
          dateFormat: 'Formato de Fecha',
          updated: 'Preferencias Actualizadas',
          updateSuccess: 'Tus preferencias han sido actualizadas exitosamente',
          updateError: 'Error al actualizar preferencias'
        },
        billing: {
          currentPlan: 'Plan Actual',
          availablePlans: 'Planes Disponibles',
          paymentHistory: 'Historial de Pagos',
          yearly: 'Anual',
          monthly: 'Mensual',
          year: 'año',
          month: 'mes',
          current: 'Actual',
          selectPlan: 'Seleccionar Plan',
          cancel: 'Cancelar Suscripción',
          cancelScheduled: 'Cancelación Programada',
          cancelSuccess: 'Tu suscripción ha sido cancelada',
          cancelError: 'Error al cancelar suscripción',
          paid: 'Pagado',
          failed: 'Fallido'
        },
        subscription: {
          canceled: 'Suscripción Cancelada',
          cancelSuccess: 'Tu suscripción se cancelará al final del período actual',
          cancelError: 'Error al cancelar suscripción',
          createError: 'Error al crear suscripción'
        },
        notifications: {
          title: 'Preferencias de Notificación',
          email: 'Notificaciones por Email',
          emailDesc: 'Recibe actualizaciones importantes por email',
          sms: 'Notificaciones SMS',
          smsDesc: 'Recibe alertas urgentes por SMS',
          push: 'Notificaciones Push',
          pushDesc: 'Notificaciones en el navegador',
          marketing: 'Emails de Marketing',
          marketingDesc: 'Ofertas especiales y novedades'
        },
        security: {
          title: 'Configuración de Seguridad',
          autoSave: 'Autoguardado',
          autoSaveDesc: 'Guardar estimados automáticamente',
          dataProtection: 'Todos tus datos están encriptados y protegidos.'
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;