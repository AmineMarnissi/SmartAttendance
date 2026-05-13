import {useAuthStore} from '../src/store/useAuthStore';

const teacher = {
  id: 2,
  name: 'John Doe',
  role: 'teacher' as const,
  pin_hash: 'hash',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('teacher regressions', () => {
  it('logs out without leaving stale user state', () => {
    useAuthStore.getState().setUser(teacher);
    useAuthStore.getState().setAuthenticated(true);

    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('keeps teacher role available for student management routes', () => {
    useAuthStore.getState().setUser(teacher);
    useAuthStore.getState().setAuthenticated(true);

    expect(useAuthStore.getState().user?.role).toBe('teacher');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
