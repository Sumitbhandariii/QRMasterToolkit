/**
 * Web stub for expo-modules-core.
 * Under pnpm the nested copy at .pnpm/node_modules/expo-modules-core
 * may not have its build/ directory. This stub is used on web so Metro
 * never tries to read the missing build/index.js.
 */

const noop = () => {};
const noopAsync = async () => {};

module.exports = {
  // NativeModulesProxy
  NativeModulesProxy: new Proxy({}, { get: () => noop }),
  // EventEmitter
  EventEmitter: class EventEmitter {
    addListener() { return { remove: noop }; }
    removeAllListeners() {}
    emit() {}
  },
  // Platform utilities
  Platform: { OS: 'web' },
  // requireNativeModule / requireOptionalNativeModule
  requireNativeModule: () => ({}),
  requireOptionalNativeModule: () => null,
  // Permissions
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  // UUID
  uuidv4: () => Math.random().toString(36).slice(2),
  uuidv5: () => Math.random().toString(36).slice(2),
  // Types helpers (no-ops on web)
  CodedError: class CodedError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  },
  UnavailabilityError: class UnavailabilityError extends Error {
    constructor(moduleName, propertyName) {
      super(`${moduleName}.${propertyName} is not available on web.`);
    }
  },
  // Hooks no-ops
  useReleasingSharedObject: (factory) => factory(),
  SharedObject: class SharedObject {},
  SharedRef: class SharedRef {},
};
