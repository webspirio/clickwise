<?php

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Author: Webspirio (Oleksandr Chornous)
 * Contact: contact@webspirio.com
 * @subpackage Clickwise_Analytics/includes
 * @author     Webspirio (Oleksandr Chornous) <contact@webspirio.com>
 *
 * Copyright (c) 2025 Webspirio
 * Licensed under GPLv2 or later
 */
class Clickwise_Analytics {

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
	 * Queue for server-side events.
	 *
	 * @var      array
	 */
	protected static $event_queue = array();

	/**
	 * The admin object.
	 *
	 * @var      Clickwise_Admin
	 */
	protected $plugin_admin;

	/**
	 * Define the core functionality of the plugin.
	 */
	public function __construct() {
		$this->plugin_name = 'clickwise-analytics';
		$this->version     = CLICKWISE_VERSION;

		$this->load_dependencies();
		$this->set_locale();
		
		// Instantiate admin class once
		$this->plugin_admin = new Clickwise_Admin( $this->plugin_name, $this->version );
		
		$this->define_admin_hooks();
		$this->define_public_hooks();
		$this->define_integrations();

		// Add settings link to plugins page
		add_filter( 'plugin_action_links_' . plugin_basename( CLICKWISE_PATH . 'clickwise.php' ), array( $this->plugin_admin, 'add_settings_link' ) );
	}

	/**
	 * Load the required dependencies for this plugin.
	 */
	private function load_dependencies() {
		require_once CLICKWISE_PATH . 'includes/class-clickwise-admin.php';
	}

	/**
	 * Define the locale for this plugin for internationalization.
	 */
	private function set_locale() {
		load_plugin_textdomain(
			'clickwise',
			false,
			dirname( dirname( plugin_basename( __FILE__ ) ) ) . '/languages/'
		);
	}

	/**
	 * Register all of the hooks related to the admin area functionality.
	 */
	private function define_admin_hooks() {
		$plugin_admin = $this->plugin_admin;

		add_action( 'admin_menu', array( $plugin_admin, 'add_admin_menu' ) );
		add_action( 'admin_init', array( $plugin_admin, 'register_settings' ) );
		add_action( 'admin_enqueue_scripts', array( $plugin_admin, 'enqueue_admin_scripts' ) );
		add_action( 'wp_enqueue_scripts', array( $plugin_admin, 'enqueue_admin_scripts' ) ); // For admin bar on frontend
		add_action( 'admin_bar_menu', array( $plugin_admin, 'add_admin_bar_menu' ), 999 );
		
		add_action( 'wp_ajax_clickwise_test_connection', array( $plugin_admin, 'ajax_test_connection' ) );
		add_action( 'wp_ajax_clickwise_toggle_recording', array( $plugin_admin, 'ajax_toggle_recording' ) );
		add_action( 'wp_ajax_clickwise_record_event', array( $plugin_admin, 'ajax_record_event' ) );
		add_action( 'wp_ajax_clickwise_update_event_status', array( $plugin_admin, 'ajax_update_event_status' ) );
		add_action( 'wp_ajax_clickwise_delete_session', array( $plugin_admin, 'ajax_delete_session' ) );
		add_action( 'wp_ajax_clickwise_bulk_action', array( $plugin_admin, 'ajax_bulk_action' ) );
		add_action( 'wp_ajax_clickwise_send_test_event', array( $plugin_admin, 'ajax_send_test_event' ) );
		add_action( 'wp_ajax_clickwise_test_handler', array( $plugin_admin, 'ajax_test_handler' ) );
		add_action( 'wp_ajax_clickwise_dismiss_service_notice', array( $plugin_admin, 'ajax_dismiss_service_notice' ) );
		add_action( 'wp_ajax_clickwise_test_form_feedback', array( $plugin_admin, 'ajax_test_form_feedback' ) );
		add_action( 'wp_ajax_clickwise_untrack_event', array( $plugin_admin, 'ajax_untrack_event' ) );
		
		add_action( 'admin_footer', array( $this, 'print_queued_events' ) );
	}

	/**
	 * Register all of the hooks related to the public-fng functionality.
	 */
	private function define_public_hooks() {
		add_action( 'wp_head', array( $this, 'add_tracking_code' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
		add_action( 'wp_footer', array( $this, 'print_queued_events' ) );
		add_shortcode( 'clickwise_event', array( $this, 'render_shortcode' ) );
	}

	/**
	 * Register integration hooks.
	 */
	private function define_integrations() {
		add_action( 'wp_login', array( $this, 'hook_user_login' ), 10, 2 );
		add_action( 'user_register', array( $this, 'hook_user_register' ), 10, 1 );
	}

	/**
	 * Create the custom database table for events.
	 */
	private function create_events_table() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE $table_name (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			event_key varchar(32) NOT NULL,
			type varchar(50) NOT NULL,
			name varchar(255) NOT NULL,
			alias varchar(255) DEFAULT '' NOT NULL,
			selector text,
			status varchar(20) DEFAULT 'pending' NOT NULL,
			first_seen datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
			last_seen datetime DEFAULT '0000-00-00 00:00:00' NOT NULL,
			example_detail longtext,
			session_id varchar(50),
			session_timestamp int(11),
			PRIMARY KEY  (id),
			UNIQUE KEY event_key (event_key)
		) $charset_collate;";

		require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
		dbDelta( $sql );
	}

	/**
	 * Migrate data from wp_options to custom table.
	 */
	private function migrate_events_data() {
		$events = get_option( 'clickwise_discovered_events' );
		if ( empty( $events ) || ! is_array( $events ) ) {
			return;
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		foreach ( $events as $key => $event ) {
			// Check if exists
			$exists = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $table_name WHERE event_key = %s", $key ) );
			if ( $exists ) {
				continue;
			}

			$wpdb->insert(
				$table_name,
				array(
					'event_key'         => $key,
					'type'              => isset( $event['type'] ) ? $event['type'] : 'custom',
					'name'              => isset( $event['name'] ) ? $event['name'] : '',
					'alias'             => isset( $event['alias'] ) ? $event['alias'] : '',
					'selector'          => isset( $event['selector'] ) ? $event['selector'] : '',
					'status'            => isset( $event['status'] ) ? $event['status'] : 'pending',
					'first_seen'        => isset( $event['first_seen'] ) ? date( 'Y-m-d H:i:s', $event['first_seen'] ) : current_time( 'mysql' ),
					'last_seen'         => isset( $event['last_seen'] ) ? date( 'Y-m-d H:i:s', $event['last_seen'] ) : current_time( 'mysql' ),
					'example_detail'    => isset( $event['example'] ) ? $event['example'] : '',
					'session_id'        => isset( $event['session_id'] ) ? $event['session_id'] : null,
					'session_timestamp' => isset( $event['session_timestamp'] ) ? $event['session_timestamp'] : null,
				)
			);
		}

		// Rename option to avoid re-migration, or delete it. 
		// Let's rename it for safety backup for now.
		update_option( 'clickwise_discovered_events_backup', $events );
		delete_option( 'clickwise_discovered_events' );
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 */
	public function run() {
		// Migration check on admin init, not every run
		if ( is_admin() ) {
			add_action( 'admin_init', array( $this, 'check_migration' ) );
		}
	}

	/**
	 * Check if migration is needed.
	 */
	public function check_migration() {
		if ( get_option( 'clickwise_discovered_events' ) ) {
			$this->migrate_events_data();
		}
	}

	/**
	 * Activation hook callback.
	 */
	public static function activate() {
		$plugin = new self();
		$plugin->create_events_table();
	}

	/**
	 * Add the Clickwise tracking code to the site header.
	 */
	public function add_tracking_code() {
		// Check which handlers are enabled
		$rybbit_enabled = get_option( 'clickwise_rybbit_enabled' );
		$ga_enabled = get_option( 'clickwise_ga_enabled' );

		// Add Rybbit tracking code if enabled
		if ( $rybbit_enabled ) {
			$this->add_rybbit_tracking_code();
		}

		// Add Google Analytics tracking code if enabled
		if ( $ga_enabled ) {
			$this->add_ga_tracking_code();
		}
	}

	/**
	 * Add Rybbit tracking code.
	 */
	private function add_rybbit_tracking_code() {
		// Get Rybbit handler options with fallbacks to old option names
		$script_url         = get_option( 'clickwise_rybbit_script_url', get_option( 'clickwise_script_url', 'https://tracking.example.com/api/script.js' ) );
		$site_id            = get_option( 'clickwise_rybbit_site_id', get_option( 'clickwise_site_id', '' ) );
		$api_version        = get_option( 'clickwise_rybbit_api_version', get_option( 'clickwise_api_version', 'v2' ) );
		$track_pgv          = get_option( 'clickwise_track_pgv', true );
		$track_spa          = get_option( 'clickwise_track_spa', true );
		$track_query        = get_option( 'clickwise_track_query', true );
		$track_errors       = get_option( 'clickwise_track_errors', false );
		$session_replay     = get_option( 'clickwise_session_replay', false );
		$skip_patterns_text = get_option( 'clickwise_skip_patterns', '' );
		$mask_patterns_text = get_option( 'clickwise_mask_patterns', '' );
		$debounce           = get_option( 'clickwise_debounce', 500 );

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
	 * Add Google Analytics tracking code.
	 */
	private function add_ga_tracking_code() {
		$ga_measurement_id = get_option( 'clickwise_ga_measurement_id', '' );

		if ( empty( $ga_measurement_id ) ) {
			return;
		}

		// Add Google Analytics gtag script
		echo "<!-- Google Analytics -->\n";
		echo "<script async src=\"https://www.googletagmanager.com/gtag/js?id=" . esc_attr( $ga_measurement_id ) . "\"></script>\n";
		echo "<script>\n";
		echo "  window.dataLayer = window.dataLayer || [];\n";
		echo "  function gtag(){dataLayer.push(arguments);}\n";
		echo "  gtag('js', new Date());\n";
		echo "  gtag('config', '" . esc_js( $ga_measurement_id ) . "');\n";
		echo "</script>\n";
		echo "<!-- End Google Analytics -->\n";
	}

	/**
	 * Enqueue the frontend tracking script.
	 */
	public function enqueue_scripts() {
		wp_enqueue_script( $this->plugin_name, CLICKWISE_URL . 'assets/js/clickwise-tracker.js', array(), $this->version, true );

		// Pass settings to JS
		$event_prefixes = get_option( 'clickwise_event_prefixes', 'kb-, wc-, custom-' );
		$track_forms    = get_option( 'clickwise_track_forms', true );
		$track_links    = get_option( 'clickwise_track_links', true );
		$dev_mode       = get_option( 'clickwise_dev_mode', false ) && current_user_can( 'manage_options' );
		$ignore_admin   = get_option( 'clickwise_ignore_admin', true );
		
		$recording_mode = false;
		if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {
			$recording_mode = get_user_meta( get_current_user_id(), 'clickwise_recording_mode', true );
		}

		// Get managed events from database table
		$all_events = $this->get_managed_events_for_js();
		$managed_events = array();
		foreach ( $all_events as $key => $event ) {
			if ( $event['status'] === 'tracked' ) {
				$managed_events[] = $event;
			}
		}

		// Process event rules - supports old prefixes and new rule-based format
		$event_rules = $this->process_prefixes_list( $event_prefixes );
		if ( empty( $event_rules ) ) {
			$event_rules = array( 'kb-', 'wc-', 'custom-' );
		}

		// Get handler settings
		$rybbit_enabled = get_option( 'clickwise_rybbit_enabled' );
		$ga_enabled = get_option( 'clickwise_ga_enabled' );
		$ga_measurement_id = get_option( 'clickwise_ga_measurement_id', '' );

		wp_localize_script( $this->plugin_name, 'clickwise_config', array(
			'event_rules'        => $event_rules,
			'track_forms'        => (bool) $track_forms,
			'track_links'        => (bool) $track_links,
			'dev_mode'           => (bool) $dev_mode,
			'ignore_admin'       => (bool) $ignore_admin,
			'recording_mode'     => (bool) $recording_mode,
			'managed_events'     => $managed_events,
			'ajax_url'           => admin_url( 'admin-ajax.php' ),
			'admin_url'          => admin_url( 'admin.php?page=clickwise-settings' ),
			'nonce'              => wp_create_nonce( 'clickwise_admin_nonce' ),
			'events'             => $this->get_managed_events_for_js(),
			'handlers'           => array(
				'rybbit' => array(
					'enabled' => (bool) $rybbit_enabled
				),
				'ga' => array(
					'enabled' => (bool) $ga_enabled,
					'measurement_id' => $ga_measurement_id
				)
			)
		) );

		if ( $recording_mode ) {
			wp_enqueue_style( 'clickwise-recorder-css', CLICKWISE_URL . 'assets/css/clickwise-recorder.css', array(), $this->version );
			wp_enqueue_script( 'clickwise-recorder-js', CLICKWISE_URL . 'assets/js/clickwise-recorder.js', array( $this->plugin_name ), $this->version, true );
		}

		if ( $dev_mode ) {
			wp_enqueue_style( 'clickwise-dev-css', CLICKWISE_URL . 'assets/css/clickwise-dev.css', array(), $this->version );
			wp_enqueue_script( 'clickwise-dev-js', CLICKWISE_URL . 'assets/js/clickwise-dev.js', array( $this->plugin_name ), $this->version, true );
		}
	}

	/**
	 * Helper to get managed events from DB for JS.
	 */
	private function get_managed_events_for_js() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';
		// Check if table exists first to avoid errors on fresh install before migration runs
		if ( $wpdb->get_var( "SHOW TABLES LIKE '$table_name'" ) != $table_name ) {
			return array();
		}
		
		$results = $wpdb->get_results( "SELECT * FROM $table_name", ARRAY_A );
		$events = array();
		if ( $results ) {
			foreach ( $results as $row ) {
				$events[ $row['event_key'] ] = $row;
			}
		}
		return $events;
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

	/**
	 * Helper to process event rules - supports old formats and new rule-based format.
	 */
	private function process_prefixes_list( $rules_text ) {
		if ( empty( $rules_text ) ) {
			return array();
		}

		// Try to decode as JSON (new rule-based format)
		$rules = json_decode( $rules_text, true );
		if ( is_array( $rules ) && isset( $rules[0] ) && isset( $rules[0]['type'] ) ) {
			// New rule-based format - convert to JavaScript-compatible array
			return $this->convert_rules_to_js_format( $rules );
		}

		// Legacy format - handle both comma and line separated
		if ( strpos( $rules_text, "\n" ) !== false || strpos( $rules_text, "\r" ) !== false ) {
			$prefixes = preg_split( '/\r\n|\r|\n/', $rules_text );
		} else {
			$prefixes = explode( ',', $rules_text );
		}

		$prefixes = array_filter( $prefixes, function ( $line ) {
			return trim( $line ) !== '';
		} );
		return array_map( 'trim', $prefixes );
	}

	/**
	 * Convert rules array to JavaScript-compatible format for frontend matching.
	 */
	private function convert_rules_to_js_format( $rules ) {
		$js_rules = array();

		foreach ( $rules as $rule ) {
			if ( empty( $rule['value'] ) || empty( $rule['type'] ) ) {
				continue;
			}

			$js_rules[] = array(
				'type' => $rule['type'],
				'value' => $rule['value'],
				'description' => isset( $rule['description'] ) ? $rule['description'] : ''
			);
		}

		return $js_rules;
	}

	/**
	 * Track an event from the server-side.
	 *
	 * @param string $name       The event name.
	 * @param array  $properties Optional event properties.
	 */
	public static function track_event( $name, $properties = array() ) {
		if ( empty( $name ) ) {
			return;
		}
		
		$event = array(
			'name'       => $name,
			'properties' => $properties,
		);

		self::$event_queue[] = $event;

		// Persist if user is logged in (handles redirects)
		if ( is_user_logged_in() ) {
			$user_id = get_current_user_id();
			$transient_key = 'clickwise_event_queue_' . $user_id;
			$queued = get_transient( $transient_key );
			if ( ! is_array( $queued ) ) {
				$queued = array();
			}
			$queued[] = $event;
			set_transient( $transient_key, $queued, 60 );
		}
	}

	/**
	 * Print queued events to the footer.
	 */
	public function print_queued_events() {
		$events = self::$event_queue;

		// Check for persisted events
		if ( is_user_logged_in() ) {
			$user_id = get_current_user_id();
			$transient_key = 'clickwise_event_queue_' . $user_id;
			$persisted = get_transient( $transient_key );
			if ( is_array( $persisted ) && ! empty( $persisted ) ) {
				$events = array_merge( $events, $persisted );
				delete_transient( $transient_key );
			}
		}

		// Deduplicate based on name and properties to avoid double firing if both queue and transient have it (edge case)
		$events = array_map("unserialize", array_unique(array_map("serialize", $events)));

		if ( empty( $events ) ) {
			return;
		}

		// Check which handlers are enabled
		$rybbit_enabled = get_option( 'clickwise_rybbit_enabled' );
		$ga_enabled = get_option( 'clickwise_ga_enabled' );

		echo "<script>\n";
		echo "window.addEventListener('load', function() {\n";

		// Send to Rybbit if enabled
		if ( $rybbit_enabled ) {
			echo "    if (window.rybbit && window.rybbit.event) {\n";
			foreach ( $events as $event ) {
				$name_json = json_encode( $event['name'] );
				$props_json = ! empty( $event['properties'] ) ? json_encode( $event['properties'] ) : '{}';
				echo "        window.rybbit.event($name_json, $props_json);\n";
			}
			echo "    }\n";
		}

		// Send to Google Analytics if enabled and configured
		if ( $ga_enabled ) {
			$ga_measurement_id = get_option( 'clickwise_ga_measurement_id' );
			if ( $ga_measurement_id ) {
				echo "    if (window.gtag) {\n";
				foreach ( $events as $event ) {
					$event_name = $this->sanitize_ga_event_name( $event['name'] );
					$event_params = ! empty( $event['properties'] ) ? json_encode( $event['properties'] ) : '{}';
					echo "        window.gtag('event', '$event_name', $event_params);\n";
				}
				echo "    }\n";
			}
		}

		echo "});\n";
		echo "</script>\n";
	}

	/**
	 * Sanitize event name for Google Analytics.
	 */
	private function sanitize_ga_event_name( $name ) {
		// GA event names must be alphanumeric and underscores only, max 40 chars
		$name = preg_replace( '/[^a-zA-Z0-9_]/', '_', $name );
		$name = substr( $name, 0, 40 );
		return $name;
	}

	/**
	 * Hook: User Login
	 */
	public function hook_user_login( $user_login, $user ) {
		self::track_event( 'login', array( 'method' => 'wp_login' ) );
	}

	/**
	 * Hook: User Register
	 */
	public function hook_user_register( $user_id ) {
		self::track_event( 'signup', array( 'method' => 'user_register' ) );
	}

	/**
	 * Shortcode: [clickwise_event]
	 */
	public function render_shortcode( $atts, $content = null ) {
		$a = shortcode_atts( array(
			'type'   => 'click',
			'name'   => 'custom_event',
			'detail' => '',
			'class'  => '',
			'tag'    => 'span',
		), $atts );

		$tag = sanitize_text_field( $a['tag'] );
		// Allow only safe tags
		if ( ! in_array( $tag, array( 'span', 'div', 'button', 'a', 'p' ) ) ) {
			$tag = 'span';
		}

		$attrs = array(
			'class'              => esc_attr( $a['class'] ),
			'data-clickwise-action' => esc_attr( $a['type'] ),
			'data-clickwise-name'   => esc_attr( $a['name'] ),
		);

		if ( ! empty( $a['detail'] ) ) {
			$attrs['data-clickwise-detail'] = esc_attr( $a['detail'] );
		}

		$attr_str = '';
		foreach ( $attrs as $k => $v ) {
			if ( ! empty( $v ) ) {
				$attr_str .= " $k=\"$v\"";
			}
		}

		return "<$tag$attr_str>" . do_shortcode( $content ) . "</$tag>";
	}
}
