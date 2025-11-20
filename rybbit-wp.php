<?php
/**
 * Plugin Name: Rybbit Analytics
 * Plugin URI: https://github.com/webspirio/rybbit-wp
 * Description: The ultimate Rybbit Analytics integration for WordPress. Tracks pageviews, custom events, form submissions, and more.
 * Version: 2.0.0
 * Author: Webspirio (Oleksandr Chornous)
 * Author URI: https://webspirio.com/
 * Contact: contact@webspirio.com
 * License: GPLv2 or later
 * Text Domain: rybbit-wp
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

// Define plugin constants
define( 'RYBBIT_WP_VERSION', '1.0.0' );
define( 'RYBBIT_WP_PATH', plugin_dir_path( __FILE__ ) );
define( 'RYBBIT_WP_URL', plugin_dir_url( __FILE__ ) );

// Include the main class
require_once RYBBIT_WP_PATH . 'includes/class-rybbit-analytics.php';

/**
 * Begins execution of the plugin.
 */
function run_rybbit_analytics_wordpress() {
	$plugin = new Rybbit_Analytics();
	$plugin->run();
}

run_rybbit_analytics_wordpress();
