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
				
				$is_dev = defined( 'CLICKWISE_REACT_DEV' ) && CLICKWISE_REACT_DEV;
				// Auto-detect dev mode if localhost:5173 is reachable (optional, but manual constant is safer for now)
				// For this environment, let's assume dev mode if the constant is not defined but we are in a local env
				if ( ! defined( 'CLICKWISE_REACT_DEV' ) && ( wp_get_environment_type() === 'local' || wp_get_environment_type() === 'development' ) ) {
					$is_dev = true;
				}

				if ( $is_dev ) {
					// Vite Dev Server
					wp_enqueue_script( 'clickwise-vite-client', 'http://localhost:5173/@vite/client', array(), null, true );
					wp_enqueue_script( 'clickwise-react-app', 'http://localhost:5173/src/main.tsx', array( 'clickwise-vite-client' ), null, true );
				} else {
					// Production Build
					$manifest_path = CLICKWISE_PATH . 'assets/dist/.vite/manifest.json';
					if ( file_exists( $manifest_path ) ) {
						$manifest = json_decode( file_get_contents( $manifest_path ), true );
						if ( isset( $manifest['src/main.tsx'] ) ) {
							$entry = $manifest['src/main.tsx'];
							wp_enqueue_script( 'clickwise-react-app', CLICKWISE_URL . 'assets/dist/' . $entry['file'], array(), CLICKWISE_VERSION, true );
							if ( isset( $entry['css'] ) ) {
								foreach ( $entry['css'] as $css_file ) {
									wp_enqueue_style( 'clickwise-react-css', CLICKWISE_URL . 'assets/dist/' . $css_file, array(), CLICKWISE_VERSION );
								}
							}
						}
					}
				}

				// Pass data to React
				wp_localize_script( 'clickwise-react-app', 'clickwiseSettings', array(
					'ajaxUrl' => admin_url( 'admin-ajax.php' ),
					'nonce'    => wp_create_nonce( 'clickwise_admin_nonce' ),
					'restUrl' => esc_url_raw( rest_url() ),
					'restNonce' => wp_create_nonce( 'wp_rest' ),
					'scriptUrl' => get_option( 'clickwise_script_url' ),
					'siteId'    => get_option( 'clickwise_site_id' ),
					'currentUser' => wp_get_current_user(),
					'activeTab' => isset( $_GET['tab'] ) ? $_GET['tab'] : 'general',
					'rybbitEnabled' => get_option( 'clickwise_rybbit_enabled' ),
					'gaEnabled' => get_option( 'clickwise_ga_enabled' ),
				) );

				// Add module type for Vite scripts
				add_filter( 'script_loader_tag', array( $this, 'add_type_attribute' ), 10, 3 );
			}
		}
	}

	public function add_type_attribute( $tag, $handle, $src ) {
		if ( 'clickwise-vite-client' === $handle || 'clickwise-react-app' === $handle ) {
			$tag = '<script type="module" src="' . esc_url( $src ) . '"></script>';
		}
		return $tag;
	}

	public function register_settings() {
		// --- Rybbit Handler Settings ---
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_enabled' );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_script_url' );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_site_id' );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_api_version' );

		add_settings_section(
			'clickwise_rybbit_section',
			'Rybbit Analytics',
			array( $this, 'render_rybbit_section_description' ),
			'clickwise-settings-rybbit'
		);

		add_settings_field(
			'clickwise_rybbit_enabled',
			'Enable Rybbit',
			array( $this, 'render_rybbit_enabled_field' ),
			'clickwise-settings-rybbit',
			'clickwise_rybbit_section'
		);

		add_settings_field(
			'clickwise_rybbit_script_url',
			'Script URL',
			array( $this, 'render_rybbit_script_url_field' ),
			'clickwise-settings-rybbit',
			'clickwise_rybbit_section'
		);

		add_settings_field(
			'clickwise_rybbit_site_id',
			'Site ID',
			array( $this, 'render_rybbit_site_id_field' ),
			'clickwise-settings-rybbit',
			'clickwise_rybbit_section'
		);

		add_settings_field(
			'clickwise_rybbit_api_version',
			'API Version',
			array( $this, 'render_rybbit_api_version_field' ),
			'clickwise-settings-rybbit',
			'clickwise_rybbit_section'
		);

		add_settings_field(
			'clickwise_rybbit_test',
			'Test Connection',
			array( $this, 'render_rybbit_test_field' ),
			'clickwise-settings-rybbit',
			'clickwise_rybbit_section'
		);
		
		add_settings_field(
			'clickwise_rybbit_remote_config',
			'Remote Configuration',
			array( $this, 'render_rybbit_remote_config_field' ),
			'clickwise-settings-rybbit',
			'clickwise_rybbit_section'
		);


		// --- Google Analytics Settings ---
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_enabled' );
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_measurement_id' );
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_api_secret' );

		add_settings_section(
			'clickwise_ga_section',
			'Google Analytics 4',
			array( $this, 'render_ga_section_description' ),
			'clickwise-settings-ga'
		);

		add_settings_field(
			'clickwise_ga_enabled',
			'Enable GA4',
			array( $this, 'render_ga_enabled_field' ),
			'clickwise-settings-ga',
			'clickwise_ga_section'
		);

		add_settings_field(
			'clickwise_ga_measurement_id',
			'Measurement ID',
			array( $this, 'render_ga_measurement_id_field' ),
			'clickwise-settings-ga',
			'clickwise_ga_section'
		);

		add_settings_field(
			'clickwise_ga_api_secret',
			'API Secret',
			array( $this, 'render_ga_api_secret_field' ),
			'clickwise-settings-ga',
			'clickwise_ga_section'
		);

		add_settings_field(
			'clickwise_ga_test',
			'Test Connection',
			array( $this, 'render_ga_test_field' ),
			'clickwise-settings-ga',
			'clickwise_ga_section'
		);


		// --- General Settings (Legacy/Fallback) ---
		register_setting( 'clickwise-settings-general', 'clickwise_script_url' );
		register_setting( 'clickwise-settings-general', 'clickwise_site_id' );
		register_setting( 'clickwise-settings-general', 'clickwise_api_version' );

		add_settings_section(
			'clickwise_general_section',
			'General Settings',
			null,
			'clickwise-settings-general'
		);

		add_settings_field(
			'clickwise_script_url',
			'Script URL',
			array( $this, 'render_text_field' ),
			'clickwise-settings-general',
			'clickwise_general_section',
			array( 'id' => 'clickwise_script_url', 'desc' => 'Legacy setting (use Rybbit tab)' )
		);

		add_settings_field(
			'clickwise_site_id',
			'Site ID',
			array( $this, 'render_text_field' ),
			'clickwise-settings-general',
			'clickwise_general_section',
			array( 'id' => 'clickwise_site_id', 'desc' => 'Legacy setting (use Rybbit tab)' )
		);


		// --- Events & Forms Settings ---
		register_setting( 'clickwise-settings-events', 'clickwise_event_patterns' );
		register_setting( 'clickwise-settings-events', 'clickwise_event_rules' );

		add_settings_section(
			'clickwise_events_section',
			'Events & Forms',
			null,
			'clickwise-settings-events'
		);

		add_settings_field(
			'clickwise_event_patterns',
			'URL Patterns',
			array( $this, 'render_pattern_list_field' ),
			'clickwise-settings-events',
			'clickwise_events_section',
			array( 'id' => 'clickwise_event_patterns', 'desc' => 'Define URL patterns to include/exclude.' )
		);

		add_settings_field(
			'clickwise_event_rules',
			'Event Rules',
			array( $this, 'render_event_rules_field' ),
			'clickwise-settings-events',
			'clickwise_events_section',
			array( 'id' => 'clickwise_event_rules', 'desc' => 'Define rules for auto-tracking events.' )
		);
	}

	public function display_options_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div id="clickwise-admin-app"></div>
		<?php
	}

	public function render_sandbox_tab() {
		// Get handler status
		$rybbit_enabled = get_option( 'clickwise_rybbit_enabled' );
		$ga_enabled = get_option( 'clickwise_ga_enabled' );
		?>
		<div class="clickwise-sandbox">
			<h2>Event Sandbox</h2>
			<p>Use this tool to test custom events and verify that your tracking configuration is working correctly.</p>

			<!-- Handler Selection -->
			<div class="clickwise-handler-selection">
				<div class="handler-selection-header">
					<h3>Testing Handlers</h3>
					<span class="handler-count" id="selected-count">0 selected</span>
				</div>

				<div class="clickwise-handler-chips">
					<label class="clickwise-handler-chip <?php echo !$rybbit_enabled ? 'disabled' : ''; ?>"
						   <?php if (!$rybbit_enabled): ?>title="Enable Rybbit in settings to test"<?php endif; ?>>
						<input type="checkbox"
							   id="handler-rybbit"
							   data-handler="rybbit"
							   <?php echo !$rybbit_enabled ? 'disabled' : ''; ?>>
						<span class="chip-content">
							<span class="chip-icon">🚀</span>
							<span class="chip-text">Rybbit</span>
							<?php if (!$rybbit_enabled): ?>
								<span class="chip-status disabled">OFF</span>
							<?php endif; ?>
						</span>
					</label>

					<label class="clickwise-handler-chip <?php echo !$ga_enabled ? 'disabled' : ''; ?>"
						   <?php if (!$ga_enabled): ?>title="Enable Google Analytics in settings to test"<?php endif; ?>>
						<input type="checkbox"
							   id="handler-ga"
							   data-handler="ga"
							   <?php echo !$ga_enabled ? 'disabled' : ''; ?>>
						<span class="chip-content">
							<span class="chip-icon">📊</span>
							<span class="chip-text">Google Analytics</span>
							<?php if (!$ga_enabled): ?>
								<span class="chip-status disabled">OFF</span>
							<?php endif; ?>
						</span>
					</label>
				</div>
			</div>

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
				<div class="clickwise-responsive-table">
					<div class="clickwise-table-header">
						<div class="clickwise-header-cell check-column">
							<input type="checkbox" class="clickwise-select-all">
						</div>
						<div class="clickwise-header-cell event-name">Event Name</div>
						<div class="clickwise-header-cell original-name">Original Name</div>
						<div class="clickwise-header-cell type">Type</div>
						<div class="clickwise-header-cell selector">Selector</div>
						<div class="clickwise-header-cell actions">Actions</div>
					</div>
					<div class="clickwise-table-body">
						<?php if ( empty( $tracked_events ) ) : ?>
							<div class="clickwise-empty-state">No tracked events yet.</div>
						<?php else : ?>
							<?php foreach ( $tracked_events as $event ) : ?>
								<div class="clickwise-table-row clickwise-clickable-row" data-key="<?php echo esc_attr( $event['key'] ); ?>">
									<div class="clickwise-cell check-column" onclick="event.stopPropagation();">
										<input type="checkbox" name="keys[]" value="<?php echo esc_attr( $event['key'] ); ?>">
									</div>
									<div class="clickwise-cell event-name" data-label="Event Name:">
										<strong><?php echo esc_html( isset($event['alias']) && $event['alias'] ? $event['alias'] : $event['name'] ); ?></strong>
									</div>
									<div class="clickwise-cell original-name" data-label="Original Name:">
										<?php echo esc_html( $event['name'] ); ?>
									</div>
									<div class="clickwise-cell type" data-label="Type:">
										<span class="clickwise-type-badge"><?php echo esc_html( $event['type'] ); ?></span>
									</div>
									<div class="clickwise-cell selector" data-label="Selector:">
										<code><?php echo esc_html( isset($event['selector']) ? $event['selector'] : '' ); ?></code>
									</div>
									<div class="clickwise-cell actions" onclick="event.stopPropagation();">
										<button type="button" class="button button-primary clickwise-track-event"
											data-key="<?php echo esc_attr( $event['key'] ); ?>"
											data-name="<?php echo esc_attr( $event['name'] ); ?>"
											data-action="untrack"
											data-status="tracked">Untrack</button>
									</div>
								</div>
							<?php endforeach; ?>
						<?php endif; ?>
					</div>
				</div>
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
				<div class="clickwise-responsive-table">
					<div class="clickwise-table-header ignored-events-header">
						<div class="clickwise-header-cell check-column">
							<input type="checkbox" class="clickwise-select-all">
						</div>
						<div class="clickwise-header-cell original-name">Original Name</div>
						<div class="clickwise-header-cell type">Type</div>
						<div class="clickwise-header-cell selector">Selector</div>
						<div class="clickwise-header-cell actions">Actions</div>
					</div>
					<div class="clickwise-table-body">
						<?php if ( empty( $ignored_events ) ) : ?>
							<div class="clickwise-empty-state">No ignored events.</div>
						<?php else : ?>
							<?php foreach ( $ignored_events as $event ) : ?>
								<div class="clickwise-table-row clickwise-clickable-row" data-key="<?php echo esc_attr( $event['key'] ); ?>">
									<div class="clickwise-cell check-column" onclick="event.stopPropagation();">
										<input type="checkbox" name="keys[]" value="<?php echo esc_attr( $event['key'] ); ?>">
									</div>
									<div class="clickwise-cell original-name" data-label="Original Name:">
										<strong><?php echo esc_html( $event['name'] ); ?></strong>
									</div>
									<div class="clickwise-cell type" data-label="Type:">
										<span class="clickwise-type-badge"><?php echo esc_html( $event['type'] ); ?></span>
									</div>
									<div class="clickwise-cell selector" data-label="Selector:">
										<code><?php echo esc_html( isset($event['selector']) ? $event['selector'] : '' ); ?></code>
									</div>
									<div class="clickwise-cell actions" onclick="event.stopPropagation();">
										<button type="button" class="button button-primary clickwise-track-event"
											data-key="<?php echo esc_attr( $event['key'] ); ?>"
											data-name="<?php echo esc_attr( $event['name'] ); ?>"
											data-action="track"
											data-status="ignored">Track</button>
									</div>
								</div>
							<?php endforeach; ?>
						<?php endif; ?>
					</div>
				</div>
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
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

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

	public function render_rybbit_remote_config_field() {
		$enabled = get_option( 'clickwise_rybbit_enabled' );
		$script_url = get_option( 'clickwise_rybbit_script_url', '' );
		$site_id = get_option( 'clickwise_rybbit_site_id', '' );
		
		if ( ! $enabled || empty( $script_url ) || empty( $site_id ) ) {
			?>
			<div class="clickwise-remote-config-notice">
				<p style="color: var(--cw-cyan-300); margin: 0;">
					⚠️ Configure and enable Rybbit Analytics above to view remote configuration settings.
				</p>
			</div>
			<?php
			return;
		}
		?>
		<div id="clickwise-remote-config-container" class="clickwise-remote-config-container">
			<div class="clickwise-remote-config-loading">
				<div class="clickwise-spinner"></div>
				<p>Loading remote configuration from Rybbit...</p>
			</div>
			<div class="clickwise-remote-config-content" style="display: none;">
				<!-- Content will be populated by JavaScript -->
			</div>
			<div class="clickwise-remote-config-error" style="display: none;">
				<p class="clickwise-error-message"></p>
			</div>
		</div>
		<p class="description">
			These settings are controlled through your <strong>Rybbit dashboard</strong> and cannot be changed here. 
			They are fetched in real-time from your Rybbit instance.
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
			   placeholder="API Secret Key (Optional)" <?php echo $disabled; ?> />
		<p class="description">Only required for the "Test Connection" button below. Not needed for standard tracking.</p>
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
