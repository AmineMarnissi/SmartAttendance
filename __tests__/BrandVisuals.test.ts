import {brand} from '../src/theme/design';
import {modernDarkTheme, modernLightTheme} from '../src/theme/appTheme';

describe('brand visuals', () => {
  it('uses Intelligent Register coral identity', () => {
    expect(brand.name).toBe('Intelligent Register');
    expect(brand.primary).toBe('#FF5B61');
  });

  it('exposes light and dark paper themes', () => {
    expect(modernLightTheme.colors.primary).toBe('#FF5B61');
    expect(modernDarkTheme.colors.background).toBe('#090A12');
  });
});
