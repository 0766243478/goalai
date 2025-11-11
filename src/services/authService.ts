import type { User } from '../types';
import { userService } from './detaService';

const AUTH_STORAGE_KEY = 'restaurant_auth_user';

export const authService = {
  async login(email: string, password: string): Promise<User | null> {
    try {
      const users = await userService.getByEmail(email);
      const user = users.find(u => u.password === password);
      
      if (user) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        return user;
      }
      return null;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  logout(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(AUTH_STORAGE_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  },

  async register(user: User): Promise<User | null> {
    try {
      const existingUsers = await userService.getByEmail(user.email);
      if (existingUsers.length > 0) {
        throw new Error('User already exists');
      }
      return await userService.create(user);
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  },
};
