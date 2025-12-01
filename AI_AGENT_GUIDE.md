# AI Agent Guidelines for Clickwise Analytics

Welcome, AI Agent. This document is your primary source of truth for developing, maintaining, and improving the Clickwise Analytics project. Follow these guidelines to ensure consistency, security, and a premium user experience.

## 1. Core Philosophy

-   **User-Centric**: Every decision should prioritize the user's experience. The UI should be intuitive, responsive, and delightful.
-   **Premium Design**: We do not build "MVP" looking software. Use rich aesthetics, smooth animations, and modern UI patterns.
-   **Secure by Default**: Security is not an afterthought. API keys are never exposed, inputs are always sanitized, and permissions are strictly enforced.
-   **Robust & Maintainable**: Write clean, typed, and documented code. Avoid "magic" numbers or strings. Use centralized utilities.

## 2. Architecture Overview

Clickwise is a hybrid application:
-   **Frontend**: A React Single Page Application (SPA) embedded within the WordPress admin. Built with Vite, TypeScript, Tailwind CSS, and Shadcn UI.
-   **Backend**: A WordPress plugin written in PHP. Handles data persistence, REST API endpoints, and integration with WordPress core.

### Key Directories
-   `src/`: React frontend source code.
-   `includes/`: PHP backend classes.
-   `assets/`: Compiled assets and static files.
-   `docs/`: Project documentation.

## 3. Development Guidelines

### Frontend (React & TypeScript)

-   **State Management**: Use React Context for global state (e.g., `SettingsContext`). Avoid Redux unless absolutely necessary.
-   **Styling**: Use **Tailwind CSS** for styling. Use **Shadcn UI** components for consistency.
-   **Type Safety**: strict TypeScript usage. No `any` unless unavoidable. Define interfaces for all data structures.
-   **Logging**: **NEVER** use `console.log` in production code. Use the centralized logger:
    ```typescript
    import { logger } from '@/lib/logger';
    logger.debug('Debug info', { context: 'Component' });
    logger.error('Error occurred', error);
    ```
-   **Settings**: Access settings via the centralized module:
    ```typescript
    import { getRybbitApiBaseUrl, normalizeSettings } from '@/lib/settings';
    const settings = window.clickwiseSettings;
    const apiUrl = getRybbitApiBaseUrl(settings);
    ```
-   **API Calls**: Use the `api` utility in `src/lib/api.ts`. It handles nonces and error normalization automatically.

### Backend (PHP & WordPress)

-   **Coding Standards**: Follow WordPress Coding Standards.
-   **Security**:
    -   **Sanitization**: Always sanitize inputs (`sanitize_text_field`, `esc_url_raw`).
    -   **Validation**: Validate data before saving.
    -   **Nonces**: Verify nonces on all form submissions and AJAX/REST requests.
    -   **Capabilities**: Check `current_user_can('manage_options')` for sensitive actions.
-   **REST API**:
    -   Register routes in `class-clickwise-rest-api.php`.
    -   **NEVER** return sensitive data (API keys, secrets) in GET responses.
    -   Use proxy endpoints for external API calls (e.g., Rybbit API) to keep keys server-side.

## 4. Security Standards

-   **API Keys**: Store API keys in `wp_options`. **NEVER** output them to the frontend. Use placeholders (`••••`) in settings forms.
-   **Proxy Pattern**: Frontend requests analytics data via WordPress REST API proxy (`/wp-json/clickwise/v1/rybbit/...`). The backend adds the API key and forwards the request.
-   **Logging**: The `logger` utility automatically sanitizes sensitive keys (`api_key`, `password`, `secret`).

## 5. Design System & UI/UX

-   **Framework**: Shadcn UI + Tailwind CSS.
-   **Aesthetics**:
    -   Use subtle gradients and glassmorphism where appropriate.
    -   Implement micro-interactions (hover states, transitions).
    -   Ensure dark mode compatibility (if applicable).
-   **Responsiveness**: All layouts must be fully responsive. Use Tailwind's responsive prefixes (`md:`, `lg:`).
-   **Icons**: Use `lucide-react` for icons.

## 6. Workflow & Best Practices

-   **Building**: Run `npm run build` to compile the frontend. This updates `assets/dist/`.
-   **Testing**:
    -   Verify the build succeeds.
    -   Check the browser console for errors (filter by `[Clickwise]`).
    -   Check `wp-content/debug.log` for PHP errors.
-   **Documentation**: Update documentation (`docs/`) when making architectural changes.

## 7. Common Tasks

### Adding a New Setting
1.  **Backend**: Add the option in `class-clickwise-rest-api.php` (register_setting) and `class-clickwise-admin.php` (window.clickwiseSettings).
2.  **Frontend**: Update `ClickwiseSettings` interface in `src/lib/settings.ts`.
3.  **UI**: Add the field to `src/pages/Settings.tsx`.

### Adding a New Feature
1.  **Plan**: Define the data flow and UI requirements.
2.  **Backend**: Implement necessary REST endpoints or PHP hooks.
3.  **Frontend**: Create components in `src/components/` and pages in `src/pages/`.
4.  **Integrate**: Connect frontend to backend using `src/lib/api.ts`.
5.  **Verify**: Test in both dev and production modes.

---

**Remember**: You are building a professional, high-quality product. Do not cut corners. If you see code that doesn't meet these standards, improve it.
