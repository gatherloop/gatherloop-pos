package buildinfo

// Version is the commit SHA the binary was built from, injected via
// -ldflags at build time. It stays "dev" for local, non-release builds.
var Version = "dev"
