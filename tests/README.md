# MCP Chat UI Integration and E2E Tests

This directory contains comprehensive integration and end-to-end tests for the MCP Chat UI application.

## Test Structure

```
tests/
├── integration/           # Integration tests
│   ├── chat-workflow.test.ts
│   ├── settings-configuration.test.ts
│   └── tool-execution.test.ts
├── e2e/                  # End-to-end tests
│   └── complete-workflows.test.ts
├── performance/          # Performance tests
│   └── streaming-performance.test.ts
├── helpers/              # Test utilities
│   └── test-utils.ts
├── setup/               # Test setup files
│   └── integration-setup.ts
├── test-runner.config.ts # Test runner configuration
└── README.md            # This file
```

## Test Categories

### Integration Tests

Integration tests verify that different components work together correctly:

- **Chat Workflow Tests** (`chat-workflow.test.ts`)
  - Complete chat flow from user input to AI response
  - Streaming response handling
  - Tool call proposal and confirmation
  - Error recovery and retry mechanisms
  - Session management integration

- **Settings Configuration Tests** (`settings-configuration.test.ts`)
  - LLM provider configuration and management
  - MCP server setup and testing
  - User preferences management
  - Settings import/export functionality
  - Connection testing workflows

- **Tool Execution Tests** (`tool-execution.test.ts`)
  - Tool confirmation dialog workflows
  - Active tool execution monitoring
  - Tool execution history management
  - Concurrent tool execution handling
  - Tool execution error scenarios

### End-to-End Tests

End-to-end tests verify complete user workflows:

- **Complete Workflows** (`complete-workflows.test.ts`)
  - New user onboarding process
  - Full chat session lifecycle
  - Session management operations
  - Settings configuration workflows
  - Error recovery scenarios
  - Data export and privacy workflows

### Performance Tests

Performance tests ensure the application performs well under various conditions:

- **Streaming Performance** (`streaming-performance.test.ts`)
  - Fast streaming response handling
  - Large streaming response processing
  - UI responsiveness during streaming
  - Memory usage during streaming
  - Large chat history rendering
  - Concurrent operations performance
  - Network latency handling

## Running Tests

### Individual Test Suites

```bash
# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run all integration and e2e tests
npm run test:all
```

### Specific Test Files

```bash
# Run specific integration test
npx vitest run tests/integration/chat-workflow.test.ts --config tests/test-runner.config.ts

# Run specific e2e test
npx vitest run tests/e2e/complete-workflows.test.ts --config tests/test-runner.config.ts

# Run specific performance test
npx vitest run tests/performance/streaming-performance.test.ts --config tests/test-runner.config.ts
```

### Watch Mode

```bash
# Watch integration tests
npx vitest tests/integration --config tests/test-runner.config.ts

# Watch e2e tests
npx vitest tests/e2e --config tests/test-runner.config.ts
```

## Test Configuration

### Test Runner Configuration

The test runner is configured in `tests/test-runner.config.ts` with:

- Extended timeouts for integration tests (30s test timeout, 10s hook timeout)
- JSdom environment for React component testing
- Coverage reporting with v8 provider
- Thread pool configuration for parallel execution
- Custom alias resolution for imports

### Setup Files

- `tests/setup/integration-setup.ts`: Comprehensive setup for integration tests
  - Mocks for browser APIs (localStorage, sessionStorage, matchMedia)
  - Mocks for Web APIs (ResizeObserver, IntersectionObserver, fetch)
  - Mocks for streaming APIs (ReadableStream)
  - Mocks for crypto APIs for encryption tests
  - Global test lifecycle hooks

### Test Utilities

The `tests/helpers/test-utils.ts` file provides:

- Custom render function with providers
- Mock data generators for common entities
- Performance measurement utilities
- Stream creation utilities
- Error simulation utilities
- Wait condition utilities

## Test Coverage

The tests cover all major requirements:

### Functional Requirements Coverage

1. **Core Chat Functionality** (Requirement 1)
   - ✅ Chat interface rendering and interaction
   - ✅ Message sending and receiving
   - ✅ Message history persistence
   - ✅ Markdown content rendering

2. **LLM Provider Configuration** (Requirement 2)
   - ✅ Provider configuration and management
   - ✅ API key secure storage and validation
   - ✅ Connection testing
   - ✅ Model selection and compatibility

3. **MCP Server Integration** (Requirement 3)
   - ✅ Server configuration and connection
   - ✅ Tool discovery and listing
   - ✅ Connection status monitoring
   - ✅ Server lifecycle management

4. **Tool Execution Control** (Requirement 4)
   - ✅ Tool confirmation dialogs
   - ✅ Tool parameter validation
   - ✅ Tool execution and result handling
   - ✅ Tool cancellation workflows

5. **Seamless Tool Integration** (Requirement 5)
   - ✅ Tool execution flow integration
   - ✅ Progress indicators and status updates
   - ✅ Error handling and recovery
   - ✅ Multiple tool handling

6. **Unified Next.js Architecture** (Requirement 6)
   - ✅ Server and Client Component integration
   - ✅ Route Handler functionality
   - ✅ State management integration
   - ✅ Build and deployment compatibility

7. **Data Privacy and Security** (Requirement 7)
   - ✅ Local data processing
   - ✅ API key encryption and security
   - ✅ Input validation and XSS protection
   - ✅ Data export and cleanup

8. **Responsive Design** (Requirement 8)
   - ✅ Multi-device compatibility
   - ✅ Touch interactions
   - ✅ Accessibility features
   - ✅ Keyboard navigation

9. **Session Management** (Requirement 9)
   - ✅ Session creation and management
   - ✅ Chat history and search
   - ✅ Session organization features
   - ✅ Data export functionality

10. **Multi-language Support** (Requirement 10)
    - ✅ Language detection and switching
    - ✅ Interface translation
    - ✅ Locale-specific formatting
    - ✅ Translation management

11. **Provider and Model Selection** (Requirement 11)
    - ✅ Provider selection workflows
    - ✅ Model compatibility checking
    - ✅ Server-side credential management
    - ✅ Session configuration

### Performance Requirements Coverage

- ✅ Streaming response performance (< 2s for 100 chunks)
- ✅ Large chat history rendering (< 2s for 1000 messages)
- ✅ UI responsiveness during operations (< 500ms)
- ✅ Memory usage stability
- ✅ Network latency handling
- ✅ Concurrent operation performance

### Error Handling Coverage

- ✅ Network error recovery
- ✅ API failure handling
- ✅ Tool execution errors
- ✅ Validation errors
- ✅ Timeout handling
- ✅ Stream interruption recovery

## Best Practices

### Writing Integration Tests

1. **Test Real Workflows**: Focus on testing complete user workflows rather than isolated components
2. **Mock External Dependencies**: Mock API calls and external services while testing integration between internal components
3. **Use Realistic Data**: Use realistic mock data that represents actual usage scenarios
4. **Test Error Scenarios**: Include tests for error conditions and recovery mechanisms
5. **Verify Side Effects**: Ensure that operations have the expected side effects (API calls, state changes, etc.)

### Writing Performance Tests

1. **Set Performance Budgets**: Define acceptable performance thresholds and test against them
2. **Test Under Load**: Test with realistic data volumes and concurrent operations
3. **Measure Key Metrics**: Focus on user-perceived performance metrics (response time, rendering time)
4. **Test Memory Usage**: Verify that operations don't cause memory leaks
5. **Test Network Conditions**: Include tests for various network conditions and failures

### Writing E2E Tests

1. **Test Complete User Journeys**: Test entire workflows from start to finish
2. **Include Setup and Teardown**: Test the complete lifecycle including setup and cleanup
3. **Test Cross-Component Integration**: Verify that different parts of the application work together
4. **Test Data Persistence**: Verify that data is correctly saved and loaded
5. **Test Error Recovery**: Include tests for error scenarios and user recovery paths

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- Tests use mocked dependencies to avoid external service dependencies
- Tests include proper cleanup to avoid state leakage between runs
- Tests have appropriate timeouts for CI environments
- Tests generate coverage reports for quality monitoring

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout values in test configuration if tests are timing out
2. **Mock Issues**: Ensure all external dependencies are properly mocked
3. **State Leakage**: Use proper cleanup in beforeEach/afterEach hooks
4. **Async Issues**: Use proper async/await patterns and waitFor utilities

### Debug Mode

Run tests with debug output:

```bash
# Run with debug output
DEBUG=* npm run test:integration

# Run specific test with verbose output
npx vitest run tests/integration/chat-workflow.test.ts --reporter=verbose
```

## Contributing

When adding new tests:

1. Follow the existing test structure and naming conventions
2. Add appropriate documentation and comments
3. Include both success and error scenarios
4. Update this README if adding new test categories
5. Ensure tests are deterministic and don't rely on external services