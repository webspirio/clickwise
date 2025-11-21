<?php

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Author: Webspirio (Oleksandr Chornous)
 * Contact: contact@webspirio.com
 * @subpackage Rybbit_Analytics/includes
 * @author     Webspirio (Oleksandr Chornous) <contact@webspirio.com>
 *
 * Copyright (c) 2025 Webspirio
 * Licensed under GPLv2 or later
 */
class Rybbit_Analytics {

	/**
	 * The unique identifier of this plugin.
	 *
	 * @var      string
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @var      string
	 */
	protected $version;

	/**
	 * Define the core functionality of the plugin.
	 */
	public function __construct() {
		$this->plugin_name = 'webspirio-rybbit-analytics';
		$this->version     = RYBBIT_WP_VERSION;

		$this->load_dependencies();
		$this->set_locale();
		$this->define_admin_hooks();
		$this->define_public_hooks();

		// Add settings link to plugins page
		$plugin_admin = new Rybbit_Admin( $this->plugin_name, $this->version );
		add_filter( 'plugin_action_links_' . plugin_basename( RYBBIT_WP_PATH . 'webspirio-rybbit-analytics.php' ), array( $plugin_admin, 'add_settings_link' ) );
	}

	/**
	 * Load the required dependencies for this plugin.
	 */
	private function load_dependencies() {
		require_once RYBBIT_WP_PATH . 'includes/class-rybbit-admin.php';
	}

	/**
	 * Define the locale for this plugin for internationalization.
	 */
	private function set_locale() {
		load_plugin_textdomain(
			'rybbit-wp',
			false,
			dirname( dirname( plugin_basename( __FILE__ ) ) ) . '/languages/'
		);
	}

	/**
	 * Register all of the hooks related to the admin area functionality.
	 */
	private function define_admin_hooks() {
		$plugin_admin = new Rybbit_Admin( $this->plugin_name, $this->version );

		add_action( 'admin_menu', array( $plugin_admin, 'add_admin_menu' ) );
		add_action( 'admin_init', array( $plugin_admin, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $plugin_admin, 'enqueue_admin_scripts' ) );
		add_action( 'wp_enqueue_scripts', array( $plugin_admin, 'enqueue_admin_scripts' ) ); // For admin bar on frontend
		add_action( 'admin_bar_menu', array( $plugin_admin, 'add_admin_bar_menu' ), 999 );
		
		add_action( 'wp_ajax_rybbit_test_connection', array( $plugin_admin, 'ajax_test_connection' ) );
		add_action( 'wp_ajax_rybbit_toggle_recording', array( $plugin_admin, 'ajax_toggle_recording' ) );
		add_action( 'wp_ajax_rybbit_record_event', array( $plugin_admin, 'ajax_record_event' ) );
		add_action( 'wp_ajax_rybbit_update_event_status', array( $plugin_admin, 'ajax_update_event_status' ) );
		add_action( 'wp_ajax_rybbit_delete_session', array( $plugin_admin, 'ajax_delete_session' ) );
		add_action( 'wp_ajax_rybbit_bulk_action', array( $plugin_admin, 'ajax_bulk_action' ) );
		add_action( 'wp_ajax_rybbit_send_test_event', array( $plugin_admin, 'ajax_send_test_event' ) );
		

	}

	/**
	 * Register all of the hooks related to the public-fng functionality.
	 */
	private function define_public_hooks() {
		add_action( 'wp_head', array( $this, 'add_tracking_code' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 */
	public function run() {
		// Hooks are registered in the constructor
	}

	/**
	 * Add the Rybbit tracking code to the site header.
	 */
	public function add_tracking_code() {
		// Get options with defaults
		$script_url         = get_option( 'rybbit_script_url', 'https://tracking.example.com/api/script.js' );
		$site_id            = get_option( 'rybbit_site_id', '' );
		$api_version        = get_option( 'rybbit_api_version', 'v1' );
		$track_pgv          = get_option( 'rybbit_track_pgv', true );
		$track_spa          = get_option( 'rybbit_track_spa', true );
		$track_query        = get_option( 'rybbit_track_query', true );
		$track_errors       = get_option( 'rybbit_track_errors', false );
		$session_replay     = get_option( 'rybbit_session_replay', false );
		$skip_patterns_text = get_option( 'rybbit_skip_patterns', '' );
		$mask_patterns_text = get_option( 'rybbit_mask_patterns', '' );
		$debounce           = get_option( 'rybbit_debounce', 500 );

		// Validate script URL
		if ( empty( $script_url ) || ! filter_var( $script_url, FILTER_VALIDATE_URL ) ) {
			return;
		}

		// Validate site ID
		if ( empty( $site_id ) ) {
			return;
		}

		// Validate debounce value
		$debounce = absint( $debounce );
		if ( $debounce < 1 ) {
			$debounce = 500;
		} else if ( $debounce > 10000 ) {
			$debounce = 10000;
		}

		// Process patterns
		$skip_patterns_json = $this->process_patterns( $skip_patterns_text );
		$mask_patterns_json = $this->process_patterns( $mask_patterns_text );

		// Output the script
		echo "<script\n";
		echo "    src=\"" . esc_url( $script_url ) . "\"\n";
		echo "    data-site-id=\"" . esc_attr( $site_id ) . "\"\n";

		if ( ! empty( $skip_patterns_json ) ) {
			echo "    data-skip-patterns='" . $skip_patterns_json . "'\n";
		}

		if ( ! empty( $mask_patterns_json ) ) {
			echo "    data-mask-patterns='" . $mask_patterns_json . "'\n";
		}

		if ( $debounce != 500 ) {
			echo "    data-debounce=\"" . esc_attr( $debounce ) . "\"\n";
		}

		if ( $api_version === 'v1' ) {
			if ( ! $track_pgv ) echo "    data-auto-track-pageview=\"false\"\n";
			if ( ! $track_spa ) echo "    data-track-spa=\"false\"\n";
			if ( ! $track_query ) echo "    data-track-query=\"false\"\n";
			if ( $track_errors ) echo "    data-track-errors=\"true\"\n";
			if ( $session_replay ) echo "    data-session-replay=\"true\"\n";
		}

		echo "    defer\n";
		echo "></script>\n";
	}

	/**
	 * Enqueue the frontend tracking script.
	 */
	public function enqueue_scripts() {
		wp_enqueue_script( $this->plugin_name, RYBBIT_WP_URL . 'assets/js/rybbit-tracker.js', array(), $this->version, true );

		// Pass settings to JS
		$event_prefixes = get_option( 'rybbit_event_prefixes', 'kb-, wc-, custom-' );
		$track_forms    = get_option( 'rybbit_track_forms', true );
		$track_links    = get_option( 'rybbit_track_links', true );
		$dev_mode       = get_option( 'rybbit_dev_mode', false );
		
		$recording_mode = false;
		if ( is_user_logged_in() ) {
			$recording_mode = get_user_meta( get_current_user_id(), 'rybbit_recording_mode', true );
		}

		$discovered_events = get_option( 'rybbit_discovered_events', array() );
		$managed_events = array();
		foreach ( $discovered_events as $key => $event ) {
			if ( $event['status'] === 'tracked' ) {
				$managed_events[] = $event;
			}
		}

		// Process prefixes into array
		$prefixes_array = array_filter( array_map( 'trim', explode( ',', $event_prefixes ) ) );
		if ( empty( $prefixes_array ) ) {
			$prefixes_array = array( 'kb-', 'wc-', 'custom-' );
		}

		wp_localize_script( $this->plugin_name, 'rybbit_config', array(
			'prefixes'       => $prefixes_array,
			'track_forms'    => (bool) $track_forms,
			'track_links'    => (bool) $track_links,
			'dev_mode'       => (bool) $dev_mode,
			'recording_mode' => (bool) $recording_mode,
			'managed_events' => $managed_events,
			'ajax_url'       => admin_url( 'admin-ajax.php' ),
			'admin_url'      => admin_url( 'admin.php?page=rybbit-analytics' ),
			'nonce'          => wp_create_nonce( 'rybbit_admin_nonce' ), // Reuse admin nonce for recording
			'events'         => get_option( 'rybbit_discovered_events', array() )
		) );
	}

	/**
	 * Helper to process pattern textareas.
	 */
	private function process_patterns( $patterns_text ) {
		if ( empty( $patterns_text ) ) {
			return '';
		}
		$patterns = preg_split( '/\r\n|\r|\n/', $patterns_text );
		$patterns = array_filter( $patterns, function ( $line ) {
			return trim( $line ) !== '';
		} );
		$patterns = array_map( 'trim', $patterns );
		return json_encode( array_values( $patterns ), JSON_UNESCAPED_SLASHES );
	}
}
