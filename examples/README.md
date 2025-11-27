# Examples

This folder contains practical examples demonstrating how to use `secure-fetch-client` in various scenarios.

## 📁 Files

- **basic-usage.ts** - Fundamental features: GET, POST, PUT, DELETE requests, error handling
- **react-example.tsx** - React integration with hooks, SWR, and components
- **angular-example.ts** - Angular service patterns and RxJS integration
- **vue-example.ts** - Vue 3 Composition API with composables
- **encryption-example.ts** - AES-GCM encryption usage and gateway mode
- **mock-server-example.ts** - Mock server setup for testing and development

## 🚀 Quick Start

Each example file is self-contained and can be used as a reference. To run an example:

1. Copy the relevant code into your project
2. Install dependencies: `npm install secure-fetch-client`
3. Adapt the code to your specific use case

## 📚 Usage Patterns

### Basic API Calls

See `basic-usage.ts` for:

- Simple GET/POST requests
- Query parameters
- Error handling
- Request cancellation

### Framework Integration

- **React**: See `react-example.tsx` for hooks, SWR integration, and form handling
- **Angular**: See `angular-example.ts` for services, RxJS, and dependency injection
- **Vue**: See `vue-example.ts` for composables and reactive state

### Advanced Features

- **Encryption**: See `encryption-example.ts` for AES-GCM encryption and gateway mode
- **Mocking**: See `mock-server-example.ts` for testing with mock JSON files

## 💡 Tips

1. **Create a shared client instance** - Don't create a new `ApiClient` for each request
2. **Use TypeScript** - Leverage type safety for better DX
3. **Handle errors gracefully** - Always check `response.ok` before accessing `response.data`
4. **Use mock mode in development** - Speed up development with local JSON files
5. **Enable encryption for sensitive data** - Use gateway mode for production security

## 🔗 Related Documentation

- [Main README](../README.md) - Full API documentation
- [GitHub Repository](https://github.com/sanjay3722/secure-api-client) - Source code and issues
