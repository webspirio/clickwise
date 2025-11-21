# Clickwise Analytics for WordPress

**Privacy-focused WordPress analytics plugin with advanced event tracking and live recording features.**

Connect your WordPress site to [Rybbit Analytics](https://rybbit.com) for comprehensive tracking with complete data ownership. Built by [Webspirio](https://webspirio.com).

> **Note:** This is a third-party integration plugin developed by Webspirio, not an official Rybbit Analytics plugin. For more information about Rybbit Analytics, visit [rybbit.com](https://rybbit.com).

## ⚠️ Important

**This plugin requires a Rybbit Analytics instance** (self-hosted or managed service). All analytics data goes to YOUR Rybbit server—not to us.

## ✨ Key Features

### 📊 Comprehensive Tracking
- Automatic pageviews & SPA support
- Custom events with configurable prefixes
- Form submissions & outbound links
- JavaScript error tracking
- Session replay (optional)

### 🎯 Advanced Event Manager
- **Live Recording Mode** - Visual overlay showing events in real-time
- **Smart Selectors** - Auto-generated, human-readable CSS selectors
- **Session History** - Organized by recording sessions
- **Bulk Actions** - Manage multiple events efficiently
- **Event Aliases** - Rename events for better analytics

### 🛠️ Developer-Friendly
- Development Mode with visual debugging
- Test Connection tool
- Admin Bar integration
- Hooks & filters for customization
- Clean, well-documented code

## 🚀 Quick Start

1. **Install** from WordPress plugins or [GitHub](https://github.com/webspirio/clickwise-wp)
2. **Activate** the plugin
3. **Configure** at Settings → Clickwise Analytics
   - Add your Rybbit Script URL
   - Add your Site ID
   - Click "Test Connection"
4. **Start tracking!**

## 📸 Screenshots

### General Settings
<img width="831" height="502" alt="General Settings Interface" src="https://github.com/user-attachments/assets/1ec64ec0-2e2d-4353-bd33-5cab143b6f44" />

### Event Manager
<img width="1183" height="562" alt="Event Manager with Tabs" src="https://github.com/user-attachments/assets/87740e49-bd59-420f-94dc-09f03a6dec05" />

## 📖 Documentation

### Recording Events

1. Click **Start Recording** in the WordPress Admin Bar
2. Interact with your site (click, submit forms, etc.)
3. Watch events appear in the live overlay
4. Click **Stop Recording** when done
5. Manage events in **Event Manager** tab

### Event Organization

- **Tracked** - Events sent to Rybbit
- **Ignored** - Events excluded from tracking
- **History** - Past recording sessions

## 🔧 Configuration

**Tracking Options**
- Enable/disable pageviews, SPA, forms, links
- Configure event prefixes (e.g., `kb-`, `wc-`)
- Set URL skip/mask patterns
- Adjust debounce timing

**Advanced**
- Session replay
- Development Mode
- Error tracking
- Custom configurations

## 🤝 Contributing

We welcome contributions! Check out our [Contributing Guide](CONTRIBUTING.md) and visit the [GitHub repository](https://github.com/webspirio/clickwise-wp).

## ❓ FAQ

**Do I need a Rybbit instance?**  
Yes, you need either a self-hosted Rybbit Analytics instance or access to a managed service.

**Does this send data to plugin developers?**  
No. All data goes exclusively to YOUR Rybbit instance.

**What is Rybbit Analytics?**  
[Rybbit Analytics](https://rybbit.com) is a privacy-focused analytics platform. This plugin connects your WordPress site to your Rybbit instance to track user interactions and behavior.

**Can I use this alongside Google Analytics or other analytics tools?**  
Yes! This plugin works alongside other analytics solutions without conflicts. However, this plugin **only sends data to Rybbit Analytics**—not to Google Analytics or other platforms.

**Is this GDPR compliant?**  
The plugin doesn't store personal data. Compliance depends on your Rybbit instance configuration and privacy policy.

## 📋 Requirements

- WordPress 5.0+
- PHP 7.4+
- A Rybbit Analytics instance

## 📝 License

GPLv2 or later. See [LICENSE](LICENSE) file.

## 💬 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/webspirio/clickwise-wp/issues)
- **Email**: contact@webspirio.com
- **Documentation**: [rybbit.com/docs](https://rybbit.com/docs)

## 🏆 Credits

Developed with ❤️ by [Webspirio](https://webspirio.com)  
**Oleksandr Chornous** - [contact@webspirio.com](mailto:contact@webspirio.com)

---

**Made for the WordPress community** 🌟
