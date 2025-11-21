<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://webspirio.com
 * @since      1.0.0
 *
 * @package    Webspirio_Rybbit_Analytics
 * @subpackage Webspirio_Rybbit_Analytics/includes
 * @author     Webspirio (Oleksandr Chornous) <contact@webspirio.com>
 *
 * Copyright (c) 2025 Webspirio
 * Licensed under GPLv2 or later
 */
class Rybbit_Admin {

	private $plugin_name;
	private $version;

	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version     = $version;
	}

	public function add_admin_menu() {
		add_options_page(
			'Rybbit Analytics',
			'Rybbit Analytics',
			'manage_options',
			'rybbit-settings',
			array( $this, 'display_options_page' )
		);
	}

	public function add_admin_bar_menu( $wp_admin_bar ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$is_recording = get_user_meta( get_current_user_id(), 'rybbit_recording_mode', true );
		$title = $is_recording ? '● Recording Events' : 'Rybbit Analytics';
		
		$meta = array();
		if ( $is_recording ) {
			$meta['class'] = 'rybbit-recording-active';
		}

		$wp_admin_bar->add_node( array(
			'id'    => 'rybbit-analytics',
			'title' => $title,
			'href'  => admin_url( 'options-general.php?page=rybbit-settings&tab=events_manager' ),
			'meta'  => $meta
		) );

		$wp_admin_bar->add_node( array(
			'id'     => 'rybbit-toggle-recording',
			'parent' => 'rybbit-analytics',
			'title'  => $is_recording ? 'Stop Recording' : 'Start Recording',
			'href'   => '#',
			'meta'   => array(
				'onclick' => 'rybbitToggleRecording(event)',
			),
		) );

		$wp_admin_bar->add_node( array(
			'id'     => 'rybbit-manage-events',
			'parent' => 'rybbit-analytics',
			'title'  => 'Manage Events',
			'href'   => admin_url( 'options-general.php?page=rybbit-settings&tab=events_manager' ),
		) );
	}

	public function enqueue_admin_scripts( $hook ) {
		// Enqueue on settings page AND frontend (for admin bar)
		if ( 'settings_page_rybbit-settings' === $hook || ! is_admin() ) {
			if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {
			wp_enqueue_style( 'rybbit-admin-bar-css', RYBBIT_WP_URL . 'assets/css/rybbit-admin-bar.css', array(), RYBBIT_WP_VERSION );
			wp_enqueue_style( 'rybbit-pattern-ui-css', RYBBIT_WP_URL . 'assets/css/rybbit-pattern-ui.css', array(), RYBBIT_WP_VERSION );
			wp_enqueue_script( 'rybbit-admin', RYBBIT_WP_URL . 'assets/js/rybbit-admin.js', array( 'jquery' ), RYBBIT_WP_VERSION, true );
			wp_enqueue_script( 'rybbit-pattern-ui', RYBBIT_WP_URL . 'assets/js/rybbit-pattern-ui.js', array( 'jquery' ), RYBBIT_WP_VERSION, true );
				wp_localize_script( 'rybbit-admin', 'rybbit_admin', array(
					'ajax_url' => admin_url( 'admin-ajax.php' ),
					'nonce'    => wp_create_nonce( 'rybbit_admin_nonce' ),
					'events'   => $this->get_events_for_admin_js(),
					'script_url' => get_option( 'rybbit_script_url' ),
					'site_id'    => get_option( 'rybbit_site_id' )
				) );
			}
		}
	}

	public function ajax_toggle_recording() {
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$user_id = get_current_user_id();
		$current = get_user_meta( $user_id, 'rybbit_recording_mode', true );
		$new_state = ! $current;
		
		update_user_meta( $user_id, 'rybbit_recording_mode', $new_state );

		if ( $new_state ) {
			// Start new session
			$session_id = uniqid( 'sess_' );
			update_user_meta( $user_id, 'rybbit_current_session_id', $session_id );
			update_user_meta( $user_id, 'rybbit_current_session_start', time() );
		}

		wp_send_json_success( $new_state );
	}

	public function ajax_record_event() {
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$event_data = isset( $_POST['event'] ) ? $_POST['event'] : array();
		if ( empty( $event_data ) || empty( $event_data['type'] ) || empty( $event_data['detail'] ) ) {
			wp_send_json_error( 'Invalid event data' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'rybbit_events';

		$type     = sanitize_text_field( $event_data['type'] );
		$detail   = $event_data['detail']; // Already an object/array from JS
		$selector = isset( $event_data['selector'] ) ? sanitize_text_field( $event_data['selector'] ) : '';
		
		// Generate a unique key for the event based on type and selector (or name if custom)
		// For clicks/forms, selector is key. For custom events, type is key.
		$key_string = $type . '|' . $selector;
		$event_key  = md5( $key_string );

		// Check if exists
		$existing = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_name WHERE event_key = %s", $event_key ), ARRAY_A );

		$now = current_time( 'mysql' );
		$session_id = uniqid( 'sess_' ); // Simple session ID for grouping in this context

		if ( $existing ) {
			// Update last seen
			$wpdb->update(
				$table_name,
				array(
					'last_seen' => $now,
					'example_detail' => json_encode( $detail ) // Update example with latest
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
					'name'           => $type, // Default name
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
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );

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
		$table_name = $wpdb->prefix . 'rybbit_events';

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

	public function ajax_delete_session() {
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$session_id = isset( $_POST['session_id'] ) ? sanitize_text_field( $_POST['session_id'] ) : '';

		if ( empty( $session_id ) ) {
			wp_send_json_error( 'Missing session ID' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'rybbit_events';

		$wpdb->delete(
			$table_name,
			array( 'session_id' => $session_id )
		);

		wp_send_json_success( 'Session deleted' );
	}

	public function ajax_bulk_action() {
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$action = isset( $_POST['bulk_action'] ) ? sanitize_text_field( $_POST['bulk_action'] ) : '';
		$keys   = isset( $_POST['keys'] ) ? $_POST['keys'] : array();

		if ( empty( $action ) || empty( $keys ) || ! is_array( $keys ) ) {
			wp_send_json_error( 'Invalid request' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'rybbit_events';

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
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );

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
		$settings_link = '<a href="options-general.php?page=rybbit-settings">Settings</a>';
		array_unshift( $links, $settings_link );
		return $links;
	}

	public function register_settings() {
		// --- General Settings ---
		register_setting( 'rybbit-settings-general', 'rybbit_script_url' );
		register_setting( 'rybbit-settings-general', 'rybbit_site_id' );
		register_setting( 'rybbit-settings-general', 'rybbit_api_version' );

		// --- Tracking Settings ---
		register_setting( 'rybbit-settings-tracking', 'rybbit_track_pgv' );
		register_setting( 'rybbit-settings-tracking', 'rybbit_track_spa' );
		register_setting( 'rybbit-settings-tracking', 'rybbit_track_query' );
		register_setting( 'rybbit-settings-tracking', 'rybbit_track_errors' );

		// --- Events Settings ---
		register_setting( 'rybbit-settings-events', 'rybbit_event_prefixes' );
		register_setting( 'rybbit-settings-events', 'rybbit_track_forms' );
		register_setting( 'rybbit-settings-events', 'rybbit_track_links' );

		// --- Advanced Settings ---
		register_setting( 'rybbit-settings-advanced', 'rybbit_skip_patterns' );
		register_setting( 'rybbit-settings-advanced', 'rybbit_mask_patterns' );
		register_setting( 'rybbit-settings-advanced', 'rybbit_debounce' );
		register_setting( 'rybbit-settings-advanced', 'rybbit_session_replay' );
		register_setting( 'rybbit-settings-advanced', 'rybbit_dev_mode' );

		// --- Tab: General ---
		add_settings_section( 'rybbit_general_section', 'General Configuration', null, 'rybbit-settings-general' );
		
		add_settings_field( 'rybbit_script_url', 'Script URL', array( $this, 'render_text_field' ), 'rybbit-settings-general', 'rybbit_general_section', array( 
			'id' => 'rybbit_script_url', 
			'type' => 'url',
			'desc' => 'The URL to your Rybbit tracking script (e.g., https://tracking.example.com/api/script.js).'
		) );
		add_settings_field( 'rybbit_site_id', 'Site ID', array( $this, 'render_text_field' ), 'rybbit-settings-general', 'rybbit_general_section', array( 
			'id' => 'rybbit_site_id',
			'desc' => 'Your unique Site ID found in the Rybbit dashboard.'
		) );
		add_settings_field( 'rybbit_api_version', 'API Version', array( $this, 'render_select_field' ), 'rybbit-settings-general', 'rybbit_general_section', array( 
			'id' => 'rybbit_api_version', 
			'options' => array( 'v1' => 'v1 (Legacy)', 'v2' => 'v2 (Modern)' ),
			'desc' => 'Select the API version compatible with your Rybbit instance.'
		) );

		// --- Tab: Tracking ---
		add_settings_section( 'rybbit_tracking_section', 'Standard Tracking', null, 'rybbit-settings-tracking' );

		add_settings_field( 'rybbit_track_pgv', 'Pageviews', array( $this, 'render_checkbox_field' ), 'rybbit-settings-tracking', 'rybbit_tracking_section', array( 
			'id' => 'rybbit_track_pgv', 
			'label' => 'Track initial pageview',
			'desc' => 'Automatically track a pageview event when a page loads. Disable this if you want to manually trigger pageviews.'
		) );
		add_settings_field( 'rybbit_track_spa', 'SPA Support', array( $this, 'render_checkbox_field' ), 'rybbit-settings-tracking', 'rybbit_tracking_section', array( 
			'id' => 'rybbit_track_spa', 
			'label' => 'Track virtual pageviews on History API changes',
			'desc' => 'Enable this for Single Page Applications (SPAs) to track pageviews when the URL changes without a full reload.'
		) );
		add_settings_field( 'rybbit_track_query', 'Query Parameters', array( $this, 'render_checkbox_field' ), 'rybbit-settings-tracking', 'rybbit_tracking_section', array( 
			'id' => 'rybbit_track_query', 
			'label' => 'Include URL query parameters in tracking',
			'desc' => 'If enabled, the full URL with query parameters (e.g., ?utm_source=google) will be recorded. Useful for marketing attribution.'
		) );
		add_settings_field( 'rybbit_track_errors', 'JavaScript Errors', array( $this, 'render_checkbox_field' ), 'rybbit-settings-tracking', 'rybbit_tracking_section', array( 
			'id' => 'rybbit_track_errors', 
			'label' => 'Automatically track JavaScript errors',
			'desc' => 'Capture uncaught JavaScript exceptions and send them as error events to Rybbit.'
		) );

		// --- Tab: Events & Forms ---
		add_settings_section( 'rybbit_events_section', 'Events & Interactions', null, 'rybbit-settings-events' );

		add_settings_field( 'rybbit_event_prefixes', 'Custom Event Prefixes', array( $this, 'render_text_field' ), 'rybbit-settings-events', 'rybbit_events_section', array( 
			'id' => 'rybbit_event_prefixes', 
			'desc' => 'Comma-separated list of event prefixes to automatically track (e.g., "kb-, wc-, custom-").' 
		) );
		add_settings_field( 'rybbit_track_forms', 'Form Submissions', array( $this, 'render_checkbox_field' ), 'rybbit-settings-events', 'rybbit_events_section', array( 
			'id' => 'rybbit_track_forms', 
			'label' => 'Automatically track form submissions',
			'desc' => 'Detects standard HTML form submissions and records them as events.'
		) );
		add_settings_field( 'rybbit_track_links', 'Outbound Links', array( $this, 'render_checkbox_field' ), 'rybbit-settings-events', 'rybbit_events_section', array( 
			'id' => 'rybbit_track_links', 
			'label' => 'Track clicks on external links',
			'desc' => 'Records clicks on links that lead to other domains.'
		) );

		// --- Tab: Advanced ---
		add_settings_section( 'rybbit_advanced_section', 'Advanced Configuration', null, 'rybbit-settings-advanced' );

		add_settings_field( 'rybbit_skip_patterns', 'Skip Patterns', array( $this, 'render_pattern_list_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 
			'id' => 'rybbit_skip_patterns', 
			'desc' => 'URL patterns to exclude from tracking. Use * for wildcards (e.g., /admin/*).' 
		) );
		add_settings_field( 'rybbit_mask_patterns', 'Mask Patterns', array( $this, 'render_pattern_list_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 
			'id' => 'rybbit_mask_patterns', 
			'desc' => 'URL patterns to mask/anonymize in reports (e.g., /user/*).' 
		) );
		add_settings_field( 'rybbit_debounce', 'Debounce (ms)', array( $this, 'render_text_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 
			'id' => 'rybbit_debounce', 
			'type' => 'number',
			'desc' => 'Delay in milliseconds before sending events (default: 500).'
		) );
		add_settings_field( 'rybbit_session_replay', 'Session Replay', array( $this, 'render_checkbox_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 
			'id' => 'rybbit_session_replay', 
			'label' => 'Enable session replay recording (High resource usage)',
			'desc' => 'Records user interactions for session replay. <strong>Warning:</strong> This can increase bandwidth usage and impact client performance.'
		) );
		add_settings_field( 'rybbit_dev_mode', 'Development Mode', array( $this, 'render_checkbox_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 
			'id' => 'rybbit_dev_mode', 
			'label' => 'Enable debug logging and visual notifications',
			'desc' => 'Shows event "toasts" on the frontend and logs detailed info to the browser console. Only visible to admins.'
		) );
	}

	public function display_options_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$active_tab = isset( $_GET['tab'] ) ? $_GET['tab'] : 'general';
		?>
		<div class="wrap">
			<h1>Rybbit Analytics <span style="font-size: 0.5em; color: #666; font-weight: normal;">by <a href="https://webspirio.com" target="_blank" style="color: #666; text-decoration: none;">Webspirio</a></span></h1>
			
			<h2 class="nav-tab-wrapper">
				<a href="?page=rybbit-settings&tab=general" class="nav-tab <?php echo $active_tab == 'general' ? 'nav-tab-active' : ''; ?>">General</a>
				<a href="?page=rybbit-settings&tab=tracking" class="nav-tab <?php echo $active_tab == 'tracking' ? 'nav-tab-active' : ''; ?>">Tracking</a>
				<a href="?page=rybbit-settings&tab=events" class="nav-tab <?php echo $active_tab == 'events' ? 'nav-tab-active' : ''; ?>">Events & Forms</a>
				<a href="?page=rybbit-settings&tab=events_manager" class="nav-tab <?php echo $active_tab == 'events_manager' ? 'nav-tab-active' : ''; ?>">Event Manager</a>
				<a href="?page=rybbit-settings&tab=sandbox" class="nav-tab <?php echo $active_tab == 'sandbox' ? 'nav-tab-active' : ''; ?>">Sandbox</a>
				<a href="?page=rybbit-settings&tab=advanced" class="nav-tab <?php echo $active_tab == 'advanced' ? 'nav-tab-active' : ''; ?>">Advanced</a>
			</h2>

		<?php if ( $active_tab === 'general' ) : ?>
			<div class="notice notice-info" style="margin: 15px 0;">
				<p><strong>External Service Notice:</strong> This plugin connects to your Rybbit Analytics instance (an external service). By configuring and using this plugin, you consent to sending analytics data to your specified Rybbit server. <a href="https://rybbit.com" target="_blank">Learn more about Rybbit Analytics</a> | Please review your Rybbit provider's privacy policy and terms of service.</p>
			</div>
		<?php endif; ?>

		<div class="rybbit-settings-container" style="display: flex; gap: 20px; margin-top: 20px;">
				<div class="rybbit-main-content" style="flex: 3;">
					<?php if ( $active_tab === 'events_manager' ) : ?>
						<?php $this->render_events_manager_tab(); ?>
					<?php elseif ( $active_tab === 'sandbox' ) : ?>
						<?php $this->render_sandbox_tab(); ?>
					<?php else : ?>
						<form action="options.php" method="post">
							<?php
							if ( $active_tab == 'general' ) {
								settings_fields( 'rybbit-settings-general' );
								do_settings_sections( 'rybbit-settings-general' );
							} elseif ( $active_tab == 'tracking' ) {
								settings_fields( 'rybbit-settings-tracking' );
								do_settings_sections( 'rybbit-settings-tracking' );
							} elseif ( $active_tab == 'events' ) {
								settings_fields( 'rybbit-settings-events' );
								do_settings_sections( 'rybbit-settings-events' );
							} elseif ( $active_tab == 'advanced' ) {
								settings_fields( 'rybbit-settings-advanced' );
								do_settings_sections( 'rybbit-settings-advanced' );
							}
							submit_button();
							?>
						</form>
					<?php endif; ?>
				</div>
				
				<div class="rybbit-sidebar" style="flex: 1; background: #fff; padding: 20px; border: 1px solid #ccd0d4; box-shadow: 0 1px 1px rgba(0,0,0,.04);">
					<h3>Quick Tips</h3>
					<ul>
						<li><strong>Site ID:</strong> Found in your Rybbit dashboard.</li>
						<li><strong>Events:</strong> Use prefixes like <code>kb-</code> to track specific custom events.</li>
						<li><strong>Testing:</strong> Use the browser console to verify events.</li>
					</ul>
					<hr>
					<p><small>Plugin developed by <a href="https://webspirio.com" target="_blank" style="text-decoration: none;"><strong>Webspirio</strong></a><br>Oleksandr Chornous<br><a href="mailto:contact@webspirio.com">contact@webspirio.com</a></small></p>
					<p>
						<a href="https://rybbit.com/docs" target="_blank" class="button button-secondary">View Documentation</a>
						<a href="https://webspirio.com" target="_blank" class="button button-secondary">Visit Webspirio</a>
					</p>
				</div>
			</div>
		</div>
		<?php
	}

	public function render_sandbox_tab() {
		?>
		<div class="rybbit-sandbox">
			<h3>Event Sandbox</h3>
			<p>Use this tool to test custom events and verify that your tracking configuration is working correctly.</p>
			
			<table class="form-table">
				<tr>
					<th scope="row"><label for="rybbit-sandbox-name">Event Name</label></th>
					<td>
						<input type="text" id="rybbit-sandbox-name" class="regular-text" value="custom_event" placeholder="e.g. signup_click">
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="rybbit-sandbox-props">Event Properties (JSON)</label></th>
					<td>
						<textarea id="rybbit-sandbox-props" rows="5" cols="50" class="large-text code" placeholder='{"key": "value"}'><?php echo "{\n    \"test_mode\": true,\n    \"source\": \"admin_sandbox\"\n}"; ?></textarea>
						<p class="description">Enter valid JSON object.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Actions</th>
					<td>
						<button type="button" id="rybbit-sandbox-send" class="button button-primary">Send Custom Event</button>
					</td>
				</tr>
			</table>

			<div id="rybbit-sandbox-log" style="margin-top: 20px; background: #f0f0f1; padding: 15px; border: 1px solid #c3c4c7; border-radius: 4px; font-family: monospace; max-height: 300px; overflow-y: auto;">
				<div style="color: #666; font-style: italic;">Ready to send events...</div>
			</div>
		</div>
		<?php
	}

	public function render_text_field( $args ) {
		$id = $args['id'];
		$type = isset( $args['type'] ) ? $args['type'] : 'text';
		$value = get_option( $id );
		$desc = isset( $args['desc'] ) ? $args['desc'] : '';
		echo "<input type='$type' name='$id' id='$id' value='" . esc_attr( $value ) . "' class='regular-text'>";
		if ( $id === 'rybbit_script_url' ) {
			echo " <button type='button' id='rybbit-test-connection' class='button'>Test Connection</button>";
			echo " <span id='rybbit-test-result'></span>";
		}
		if ( $id === 'rybbit_site_id' ) {
			echo " <button type='button' id='rybbit-send-test-event' class='button'>Send Test Event</button>";
			echo " <span id='rybbit-test-event-result'></span>";
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
		
		echo '<div class="rybbit-pattern-ui-container">';
		echo '<textarea name="' . esc_attr( $id ) . '" id="' . esc_attr( $id ) . '" class="rybbit-pattern-source" style="display:none;">' . esc_textarea( $value ) . '</textarea>';
		
		echo '<div class="rybbit-pattern-wrapper">';
		echo '<ul class="rybbit-pattern-list"></ul>';
		echo '<div class="rybbit-pattern-input-group">';
		echo '<input type="text" class="regular-text rybbit-new-pattern-input" placeholder="Enter pattern (e.g. /blog/*)">';
		echo '<button type="button" class="button rybbit-add-pattern-btn">Add Pattern</button>';
		echo '</div>';
		echo '</div>';
		
		if ( $desc ) echo "<p class='description'>$desc</p>";
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
		$table_name = $wpdb->prefix . 'rybbit_events';
		
		// Check if table exists
		if ( $wpdb->get_var( "SHOW TABLES LIKE '$table_name'" ) != $table_name ) {
			echo '<div class="notice notice-error"><p>Database table not found. Please reactivate the plugin.</p></div>';
			return;
		}

		$events = $wpdb->get_results( "SELECT * FROM $table_name ORDER BY last_seen DESC", ARRAY_A );

		echo '<div class="rybbit-events-manager">';
		echo '<h3>Discovered Events</h3>';
		echo '<p>These events were discovered while Recording Mode was active.</p>';

		if ( empty( $events ) ) {
			echo '<p>No events recorded yet. Turn on Recording Mode and interact with your site.</p>';
		} else {
			echo '<form id="rybbit-bulk-action-form">';
			echo '<div class="tablenav top">';
			echo '<div class="alignleft actions bulkactions">';
			echo '<select name="bulk_action" id="bulk-action-selector-top">';
			echo '<option value="-1">Bulk Actions</option>';
			echo '<option value="track">Mark as Track</option>';
			echo '<option value="ignore">Mark as Ignore</option>';
			echo '<option value="pending">Mark as Pending</option>';
			echo '<option value="delete">Delete</option>';
			echo '</select>';
			echo '<input type="submit" id="doaction" class="button action" value="Apply">';
			echo '</div>';
			echo '</div>';

			echo '<table class="wp-list-table widefat fixed striped">';
			echo '<thead><tr>';
			echo '<td id="cb" class="manage-column column-cb check-column"><input type="checkbox" id="cb-select-all-1"></td>';
			echo '<th>Status</th>';
			echo '<th>Type</th>';
			echo '<th>Name / Selector</th>';
			echo '<th>Alias (Rename)</th>';
			echo '<th>Example Detail</th>';
			echo '<th>Last Seen</th>';
			echo '<th>Actions</th>';
			echo '</tr></thead>';
			echo '<tbody>';

			foreach ( $events as $event ) {
				$key = $event['event_key'];
				$status_label = ucfirst( $event['status'] );
				$status_class = 'status-' . $event['status'];
				
				// Format detail JSON for display
				$detail_json = $event['example_detail'];
				$detail_display = '';
				if ( ! empty( $detail_json ) ) {
					$detail_obj = json_decode( $detail_json, true );
					if ( $detail_obj && is_array( $detail_obj ) ) {
						foreach ( $detail_obj as $k => $v ) {
							if ( is_array( $v ) || is_object( $v ) ) $v = json_encode( $v );
							$detail_display .= "<strong>$k:</strong> " . esc_html( substr( $v, 0, 50 ) ) . "<br>";
						}
					} else {
						$detail_display = esc_html( substr( $detail_json, 0, 100 ) );
					}
				}

				echo '<tr>';
				echo '<th scope="row" class="check-column"><input type="checkbox" name="event_keys[]" value="' . esc_attr( $key ) . '"></th>';
				echo "<td><span class='rybbit-status-badge $status_class'>$status_label</span></td>";
				echo '<td>' . esc_html( $event['type'] ) . '</td>';
				echo '<td>';
				if ( $event['type'] === 'custom' ) {
					echo '<strong>' . esc_html( $event['name'] ) . '</strong>';
				} else {
					echo '<code>' . esc_html( $event['selector'] ) . '</code>';
				}
				echo '</td>';
				echo '<td>';
				echo '<input type="text" class="rybbit-alias-input" data-key="' . esc_attr( $key ) . '" value="' . esc_attr( $event['alias'] ) . '" placeholder="e.g. Signup Button">';
				echo ' <button type="button" class="button button-small rybbit-save-alias" data-key="' . esc_attr( $key ) . '">Save</button>';
				echo '</td>';
				echo '<td class="rybbit-detail-cell"><div class="rybbit-detail-content">' . $detail_display . '</div></td>';
				echo '<td>' . esc_html( $event['last_seen'] ) . '</td>';
				echo '<td>';
				echo '<select class="rybbit-status-select" data-key="' . esc_attr( $key ) . '">';
				echo '<option value="pending" ' . selected( $event['status'], 'pending', false ) . '>Pending</option>';
				echo '<option value="track" ' . selected( $event['status'], 'track', false ) . '>Track</option>';
				echo '<option value="ignore" ' . selected( $event['status'], 'ignore', false ) . '>Ignore</option>';
				echo '</select>';
				echo '</td>';
				echo '</tr>';
			}

			echo '</tbody>';
			echo '</table>';
			echo '</form>';
		}
		echo '</div>';
	}

	/**
	 * Helper to get events from database table for admin JS.
	 */
	private function get_events_for_admin_js() {
		global $wpdb;
		$table_name = $wpdb->prefix . 'rybbit_events';

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
}
