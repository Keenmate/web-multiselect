import { describe, it, expect, afterEach } from 'vitest';
import { setCategoryLevel, resetLogging, enableLogging, uiLogger, dataLogger } from '../../src/logger';

describe('logger shim', () => {
    afterEach(() => resetLogging());

    it('setCategoryLevel(cat, null) clears that category back to the default (warn)', () => {
        setCategoryLevel('MULTISELECT:UI', 'debug');
        expect(uiLogger.getLevel()).toBe(uiLogger.levels.DEBUG);
        setCategoryLevel('UI', null);
        expect(uiLogger.getLevel()).toBe(uiLogger.levels.WARN);
    });

    it('resetLogging() clears every category level', () => {
        enableLogging();
        expect(dataLogger.getLevel()).toBe(dataLogger.levels.DEBUG);
        resetLogging();
        expect(dataLogger.getLevel()).toBe(dataLogger.levels.WARN);
        expect(uiLogger.getLevel()).toBe(uiLogger.levels.WARN);
    });
});
