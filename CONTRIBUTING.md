# Contributing

Thanks for taking a look at GetJackedCoach.

## Local Workflow

1. Create a branch from `main`.
2. Install frontend and backend dependencies.
3. Make focused changes that preserve existing API contracts.
4. Run validation before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

## Pull Requests

- Keep changes scoped and easy to review.
- Include screenshots for UI changes.
- Do not commit `.env` files, credentials, logs, `node_modules`, or build output.
- Document any API or environment-variable changes in `README.md`.

## Security

Do not open public issues containing secrets or private credentials. See `SECURITY.md` for responsible reporting guidance.
