export const getHomeRouteForRole = (role) => {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  if (role === 'teacher') {
    return '/teacher/dashboard';
  }

  return '/dashboard';
};

export const isTeacherRole = (role) => role === 'teacher';
export const isAdminRole = (role) => role === 'admin';