import fs from 'fs';
import path from 'path';
import {seedData} from '../src/services/database/seedData';
import {classRepository} from '../src/services/database/classRepository';
import {studentRepository} from '../src/services/database/studentRepository';
import {userRepository} from '../src/services/database/userRepository';

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn(async (pin: string) => `hash:${pin}`),
}));

jest.mock('../src/services/database/userRepository');
jest.mock('../src/services/database/classRepository');
jest.mock('../src/services/database/studentRepository');

const readProjectFile = (relativePath: string) =>
  fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

describe('startup regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not import removed legacy Victory chart components', () => {
    const source = readProjectFile(
      'src/components/analytics/AttendanceChart.tsx',
    );

    expect(source).not.toMatch(/Victory(?:Chart|Axis|Line)/);
  });

  it('does not auto-bootstrap a session before login', () => {
    const source = readProjectFile('App.tsx');

    expect(source).not.toContain('bootstrapDefaultSession');
  });

  it('allows submitting login from the PIN keyboard', () => {
    const source = readProjectFile('src/screens/auth/LoginScreen.tsx');

    expect(source).toContain('onSubmitEditing={handleLogin}');
    expect(source).toContain('returnKeyType="done"');
  });

  it('uses a supported MaterialCommunityIcons glyph for the teacher students tab', () => {
    const source = readProjectFile('src/navigation/AppNavigator.tsx');
    const glyphMap = JSON.parse(
      readProjectFile(
        'node_modules/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json',
      ),
    );

    expect(source).not.toContain('account-school-outline');
    expect(glyphMap).toHaveProperty('school-outline');
  });

  it('keeps both default login accounts available on a partially seeded database', async () => {
    const existingTeacher = {
      id: 2,
      name: 'John Doe',
      role: 'teacher' as const,
      pin_hash: 'old-hash',
      created_at: '2026-05-13T00:00:00.000Z',
    };
    const createdAdmin = {
      id: 1,
      name: 'Admin User',
      role: 'admin' as const,
      pin_hash: 'hash:1234',
      created_at: '2026-05-13T00:00:00.000Z',
    };

    (userRepository.getAll as jest.Mock).mockResolvedValue([existingTeacher]);
    (userRepository.getByName as jest.Mock).mockImplementation(
      async (name: string) => {
        if (name === 'John Doe') {
          return existingTeacher;
        }

        return null;
      },
    );
    (userRepository.create as jest.Mock).mockResolvedValue(1);
    (userRepository.getById as jest.Mock).mockResolvedValue(createdAdmin);
    (classRepository.getByTeacher as jest.Mock).mockResolvedValue([
      {id: 10, name: 'Math 10-A', grade: '10', teacher_id: 2},
    ]);
    (studentRepository.getByCode as jest.Mock).mockResolvedValue(null);

    await seedData();

    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Admin User',
        role: 'admin',
        pin_hash: 'hash:1234',
      }),
    );
    expect(userRepository.updatePin).toHaveBeenCalledWith(2, 'hash:5678');
    expect(classRepository.getByTeacher).toHaveBeenCalledWith(2);
  });
});
