import { PasswordUtil } from '../password.util';

describe('PasswordUtil.validatePassword', () => {
  it('rejects passwords that do not meet the policy', () => {
    const result = PasswordUtil.validatePassword('weakpass');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('accepts passwords that satisfy the policy', () => {
    const result = PasswordUtil.validatePassword('StrongP@ssw0rd');

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
