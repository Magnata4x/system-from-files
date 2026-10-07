import { describe, expect, it } from 'vitest';
import {
  assertExecutionContext,
  createExecutionContext,
  environmentForMode,
  isProductionExecution,
  isRealExecutionAuthorized,
} from '../execution-environment';

describe('execution environment contract', () => {
  it('maps DEMO exclusively to TEST', () => {
    expect(environmentForMode('DEMO')).toBe('TEST');
    expect(createExecutionContext('DEMO')).toEqual({
      mode: 'DEMO',
      environment: 'TEST',
    });
  });

  it('maps REAL exclusively to PRODUCTION', () => {
    expect(environmentForMode('REAL')).toBe('PRODUCTION');
    expect(createExecutionContext('REAL')).toEqual({
      mode: 'REAL',
      environment: 'PRODUCTION',
    });
  });

  it('accepts only the environment assigned to the mode', () => {
    expect(() => assertExecutionContext({ mode: 'DEMO', environment: 'TEST' })).not.toThrow();
    expect(() => assertExecutionContext({ mode: 'REAL', environment: 'PRODUCTION' })).not.toThrow();
    expect(() => assertExecutionContext({ mode: 'DEMO', environment: 'PRODUCTION' })).toThrow();
    expect(() => assertExecutionContext({ mode: 'REAL', environment: 'TEST' })).toThrow();
  });

  it('identifies production without changing authorization', () => {
    expect(isProductionExecution({ mode: 'DEMO', environment: 'TEST' })).toBe(false);
    expect(isProductionExecution({ mode: 'REAL', environment: 'PRODUCTION' })).toBe(true);
  });

  it('keeps REAL submission closed during Phase 41', () => {
    expect(isRealExecutionAuthorized(createExecutionContext('REAL'))).toBe(false);
    expect(isRealExecutionAuthorized(createExecutionContext('DEMO'))).toBe(false);
  });
});
