# Security Policy

## Reporting a Vulnerability

If you find a vulnerability, do not include secrets, exploit payloads, or private data in a public issue.

For now, report security concerns privately to the repository owner. If this project gains more collaborators, add a dedicated security contact here.

## Current Security Notes

- The backend uses JWT authentication, password hashing with bcrypt, Helmet, CORS allowlisting, request body limits, NoSQL sanitization, and auth rate limiting.
- JWTs are currently stored in browser `localStorage`, which is acceptable for this MVP but is a known limitation for production hardening.
- The historical security report notes that old secrets appeared in Git history and should be rotated.

## Maintainer Checklist

- Rotate exposed credentials immediately.
- Keep `.env` files out of Git.
- Review dependency updates before deployment.
- Avoid logging sensitive request data or authentication tokens.
