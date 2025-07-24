# ReaderAI Backend Tests

## Testing Philosophy

Following our functional programming guidelines, we prioritize:

1. **Pure function tests** - Test logic without external dependencies
2. **Integration tests** - Test against real infrastructure (AWS, databases)
3. **No mocking** - Unless explicitly approved by the user

## Test Structure

```
tests/
├── test_*.py                    # Unit tests (pure functions only)
├── integration/                 # Integration tests requiring infrastructure
│   └── test_*_integration.py
└── README.md                    # This file
```

## Running Tests

### Unit Tests Only (Fast, No External Dependencies)

```bash
# Run only unit tests (skip integration)
uv run pytest -m "not integration"

# Or simply
uv run pytest tests/test_*.py
```

### Integration Tests (Requires AWS Infrastructure)

```bash
# Ensure AWS is configured
source ../.env.aws  # Load AWS environment variables

# Run only integration tests
uv run pytest -m integration

# Run all tests including integration
uv run pytest
```

### Prerequisites for Integration Tests

1. Deploy AWS infrastructure:

   ```bash
   cd ../infra/terraform
   terraform apply
   ```

2. Configure AWS credentials:

   ```bash
   aws configure
   # or
   export AWS_PROFILE=your-profile
   ```

3. Load environment variables:
   ```bash
   source ../.env.aws
   ```

## Writing Tests

### Pure Function Tests

- Test only the logic, no I/O
- No mocking, no external services
- Fast and deterministic
- Example: `test_tts_pure_functions.py`

### Integration Tests

- Test against real services
- Mark with `@pytest.mark.integration`
- May be slower and cost money (AWS)
- Example: `integration/test_tts_service_integration.py`

### Avoid Mocking

Per our guidelines, mocking is discouraged. If you believe mocking is necessary:

1. First try to refactor to pure functions
2. Consider using real test infrastructure
3. Get explicit approval before adding mocks

## Test Data Cleanup

Integration tests may create real resources. Clean them up:

```python
# Manual cleanup if needed
from tests.integration.test_tts_service_integration import cleanup_test_objects
await cleanup_test_objects("your-bucket-name")
```
