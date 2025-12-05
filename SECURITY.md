# Security Policy

## Supported Versions

We release security updates for the following versions of Clickwise:

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take the security of Clickwise seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to:

- **Email**: [contact@webspirio.com](mailto:contact@webspirio.com)
- **Subject**: `[SECURITY] Clickwise - Brief Description`

### What to Include

To help us assess and respond to the vulnerability more effectively, please include:

1. **Description**: A clear description of the vulnerability
2. **Impact**: The potential impact and severity of the issue
3. **Steps to Reproduce**: Detailed steps to reproduce the vulnerability
4. **Proof of Concept**: If possible, include proof-of-concept code or screenshots
5. **Environment**: WordPress version, PHP version, and plugin version
6. **Suggested Fix**: If you have suggestions for fixing the issue, please include them

### Example Report

```
Subject: [SECURITY] Clickwise - XSS vulnerability in event tracking

Description:
Cross-site scripting vulnerability in the event tracking endpoint that allows
arbitrary JavaScript execution.

Impact:
An attacker could execute arbitrary JavaScript in the context of an
authenticated user's session.

Steps to Reproduce:
1. Navigate to /wp-admin/admin-ajax.php
2. Send POST request with crafted payload...
3. Observe script execution in admin panel

Environment:
- WordPress 6.4.2
- PHP 8.2
- Clickwise v1.0.0

Proof of Concept:
[Attach PoC code or screenshots]
```

## Security Best Practices

When using Clickwise, we recommend:

### For Site Administrators

1. **Keep Updated**: Always use the latest version of the plugin
2. **Secure API Keys**: Store Rybbit API keys securely and never commit them to version control
3. **Use HTTPS**: Always run WordPress over HTTPS
4. **Restrict Access**: Limit admin access to trusted users only
5. **Regular Audits**: Review analytics data and access logs regularly

### For Developers

1. **Code Reviews**: All code changes undergo security review
2. **Input Validation**: Always validate and sanitize user input
3. **Output Escaping**: Escape all output to prevent XSS
4. **SQL Security**: Use prepared statements for all database queries
5. **Nonce Verification**: Verify WordPress nonces for all AJAX requests
6. **Capability Checks**: Verify user capabilities before performing actions

## Known Security Considerations

### API Key Security

- Rybbit API keys are stored in WordPress options and never exposed to the frontend
- All API calls are proxied through WordPress REST API endpoints
- Sensitive data in logs is automatically redacted

### Data Privacy

- User tracking respects privacy settings
- Analytics data is processed according to configured privacy rules
- Personal data is sanitized before storage

### Cross-Site Scripting (XSS)

- All user input is sanitized using WordPress escaping functions
- React components use JSX escaping by default
- Event properties are validated before processing

### Cross-Site Request Forgery (CSRF)

- All WordPress REST API requests require valid nonces
- Admin actions verify user capabilities
- AJAX requests use WordPress nonce verification

## Security Features

- **Input Sanitization**: All user inputs are sanitized and validated
- **Output Escaping**: All outputs use proper escaping mechanisms
- **Nonce Protection**: CSRF protection via WordPress nonces
- **Capability Checks**: Role-based access control
- **Secure API Proxy**: API keys never exposed to client
- **Data Sanitization**: Sensitive data redacted in logs
- **Type Safety**: TypeScript for additional compile-time security

## Scope

This security policy applies to:

- Clickwise WordPress plugin (this repository)
- All bundled frontend JavaScript code
- WordPress REST API endpoints provided by the plugin
- Admin interface and settings pages

Out of scope:

- Third-party dependencies (report to respective projects)
- WordPress core vulnerabilities (report to WordPress security team)
- Hosting environment issues

## Bug Bounty

We currently do not offer a paid bug bounty program, but we deeply appreciate security researchers who help keep our users safe. We will:

- Acknowledge your contribution in our security advisories
- Credit you in release notes (if desired)
- Provide a reference letter upon request

## Contact

For security-related inquiries:

- **Security Email**: contact@webspirio.com
- **General Support**: https://github.com/webspirio/clickwise/issues (non-security issues only)

Thank you for helping keep Clickwise and our users safe!
