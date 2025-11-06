import { TokenUtil } from '../token.util';

describe('TokenUtil', () => {
  const payload = {
    sub: 'user-123',
    email: 'user@example.com',
    username: 'user',
    role: 'USER',
    jti: 'family-123'
  };

  it('generates an access token that can be verified', () => {
    const token = TokenUtil.generateAccessToken(payload);
    const decoded = TokenUtil.verifyAccessToken(token);

    expect(decoded.type).toBe('access');
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('generates refresh tokens that require the refresh secret', () => {
    const refreshToken = TokenUtil.generateRefreshToken(payload);
    const decoded = TokenUtil.verifyRefreshToken(refreshToken);

    expect(decoded.type).toBe('refresh');
    expect(decoded.sub).toBe(payload.sub);
    expect(() => TokenUtil.verifyAccessToken(refreshToken)).toThrow('INVALID_TOKEN');
  });
});
