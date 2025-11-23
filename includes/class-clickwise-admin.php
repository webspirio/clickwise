<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://webspirio.com
 * @since      1.0.0
 *
 * @package    Webspirio_Clickwise_Analytics
 * @subpackage Webspirio_Clickwise_Analytics/includes
 * @author     Webspirio (Oleksandr Chornous) <contact@webspirio.com>
 *
 * Copyright (c) 2025 Webspirio
 * Licensed under GPLv2 or later
 */
class Clickwise_Admin {

	private $plugin_name;
	private $version;

	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version     = $version;
	}

	public function add_admin_menu() {
		add_options_page(
			'Clickwise Analytics',
			'Clickwise Analytics',
			'manage_options',
			'clickwise-settings',
			array( $this, 'display_options_page' )
		);
	}

	public function add_admin_bar_menu( $wp_admin_bar ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$is_recording = get_user_meta( get_current_user_id(), 'clickwise_recording_mode', true );
		$title = $is_recording ? '● Recording Events' : 'Clickwise Analytics';
		
		$meta = array();
		if ( $is_recording ) {
			$meta['class'] = 'clickwise-recording-active';
		}

		$wp_admin_bar->add_node( array(
			'id'    => 'clickwise-analytics',
			'title' => $title,
			'href'  => admin_url( 'options-general.php?page=clickwise-settings&tab=events_manager' ),
			'meta'  => $meta
		) );

		$wp_admin_bar->add_node( array(
			'id'     => 'clickwise-toggle-recording',
			'parent' => 'clickwise-analytics',
			'title'  => $is_recording ? 'Stop Recording' : 'Start Recording',
			'href'   => '#',
			'meta'   => array(
				'onclick' => 'clickwiseToggleRecording(event)',
			),
		) );

		$wp_admin_bar->add_node( array(
			'id'     => 'clickwise-manage-events',
			'parent' => 'clickwise-analytics',
			'title'  => 'Manage Events',
			'href'   => admin_url( 'options-general.php?page=clickwise-settings&tab=events_manager' ),
		) );
	}

	public function enqueue_admin_scripts( $hook ) {
		// Enqueue on settings page AND frontend (for admin bar)
		if ( 'settings_page_clickwise-settings' === $hook || ! is_admin() ) {
			if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {
			wp_enqueue_style( 'clickwise-admin-css', CLICKWISE_URL . 'assets/css/clickwise-admin.css', array(), CLICKWISE_VERSION );
			wp_enqueue_style( 'clickwise-admin-bar-css', CLICKWISE_URL . 'assets/css/clickwise-admin-bar.css', array(), CLICKWISE_VERSION );
			wp_enqueue_style( 'clickwise-pattern-ui-css', CLICKWISE_URL . 'assets/css/clickwise-pattern-ui.css', array(), CLICKWISE_VERSION );
			wp_enqueue_style( 'clickwise-event-rules-css', CLICKWISE_URL . 'assets/css/clickwise-event-rules.css', array(), CLICKWISE_VERSION );
			wp_enqueue_style( 'clickwise-form-feedback-css', CLICKWISE_URL . 'assets/css/clickwise-form-feedback.css', array(), CLICKWISE_VERSION );
			wp_enqueue_style( 'clickwise-google-fonts', 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap', array(), null );
			wp_enqueue_script( 'clickwise-admin', CLICKWISE_URL . 'assets/js/clickwise-admin.js', array( 'jquery' ), CLICKWISE_VERSION, true );
			wp_enqueue_script( 'clickwise-pattern-ui', CLICKWISE_URL . 'assets/js/clickwise-pattern-ui.js', array( 'jquery' ), CLICKWISE_VERSION, true );
			wp_enqueue_script( 'clickwise-event-rules', CLICKWISE_URL . 'assets/js/clickwise-event-rules.js', array( 'jquery' ), CLICKWISE_VERSION, true );
			wp_enqueue_script( 'clickwise-tab-transitions', CLICKWISE_URL . 'assets/js/clickwise-tab-transitions.js', array( 'jquery' ), CLICKWISE_VERSION, true );
			wp_enqueue_script( 'clickwise-form-feedback', CLICKWISE_URL . 'assets/js/clickwise-form-feedback.js', array( 'jquery' ), CLICKWISE_VERSION, true );
				wp_localize_script( 'clickwise-admin', 'clickwise_admin', array(
					'ajax_url' => admin_url( 'admin-ajax.php' ),
					'nonce'    => wp_create_nonce( 'clickwise_admin_nonce' ),
					'events'   => $this->get_events_for_admin_js(),
					'script_url' => get_option( 'clickwise_script_url' ),
					'site_id'    => get_option( 'clickwise_site_id' )
				) );
			}
		}
	}

	public function ajax_toggle_recording() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$user_id = get_current_user_id();
		$current = get_user_meta( $user_id, 'clickwise_recording_mode', true );
		$new_state = ! $current;
		
		update_user_meta( $user_id, 'clickwise_recording_mode', $new_state );

		if ( $new_state ) {
			// Start new session
			$session_id = uniqid( 'sess_' );
			update_user_meta( $user_id, 'clickwise_current_session_id', $session_id );
			update_user_meta( $user_id, 'clickwise_current_session_start', time() );
		}

		wp_send_json_success( $new_state );
	}

	public function ajax_record_event() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$event_data = isset( $_POST['event'] ) ? $_POST['event'] : array();
		if ( empty( $event_data ) || empty( $event_data['type'] ) || empty( $event_data['detail'] ) ) {
			wp_send_json_error( 'Invalid event data' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$type     = sanitize_text_field( $event_data['type'] );
		$detail   = $event_data['detail']; // Already an object/array from JS
		$selector = isset( $event_data['selector'] ) ? sanitize_text_field( $event_data['selector'] ) : '';
		
		$name = isset( $event_data['name'] ) ? sanitize_text_field( $event_data['name'] ) : $type;

		// Generate a unique key for the event based on type and selector (or name if custom)
		// For clicks/forms, selector is key. For custom events, type is key.
		$key_string = $type . '|' . $selector;
		$event_key  = md5( $key_string );

		// Check if exists
		$existing = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_name WHERE event_key = %s", $event_key ), ARRAY_A );

		$now = current_time( 'mysql' );
		
		// Use provided session ID or generate new one
		$session_id = isset( $_POST['session_id'] ) && ! empty( $_POST['session_id'] ) 
			? sanitize_text_field( $_POST['session_id'] ) 
			: uniqid( 'sess_' );

		if ( $existing ) {
			// Update last seen
			$wpdb->update(
				$table_name,
				array(
					'last_seen' => $now,
					'example_detail' => json_encode( $detail ), // Update example with latest
					// Optionally update name if it was generic before? 
					// Let's update name if the existing one is just the type (generic) and we have a better one now
					'name' => ($existing['name'] === $existing['type'] && $name !== $type) ? $name : $existing['name'],
					'session_id' => $session_id,
					'session_timestamp' => time()
				),
				array( 'id' => $existing['id'] )
			);
			$status = $existing['status'];
		} else {
			// Insert new
			$wpdb->insert(
				$table_name,
				array(
					'event_key'      => $event_key,
					'type'           => $type,
					'name'           => $name,
					'alias'          => '',
					'selector'       => $selector,
					'status'         => 'pending',
					'first_seen'     => $now,
					'last_seen'      => $now,
					'example_detail' => json_encode( $detail ),
					'session_id'     => $session_id,
					'session_timestamp' => time()
				)
			);
			$status = 'pending';
		}

		wp_send_json_success( array( 'status' => $status, 'key' => $event_key ) );
	}

	public function ajax_update_event_status() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$key    = isset( $_POST['key'] ) ? sanitize_text_field( $_POST['key'] ) : '';
		$status = isset( $_POST['status'] ) ? sanitize_text_field( $_POST['status'] ) : '';
		$alias  = isset( $_POST['alias'] ) ? sanitize_text_field( $_POST['alias'] ) : '';

		if ( empty( $key ) || empty( $status ) ) {
			wp_send_json_error( 'Missing parameters' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$data = array( 'status' => $status );
		if ( isset( $_POST['alias'] ) ) {
			$data['alias'] = $alias;
		}

		$updated = $wpdb->update(
			$table_name,
			$data,
			array( 'event_key' => $key )
		);

		if ( $updated !== false ) {
			wp_send_json_success( 'Event updated' );
		} else {
			wp_send_json_error( 'Update failed' );
		}
	}

	public function ajax_untrack_event() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$key = isset( $_POST['key'] ) ? sanitize_text_field( $_POST['key'] ) : '';
		$action = isset( $_POST['action_type'] ) ? sanitize_text_field( $_POST['action_type'] ) : 'untrack';

		if ( empty( $key ) ) {
			wp_send_json_error( 'Missing event key' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		// Determine new status based on action
		if ( $action === 'untrack' ) {
			$new_status = 'ignored';
			$success_message = 'Event untracked successfully';
		} else {
			$new_status = 'tracked';
			$success_message = 'Event tracked successfully';
		}

		// Update the status
		$updated = $wpdb->update(
			$table_name,
			array( 'status' => $new_status ),
			array( 'event_key' => $key )
		);

		if ( $updated !== false ) {
			wp_send_json_success( array(
				'message' => $success_message,
				'new_status' => $new_status,
				'new_action' => $new_status === 'tracked' ? 'untrack' : 'track',
				'new_text' => $new_status === 'tracked' ? 'Untrack' : 'Track'
			) );
		} else {
			wp_send_json_error( 'Status update failed' );
		}
	}

	public function ajax_delete_session() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$session_id = isset( $_POST['session_id'] ) ? sanitize_text_field( $_POST['session_id'] ) : '';

		if ( empty( $session_id ) ) {
			wp_send_json_error( 'Missing session ID' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		// 1. Unlink tracked events from this session (preserve them)
		$wpdb->query( $wpdb->prepare( 
			"UPDATE $table_name SET session_id = NULL, session_timestamp = NULL WHERE session_id = %s AND status = 'tracked'", 
			$session_id 
		) );

		// 2. Delete non-tracked events from this session
		$wpdb->query( $wpdb->prepare( 
			"DELETE FROM $table_name WHERE session_id = %s", 
			$session_id 
		) );

		wp_send_json_success( 'Session deleted' );
	}

	public function ajax_bulk_action() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$action = isset( $_POST['bulk_action'] ) ? sanitize_text_field( $_POST['bulk_action'] ) : '';
		$keys   = isset( $_POST['keys'] ) ? $_POST['keys'] : array();

		if ( empty( $action ) || empty( $keys ) || ! is_array( $keys ) ) {
			wp_send_json_error( 'Invalid request' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$sanitized_keys = array_map( 'sanitize_text_field', $keys );
		// Prepare IN clause
		$placeholders = implode( ',', array_fill( 0, count( $sanitized_keys ), '%s' ) );

		if ( $action === 'delete' ) {
			$sql = "DELETE FROM $table_name WHERE event_key IN ($placeholders)";
			$wpdb->query( $wpdb->prepare( $sql, $sanitized_keys ) );
		} elseif ( in_array( $action, array( 'track', 'ignore', 'pending' ) ) ) {
			$sql = "UPDATE $table_name SET status = %s WHERE event_key IN ($placeholders)";
			$params = array_merge( array( $action ), $sanitized_keys );
			$wpdb->query( $wpdb->prepare( $sql, $params ) );
		}

		wp_send_json_success( 'Bulk action completed' );
	}

	public function ajax_test_connection() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$url = isset( $_POST['url'] ) ? esc_url_raw( $_POST['url'] ) : '';

		if ( empty( $url ) || ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
			wp_send_json_error( 'Invalid URL' );
		}

		$response = wp_remote_head( $url, array( 'timeout' => 5 ) );

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( 'Connection failed: ' . $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );

		if ( $code >= 200 && $code < 300 ) {
			wp_send_json_success( 'Connection successful! Script found.' );
		} else {
			wp_send_json_error( 'Connection failed. HTTP Status: ' . $code );
		}
	}

	public function add_settings_link( $links ) {
		$settings_link = '<a href="options-general.php?page=clickwise-settings">Settings</a>';
		array_unshift( $links, $settings_link );
		return $links;
	}

	public function register_settings() {
		// --- Rybbit Handler Settings ---
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_enabled' );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_script_url' );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_site_id' );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_api_version' );

		// --- Google Analytics Handler Settings ---
		register_setting( 'clickwise-settings-google-analytics', 'clickwise_ga_enabled' );
		register_setting( 'clickwise-settings-google-analytics', 'clickwise_ga_measurement_id' );
		register_setting( 'clickwise-settings-google-analytics', 'clickwise_ga_api_secret' );

		// --- General Settings ---
		// (Handler settings moved to handlers tab)
		register_setting( 'clickwise-settings-general', 'clickwise_track_pgv' );
		register_setting( 'clickwise-settings-general', 'clickwise_track_spa' );
		register_setting( 'clickwise-settings-general', 'clickwise_track_query' );
		register_setting( 'clickwise-settings-general', 'clickwise_track_errors' );
		register_setting( 'clickwise-settings-general', 'clickwise_dev_mode' );
		register_setting( 'clickwise-settings-general', 'clickwise_ignore_admin' );

		// --- Events Settings ---
		register_setting( 'clickwise-settings-events', 'clickwise_event_prefixes' );
		register_setting( 'clickwise-settings-events', 'clickwise_track_forms' );
		register_setting( 'clickwise-settings-events', 'clickwise_track_links' );

		// --- Advanced Settings ---
		register_setting( 'clickwise-settings-advanced', 'clickwise_skip_patterns' );
		register_setting( 'clickwise-settings-advanced', 'clickwise_mask_patterns' );
		register_setting( 'clickwise-settings-advanced', 'clickwise_debounce' );
		register_setting( 'clickwise-settings-advanced', 'clickwise_session_replay' );

		// --- Tab: Rybbit Handler ---
		add_settings_section( 'clickwise_rybbit_section', 'Rybbit Analytics Configuration', array( $this, 'render_rybbit_section_description' ), 'clickwise-settings-rybbit' );

		add_settings_field( 'clickwise_rybbit_enabled', 'Enable Rybbit Analytics', array( $this, 'render_rybbit_enabled_field' ), 'clickwise-settings-rybbit', 'clickwise_rybbit_section' );

		add_settings_field( 'clickwise_rybbit_script_url', 'Script URL', array( $this, 'render_rybbit_script_url_field' ), 'clickwise-settings-rybbit', 'clickwise_rybbit_section' );

		add_settings_field( 'clickwise_rybbit_site_id', 'Site ID', array( $this, 'render_rybbit_site_id_field' ), 'clickwise-settings-rybbit', 'clickwise_rybbit_section' );

		add_settings_field( 'clickwise_rybbit_api_version', 'API Version', array( $this, 'render_rybbit_api_version_field' ), 'clickwise-settings-rybbit', 'clickwise_rybbit_section' );

		add_settings_field( 'clickwise_rybbit_test', 'Test Connection', array( $this, 'render_rybbit_test_field' ), 'clickwise-settings-rybbit', 'clickwise_rybbit_section' );

		// --- Tab: Google Analytics Handler ---
		add_settings_section( 'clickwise_ga_section', 'Google Analytics 4 Configuration', array( $this, 'render_ga_section_description' ), 'clickwise-settings-google-analytics' );

		add_settings_field( 'clickwise_ga_enabled', 'Enable Google Analytics 4', array( $this, 'render_ga_enabled_field' ), 'clickwise-settings-google-analytics', 'clickwise_ga_section' );

		add_settings_field( 'clickwise_ga_measurement_id', 'Measurement ID', array( $this, 'render_ga_measurement_id_field' ), 'clickwise-settings-google-analytics', 'clickwise_ga_section' );

		add_settings_field( 'clickwise_ga_api_secret', 'API Secret', array( $this, 'render_ga_api_secret_field' ), 'clickwise-settings-google-analytics', 'clickwise_ga_section' );

		add_settings_field( 'clickwise_ga_test', 'Test Connection', array( $this, 'render_ga_test_field' ), 'clickwise-settings-google-analytics', 'clickwise_ga_section' );

		// --- Tab: General ---
		add_settings_section( 'clickwise_general_section', 'General Configuration', null, 'clickwise-settings-general' );

		add_settings_field( 'clickwise_track_pgv', 'Pageviews', array( $this, 'render_checkbox_field' ), 'clickwise-settings-general', 'clickwise_general_section', array( 
			'id' => 'clickwise_track_pgv', 
			'label' => 'Track initial pageview',
			'desc' => 'Automatically track a pageview event when a page loads. Disable this if you want to manually trigger pageviews.'
		) );
		add_settings_field( 'clickwise_track_spa', 'SPA Support', array( $this, 'render_checkbox_field' ), 'clickwise-settings-general', 'clickwise_general_section', array( 
			'id' => 'clickwise_track_spa', 
			'label' => 'Track virtual pageviews on History API changes',
			'desc' => 'Enable this for Single Page Applications (SPAs) to track pageviews when the URL changes without a full reload.'
		) );
		add_settings_field( 'clickwise_track_query', 'Query Parameters', array( $this, 'render_checkbox_field' ), 'clickwise-settings-general', 'clickwise_general_section', array( 
			'id' => 'clickwise_track_query', 
			'label' => 'Include URL query parameters in tracking',
			'desc' => 'If enabled, the full URL with query parameters (e.g., ?utm_source=google) will be recorded. Useful for marketing attribution.'
		) );
		add_settings_field( 'clickwise_track_errors', 'JavaScript Errors', array( $this, 'render_checkbox_field' ), 'clickwise-settings-general', 'clickwise_general_section', array( 
			'id' => 'clickwise_track_errors', 
			'label' => 'Automatically track JavaScript errors',
			'desc' => 'Capture uncaught JavaScript exceptions and send them as error events to Rybbit.'
		) );
		add_settings_field( 'clickwise_dev_mode', 'Debug Mode', array( $this, 'render_checkbox_field' ), 'clickwise-settings-general', 'clickwise_general_section', array( 
			'id' => 'clickwise_dev_mode', 
			'label' => 'Enable Developer Mode',
			'desc' => 'Log all tracking events to the browser console for debugging purposes.'
		) );
		add_settings_field( 'clickwise_ignore_admin', 'Ignore Admin Interface', array( $this, 'render_checkbox_field' ), 'clickwise-settings-general', 'clickwise_general_section', array( 
			'id' => 'clickwise_ignore_admin', 
			'label' => 'Ignore interactions with Admin Bar and Plugin UI',
			'desc' => 'Prevents tracking of clicks on the WordPress Admin Bar and Clickwise Recorder interface.'
		) );

		// Note: Handler-specific settings are now in the Handlers tab

		// --- Tab: Events & Forms ---
		add_settings_section( 'clickwise_events_section', 'Events & Interactions', null, 'clickwise-settings-events' );

		add_settings_field( 'clickwise_event_prefixes', 'Custom Event Rules', array( $this, 'render_event_rules_field' ), 'clickwise-settings-events', 'clickwise_events_section', array(
			'id' => 'clickwise_event_prefixes',
			'desc' => 'Define flexible rules to automatically track events. Support for prefixes, contains, patterns, exact matches, and regex.'
		) );
		add_settings_field( 'clickwise_track_forms', 'Form Submissions', array( $this, 'render_checkbox_field' ), 'clickwise-settings-events', 'clickwise_events_section', array( 
			'id' => 'clickwise_track_forms', 
			'label' => 'Automatically track form submissions',
			'desc' => 'Detects standard HTML form submissions and records them as events.'
		) );
		add_settings_field( 'clickwise_track_links', 'Outbound Links', array( $this, 'render_checkbox_field' ), 'clickwise-settings-events', 'clickwise_events_section', array( 
			'id' => 'clickwise_track_links', 
			'label' => 'Track clicks on external links',
			'desc' => 'Records clicks on links that lead to other domains.'
		) );

		// --- Tab: Advanced ---
		add_settings_section( 'clickwise_advanced_section', 'Advanced Configuration', null, 'clickwise-settings-advanced' );

		add_settings_field( 'clickwise_skip_patterns', 'Skip Patterns', array( $this, 'render_pattern_list_field' ), 'clickwise-settings-advanced', 'clickwise_advanced_section', array( 
			'id' => 'clickwise_skip_patterns', 
			'desc' => 'URL patterns to exclude from tracking. Use * for wildcards (e.g., /admin/*).' 
		) );
		add_settings_field( 'clickwise_mask_patterns', 'Mask Patterns', array( $this, 'render_pattern_list_field' ), 'clickwise-settings-advanced', 'clickwise_advanced_section', array( 
			'id' => 'clickwise_mask_patterns', 
			'desc' => 'URL patterns to mask/anonymize in reports (e.g., /user/*).' 
		) );
		add_settings_field( 'clickwise_debounce', 'Debounce (ms)', array( $this, 'render_text_field' ), 'clickwise-settings-advanced', 'clickwise_advanced_section', array( 
			'id' => 'clickwise_debounce', 
			'type' => 'number',
			'desc' => 'Delay in milliseconds before sending events (default: 500).'
		) );
		add_settings_field( 'clickwise_session_replay', 'Session Replay', array( $this, 'render_checkbox_field' ), 'clickwise-settings-advanced', 'clickwise_advanced_section', array( 
			'id' => 'clickwise_session_replay', 
			'label' => 'Enable session replay recording (High resource usage)',
			'desc' => 'Records user interactions for session replay. <strong>Warning:</strong> This can increase bandwidth usage and impact client performance.'
		) );
	}

	public function display_options_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$active_tab = isset( $_GET['tab'] ) ? $_GET['tab'] : 'general';
		?>
		<div class="clickwise-admin-wrapper">
			<div class="clickwise-header">
				<div class="clickwise-brand">
					<div class="clickwise-logo-icon">
						<?php
						$logo_path = CLICKWISE_PATH . 'assets/images/logo-transparent-full-256x256.svg';
						if ( file_exists( $logo_path ) ) {
							$svg_content = file_get_contents( $logo_path );
							// Add ID and style to the SVG tag
							echo str_replace( '<svg', '<svg id="clickwise-admin-logo" style="width: 64px; height: 64px;"', $svg_content );
						}
						?>
					</div>
					<div class="clickwise-title-group">
						<h1>Clickwise</h1>
						<span class="clickwise-subtitle">WordPress Event Tracking Plugin</span>
					</div>
				</div>
				<div class="clickwise-header-actions">
					<a href="https://webspirio.com/contact" target="_blank" class="button button-primary clickwise-header-btn">Get a free quote</a>
				</div>
			</div>

			<div class="clickwise-nav-container">
				<nav class="clickwise-nav">
					<a href="?page=clickwise-settings&tab=rybbit" class="clickwise-nav-item <?php echo $active_tab == 'rybbit' ? 'active' : ''; ?>">
						<?php
						$rybbit_enabled = get_option( 'clickwise_rybbit_enabled' );
						echo $rybbit_enabled ? '<span class="status-dot active"></span>' : '<span class="status-dot"></span>';
						?>
						Rybbit
					</a>
					<a href="?page=clickwise-settings&tab=google_analytics" class="clickwise-nav-item <?php echo $active_tab == 'google_analytics' ? 'active' : ''; ?>">
						<?php
						$ga_enabled = get_option( 'clickwise_ga_enabled' );
						echo $ga_enabled ? '<span class="status-dot active"></span>' : '<span class="status-dot"></span>';
						?>
						Google Analytics
					</a>
					<a href="?page=clickwise-settings&tab=general" class="clickwise-nav-item <?php echo $active_tab == 'general' ? 'active' : ''; ?>">General</a>
					<a href="?page=clickwise-settings&tab=events" class="clickwise-nav-item <?php echo $active_tab == 'events' ? 'active' : ''; ?>">Events & Forms</a>
					<a href="?page=clickwise-settings&tab=events_manager" class="clickwise-nav-item <?php echo $active_tab == 'events_manager' ? 'active' : ''; ?>">Event Manager</a>
					<a href="?page=clickwise-settings&tab=sandbox" class="clickwise-nav-item <?php echo $active_tab == 'sandbox' ? 'active' : ''; ?>">Sandbox</a>
					<a href="?page=clickwise-settings&tab=advanced" class="clickwise-nav-item <?php echo $active_tab == 'advanced' ? 'active' : ''; ?>">Advanced</a>
				</nav>
			</div>

			<?php if ( ! get_user_meta( get_current_user_id(), 'clickwise_dismiss_service_notice', true ) ) : ?>
			<div id="clickwise-service-notice" class="clickwise-notice">
				<div class="clickwise-notice-content">
					<p><strong>External Service Notice:</strong> This plugin connects to your Rybbit Analytics instance. <a href="https://rybbit.com" target="_blank">Learn more</a></p>
				</div>
				<button type="button" class="clickwise-notice-dismiss" onclick="clickwiseDismissNotice()">
					<span class="dashicons dashicons-no-alt"></span>
				</button>
			</div>
				<script>
				function clickwiseDismissNotice() {
					jQuery.post(ajaxurl, {
						action: 'clickwise_dismiss_service_notice'
					}, function() {
						jQuery('#clickwise-service-notice').fadeOut();
					});
				}
				</script>
			<?php endif; ?>

			<div class="clickwise-body">
				<div class="clickwise-main-panel">
					<?php if ( $active_tab === 'events_manager' ) : ?>
						<?php $this->render_events_manager_tab(); ?>
					<?php elseif ( $active_tab === 'sandbox' ) : ?>
						<?php $this->render_sandbox_tab(); ?>
					<?php else : ?>
						<form action="options.php" method="post">
							<?php
							if ( $active_tab == 'rybbit' ) {
								settings_fields( 'clickwise-settings-rybbit' );
								do_settings_sections( 'clickwise-settings-rybbit' );
							} elseif ( $active_tab == 'google_analytics' ) {
								settings_fields( 'clickwise-settings-google-analytics' );
								do_settings_sections( 'clickwise-settings-google-analytics' );
							} elseif ( $active_tab == 'general' ) {
								settings_fields( 'clickwise-settings-general' );
								do_settings_sections( 'clickwise-settings-general' );
							} elseif ( $active_tab == 'events' ) {
								settings_fields( 'clickwise-settings-events' );
								do_settings_sections( 'clickwise-settings-events' );
							} elseif ( $active_tab == 'advanced' ) {
								settings_fields( 'clickwise-settings-advanced' );
								do_settings_sections( 'clickwise-settings-advanced' );
							}
							?>
							<div class="clickwise-form-actions">
								<?php submit_button( 'Save Changes', 'primary', 'submit', false ); ?>
							</div>
						</form>
					<?php endif; ?>
				</div>

				<div class="clickwise-sidebar-panel">
					<div class="clickwise-card clickwise-tips-card">
						<h3>💡 Quick Tips</h3>
						<div id="clickwise-tips-content">
							<?php $this->render_tab_tips( $active_tab ); ?>
						</div>
					</div>
					
					<div class="clickwise-card clickwise-pro-tip-card">
						<small><strong>🎯 Pro Tip:</strong> <span id="clickwise-rotating-tip"><?php echo $this->get_random_tip(); ?></span></small>
					</div>

					<div class="clickwise-sidebar-links">
						<a href="https://clickwise.com/docs" target="_blank" class="clickwise-link-btn">📚 Documentation</a>
						<a href="https://github.com/webspirio/clickwise-wp/issues" target="_blank" class="clickwise-link-btn">🐛 Report Issue</a>
					</div>

					<div class="clickwise-credits-card">
						<div class="webspirio-logo">
							<img src="<?php echo plugin_dir_url( dirname( __FILE__ ) ) . 'assets/images/webspirio-logo-256x256.svg'; ?>" alt="Webspirio" class="webspirio-logo-img">
							<span>Developed with ❤️ by <strong>Webspirio</strong></span>
						</div>
						<div class="webspirio-links">
							<a href="https://webspirio.com" target="_blank">Website</a>
							<a href="https://github.com/webspirio" target="_blank">GitHub</a>
							<a href="mailto:contact@webspirio.com">Contact</a>
						</div>
					</div>
				</div>
			</div>
		</div>

		<script type="text/javascript">
		function toggleRybbitFields(enabled) {
			// Toggle field states
			var scriptUrlField = document.getElementById('clickwise_rybbit_script_url');
			var siteIdField = document.getElementById('clickwise_rybbit_site_id');
			var apiVersionField = document.getElementById('clickwise_rybbit_api_version');
			var testButton = document.getElementById('test-rybbit-btn');
			var sendTestButton = document.getElementById('send-test-rybbit-btn');

			if (scriptUrlField) scriptUrlField.disabled = !enabled;
			if (siteIdField) siteIdField.disabled = !enabled;
			if (apiVersionField) apiVersionField.disabled = !enabled;
			if (testButton) testButton.disabled = !enabled;
			if (sendTestButton) sendTestButton.disabled = !enabled;

			// Clear notifications when disabled
			if (!enabled) {
				var $container = jQuery('#test-rybbit-btn').closest('td').find('.clickwise-notification-container');
				if ($container.length) {
					$container.find('.clickwise-inline-notification').remove();
					$container.addClass('empty');
				}
			}

			// Update status indicator in tab
			var tabLink = document.querySelector('a[href*="tab=rybbit"]');
			if (tabLink) {
				var statusDot = tabLink.querySelector('.status-dot');
				if (statusDot) {
					if (enabled) {
						statusDot.classList.add('active');
					} else {
						statusDot.classList.remove('active');
					}
				}
			}
		}

		function toggleGAFields(enabled) {
			// Toggle field states
			var measurementIdField = document.getElementById('clickwise_ga_measurement_id');
			var apiSecretField = document.getElementById('clickwise_ga_api_secret');
			var testButton = document.getElementById('test-ga-btn');
			var sendTestButton = document.getElementById('send-test-ga-btn');

			if (measurementIdField) measurementIdField.disabled = !enabled;
			if (apiSecretField) apiSecretField.disabled = !enabled;
			if (testButton) testButton.disabled = !enabled;
			if (sendTestButton) sendTestButton.disabled = !enabled;

			// Clear notifications when disabled
			if (!enabled) {
				var $container = jQuery('#test-ga-btn').closest('td').find('.clickwise-notification-container');
				if ($container.length) {
					$container.find('.clickwise-inline-notification').remove();
					$container.addClass('empty');
				}
			}

			// Update status indicator in tab
			var tabLink = document.querySelector('a[href*="tab=google_analytics"]');
			if (tabLink) {
				var statusDot = tabLink.querySelector('.status-dot');
				if (statusDot) {
					if (enabled) {
						statusDot.classList.add('active');
					} else {
						statusDot.classList.remove('active');
					}
				}
			}
		}

		function testHandler(handler) {
			var btn = document.getElementById("test-" + handler + "-btn");
			var $container = jQuery(btn).closest('td').find('.clickwise-notification-container');

			if (!btn) return;

			// Use the feedback system if available
			var feedback = null;
			if (window.ClickwiseButtonFeedback) {
				feedback = new ClickwiseButtonFeedback(btn);
				feedback.loading('Testing...');
			} else {
				btn.disabled = true;
				btn.innerHTML = '<span class="dashicons dashicons-update-alt" style="vertical-align: middle; margin-right: 5px; animation: spin 1s linear infinite;"></span>Testing...';
			}

			// Clear previous notifications
			$container.find('.clickwise-inline-notification').remove();
			$container.removeClass('empty');

			var data = {
				action: "clickwise_test_handler",
				handler: handler,
				nonce: clickwise_admin.nonce
			};

			if (handler === "rybbit") {
				data.script_url = document.getElementById("clickwise_rybbit_script_url").value;
				data.site_id = document.getElementById("clickwise_rybbit_site_id").value;
				data.api_version = document.getElementById("clickwise_rybbit_api_version").value;
			} else if (handler === "ga") {
				data.measurement_id = document.getElementById("clickwise_ga_measurement_id").value;
				data.api_secret = document.getElementById("clickwise_ga_api_secret").value;
			}

			jQuery.post(clickwise_admin.ajax_url, data, function(response) {
				if (response.success) {
					if (feedback) {
						feedback.success('Connection successful!');
					} else {
						btn.disabled = false;
						btn.innerHTML = '<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>Test Connection';
					}

					setTimeout(() => {
						showNotification($container, 'success', response.data);
					}, 1000);
				} else {
					if (feedback) {
						feedback.error('Test failed!');
					} else {
						btn.disabled = false;
						btn.innerHTML = '<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>Test Connection';
					}

					setTimeout(() => {
						showNotification($container, 'error', response.data);
					}, 1000);
				}
			}).fail(function() {
				if (feedback) {
					feedback.error('Connection failed!');
				} else {
					btn.disabled = false;
					btn.innerHTML = '<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>Test Connection';
				}

				setTimeout(() => {
					showNotification($container, 'error', 'Connection failed! Please check your network and try again.');
				}, 1000);
			});
		}

		function sendTestEvent(handler) {
			var btn = document.getElementById("send-test-" + handler + "-btn");
			var $container = jQuery(btn).closest('td').find('.clickwise-notification-container');

			if (!btn) return;

			// Use the feedback system if available
			var feedback = null;
			if (window.ClickwiseButtonFeedback) {
				feedback = new ClickwiseButtonFeedback(btn);
				feedback.loading('Loading...');
			} else {
				btn.disabled = true;
				btn.innerHTML = '<span class="dashicons dashicons-update-alt" style="vertical-align: middle; margin-right: 5px; animation: spin 1s linear infinite;"></span>Loading...';
			}

			// Clear previous notifications
			$container.find('.clickwise-inline-notification').remove();
			$container.removeClass('empty');

			if (handler === "rybbit") {
				// Use the same approach as sandbox - load script and send via client-side
				loadRybbitScript().then(function() {
					if (feedback) {
						feedback.loading('Sending...');
					} else {
						btn.innerHTML = '<span class="dashicons dashicons-update-alt" style="vertical-align: middle; margin-right: 5px; animation: spin 1s linear infinite;"></span>Sending...';
					}

					try {
						window.rybbit.event('test_event_from_admin', {
							test_mode: true,
							source: 'admin_settings',
							timestamp: Date.now()
						});

						setTimeout(() => {
							if (feedback) {
								feedback.success('Event sent!');
							} else {
								btn.disabled = false;
								btn.innerHTML = '<span class="dashicons dashicons-media-code" style="vertical-align: middle; margin-right: 5px;"></span>Send Test Event';
							}

							setTimeout(() => {
								showNotification($container, 'success', 'Test event sent successfully via Rybbit script!');
							}, 1000);
						}, 500);
					} catch (e) {
						if (feedback) {
							feedback.error('Failed to send!');
						} else {
							btn.disabled = false;
							btn.innerHTML = '<span class="dashicons dashicons-media-code" style="vertical-align: middle; margin-right: 5px;"></span>Send Test Event';
						}

						setTimeout(() => {
							showNotification($container, 'error', 'Failed to send event: ' + e.message);
						}, 1000);
					}
				}).catch(function(err) {
					if (feedback) {
						feedback.error('Script failed!');
					} else {
						btn.disabled = false;
						btn.innerHTML = '<span class="dashicons dashicons-media-code" style="vertical-align: middle; margin-right: 5px;"></span>Send Test Event';
					}

					setTimeout(() => {
						showNotification($container, 'error', err);
					}, 1000);
				});
			} else if (handler === "ga") {
				// For GA, we can't easily load gtag dynamically, so inform user
				setTimeout(() => {
					if (feedback) {
						feedback.error('Not supported!');
					} else {
						btn.disabled = false;
						btn.innerHTML = '<span class="dashicons dashicons-media-code" style="vertical-align: middle; margin-right: 5px;"></span>Send Test Event';
					}

					setTimeout(() => {
						showNotification($container, 'error', 'Google Analytics test events are best sent from the Sandbox tab where the full tracking environment is available.');
					}, 1000);
				}, 500);
			}
		}

		function loadRybbitScript() {
			if (window.rybbitScriptPromise) return window.rybbitScriptPromise;

			window.rybbitScriptPromise = new Promise(function(resolve, reject) {
				if (window.rybbit) {
					resolve();
					return;
				}

				var scriptUrl = document.getElementById('clickwise_rybbit_script_url').value;
				var siteId = document.getElementById('clickwise_rybbit_site_id').value;

				if (!scriptUrl || !siteId) {
					reject('Script URL or Site ID not configured.');
					return;
				}

				// Pre-set configuration to disable auto-tracking
				window.rybbit_config = window.rybbit_config || {};
				window.rybbit_config.track_pageview = false;
				window.rybbit_config.manual = true;

				var script = document.createElement('script');
				script.src = scriptUrl;
				script.setAttribute('data-site-id', siteId);
				script.setAttribute('data-auto-track-pageview', 'false');
				script.setAttribute('data-manual', 'true');

				script.onload = function() {
					setTimeout(() => {
						if (window.rybbit) {
							resolve();
						} else {
							reject('Rybbit script loaded but rybbit object not found.');
						}
					}, 100);
				};

				script.onerror = function() {
					reject('Failed to load Rybbit script. Please check your Script URL.');
				};

				document.head.appendChild(script);
			});

			return window.rybbitScriptPromise;
		}

		function showNotification($container, type, message) {
			var notificationClass = 'clickwise-notification-' + type;
			var $notification = jQuery('<div class="clickwise-inline-notification ' + notificationClass + '"><span class="clickwise-notification-icon"></span><span class="clickwise-notification-message">' + message + '</span></div>');

			$container.append($notification);

			setTimeout(() => {
				$notification.addClass('clickwise-notification-show');
			}, 50);

			setTimeout(() => {
				$notification.removeClass('clickwise-notification-show');
				setTimeout(() => {
					$notification.remove();
					if ($container.find('.clickwise-inline-notification').length === 0) {
						$container.addClass('empty');
					}
				}, 300);
			}, 4000);
		}

		// Initialize field states when page loads
		document.addEventListener('DOMContentLoaded', function() {
			var rybbitCheckbox = document.querySelector('input[name="clickwise_rybbit_enabled"]');
			if (rybbitCheckbox) {
				toggleRybbitFields(rybbitCheckbox.checked);
			}

			var gaCheckbox = document.querySelector('input[name="clickwise_ga_enabled"]');
			if (gaCheckbox) {
				toggleGAFields(gaCheckbox.checked);
			}
		});
		</script>
		<?php
	}

	public function render_sandbox_tab() {
		?>
		<div class="clickwise-sandbox">
			<h3>Event Sandbox</h3>
			<p>Use this tool to test custom events and verify that your tracking configuration is working correctly.</p>
			
			<table class="form-table">
				<tr>
					<th scope="row"><label for="clickwise-sandbox-name">Event Name</label></th>
					<td>
						<input type="text" id="clickwise-sandbox-name" class="regular-text" value="custom_event" placeholder="e.g. signup_click">
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="clickwise-sandbox-props">Event Properties (JSON)</label></th>
					<td>
						<textarea id="clickwise-sandbox-props" rows="5" cols="50" class="large-text code" placeholder='{"key": "value"}'><?php echo "{\n    \"test_mode\": true,\n    \"source\": \"admin_sandbox\"\n}"; ?></textarea>
						<p class="description">Enter valid JSON object.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Actions</th>
					<td>
						<button type="button" id="clickwise-sandbox-send" class="button button-primary">Send Custom Event</button>
					</td>
				</tr>
			</table>

			<div id="clickwise-sandbox-log" class="clickwise-sandbox-log">
				<div class="clickwise-sandbox-log-header">
					<span class="clickwise-sandbox-log-title">Event Log</span>
					<button type="button" id="clickwise-clear-log" class="clickwise-clear-log-btn">Clear Log</button>
				</div>
				<div class="clickwise-sandbox-log-content">
					<div class="clickwise-log-entry initial">
						<span class="log-time">[Ready]</span>
						<span class="log-message">Sandbox ready to send events...</span>
					</div>
				</div>
			</div>

			<hr style="margin: 30px 0; border-top: 1px solid var(--cw-cyan-800);">

			<h3>Form Feedback Testing</h3>
			<p>Test the new custom form feedback system (replaces WordPress notices with button animations):</p>

			<table class="form-table">
				<tr>
					<th scope="row">Test Button States</th>
					<td>
						<button type="button" id="test-feedback-success" class="button button-primary" style="margin-right: 10px;">Test Success Feedback</button>
						<button type="button" id="test-feedback-error" class="button button-primary">Test Error Feedback</button>
						<p class="description">These buttons test the complete form feedback system with AJAX calls, button animations, and inline notifications. Try both to see how success and error states work!</p>
					</td>
				</tr>
			</table>
		</div>

		<script>
		jQuery(document).ready(function($) {
			$('#test-feedback-success').on('click', function() {
				const button = this;
				const feedback = new ClickwiseButtonFeedback(button);

				feedback.loading('Testing...');

				$.post(clickwise_admin.ajax_url, {
					action: 'clickwise_test_form_feedback',
					nonce: clickwise_admin.nonce,
					type: 'success'
				}, function(response) {
					if (response.success) {
						feedback.success('Test completed!');
						setTimeout(() => {
							// Create temporary notification container for test buttons if needed
							if ($('.clickwise-notification-container').length === 0) {
								$(button).closest('table').after('<div class="clickwise-notification-container"></div>');
							}

							const $container = $('.clickwise-notification-container');
							$container.find('.clickwise-inline-notification').remove();
							$container.removeClass('empty');

							const $notification = $('<div class="clickwise-inline-notification clickwise-notification-success"><span class="clickwise-notification-icon"></span><span class="clickwise-notification-message">' + response.data + '</span></div>');
							$container.append($notification);

							setTimeout(() => {
								$notification.addClass('clickwise-notification-show');
							}, 50);

							setTimeout(() => {
								$notification.removeClass('clickwise-notification-show');
								setTimeout(() => {
									$notification.remove();
									if ($container.find('.clickwise-inline-notification').length === 0) {
										$container.addClass('empty');
									}
								}, 300);
							}, 3000);
						}, 1000);
					} else {
						feedback.error('Test failed!');
					}
				}).fail(function() {
					feedback.error('Connection failed!');
				});
			});

			$('#test-feedback-error').on('click', function() {
				const button = this;
				const feedback = new ClickwiseButtonFeedback(button);

				feedback.loading('Testing...');

				$.post(clickwise_admin.ajax_url, {
					action: 'clickwise_test_form_feedback',
					nonce: clickwise_admin.nonce,
					type: 'error'
				}, function(response) {
					feedback.error('Test failed!');
					setTimeout(() => {
						// Create temporary notification container for test buttons if needed
						if ($('.clickwise-notification-container').length === 0) {
							$(button).closest('table').after('<div class="clickwise-notification-container"></div>');
						}

						const $container = $('.clickwise-notification-container');
						$container.find('.clickwise-inline-notification').remove();
						$container.removeClass('empty');

						const message = response.success ? response.data : (response.data || 'This is a test error message to demonstrate error handling.');
						const $notification = $('<div class="clickwise-inline-notification clickwise-notification-error"><span class="clickwise-notification-icon"></span><span class="clickwise-notification-message">' + message + '</span></div>');
						$container.append($notification);

						setTimeout(() => {
							$notification.addClass('clickwise-notification-show');
						}, 50);

						setTimeout(() => {
							$notification.removeClass('clickwise-notification-show');
							setTimeout(() => {
								$notification.remove();
								if ($container.find('.clickwise-inline-notification').length === 0) {
									$container.addClass('empty');
								}
							}, 300);
						}, 4000);
					}, 1000);
				}).fail(function() {
					feedback.error('Connection failed!');
				});
			});
		});
		</script>
		<?php
	}

	public function render_text_field( $args ) {
		$id = $args['id'];
		$type = isset( $args['type'] ) ? $args['type'] : 'text';
		$value = get_option( $id );
		$desc = isset( $args['desc'] ) ? $args['desc'] : '';
		echo "<input type='$type' name='$id' id='$id' value='" . esc_attr( $value ) . "' class='regular-text'>";
		if ( $id === 'clickwise_script_url' ) {
			echo " <button type='button' id='clickwise-test-connection' class='button'>Test Connection</button>";
			echo " <span id='clickwise-test-result'></span>";
		}
		if ( $id === 'clickwise_site_id' ) {
			echo " <button type='button' id='clickwise-send-test-event' class='button'>Send Test Event</button>";
			echo " <span id='clickwise-test-event-result'></span>";
		}
		if ( $desc ) echo "<p class='description'>$desc</p>";
	}

	public function render_textarea_field( $args ) {
		$id = $args['id'];
		$value = get_option( $id );
		$desc = isset( $args['desc'] ) ? $args['desc'] : '';
		echo "<textarea name='$id' id='$id' rows='5' cols='50' class='large-text code'>" . esc_textarea( $value ) . "</textarea>";
		if ( $desc ) echo "<p class='description'>$desc</p>";
	}

	public function render_pattern_list_field( $args ) {
		$id = $args['id'];
		$value = get_option( $id );
		$desc = isset( $args['desc'] ) ? $args['desc'] : '';

		// Determine placeholder text and button text based on field ID
		$placeholder = 'Enter pattern (e.g. /blog/*)';
		$button_text = 'Add Pattern';

		echo '<div class="clickwise-pattern-ui-container">';
		echo '<textarea name="' . esc_attr( $id ) . '" id="' . esc_attr( $id ) . '" class="clickwise-pattern-source" style="display:none;">' . esc_textarea( $value ) . '</textarea>';

		echo '<div class="clickwise-pattern-wrapper">';
		echo '<ul class="clickwise-pattern-list"></ul>';
		echo '<div class="clickwise-pattern-input-group">';
		echo '<input type="text" class="regular-text clickwise-new-pattern-input" placeholder="' . esc_attr( $placeholder ) . '">';
		echo '<button type="button" class="button clickwise-add-pattern-btn">' . esc_html( $button_text ) . '</button>';
		echo '</div>';
		echo '</div>';

		if ( $desc ) echo "<p class='description'>$desc</p>";
		echo '</div>';
	}

	public function render_event_rules_field( $args ) {
		$id = $args['id'];
		$value = get_option( $id );
		$desc = isset( $args['desc'] ) ? $args['desc'] : '';

		// Convert old format to new format for backward compatibility
		$rules = $this->convert_legacy_prefixes_to_rules( $value );

		echo '<div class="clickwise-event-rules-container">';
		echo '<input type="hidden" name="' . esc_attr( $id ) . '" id="' . esc_attr( $id ) . '" class="clickwise-rules-data" value="' . esc_attr( json_encode( $rules ) ) . '">';

		echo '<div class="clickwise-rules-list"></div>';

		echo '<div class="clickwise-add-rule-section" style="margin-top: 15px; padding: 15px; border: 2px dashed #c3c4c7; border-radius: 4px; background: #f9f9f9;">';
		echo '<h4 style="margin-top: 0;">Add New Rule</h4>';
		echo '<table class="form-table" style="margin: 0;">';
		echo '<tr>';
		echo '<th style="width: 120px;"><label for="new-rule-type">Rule Type</label></th>';
		echo '<td>';
		echo '<select id="new-rule-type" class="regular-text">';
		echo '<option value="prefix">Prefix Match</option>';
		echo '<option value="contains">Contains</option>';
		echo '<option value="exact">Exact Match</option>';
		echo '<option value="regex">Regular Expression</option>';
		echo '<option value="pattern">Wildcard Pattern</option>';
		echo '</select>';
		echo '</td>';
		echo '</tr>';
		echo '<tr>';
		echo '<th><label for="new-rule-value">Rule Value</label></th>';
		echo '<td><input type="text" id="new-rule-value" class="regular-text" placeholder="e.g. kb-"></td>';
		echo '</tr>';
		echo '<tr>';
		echo '<th><label for="new-rule-desc">Description</label></th>';
		echo '<td><input type="text" id="new-rule-desc" class="regular-text" placeholder="e.g. Kadence Block events (optional)"></td>';
		echo '</tr>';
		echo '<tr>';
		echo '<th></th>';
		echo '<td>';
		echo '<button type="button" id="add-event-rule-btn" class="button button-primary">Add Rule</button>';
		echo '<div id="rule-preview" style="display: none;">';
		echo '<strong>Preview:</strong> <span id="rule-preview-text"></span>';
		echo '</div>';
		echo '</td>';
		echo '</tr>';
		echo '</table>';
		echo '</div>';

		if ( $desc ) echo "<p class='description'>$desc</p>";

		echo '<div class="clickwise-rule-examples" style="margin-top: 15px; padding: 10px; background: #f0f8ff; border-left: 4px solid #0073aa;">';
		echo '<strong>Examples:</strong>';
		echo '<ul style="margin: 5px 0;">';
		echo '<li><strong>Prefix:</strong> "kb-" → matches "kb-button-click", "kb-form-submit"</li>';
		echo '<li><strong>Contains:</strong> "form" → matches "contact-form", "login-form-submit"</li>';
		echo '<li><strong>Exact:</strong> "user_signup" → matches only "user_signup"</li>';
		echo '<li><strong>Regex:</strong> "^wc-.*-complete$" → matches "wc-purchase-complete", "wc-checkout-complete"</li>';
		echo '<li><strong>Pattern:</strong> "click-*-button" → matches "click-red-button", "click-save-button"</li>';
		echo '</ul>';
		echo '</div>';

		echo '</div>';
	}

	public function render_checkbox_field( $args ) {
		$id = $args['id'];
		$value = get_option( $id );
		$label = isset( $args['label'] ) ? $args['label'] : '';
		$desc = isset( $args['desc'] ) ? $args['desc'] : '';
		echo "<label><input type='checkbox' name='$id' id='$id' value='1' " . checked( 1, $value, false ) . "> $label</label>";
		if ( $desc ) echo "<p class='description'>$desc</p>";
	}

	public function render_select_field( $args ) {
		$id = $args['id'];
		$value = get_option( $id );
		$options = isset( $args['options'] ) ? $args['options'] : array();
		$desc = isset( $args['desc'] ) ? $args['desc'] : '';
		echo "<select name='$id' id='$id'>";
		foreach ( $options as $key => $label ) {
			echo "<option value='" . esc_attr( $key ) . "' " . selected( $key, $value, false ) . ">" . esc_html( $label ) . "</option>";
		}
		echo "</select>";
		if ( $desc ) echo "<p class='description'>$desc</p>";
	}

	public function render_events_manager_tab() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		// Check if table exists
		if ( $wpdb->get_var( "SHOW TABLES LIKE '$table_name'" ) != $table_name ) {
			echo '<div class="notice notice-error"><p>Database table not found. Please reactivate the plugin.</p></div>';
			return;
		}

		$events_data = $wpdb->get_results( "SELECT * FROM $table_name ORDER BY last_seen DESC", ARRAY_A );

		// Convert to old format for compatibility
		$events = array();
		foreach ( $events_data as $event_row ) {
			$events[ $event_row['event_key'] ] = array(
				'key' => $event_row['event_key'],
				'type' => $event_row['type'],
				'name' => $event_row['name'],
				'alias' => $event_row['alias'],
				'selector' => $event_row['selector'],
				'status' => $event_row['status'],
				'first_seen' => strtotime( $event_row['first_seen'] ),
				'last_seen' => strtotime( $event_row['last_seen'] ),
				'example' => $event_row['example_detail'],
				'session_id' => $event_row['session_id'],
				'session_timestamp' => $event_row['session_timestamp']
			);
		}

		// Group events
		$tracked_events = array();
		$ignored_events = array();
		$sessions = array();

		foreach ( $events as $key => $event ) {
			$event['key'] = $key; // Ensure key is available

			// Status Lists
			if ( isset( $event['status'] ) ) {
				if ( $event['status'] === 'tracked' ) {
					$tracked_events[] = $event;
				} elseif ( $event['status'] === 'ignored' ) {
					$ignored_events[] = $event;
				}
			}

			// Session grouping (History)
			// Only show sessions if they have an ID. Events unlinked from sessions (via delete) won't show here.
			if ( isset( $event['session_id'] ) && $event['session_id'] ) {
				$sess_id = $event['session_id'];
				if ( ! isset( $sessions[ $sess_id ] ) ) {
					$sessions[ $sess_id ] = array(
						'id' => $sess_id,
						'timestamp' => isset( $event['session_timestamp'] ) ? $event['session_timestamp'] : 0,
						'events' => array()
					);
				}
				$sessions[ $sess_id ]['events'][] = $event;
			}
		}

		// Sort sessions by timestamp desc
		usort( $sessions, function($a, $b) {
			return $b['timestamp'] - $a['timestamp'];
		});

		?>
		<div class="clickwise-manager-tabs" style="margin-bottom: 20px; border-bottom: 1px solid #ccc;">
			<a href="#" class="clickwise-sub-tab active" data-target="clickwise-tracked-view" style="text-decoration:none; padding: 10px 20px; display:inline-block; border:1px solid #ccc; border-bottom:none; background:#fff; margin-bottom:-1px;">Tracked Events</a>
			<a href="#" class="clickwise-sub-tab" data-target="clickwise-ignored-view" style="text-decoration:none; padding: 10px 20px; display:inline-block; background:#f1f1f1; color:#555;">Ignored Events</a>
			<a href="#" class="clickwise-sub-tab" data-target="clickwise-history-view" style="text-decoration:none; padding: 10px 20px; display:inline-block; background:#f1f1f1; color:#555;">Recording History</a>
		</div>

		<!-- TRACKED EVENTS VIEW -->
		<div id="clickwise-tracked-view" class="clickwise-sub-view">
			<h3>Active Tracked Events</h3>
			<form class="clickwise-bulk-form" method="post">
				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<select name="bulk_action">
							<option value="-1">Bulk Actions</option>
							<option value="ignored">Ignore</option>
							<option value="delete">Delete</option>
						</select>
						<button type="button" class="button action clickwise-apply-bulk">Apply</button>
					</div>
				</div>
				<table class="widefat fixed striped">
					<thead>
						<tr>
							<td id="cb" class="manage-column column-cb check-column"><input type="checkbox" class="clickwise-select-all"></td>
							<th>Event Name (Alias)</th>
							<th>Original Name</th>
							<th>Type</th>
							<th>Selector</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						<?php if ( empty( $tracked_events ) ) : ?>
							<tr><td colspan="6">No tracked events yet.</td></tr>
						<?php else : ?>
							<?php foreach ( $tracked_events as $event ) : ?>
								<tr>
									<th scope="row" class="check-column"><input type="checkbox" name="keys[]" value="<?php echo esc_attr( $event['key'] ); ?>"></th>
									<td><strong><?php echo esc_html( isset($event['alias']) && $event['alias'] ? $event['alias'] : $event['name'] ); ?></strong></td>
									<td><?php echo esc_html( $event['name'] ); ?></td>
									<td><?php echo esc_html( $event['type'] ); ?></td>
									<td><code><?php echo esc_html( isset($event['selector']) ? $event['selector'] : '' ); ?></code></td>
									<td>
										<div class="button-group">
											<button type="button" class="button clickwise-open-details" data-key="<?php echo esc_attr( $event['key'] ); ?>">Details / Edit</button>
											<button type="button" class="button button-primary clickwise-track-event"
												data-key="<?php echo esc_attr( $event['key'] ); ?>"
												data-name="<?php echo esc_attr( $event['name'] ); ?>"
												data-action="untrack"
												data-status="tracked">Untrack</button>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</form>
		</div>

		<!-- IGNORED EVENTS VIEW -->
		<div id="clickwise-ignored-view" class="clickwise-sub-view" style="display:none;">
			<h3>Ignored Events</h3>
			<form class="clickwise-bulk-form" method="post">
				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<select name="bulk_action">
							<option value="-1">Bulk Actions</option>
							<option value="tracked">Track</option>
							<option value="delete">Delete</option>
						</select>
						<button type="button" class="button action clickwise-apply-bulk">Apply</button>
					</div>
				</div>
				<table class="widefat fixed striped">
					<thead>
						<tr>
							<td class="manage-column column-cb check-column"><input type="checkbox" class="clickwise-select-all"></td>
							<th>Original Name</th>
							<th>Type</th>
							<th>Selector</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						<?php if ( empty( $ignored_events ) ) : ?>
							<tr><td colspan="5">No ignored events.</td></tr>
						<?php else : ?>
							<?php foreach ( $ignored_events as $event ) : ?>
								<tr>
									<th scope="row" class="check-column"><input type="checkbox" name="keys[]" value="<?php echo esc_attr( $event['key'] ); ?>"></th>
									<td><?php echo esc_html( $event['name'] ); ?></td>
									<td><?php echo esc_html( $event['type'] ); ?></td>
									<td><code><?php echo esc_html( isset($event['selector']) ? $event['selector'] : '' ); ?></code></td>
									<td>
										<div class="button-group">
											<button type="button" class="button clickwise-open-details" data-key="<?php echo esc_attr( $event['key'] ); ?>">Details / Edit</button>
											<button type="button" class="button button-primary clickwise-track-event"
												data-key="<?php echo esc_attr( $event['key'] ); ?>"
												data-name="<?php echo esc_attr( $event['name'] ); ?>"
												data-action="track"
												data-status="ignored">Track</button>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</form>
		</div>

		<!-- RECORDING HISTORY VIEW -->
		<div id="clickwise-history-view" class="clickwise-sub-view" style="display:none;">
			<h3>Recording History</h3>
			<?php if ( empty( $sessions ) ) : ?>
				<p>No recording history found.</p>
			<?php else : ?>
				<?php foreach ( $sessions as $session ) : ?>
					<div class="clickwise-session-block" style="border: 1px solid #ccd0d4; background: #fff; margin-bottom: 20px;">
						<div class="clickwise-session-header" style="padding: 10px 15px; background: #f9f9f9; border-bottom: 1px solid #ccd0d4; display:flex; justify-content:space-between; align-items:center;">
							<div>
								<strong>Session: <?php echo esc_html( $session['id'] === 'legacy' ? 'Legacy / Manual' : date( 'F j, Y @ g:i a', $session['timestamp'] ) ); ?></strong>
								<span class="count" style="color:#666; margin-left:10px;">(<?php echo count( $session['events'] ); ?> events)</span>
							</div>
							<div>
								<button type="button" class="button clickwise-delete-session" data-session="<?php echo esc_attr( $session['id'] ); ?>">Delete Session</button>
							</div>
						</div>
						<div class="clickwise-session-content" style="padding: 0;">
							<form class="clickwise-bulk-form" method="post">
								<div class="tablenav top" style="padding: 10px;">
									<div class="alignleft actions bulkactions">
										<select name="bulk_action">
											<option value="-1">Bulk Actions</option>
											<option value="tracked">Track</option>
											<option value="ignored">Ignore</option>
											<option value="delete">Delete</option>
										</select>
										<button type="button" class="button action clickwise-apply-bulk">Apply</button>
									</div>
								</div>
								<table class="widefat fixed striped" style="border:none; box-shadow:none;">
									<thead>
										<tr>
											<td class="manage-column column-cb check-column"><input type="checkbox" class="clickwise-select-all"></td>
											<th>Status</th>
											<th>Name</th>
											<th>Type</th>
											<th>Actions</th>
										</tr>
									</thead>
									<tbody>
										<?php foreach ( $session['events'] as $event ) : ?>
											<tr data-status="<?php echo esc_attr( $event['status'] ); ?>">
												<th scope="row" class="check-column"><input type="checkbox" name="keys[]" value="<?php echo esc_attr( $event['key'] ); ?>"></th>
												<td>
													<?php if ( $event['status'] === 'tracked' ) : ?>
														<span class="dashicons dashicons-yes" style="color:green;"></span> <strong style="color:green;">Tracked</strong>
													<?php elseif ( $event['status'] === 'ignored' ) : ?>
														<span class="dashicons dashicons-no" style="color:red;"></span> <span style="color:red;">Ignored</span>
													<?php else : ?>
														<span class="dashicons dashicons-minus" style="color:orange;"></span> Pending
													<?php endif; ?>
												</td>
												<td>
													<?php echo esc_html( $event['name'] ); ?>
													<?php if ( isset($event['alias']) && $event['alias'] ) : ?>
														<br><small style="color:#666;">Alias: <?php echo esc_html( $event['alias'] ); ?></small>
													<?php endif; ?>
												</td>
												<td><?php echo esc_html( $event['type'] ); ?></td>
												<td>
													<div class="button-group">
														<button type="button" class="button clickwise-open-details" data-key="<?php echo esc_attr( $event['key'] ); ?>">Details</button>
														<?php
														$is_tracked = $event['status'] === 'tracked';
														$button_text = $is_tracked ? 'Untrack' : 'Track';
														$button_action = $is_tracked ? 'untrack' : 'track';
														?>
														<button type="button" class="button button-primary clickwise-track-event"
															data-key="<?php echo esc_attr( $event['key'] ); ?>"
															data-name="<?php echo esc_attr( $event['name'] ); ?>"
															data-action="<?php echo esc_attr( $button_action ); ?>"
															data-status="<?php echo esc_attr( $event['status'] ); ?>">
															<?php echo esc_html( $button_text ); ?>
														</button>
													</div>
												</td>
											</tr>
										<?php endforeach; ?>
									</tbody>
								</table>
							</form>
						</div>
					</div>
				<?php endforeach; ?>
			<?php endif; ?>
		</div>

		<!-- EVENT DETAILS MODAL -->
		<div id="clickwise-event-modal" class="clickwise-modal-wrapper">
			<div class="clickwise-modal-content">

				<div class="clickwise-modal-header">
					<h2>Event Details</h2>
					<button type="button" id="clickwise-modal-close-x">&times;</button>
				</div>

				<div class="clickwise-modal-body">
					<table class="form-table">
						<tr>
							<th style="width:150px;">Type</th>
							<td id="modal-event-type"></td>
						</tr>
						<tr>
							<th>Original Name</th>
							<td id="modal-event-name"></td>
						</tr>
						<tr>
							<th>Selector</th>
							<td id="modal-event-selector"></td>
						</tr>
						<tr>
							<th>Example Detail</th>
							<td>
								<div class="clickwise-code-wrapper" style="height: 200px;">
									<pre id="modal-event-detail" class="clickwise-code-backdrop"></pre>
								</div>
							</td>
						</tr>
						<tr>
							<th>User-Friendly Name (Alias)</th>
							<td>
								<input type="text" id="modal-event-alias" class="regular-text" placeholder="e.g. Signup Button Click">
								<p class="description">If set, this name will be sent to Clickwise instead of the original name.</p>
							</td>
						</tr>
						<tr>
							<th>Status</th>
							<td>
								<select id="modal-event-status">
									<option value="pending">Pending</option>
									<option value="tracked">Tracked</option>
									<option value="ignored">Ignored</option>
								</select>
							</td>
						</tr>
					</table>
				</div>

				<div class="clickwise-modal-footer">
					<button type="button" class="button" id="clickwise-modal-cancel">Cancel</button>
					<button type="button" class="button button-primary" id="clickwise-modal-save">Save Changes</button>
				</div>
			</div>
		</div>
		<style>
			/* Override code backdrop for modal use */
			#modal-event-detail.clickwise-code-backdrop {
				position: static; /* Remove absolute positioning */
				pointer-events: auto; /* Enable pointer events */
				background: var(--cw-cyan-950); /* Add background */
				overflow: auto; /* Enable scrolling */
				height: 100%; /* Fill container */
			}
		</style>
		<?php
	}

	/**
	 * Helper to get events from database table for admin JS.
	 */
	private function get_events_for_admin_js() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		// Check if table exists first to avoid errors on fresh install
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
	 * Convert legacy comma/line-separated prefixes to new rule format.
	 */
	private function convert_legacy_prefixes_to_rules( $value ) {
		if ( empty( $value ) ) {
			return array();
		}

		// Try to decode as JSON (new format)
		$decoded = json_decode( $value, true );
		if ( is_array( $decoded ) && isset( $decoded[0] ) && isset( $decoded[0]['type'] ) ) {
			// Already in new format
			return $decoded;
		}

		// Legacy format - convert to rules
		$rules = array();

		// Handle both comma and line separated formats
		if ( strpos( $value, "\n" ) !== false || strpos( $value, "\r" ) !== false ) {
			$prefixes = preg_split( '/\r\n|\r|\n/', $value );
		} else {
			$prefixes = explode( ',', $value );
		}

		$prefixes = array_filter( array_map( 'trim', $prefixes ) );

		foreach ( $prefixes as $prefix ) {
			$rules[] = array(
				'type' => 'prefix',
				'value' => $prefix,
				'description' => ''
			);
		}

		return $rules;
	}

	/**
	 * AJAX handler for dismissing the service notice
	 */
	public function ajax_dismiss_service_notice() {
		// Check nonce for security (optional but recommended)
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Unauthorized' );
		}

		// Store the dismissal in user meta
		update_user_meta( get_current_user_id(), 'clickwise_dismiss_service_notice', true );

		wp_send_json_success();
	}

	/**
	 * AJAX handler for testing form feedback (for development)
	 */
	public function ajax_test_form_feedback() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$type = isset( $_POST['type'] ) ? sanitize_text_field( $_POST['type'] ) : 'success';

		if ( $type === 'error' ) {
			wp_send_json_error( 'This is a test error message to verify error feedback styling.' );
		} else {
			wp_send_json_success( 'Test feedback completed successfully!' );
		}
	}

	public function ajax_test_handler() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$handler = sanitize_text_field( $_POST['handler'] );

		if ( $handler === 'rybbit' ) {
			$this->test_rybbit_handler();
		} elseif ( $handler === 'ga' ) {
			$this->test_ga_handler();
		} else {
			wp_send_json_error( 'Invalid handler' );
		}
	}

	private function test_rybbit_handler() {
		$script_url = sanitize_url( $_POST['script_url'] );
		$site_id = sanitize_text_field( $_POST['site_id'] );
		$api_version = sanitize_text_field( $_POST['api_version'] );

		// Validate required fields
		if ( empty( $script_url ) || empty( $site_id ) ) {
			wp_send_json_error( 'Script URL and Site ID are required' );
		}

		// Test if script URL is accessible
		$response = wp_remote_get( $script_url, array(
			'timeout' => 10,
			'user-agent' => 'Clickwise Plugin Test'
		) );

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( 'Could not reach Rybbit script: ' . $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			wp_send_json_error( 'Rybbit script returned HTTP ' . $code );
		}

		// Test if script content looks valid
		$body = wp_remote_retrieve_body( $response );
		if ( strpos( $body, 'rybbit' ) === false && strpos( $body, 'track' ) === false ) {
			wp_send_json_error( 'Script does not appear to be a valid Rybbit tracking script' );
		}

		wp_send_json_success( 'Rybbit connection successful! Script is accessible and appears valid.' );
	}

	private function test_ga_handler() {
		$measurement_id = sanitize_text_field( $_POST['measurement_id'] );
		$api_secret = sanitize_text_field( $_POST['api_secret'] );

		// Validate required fields
		if ( empty( $measurement_id ) ) {
			wp_send_json_error( 'Measurement ID is required' );
		}

		// Validate measurement ID format
		if ( ! preg_match( '/^G-[A-Z0-9]{10}$/', $measurement_id ) ) {
			wp_send_json_error( 'Invalid Measurement ID format. Should be G-XXXXXXXXXX' );
		}

		// Send test event to GA4 Measurement Protocol
		$test_data = array(
			'client_id' => wp_generate_uuid4(),
			'events' => array(
				array(
					'name' => 'clickwise_test_event',
					'params' => array(
						'event_category' => 'test',
						'event_label' => 'handler_test',
						'value' => 1
					)
				)
			)
		);

		$url = 'https://www.google-analytics.com/mp/collect?measurement_id=' . urlencode( $measurement_id );
		if ( ! empty( $api_secret ) ) {
			$url .= '&api_secret=' . urlencode( $api_secret );
		}

		$response = wp_remote_post( $url, array(
			'timeout' => 10,
			'headers' => array(
				'Content-Type' => 'application/json'
			),
			'body' => json_encode( $test_data )
		) );

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( 'Could not reach Google Analytics: ' . $response->get_error_message() );
		}

		$code = wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			wp_send_json_error( 'Google Analytics returned HTTP ' . $code );
		}

		if ( empty( $api_secret ) ) {
			wp_send_json_success( 'Google Analytics connection successful! Test event sent (no API secret - cannot verify delivery).' );
		} else {
			wp_send_json_success( 'Google Analytics connection successful! Test event sent and verified.' );
		}
	}

	/**
	 * Render tab-specific tips
	 */
	private function render_tab_tips( $tab ) {
		$tips = $this->get_tab_tips( $tab );

		if ( empty( $tips ) ) {
			echo '<p>No tips available for this tab.</p>';
			return;
		}

		echo '<ul>';
		foreach ( $tips as $tip ) {
			echo '<li>' . $tip . '</li>';
		}
		echo '</ul>';
	}

	/**
	 * Get tips for specific tab
	 */
	private function get_tab_tips( $tab ) {
		$all_tips = array(
			'general' => array(
				'<strong>📊 Pageview Tracking:</strong> Automatically tracks every page visit - no setup needed!',
				'<strong>⚡ Performance:</strong> Our tracker is lightweight (~2KB) and won\'t slow down your site.',
				'<strong>🎯 Custom Events:</strong> Track clicks, form submissions, or anything that matters to you.',
				'<strong>🔧 Debug Mode:</strong> Enable dev mode to see events in browser console.',
				'<strong>✅ Test Connection:</strong> Use the "Test Connection" button in the Rybbit tab to verify your setup.'
			),
			'rybbit' => array(
				'<strong>🎯 Site ID:</strong> Found in your Rybbit dashboard under "Sites" section.',
				'<strong>🔗 Script URL:</strong> Usually looks like <code>https://your-rybbit-instance.com/script.js</code>',
				'<strong>✅ Test Connection:</strong> Use the "Test Connection" button to verify your setup.',
				'<strong>⚡ Performance:</strong> Our tracker is lightweight (~2KB) and won\'t slow down your site.'
			),
			'google_analytics' => array(
				'<strong>🆔 Measurement ID:</strong> Found in GA4 Admin > Data Streams. Starts with <code>G-</code>.',
				'<strong>🔑 API Secret:</strong> Required for server-side event tracking. Create one in GA4 Admin > Data Streams > Measurement Protocol API secrets.',
				'<strong>📈 Dual Tracking:</strong> You can use both Rybbit and GA4 simultaneously!'
			),
			'events' => array(
				'<strong>📝 Form Tracking:</strong> Automatically captures form submissions with form name and class.',
				'<strong>🔗 Link Tracking:</strong> Tracks clicks on external links to see where users go.',
				'<strong>🎨 Custom Events:</strong> Add <code>data-clickwise-action="my-event"</code> to any HTML element.',
				'<strong>📋 Event Rules:</strong> Create flexible patterns: prefix, contains, exact match, regex, or wildcards.',
				'<strong>🚀 Example:</strong> <code>&lt;button data-clickwise-action="cta-click"&gt;Buy Now!&lt;/button&gt;</code>'
			),
			'events_manager' => array(
				'<strong>🎬 Recording Mode:</strong> Click elements to automatically generate tracking rules.',
				'<strong>📚 Event Library:</strong> Review all captured events and decide what to track.',
				'<strong>✨ Quick Actions:</strong> Approve useful events, ignore noise with one click.',
				'<strong>🔄 Sessions:</strong> Each recording session is saved separately for easy organization.',
				'<strong>🎯 Pro Tip:</strong> Record user journeys to discover which events matter most!'
			),
			'sandbox' => array(
				'<strong>🧪 Test Events:</strong> Send test events to verify your analytics setup works.',
				'<strong>🎮 Sandbox Mode:</strong> Play around without affecting your real analytics data.',
				'<strong>🔍 Event Preview:</strong> See exactly what data gets sent to your Clickwise instance.',
				'<strong>⚡ Quick Test:</strong> Try events like <code>test_click</code> or <code>sandbox_experiment</code>.',
				'<strong>🎨 Custom Data:</strong> Add extra properties like <code>{"source": "sandbox", "user_type": "tester"}</code>'
			),
			'advanced' => array(
				'<strong>⚙️ Advanced Settings:</strong> Fine-tune tracking behavior for your specific needs.',
				'<strong>🎭 User Permissions:</strong> Only admins can access recording and dev modes.',
				'<strong>🚀 Performance:</strong> All tracking happens asynchronously - zero impact on page speed.',
				'<strong>🔒 Privacy:</strong> Configure what data to collect while respecting user privacy.'
			)
		);

		return isset( $all_tips[$tab] ) ? $all_tips[$tab] : array();
	}

	public function render_handler_field( $args ) {
		$handler = $args['handler'];
		$title = $args['title'];
		$desc = $args['desc'];

		$enabled_option = "clickwise_{$handler}_enabled";
		$enabled = get_option( $enabled_option );

		$status_color = $enabled ? '#10b981' : '#6b7280';
		$status_text = $enabled ? 'ENABLED' : 'DISABLED';
		$card_style = $enabled ? 'border: 2px solid #10b981; background: #f0fdf4;' : 'border: 1px solid #d1d5db; background: #f9fafb;';

		echo '<div class="clickwise-handler-card" style="' . $card_style . ' padding: 20px; margin: 15px 0; border-radius: 8px; position: relative;">';

		// Status badge
		echo '<div style="position: absolute; top: 15px; right: 15px; background: ' . $status_color . '; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: bold;">' . $status_text . '</div>';

		echo '<h3 style="margin-top: 0; margin-bottom: 10px; color: #1f2937;">' . esc_html( $title ) . '</h3>';
		echo '<p style="margin-bottom: 20px; color: #6b7280;">' . $desc . '</p>';

		echo '<label style="display: flex; align-items: center; margin: 15px 0; font-weight: 500; cursor: pointer;">';
		echo '<input type="checkbox" name="' . $enabled_option . '" id="' . $enabled_option . '" value="1" ' . checked( 1, $enabled, false ) . ' onchange="toggleHandlerConfig(this, \'' . $handler . '\')" style="margin-right: 10px; transform: scale(1.2);"> ';
		echo 'Enable ' . esc_html( $title );
		echo '</label>';

		echo '<div id="' . $handler . '-config" class="handler-config" style="' . ( $enabled ? '' : 'opacity: 0.3; pointer-events: none;' ) . '">';
		echo '<div style="border-top: 1px solid #e5e7eb; margin-top: 20px; padding-top: 20px;">';
		echo '<h4 style="margin-bottom: 15px; color: #374151;">Configuration</h4>';
		echo '<table class="form-table"><tbody>';

		if ( $handler === 'rybbit' ) {
			// Rybbit configuration grouped here
			$script_url = get_option( 'clickwise_rybbit_script_url', get_option( 'clickwise_script_url', '' ) );
			$site_id = get_option( 'clickwise_rybbit_site_id', get_option( 'clickwise_site_id', '' ) );
			$api_version = get_option( 'clickwise_rybbit_api_version', get_option( 'clickwise_api_version', 'v2' ) );

			echo '<tr><th scope="row"><label for="clickwise_rybbit_script_url">Script URL</label></th>';
			echo '<td><input type="url" name="clickwise_rybbit_script_url" id="clickwise_rybbit_script_url" value="' . esc_attr( $script_url ) . '" class="regular-text" placeholder="https://tracking.example.com/api/script.js">';
			echo '<p class="description">The URL to your Rybbit tracking script</p></td></tr>';

			echo '<tr><th scope="row"><label for="clickwise_rybbit_site_id">Site ID</label></th>';
			echo '<td><input type="text" name="clickwise_rybbit_site_id" id="clickwise_rybbit_site_id" value="' . esc_attr( $site_id ) . '" class="regular-text">';
			echo '<p class="description">Your unique Site ID found in the Rybbit dashboard</p></td></tr>';

			echo '<tr><th scope="row"><label for="clickwise_rybbit_api_version">API Version</label></th>';
			echo '<td><select name="clickwise_rybbit_api_version" id="clickwise_rybbit_api_version">';
			echo '<option value="v1" ' . selected( 'v1', $api_version, false ) . '>v1 (Legacy)</option>';
			echo '<option value="v2" ' . selected( 'v2', $api_version, false ) . '>v2 (Modern)</option>';
			echo '</select>';
			echo '<p class="description">Select the API version compatible with your Rybbit instance</p></td></tr>';

		} elseif ( $handler === 'ga' ) {
			// Google Analytics configuration
			$ga_measurement_id = get_option( 'clickwise_ga_measurement_id', '' );
			$ga_api_secret = get_option( 'clickwise_ga_api_secret', '' );

			echo '<tr><th scope="row"><label for="clickwise_ga_measurement_id">Measurement ID</label></th>';
			echo '<td><input type="text" name="clickwise_ga_measurement_id" id="clickwise_ga_measurement_id" value="' . esc_attr( $ga_measurement_id ) . '" class="regular-text" placeholder="G-XXXXXXXXXX">';
			echo '<p class="description">Your GA4 Measurement ID (e.g., G-XXXXXXXXXX)</p></td></tr>';

			echo '<tr><th scope="row"><label for="clickwise_ga_api_secret">API Secret</label></th>';
			echo '<td><input type="text" name="clickwise_ga_api_secret" id="clickwise_ga_api_secret" value="' . esc_attr( $ga_api_secret ) . '" class="regular-text">';
			echo '<p class="description">Your GA4 Measurement Protocol API Secret (optional)</p></td></tr>';
		}

		echo '</tbody></table>';

		// Add test button
		echo '<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">';
		echo '<button type="button" class="button button-secondary" onclick="testHandler(\'' . $handler . '\')" id="test-' . $handler . '-btn" style="margin-right: 10px;" ' . ( $enabled ? '' : 'disabled' ) . '>';
		echo '<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>';
		echo 'Test Connection';
		echo '</button>';
		echo '<span id="test-' . $handler . '-result" style="margin-left: 10px;"></span>';
		echo '</div>';

		echo '</div></div>';
		echo '</div>';
	}

	public function render_rybbit_section_description() {
		?>
		<p>Configure Rybbit analytics for comprehensive event tracking and user behavior analysis.</p>
		<?php
	}

	public function render_rybbit_enabled_field() {
		$enabled = get_option( 'clickwise_rybbit_enabled' );
		?>
		<label>
			<input type="checkbox" name="clickwise_rybbit_enabled" value="1" <?php checked( 1, $enabled ); ?> onchange="toggleRybbitFields(this.checked)" />
			Enable Rybbit Analytics tracking
		</label>
		<p class="description">Turn this on to start sending analytics data to Rybbit.</p>
		<?php
	}

	public function render_rybbit_script_url_field() {
		$script_url = get_option( 'clickwise_rybbit_script_url', get_option( 'clickwise_script_url', '' ) );
		$enabled = get_option( 'clickwise_rybbit_enabled' );
		$disabled = $enabled ? '' : 'disabled';
		?>
		<input type="url" name="clickwise_rybbit_script_url" id="clickwise_rybbit_script_url"
			   value="<?php echo esc_attr( $script_url ); ?>" class="regular-text"
			   placeholder="https://tracking.example.com/api/script.js" <?php echo $disabled; ?> />
		<p class="description">The URL to your Rybbit tracking script</p>
		<?php
	}

	public function render_rybbit_site_id_field() {
		$site_id = get_option( 'clickwise_rybbit_site_id', get_option( 'clickwise_site_id', '' ) );
		$enabled = get_option( 'clickwise_rybbit_enabled' );
		$disabled = $enabled ? '' : 'disabled';
		?>
		<input type="text" name="clickwise_rybbit_site_id" id="clickwise_rybbit_site_id"
			   value="<?php echo esc_attr( $site_id ); ?>" class="regular-text"
			   placeholder="your-site-id" <?php echo $disabled; ?> />
		<p class="description">Your unique Site ID found in the Rybbit dashboard</p>
		<?php
	}

	public function render_rybbit_api_version_field() {
		$api_version = get_option( 'clickwise_rybbit_api_version', get_option( 'clickwise_api_version', 'v2' ) );
		$enabled = get_option( 'clickwise_rybbit_enabled' );
		$disabled = $enabled ? '' : 'disabled';
		?>
		<select name="clickwise_rybbit_api_version" id="clickwise_rybbit_api_version" <?php echo $disabled; ?>>
			<option value="v1" <?php selected( 'v1', $api_version ); ?>>v1 (Legacy)</option>
			<option value="v2" <?php selected( 'v2', $api_version ); ?>>v2 (Modern)</option>
		</select>
		<p class="description">Select the API version compatible with your Rybbit instance</p>
		<?php
	}

	public function render_rybbit_test_field() {
		$enabled = get_option( 'clickwise_rybbit_enabled' );
		$disabled = $enabled ? '' : 'disabled';
		?>
		<div style="display: flex; gap: 10px; margin-bottom: 15px;">
			<button type="button" class="button button-primary" onclick="testHandler('rybbit')"
					id="test-rybbit-btn" <?php echo $disabled; ?>>
				<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>
				Test Connection
			</button>
			<button type="button" class="button" onclick="sendTestEvent('rybbit')"
					id="send-test-rybbit-btn" <?php echo $disabled; ?>>
				<span class="dashicons dashicons-media-code" style="vertical-align: middle; margin-right: 5px;"></span>
				Send Test Event
			</button>
		</div>
		<div class="clickwise-notification-container empty"></div>
		<p class="description">
			Verify your configuration and send test events to Rybbit.
			<strong>💡 Tip:</strong> Visit the <a href="?page=clickwise-settings&tab=sandbox">Sandbox tab</a> to send custom test events and experiment with different data!
		</p>
		<?php
	}

	public function render_ga_section_description() {
		?>
		<p>Configure Google Analytics 4 for industry-standard web analytics and conversion tracking.</p>
		<?php
	}

	public function render_ga_enabled_field() {
		$enabled = get_option( 'clickwise_ga_enabled' );
		?>
		<label>
			<input type="checkbox" name="clickwise_ga_enabled" value="1" <?php checked( 1, $enabled ); ?> onchange="toggleGAFields(this.checked)" />
			Enable Google Analytics 4 tracking
		</label>
		<p class="description">Turn this on to start sending analytics data to Google Analytics 4.</p>
		<?php
	}

	public function render_ga_measurement_id_field() {
		$measurement_id = get_option( 'clickwise_ga_measurement_id', '' );
		$enabled = get_option( 'clickwise_ga_enabled' );
		$disabled = $enabled ? '' : 'disabled';
		?>
		<input type="text" name="clickwise_ga_measurement_id" id="clickwise_ga_measurement_id"
			   value="<?php echo esc_attr( $measurement_id ); ?>" class="regular-text"
			   placeholder="G-XXXXXXXXXX" <?php echo $disabled; ?> />
		<p class="description">Your Google Analytics 4 Measurement ID (starts with G-)</p>
		<?php
	}

	public function render_ga_api_secret_field() {
		$api_secret = get_option( 'clickwise_ga_api_secret', '' );
		$enabled = get_option( 'clickwise_ga_enabled' );
		$disabled = $enabled ? '' : 'disabled';
		?>
		<input type="password" name="clickwise_ga_api_secret" id="clickwise_ga_api_secret"
			   value="<?php echo esc_attr( $api_secret ); ?>" class="regular-text"
			   placeholder="API Secret Key" <?php echo $disabled; ?> />
		<p class="description">Your Google Analytics 4 Measurement Protocol API Secret</p>
		<?php
	}

	public function render_ga_test_field() {
		$enabled = get_option( 'clickwise_ga_enabled' );
		$disabled = $enabled ? '' : 'disabled';
		?>
		<div style="display: flex; gap: 10px; margin-bottom: 15px;">
			<button type="button" class="button button-primary" onclick="testHandler('ga')"
					id="test-ga-btn" <?php echo $disabled; ?>>
				<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>
				Test Connection
			</button>
			<button type="button" class="button" onclick="sendTestEvent('ga')"
					id="send-test-ga-btn" <?php echo $disabled; ?>>
				<span class="dashicons dashicons-media-code" style="vertical-align: middle; margin-right: 5px;"></span>
				Send Test Event
			</button>
		</div>
		<div class="clickwise-notification-container empty"></div>
		<p class="description">
			Verify your configuration and send test events to Google Analytics 4.
			<strong>💡 Tip:</strong> Visit the <a href="?page=clickwise-settings&tab=sandbox">Sandbox tab</a> to send custom test events and experiment with different data!
		</p>
		<?php
	}


	public function render_handler_card( $handler, $title, $desc ) {
		$enabled_option = "clickwise_{$handler}_enabled";
		$enabled = get_option( $enabled_option );

		$status_color = $enabled ? '#10b981' : '#6b7280';
		$status_text = $enabled ? 'ENABLED' : 'DISABLED';
		$card_style = $enabled ? 'border: 2px solid #10b981; background: #f0fdf4;' : 'border: 1px solid #d1d5db; background: #f9fafb;';

		echo '<div class="clickwise-handler-single-card" style="' . $card_style . ' padding: 30px; border-radius: 12px; position: relative; max-width: 100%; box-sizing: border-box;">';

		// Status badge
		echo '<div style="position: absolute; top: 20px; right: 20px; background: ' . $status_color . '; color: white; padding: 8px 16px; border-radius: 16px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">' . $status_text . '</div>';

		// Header section
		echo '<div style="margin-bottom: 30px;">';
		echo '<h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 24px;">' . esc_html( $title ) . '</h2>';
		echo '<p style="margin: 0; color: #6b7280; font-size: 16px; line-height: 1.5;">' . $desc . '</p>';
		echo '</div>';

		// Enable/Disable toggle
		echo '<div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">';
		echo '<h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px;">Handler Status</h3>';
		echo '<label style="display: flex; align-items: center; font-weight: 500; cursor: pointer; font-size: 16px;">';
		echo '<input type="checkbox" name="' . $enabled_option . '" id="' . $enabled_option . '" value="1" ' . checked( 1, $enabled, false ) . ' onchange="toggleSingleHandlerConfig(this, \'' . $handler . '\')" style="margin-right: 12px; transform: scale(1.3);"> ';
		echo 'Enable ' . esc_html( $title ) . ' Analytics';
		echo '</label>';
		echo '<p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">Turn this on to start sending analytics data to ' . esc_html( $title ) . '.</p>';
		echo '</div>';

		// Configuration section
		echo '<div id="' . $handler . '-config" class="handler-single-config" style="' . ( $enabled ? '' : 'opacity: 0.3; pointer-events: none;' ) . '">';
		echo '<div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">';
		echo '<h3 style="margin: 0 0 20px 0; color: #374151; font-size: 18px;">Configuration</h3>';

		if ( $handler === 'rybbit' ) {
			$this->render_rybbit_config_fields();
		} elseif ( $handler === 'ga' ) {
			$this->render_ga_config_fields();
		}

		echo '</div>';

		// Test section
		echo '<div style="margin-top: 20px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">';
		echo '<h3 style="margin: 0 0 15px 0; color: #374151; font-size: 18px;">Test Connection</h3>';
		echo '<p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">Verify your configuration by sending a test event to ' . esc_html( $title ) . '.</p>';
		echo '<button type="button" class="button button-primary" onclick="testHandler(\'' . $handler . '\')" id="test-' . $handler . '-btn" style="margin-right: 15px;" ' . ( $enabled ? '' : 'disabled' ) . '>';
		echo '<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>';
		echo 'Test Connection';
		echo '</button>';
		echo '<span id="test-' . $handler . '-result" style="margin-left: 10px;"></span>';
		echo '</div>';

		echo '</div>'; // End config section
		echo '</div>'; // End card

		// Add JavaScript for this specific handler tab
		$this->add_single_handler_javascript( $handler );
	}

	public function render_single_handler_field( $args ) {
		// Deprecated: Use render_handler_card instead.
		// This is kept just in case, but we are not using it for Rybbit/GA anymore.
		$this->render_handler_card( $args['handler'], $args['title'], $args['desc'] );
	}



	private function add_single_handler_javascript( $handler ) {
		static $js_added = false;

		if ( ! $js_added ) {
			echo '<script type="text/javascript">
			function toggleSingleHandlerConfig(checkbox, handler) {
				var configDiv = document.getElementById(handler + "-config");
				var card = checkbox.closest(".clickwise-handler-single-card");
				var statusBadge = card.querySelector("div[style*=\"position: absolute\"]");
				var testBtn = document.getElementById("test-" + handler + "-btn");
				var testResult = document.getElementById("test-" + handler + "-result");

				if (checkbox.checked) {
					configDiv.style.opacity = "1";
					configDiv.style.pointerEvents = "auto";
					card.style.border = "2px solid #10b981";
					card.style.background = "#f0fdf4";
					statusBadge.style.background = "#10b981";
					statusBadge.textContent = "ENABLED";
					testBtn.disabled = false;
				} else {
					configDiv.style.opacity = "0.3";
					configDiv.style.pointerEvents = "none";
					card.style.border = "1px solid #d1d5db";
					card.style.background = "#f9fafb";
					statusBadge.style.background = "#6b7280";
					statusBadge.textContent = "DISABLED";
					testBtn.disabled = true;
					testResult.innerHTML = "";
				}
			}

			function testHandler(handler) {
				var btn = document.getElementById("test-" + handler + "-btn");
				var result = document.getElementById("test-" + handler + "-result");

				btn.disabled = true;
				btn.innerHTML = \'<span class="dashicons dashicons-update-alt" style="vertical-align: middle; margin-right: 5px; animation: spin 1s linear infinite;"></span>Testing...\';
				result.innerHTML = "";

				var data = {
					action: "clickwise_test_handler",
					handler: handler,
					nonce: "' . wp_create_nonce( 'clickwise_admin_nonce' ) . '"
				};

				if (handler === "rybbit") {
					data.script_url = document.getElementById("clickwise_rybbit_script_url").value;
					data.site_id = document.getElementById("clickwise_rybbit_site_id").value;
					data.api_version = document.getElementById("clickwise_rybbit_api_version").value;
				} else if (handler === "ga") {
					data.measurement_id = document.getElementById("clickwise_ga_measurement_id").value;
					data.api_secret = document.getElementById("clickwise_ga_api_secret").value;
				}

				jQuery.post(ajaxurl, data, function(response) {
					btn.disabled = false;
					btn.innerHTML = \'<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>Test Connection\';

					if (response.success) {
						result.innerHTML = \'<span style="color: #10b981; font-weight: 500; font-size: 14px;"><span class="dashicons dashicons-yes-alt" style="vertical-align: middle;"></span> \' + response.data + \'</span>\';
					} else {
						result.innerHTML = \'<span style="color: #ef4444; font-weight: 500; font-size: 14px;"><span class="dashicons dashicons-dismiss" style="vertical-align: middle;"></span> \' + response.data + \'</span>\';
					}
				}).fail(function() {
					btn.disabled = false;
					btn.innerHTML = \'<span class="dashicons dashicons-admin-tools" style="vertical-align: middle; margin-right: 5px;"></span>Test Connection\';
					result.innerHTML = \'<span style="color: #ef4444; font-weight: 500; font-size: 14px;"><span class="dashicons dashicons-dismiss" style="vertical-align: middle;"></span> Connection failed</span>\';
				});
			}

			var style = document.createElement("style");
			style.innerHTML = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
			document.head.appendChild(style);
			</script>';

			$js_added = true;
		}
	}

	/**
	 * Get a random tip
	 */
	private function get_random_tip() {
		$random_tips = array(
			'Analytics are like coffee - the more data points, the better the buzz! ☕',
			'Fun fact: The average user clicks 2,617 times per day. Are you tracking them? 🖱️',
			'A website without analytics is like driving with your eyes closed... but less fun! 🚗',
			'Pro tip: Users spend 70% of their time above the fold. Track those clicks! 📊',
			'Event tracking is like being a digital detective - every click tells a story! 🕵️',
			'Remember: Data without action is just expensive storage! 💾',
			'Your bounce rate called - it wants you to track more engagement events! 📞',
			'Analytics rule #1: If it moves, track it. If it doesn\'t move, track why not! 🎯',
			'Users are like cats - they do unexpected things. Analytics help you understand why! 🐱',
			'Good analytics are like a GPS for your website - they show you where users really go! 🗺️'
		);

		return $random_tips[ array_rand( $random_tips ) ];
	}
}
