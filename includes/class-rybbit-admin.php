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
		$title = $is_recording ? '<span style="color: #d63638; font-weight: bold;">● Recording Events</span>' : 'Rybbit Analytics';

		$wp_admin_bar->add_node( array(
			'id'    => 'rybbit-analytics',
			'title' => $title,
			'href'  => admin_url( 'options-general.php?page=rybbit-settings&tab=events_manager' ),
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
				wp_enqueue_script( 'rybbit-admin', RYBBIT_WP_URL . 'assets/js/rybbit-admin.js', array( 'jquery' ), RYBBIT_WP_VERSION, true );
				wp_localize_script( 'rybbit-admin', 'rybbit_admin', array(
					'ajax_url' => admin_url( 'admin-ajax.php' ),
					'nonce'    => wp_create_nonce( 'rybbit_admin_nonce' ),
					'events'   => get_option( 'rybbit_discovered_events', array() )
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
		if ( empty( $event_data ) || empty( $event_data['name'] ) ) {
			wp_send_json_error( 'Invalid event data' );
		}

		$user_id = get_current_user_id();
		$session_id = get_user_meta( $user_id, 'rybbit_current_session_id', true );
		if ( ! $session_id ) {
			$session_id = 'manual_' . date('Ymd'); // Fallback
		}

		$events = get_option( 'rybbit_discovered_events', array() );
		$key = md5( $event_data['name'] . ( isset( $event_data['selector'] ) ? $event_data['selector'] : '' ) );

		if ( ! isset( $events[ $key ] ) ) {
			$events[ $key ] = array(
				'type'      => sanitize_text_field( wp_unslash( $event_data['type'] ) ),
				'name'      => sanitize_text_field( wp_unslash( $event_data['name'] ) ),
				'selector'  => isset( $event_data['selector'] ) ? sanitize_text_field( wp_unslash( $event_data['selector'] ) ) : '',
				'first_seen'=> time(),
				'last_seen' => time(),
				'status'    => 'pending', // pending, tracked, ignored
				'example'   => isset( $event_data['detail'] ) ? sanitize_text_field( wp_unslash( $event_data['detail'] ) ) : '',
				'session_id' => $session_id,
				'session_timestamp' => time()
			);
			update_option( 'rybbit_discovered_events', $events );
			wp_send_json_success( 'Event recorded' );
		} else {
			$events[ $key ]['last_seen'] = time();
			// Do not overwrite session_id to keep history context
			update_option( 'rybbit_discovered_events', $events );
			wp_send_json_success( 'Event updated' );
		}
	}

	public function ajax_update_event_status() {
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$key = isset( $_POST['key'] ) ? sanitize_text_field( $_POST['key'] ) : '';
		$status = isset( $_POST['status'] ) ? sanitize_text_field( $_POST['status'] ) : '';
		$alias = isset( $_POST['alias'] ) ? sanitize_text_field( $_POST['alias'] ) : '';

		if ( empty( $key ) || ! in_array( $status, array( 'tracked', 'ignored', 'pending' ) ) ) {
			wp_send_json_error( 'Invalid data' );
		}

		$events = get_option( 'rybbit_discovered_events', array() );
		if ( isset( $events[ $key ] ) ) {
			$events[ $key ]['status'] = $status;
			if ( isset( $_POST['alias'] ) ) {
				$events[ $key ]['alias'] = $alias;
			}
			update_option( 'rybbit_discovered_events', $events );
			wp_send_json_success( 'Status updated' );
		}

		wp_send_json_error( 'Event not found' );
	}

	public function ajax_delete_session() {
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$session_id = isset( $_POST['session_id'] ) ? sanitize_text_field( $_POST['session_id'] ) : '';
		if ( empty( $session_id ) ) {
			wp_send_json_error( 'Invalid session ID' );
		}

		$events = get_option( 'rybbit_discovered_events', array() );
		$count_deleted = 0;
		$count_unlinked = 0;

		foreach ( $events as $key => &$event ) {
			// Check if event belongs to this session
			if ( isset( $event['session_id'] ) && $event['session_id'] === $session_id ) {
				// If Pending -> Delete it
				if ( ! isset( $event['status'] ) || $event['status'] === 'pending' ) {
					unset( $events[ $key ] );
					$count_deleted++;
				} else {
					// If Tracked or Ignored -> Keep it, but remove from this session (unlink)
					unset( $event['session_id'] );
					unset( $event['session_timestamp'] );
					$count_unlinked++;
				}
			}
		}

		update_option( 'rybbit_discovered_events', $events );
		wp_send_json_success( "Deleted $count_deleted pending events. Preserved $count_unlinked tracked/ignored events." );
	}

	public function ajax_bulk_action() {
		check_ajax_referer( 'rybbit_admin_nonce', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Permission denied' );
		}

		$keys = isset( $_POST['keys'] ) ? (array) $_POST['keys'] : array();
		$action = isset( $_POST['bulk_action'] ) ? sanitize_text_field( $_POST['bulk_action'] ) : '';

		if ( empty( $keys ) || empty( $action ) ) {
			wp_send_json_error( 'Invalid data' );
		}

		$events = get_option( 'rybbit_discovered_events', array() );
		$count = 0;

		foreach ( $keys as $key ) {
			if ( ! isset( $events[ $key ] ) ) continue;

			if ( $action === 'delete' ) {
				unset( $events[ $key ] );
				$count++;
			} elseif ( in_array( $action, array( 'tracked', 'ignored', 'pending' ) ) ) {
				$events[ $key ]['status'] = $action;
				$count++;
			}
		}

		update_option( 'rybbit_discovered_events', $events );
		wp_send_json_success( "Processed $count events." );
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

		add_settings_field( 'rybbit_track_pgv', 'Pageviews', array( $this, 'render_checkbox_field' ), 'rybbit-settings-tracking', 'rybbit_tracking_section', array( 'id' => 'rybbit_track_pgv', 'label' => 'Track initial pageview' ) );
		add_settings_field( 'rybbit_track_spa', 'SPA Support', array( $this, 'render_checkbox_field' ), 'rybbit-settings-tracking', 'rybbit_tracking_section', array( 'id' => 'rybbit_track_spa', 'label' => 'Track virtual pageviews on History API changes' ) );
		add_settings_field( 'rybbit_track_query', 'Query Parameters', array( $this, 'render_checkbox_field' ), 'rybbit-settings-tracking', 'rybbit_tracking_section', array( 'id' => 'rybbit_track_query', 'label' => 'Include URL query parameters in tracking' ) );
		add_settings_field( 'rybbit_track_errors', 'JavaScript Errors', array( $this, 'render_checkbox_field' ), 'rybbit-settings-tracking', 'rybbit_tracking_section', array( 'id' => 'rybbit_track_errors', 'label' => 'Automatically track JavaScript errors' ) );

		// --- Tab: Events & Forms ---
		add_settings_section( 'rybbit_events_section', 'Events & Interactions', null, 'rybbit-settings-events' );

		add_settings_field( 'rybbit_event_prefixes', 'Custom Event Prefixes', array( $this, 'render_text_field' ), 'rybbit-settings-events', 'rybbit_events_section', array( 
			'id' => 'rybbit_event_prefixes', 
			'desc' => 'Comma-separated list of event prefixes to automatically track (e.g., "kb-, wc-, custom-").' 
		) );
		add_settings_field( 'rybbit_track_forms', 'Form Submissions', array( $this, 'render_checkbox_field' ), 'rybbit-settings-events', 'rybbit_events_section', array( 'id' => 'rybbit_track_forms', 'label' => 'Automatically track form submissions' ) );
		add_settings_field( 'rybbit_track_links', 'Outbound Links', array( $this, 'render_checkbox_field' ), 'rybbit-settings-events', 'rybbit_events_section', array( 'id' => 'rybbit_track_links', 'label' => 'Track clicks on external links' ) );

		// --- Tab: Advanced ---
		add_settings_section( 'rybbit_advanced_section', 'Advanced Configuration', null, 'rybbit-settings-advanced' );

		add_settings_field( 'rybbit_skip_patterns', 'Skip Patterns', array( $this, 'render_textarea_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 
			'id' => 'rybbit_skip_patterns', 
			'desc' => 'URL patterns to exclude from tracking (one per line). Use * for wildcards.' 
		) );
		add_settings_field( 'rybbit_mask_patterns', 'Mask Patterns', array( $this, 'render_textarea_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 
			'id' => 'rybbit_mask_patterns', 
			'desc' => 'URL patterns to mask/anonymize in reports (one per line).' 
		) );
		add_settings_field( 'rybbit_debounce', 'Debounce (ms)', array( $this, 'render_text_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 
			'id' => 'rybbit_debounce', 
			'type' => 'number',
			'desc' => 'Delay in milliseconds before sending events (default: 500).'
		) );
		add_settings_field( 'rybbit_session_replay', 'Session Replay', array( $this, 'render_checkbox_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 'id' => 'rybbit_session_replay', 'label' => 'Enable session replay recording (High resource usage)' ) );
		add_settings_field( 'rybbit_dev_mode', 'Development Mode', array( $this, 'render_checkbox_field' ), 'rybbit-settings-advanced', 'rybbit_advanced_section', array( 'id' => 'rybbit_dev_mode', 'label' => 'Enable debug logging and visual notifications' ) );
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
				<a href="?page=rybbit-settings&tab=advanced" class="nav-tab <?php echo $active_tab == 'advanced' ? 'nav-tab-active' : ''; ?>">Advanced</a>
			</h2>

			<div class="rybbit-settings-container" style="display: flex; gap: 20px; margin-top: 20px;">
				<div class="rybbit-main-content" style="flex: 3;">
					<?php if ( $active_tab === 'events_manager' ) : ?>
						<?php $this->render_events_manager_tab(); ?>
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
		if ( $desc ) echo "<p class='description'>$desc</p>";
	}

	public function render_textarea_field( $args ) {
		$id = $args['id'];
		$value = get_option( $id );
		$desc = isset( $args['desc'] ) ? $args['desc'] : '';
		echo "<textarea name='$id' id='$id' rows='5' cols='50' class='large-text code'>" . esc_textarea( $value ) . "</textarea>";
		if ( $desc ) echo "<p class='description'>$desc</p>";
	}

	public function render_checkbox_field( $args ) {
		$id = $args['id'];
		$value = get_option( $id );
		$label = isset( $args['label'] ) ? $args['label'] : '';
		echo "<label><input type='checkbox' name='$id' id='$id' value='1' " . checked( 1, $value, false ) . "> $label</label>";
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
		$events = get_option( 'rybbit_discovered_events', array() );
		
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
			if ( isset( $event['session_id'] ) ) {
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
		<div class="rybbit-manager-tabs" style="margin-bottom: 20px; border-bottom: 1px solid #ccc;">
			<a href="#" class="rybbit-sub-tab active" data-target="rybbit-tracked-view" style="text-decoration:none; padding: 10px 20px; display:inline-block; border:1px solid #ccc; border-bottom:none; background:#fff; margin-bottom:-1px;">Tracked Events</a>
			<a href="#" class="rybbit-sub-tab" data-target="rybbit-ignored-view" style="text-decoration:none; padding: 10px 20px; display:inline-block; background:#f1f1f1; color:#555;">Ignored Events</a>
			<a href="#" class="rybbit-sub-tab" data-target="rybbit-history-view" style="text-decoration:none; padding: 10px 20px; display:inline-block; background:#f1f1f1; color:#555;">Recording History</a>
		</div>

		<!-- TRACKED EVENTS VIEW -->
		<div id="rybbit-tracked-view" class="rybbit-sub-view">
			<h3>Active Tracked Events</h3>
			<form class="rybbit-bulk-form" method="post">
				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<select name="bulk_action">
							<option value="-1">Bulk Actions</option>
							<option value="ignored">Ignore</option>
							<option value="delete">Delete</option>
						</select>
						<button type="button" class="button action rybbit-apply-bulk">Apply</button>
					</div>
				</div>
				<table class="widefat fixed striped">
					<thead>
						<tr>
							<td id="cb" class="manage-column column-cb check-column"><input type="checkbox" class="rybbit-select-all"></td>
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
										<button type="button" class="button rybbit-open-details" data-key="<?php echo esc_attr( $event['key'] ); ?>">Details / Edit</button>
									</td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</form>
		</div>

		<!-- IGNORED EVENTS VIEW -->
		<div id="rybbit-ignored-view" class="rybbit-sub-view" style="display:none;">
			<h3>Ignored Events</h3>
			<form class="rybbit-bulk-form" method="post">
				<div class="tablenav top">
					<div class="alignleft actions bulkactions">
						<select name="bulk_action">
							<option value="-1">Bulk Actions</option>
							<option value="tracked">Track</option>
							<option value="delete">Delete</option>
						</select>
						<button type="button" class="button action rybbit-apply-bulk">Apply</button>
					</div>
				</div>
				<table class="widefat fixed striped">
					<thead>
						<tr>
							<td class="manage-column column-cb check-column"><input type="checkbox" class="rybbit-select-all"></td>
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
										<button type="button" class="button rybbit-open-details" data-key="<?php echo esc_attr( $event['key'] ); ?>">Details / Edit</button>
									</td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</form>
		</div>

		<!-- RECORDING HISTORY VIEW -->
		<div id="rybbit-history-view" class="rybbit-sub-view" style="display:none;">
			<h3>Recording History</h3>
			<?php if ( empty( $sessions ) ) : ?>
				<p>No recording history found.</p>
			<?php else : ?>
				<?php foreach ( $sessions as $session ) : ?>
					<div class="rybbit-session-block" style="border: 1px solid #ccd0d4; background: #fff; margin-bottom: 20px;">
						<div class="rybbit-session-header" style="padding: 10px 15px; background: #f9f9f9; border-bottom: 1px solid #ccd0d4; display:flex; justify-content:space-between; align-items:center;">
							<div>
								<strong>Session: <?php echo esc_html( $session['id'] === 'legacy' ? 'Legacy / Manual' : date( 'F j, Y @ g:i a', $session['timestamp'] ) ); ?></strong>
								<span class="count" style="color:#666; margin-left:10px;">(<?php echo count( $session['events'] ); ?> events)</span>
							</div>
							<div>
								<button type="button" class="button rybbit-delete-session" data-session="<?php echo esc_attr( $session['id'] ); ?>" style="color: #a00; border-color: #a00;">Delete Session</button>
							</div>
						</div>
						<div class="rybbit-session-content" style="padding: 0;">
							<form class="rybbit-bulk-form" method="post">
								<div class="tablenav top" style="padding: 10px;">
									<div class="alignleft actions bulkactions">
										<select name="bulk_action">
											<option value="-1">Bulk Actions</option>
											<option value="tracked">Track</option>
											<option value="ignored">Ignore</option>
											<option value="delete">Delete</option>
										</select>
										<button type="button" class="button action rybbit-apply-bulk">Apply</button>
									</div>
								</div>
								<table class="widefat fixed striped" style="border:none; box-shadow:none;">
									<thead>
										<tr>
											<td class="manage-column column-cb check-column"><input type="checkbox" class="rybbit-select-all"></td>
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
													<button type="button" class="button rybbit-open-details" data-key="<?php echo esc_attr( $event['key'] ); ?>">Details</button>
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


		<!-- Event Details Modal -->
		<div id="rybbit-event-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10000; align-items: center; justify-content: center;">
			<div class="rybbit-modal-content" style="background:#fff; width:700px; max-width:90%; max-height:90vh; overflow-y:auto; padding:0; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.3); position:relative; display:flex; flex-direction:column;">
				
				<div class="rybbit-modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
					<h2 style="margin:0;">Event Details</h2>
					<button type="button" id="rybbit-modal-close-x" style="background:none; border:none; font-size:24px; cursor:pointer; color:#666; line-height:1;">&times;</button>
				</div>

				<div class="rybbit-modal-body" style="padding: 20px; overflow-y:auto;">
					<table class="form-table" style="margin:0;">
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
							<td><pre id="modal-event-detail" style="background:#f6f7f7; padding:15px; border:1px solid #dcdcde; border-radius:4px; overflow:auto; max-height:200px; font-family:monospace; white-space:pre-wrap; word-wrap:break-word;"></pre></td>
						</tr>
						<tr>
							<th>User-Friendly Name (Alias)</th>
							<td>
								<input type="text" id="modal-event-alias" class="regular-text" placeholder="e.g. Signup Button Click" style="width:100%;">
								<p class="description">If set, this name will be sent to Rybbit instead of the original name.</p>
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

				<div class="rybbit-modal-footer" style="padding: 20px; border-top: 1px solid #eee; text-align:right; background:#fcfcfc; border-radius:0 0 8px 8px;">
					<button type="button" class="button" id="rybbit-modal-cancel">Cancel</button>
					<button type="button" class="button button-primary" id="rybbit-modal-save">Save Changes</button>
				</div>
			</div>
		</div>
		<style>
			#modal-event-detail .string { color: #008000; }
			#modal-event-detail .number { color: #0000ff; }
			#modal-event-detail .boolean { color: #b22222; }
			#modal-event-detail .null { color: #808080; }
			#modal-event-detail .key { color: #a52a2a; font-weight: bold; }
		</style>
		<?php
	}
}
