<?php
/**
 * Plugin Name: Clickwise Analytics
 * Plugin URI: https://github.com/webspirio/clickwise-wp
 * Description: The ultimate Clickwise Analytics integration for WordPress. Tracks pageviews, custom events, form submissions, and more.
 * Version: 2.0.0
 * Author: Webspirio (Oleksandr Chornous)
 * Author URI: https://webspirio.com/
 * Contact: contact@webspirio.com
 * License: GPLv2 or later
 * Text Domain: clickwise
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

// Define plugin constants
define( 'CLICKWISE_VERSION', '2.0.0' );
define( 'CLICKWISE_PATH', plugin_dir_path( __FILE__ ) );
define( 'CLICKWISE_URL', plugin_dir_url( __FILE__ ) );

// Include the main class
require_once CLICKWISE_PATH . 'includes/class-clickwise-analytics.php';

/**
 * Begins execution of the plugin.
 */
function run_clickwise_analytics_wordpress() {
	$plugin = new Clickwise_Analytics();
	$plugin->run();
}

run_clickwise_analytics_wordpress();
