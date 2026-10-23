import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { generateTokens } from '../modules/auth/auth.service';
import {
  WS_JOIN_PROJECT,
  WS_LEAVE_PROJECT,
  WS_TASK_MOVED,
  WS_COMMENT_CREATED,
  WS_NOTIFICATION_CREATED,
} from '../websocket/events';

describe('Auth Service - Token Generation', () => {
  it('should generate valid access and refresh JWT tokens', () => {
    const userId = 'user-test-uuid-123';
    const tokens = generateTokens(userId);

    assert.ok(tokens.accessToken, 'Access token should be present');
    assert.ok(tokens.refreshToken, 'Refresh token should be present');

    const decodedAccess = jwt.decode(tokens.accessToken) as { userId: string };
    assert.equal(decodedAccess.userId, userId, 'Access token payload must contain userId');

    const decodedRefresh = jwt.decode(tokens.refreshToken) as { userId: string; jti: string };
    assert.equal(decodedRefresh.userId, userId, 'Refresh token payload must contain userId');
    assert.ok(decodedRefresh.jti, 'Refresh token must contain a unique jti identifier');
  });

  it('should verify signature with the access secret', () => {
    const userId = 'user-test-uuid-456';
    const { accessToken } = generateTokens(userId);
    const secret = process.env.JWT_ACCESS_SECRET || 'access-secret';

    const verified = jwt.verify(accessToken, secret) as { userId: string };
    assert.equal(verified.userId, userId);
  });
});

describe('WebSocket Event Definitions', () => {
  it('should have standard action and event constants', () => {
    assert.equal(WS_JOIN_PROJECT, 'JOIN_PROJECT');
    assert.equal(WS_LEAVE_PROJECT, 'LEAVE_PROJECT');
    assert.equal(WS_TASK_MOVED, 'TASK_MOVED');
    assert.equal(WS_COMMENT_CREATED, 'COMMENT_CREATED');
    assert.equal(WS_NOTIFICATION_CREATED, 'NOTIFICATION_CREATED');
  });
});
