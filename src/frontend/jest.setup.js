// Native modules that have no implementation under Jest. Both are replaced
// with in-memory equivalents so tests exercise real read/write behaviour
// rather than assertions about mock calls.

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-secure-store', () => {
  const vault = new Map();
  return {
    getItemAsync: jest.fn(async (key) => (vault.has(key) ? vault.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      vault.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      vault.delete(key);
    }),
    isAvailableAsync: jest.fn(async () => true),
    __vault: vault,
  };
});
