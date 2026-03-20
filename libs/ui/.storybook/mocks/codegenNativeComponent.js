// Stub for react-native's Fabric/TurboModule codegen — not available on web.
// react-native-svg imports this for its <Use> element; returning a no-op
// component creator is enough to prevent the build error.
export default function codegenNativeComponent(_name, _options) {
  return null;
}
