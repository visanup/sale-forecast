import argon2 from 'argon2';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export class PasswordUtil {
  /**
   * Hash a password using bcrypt
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verify(hash: string, password: string): Promise<boolean> {
    try {
      if (hash.startsWith('$argon2')) {
        return await argon2.verify(hash, password);
      }
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const minLength = 8;

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a stronger password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a random password
   */
  static generatePassword(length: number = 12): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each required type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special char
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password needs to be changed
   */
  static shouldChangePassword(lastPasswordChange: Date, maxAgeDays: number = 90): boolean {
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceChange >= maxAgeDays;
  }
}
