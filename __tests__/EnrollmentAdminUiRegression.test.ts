import fs from 'fs';
import path from 'path';

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

describe('enrollment and admin UI regressions', () => {
  it('keeps Done enabled after face enrollment has been saved', () => {
    const source = readSource(
      'src',
      'screens',
      'enrollment',
      'FaceCaptureScreen.tsx',
    );

    expect(source).toContain('const isCaptureButtonDisabled =');
    expect(source).toMatch(/savedStudent\s*\?\s*t\('done'\)/);
    expect(source).toContain('if (savedStudent) {');
    expect(source).toContain('finishEnrollment();');
    expect(source).toContain('disabled={isCaptureButtonDisabled}');
  });

  it('uses dark text for class names on light enrollment rows', () => {
    const source = readSource(
      'src',
      'screens',
      'enrollment',
      'StudentEnrollmentScreen.tsx',
    );

    expect(source).toContain('className: {');
    expect(source).toContain('color: brand.ink');
    expect(source).not.toContain(
      '{color: theme.colors.onSurface},\n                        ]}',
    );
  });
});
