import {translate} from '../src/services/i18n/i18n';
import {usePreferencesStore} from '../src/store/usePreferencesStore';

describe('preferences and i18n', () => {
  it('translates core labels in English and French', () => {
    expect(translate('en', 'login')).toBe('Login');
    expect(translate('fr', 'login')).toBe('Connexion');
    expect(translate('fr', 'attendanceMatrix')).toBe('Matrice de présence');
    expect(translate('fr', 'reports')).toBe('Rapports');
    expect(translate('fr', 'export')).toBe('Exporter');
    expect(translate('fr', 'selectClassForReport')).toBe(
      'Sélectionner une classe pour le rapport',
    );
    expect(translate('fr', 'history')).toBe('Historique');
  });

  it('stores language and theme preferences', () => {
    usePreferencesStore.getState().setLanguage('fr');
    usePreferencesStore.getState().setThemeMode('dark');

    expect(usePreferencesStore.getState().language).toBe('fr');
    expect(usePreferencesStore.getState().themeMode).toBe('dark');
    expect(usePreferencesStore.getState().t('logout')).toBe('Déconnexion');
  });
});
