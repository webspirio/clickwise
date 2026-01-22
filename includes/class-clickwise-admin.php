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

	public function inject_vite_scripts() {
		// Only on settings page
		$screen = get_current_screen();
		if ( ! $screen || 'toplevel_page_clickwise-settings' !== $screen->id ) {
			return;
		}

		if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$is_dev = defined( 'CLICKWISE_REACT_DEV' ) && CLICKWISE_REACT_DEV;
		if ( ! defined( 'CLICKWISE_REACT_DEV' ) && ( wp_get_environment_type() === 'local' || wp_get_environment_type() === 'development' ) ) {
			$is_dev = true;
		}

		if ( $is_dev ) {
			// Output settings data first
			?>
			<script>
			window.clickwiseSettings = <?php echo json_encode( array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'clickwise_admin_nonce' ),
				'restUrl' => esc_url_raw( rest_url() ),
				'restNonce' => wp_create_nonce( 'wp_rest' ),
				'scriptUrl' => get_option( 'clickwise_script_url', '' ),
				'siteId'    => get_option( 'clickwise_site_id', '' ),
				'activeTab' => isset( $_GET['tab'] ) ? $_GET['tab'] : 'general',
				'isPlayground' => defined( 'IS_PLAYGROUND_PREVIEW' ) && IS_PLAYGROUND_PREVIEW,
				// Rybbit settings - always include with defaults to prevent undefined errors
				'rybbitEnabled' => get_option( 'clickwise_rybbit_enabled', '' ),
				'rybbitSiteId' => get_option( 'clickwise_rybbit_site_id', '' ),
				'rybbitDomain' => get_option( 'clickwise_rybbit_domain', 'https://app.rybbit.io' ),
				'rybbitScriptUrl' => get_option( 'clickwise_rybbit_script_url', '' ),
				'rybbitScriptPath' => get_option( 'clickwise_rybbit_script_path', '' ),
				'rybbitTrackingId' => get_option( 'clickwise_rybbit_tracking_id', '' ),
				'rybbitWebsiteId' => get_option( 'clickwise_rybbit_website_id', '' ),
				// Google Analytics settings
				'gaEnabled' => get_option( 'clickwise_ga_enabled', '' ),
			) ); ?>;
			</script>
			<script type="module">
				import RefreshRuntime from "http://localhost:5173/@react-refresh"
				RefreshRuntime.injectIntoGlobalHook(window)
				window.$RefreshReg$ = () => {}
				window.$RefreshSig$ = () => (type) => type
				window.__vite_plugin_react_preamble_installed__ = true
			</script>
			<script type="module" crossorigin src="http://localhost:5173/@vite/client"></script>
			<script type="module" crossorigin src="http://localhost:5173/src/main.tsx"></script>
			<?php
		}
	}

	public function inject_frontend_preamble() {
		if ( is_admin() || ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$is_dev = defined( 'CLICKWISE_REACT_DEV' ) && CLICKWISE_REACT_DEV;
		if ( ! defined( 'CLICKWISE_REACT_DEV' ) && ( wp_get_environment_type() === 'local' || wp_get_environment_type() === 'development' ) ) {
			$is_dev = true;
		}

		if ( $is_dev ) {
			// Inject everything directly to avoid WordPress script queue interference
			?>
			<script>
			window.clickwiseSettings = <?php echo json_encode( array(
				'ajaxUrl' => admin_url( 'admin-ajax.php' ),
				'nonce'    => wp_create_nonce( 'clickwise_admin_nonce' ),
				'restUrl' => esc_url_raw( rest_url() ),
				'restNonce' => wp_create_nonce( 'wp_rest' ),
				'scriptUrl' => get_option( 'clickwise_script_url', '' ),
				'siteId'    => get_option( 'clickwise_site_id', '' ),
				'activeTab' => '',
				'isPlayground' => defined( 'IS_PLAYGROUND_PREVIEW' ) && IS_PLAYGROUND_PREVIEW,
				// Rybbit settings - always include with defaults to prevent undefined errors
				'rybbitEnabled' => get_option( 'clickwise_rybbit_enabled', '' ),
				'rybbitSiteId' => get_option( 'clickwise_rybbit_site_id', '' ),
				'rybbitDomain' => get_option( 'clickwise_rybbit_domain', 'https://app.rybbit.io' ),
				'rybbitScriptUrl' => get_option( 'clickwise_rybbit_script_url', '' ),
				'rybbitScriptPath' => get_option( 'clickwise_rybbit_script_path', '' ),
				'rybbitTrackingId' => get_option( 'clickwise_rybbit_tracking_id', '' ),
				'rybbitWebsiteId' => get_option( 'clickwise_rybbit_website_id', '' ),
				// Google Analytics settings
				'gaEnabled' => get_option( 'clickwise_ga_enabled', '' ),
			) ); ?>;
			</script>
			<script type="module">
				import RefreshRuntime from "http://localhost:5173/@react-refresh"
				RefreshRuntime.injectIntoGlobalHook(window)
				window.$RefreshReg$ = () => {}
				window.$RefreshSig$ = () => (type) => type
				window.__vite_plugin_react_preamble_installed__ = true
			</script>
			<script type="module" crossorigin src="http://localhost:5173/@vite/client"></script>
			<script type="module" crossorigin src="http://localhost:5173/src/main.tsx"></script>
			<?php
		}
	}

	public function add_settings_link( $links ) {
		$settings_link = '<a href="' . admin_url( 'admin.php?page=clickwise-settings' ) . '">' . __( 'Settings', 'clickwise' ) . '</a>';
		array_unshift( $links, $settings_link );
		return $links;
	}

	public function add_admin_menu() {
		add_menu_page(
			'Clickwise',
			'Clickwise',
			'manage_options',
			'clickwise-settings',
			array( $this, 'display_options_page' ),
			'data:image/svg+xml;base64,' . base64_encode( file_get_contents( CLICKWISE_URL . 'assets/images/icon-simple-128x128.svg' ) ),
			30
		);
	}

	public function add_admin_bar_menu( $wp_admin_bar ) {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$is_recording = get_user_meta( get_current_user_id(), 'clickwise_recording_mode', true );
		$title = $is_recording ? '● Recording Events' : 'Clickwise';
		
		$meta = array();
		if ( $is_recording ) {
			$meta['class'] = 'clickwise-recording-active';
		}

		$wp_admin_bar->add_node( array(
			'id'    => 'clickwise-analytics',
			'title' => $title,
			'href'  => admin_url( 'admin.php?page=clickwise-settings&tab=events_manager' ),
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
			'id'     => 'clickwise-toggle-highlight',
			'parent' => 'clickwise-analytics',
			'title'  => 'Highlight Tracked',
			'href'   => '#',
			'meta'   => array(
				'onclick' => 'clickwiseToggleHighlight(event)',
			),
		) );

		$wp_admin_bar->add_node( array(
			'id'     => 'clickwise-manage-events',
			'parent' => 'clickwise-analytics',
			'title'  => 'Manage Events',
			'href'   => admin_url( 'admin.php?page=clickwise-settings&tab=events_manager' ),
		) );
	}

	public function enqueue_admin_scripts( $hook = null ) {
		// Enqueue on settings page AND frontend (for admin bar)
		if ( 'toplevel_page_clickwise-settings' === $hook || ! is_admin() ) {
			if ( is_user_logged_in() && current_user_can( 'manage_options' ) ) {

				$is_dev = defined( 'CLICKWISE_REACT_DEV' ) && CLICKWISE_REACT_DEV;
				// Auto-detect dev mode if localhost:5173 is reachable (optional, but manual constant is safer for now)
				// For this environment, let's assume dev mode if the constant is not defined but we are in a local env
				if ( ! defined( 'CLICKWISE_REACT_DEV' ) && ( wp_get_environment_type() === 'local' || wp_get_environment_type() === 'development' ) ) {
					$is_dev = true;
				}

				if ( $is_dev && 'toplevel_page_clickwise-settings' === $hook ) {
					// Vite Dev Server - Scripts and settings are injected directly in admin_head via inject_vite_scripts()
					// Nothing to do here for the settings page
					return;
				} else if ( $is_dev && ! is_admin() ) {
					// Dev mode on frontend - Scripts and settings are injected directly in wp_head via inject_frontend_preamble()
					// But we still need to enqueue the admin bar handler
				} else if ( $is_dev ) {
					// This shouldn't happen, but just in case - some other admin page in dev mode
					wp_enqueue_script( 'clickwise-vite-client', 'http://localhost:5173/@vite/client', array(), null, false );
					wp_enqueue_script( 'clickwise-react-app', 'http://localhost:5173/src/main.tsx', array( 'clickwise-vite-client' ), null, false );
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

				// Pass data to React (for non-settings pages or production mode)
				wp_localize_script( 'clickwise-react-app', 'clickwiseSettings', array(
					'ajaxUrl' => admin_url( 'admin-ajax.php' ),
					'nonce'    => wp_create_nonce( 'clickwise_admin_nonce' ),
					'restUrl' => esc_url_raw( rest_url() ),
					'restNonce' => wp_create_nonce( 'wp_rest' ),
					'scriptUrl' => get_option( 'clickwise_script_url', '' ),
					'siteId'    => get_option( 'clickwise_site_id', '' ),
					'activeTab' => isset( $_GET['tab'] ) ? $_GET['tab'] : 'general',
					'isPlayground' => defined( 'IS_PLAYGROUND_PREVIEW' ) && IS_PLAYGROUND_PREVIEW,
					// Rybbit settings - always include with defaults to prevent undefined errors
					'rybbitEnabled' => get_option( 'clickwise_rybbit_enabled', '' ),
					'rybbitSiteId' => get_option( 'clickwise_rybbit_site_id', '' ),
					'rybbitDomain' => get_option( 'clickwise_rybbit_domain', 'https://app.rybbit.io' ),
					'rybbitScriptUrl' => get_option( 'clickwise_rybbit_script_url', '' ),
					'rybbitScriptPath' => get_option( 'clickwise_rybbit_script_path', '' ),
					'rybbitTrackingId' => get_option( 'clickwise_rybbit_tracking_id', '' ),
					'rybbitWebsiteId' => get_option( 'clickwise_rybbit_website_id', '' ),
					// Google Analytics settings
					'gaEnabled' => get_option( 'clickwise_ga_enabled', '' ),
				) );

				// Add module type for Vite scripts
				add_filter( 'script_loader_tag', array( $this, 'add_type_attribute' ), 10, 3 );

				// Enqueue Admin Bar Handler (Always for admins)
				wp_enqueue_script( 'clickwise-admin-bar-js', CLICKWISE_URL . 'assets/js/clickwise-admin-bar.js', array(), $this->version, true );
				
				// Localize settings for admin bar handler specifically
				wp_localize_script( 'clickwise-admin-bar-js', 'clickwiseAdminBarSettings', array(
					'ajaxUrl' => admin_url( 'admin-ajax.php' ),
					'nonce'   => wp_create_nonce( 'clickwise_admin_nonce' )
				) );
			}
		}
	}

	public function add_type_attribute( $tag, $handle, $src ) {
		if ( 'clickwise-vite-client' === $handle || 'clickwise-react-app' === $handle ) {
			// Replace type='text/javascript' with type='module' or add it if not present
			$tag = str_replace( ' type=\'text/javascript\'', ' type=\'module\'', $tag );
			if ( strpos( $tag, 'type=' ) === false ) {
				$tag = str_replace( '<script ', '<script type=\'module\' ', $tag );
			}
			// Add crossorigin for Vite dev server
			if ( strpos( $tag, 'crossorigin' ) === false ) {
				$tag = str_replace( '<script ', '<script crossorigin ', $tag );
			}
		}
		return $tag;
	}

	public function register_settings() {
		// --- Rybbit Handler Settings ---
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_enabled', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );

		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_site_id', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_api_version', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => 'v2',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_domain', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => 'https://api.rybbit.io/api',
		) );

		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_tracking_id', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_website_id', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-rybbit', 'clickwise_rybbit_api_key', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );

		// --- Google Analytics Settings ---
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_enabled', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_measurement_id', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
		register_setting( 'clickwise-settings-ga', 'clickwise_ga_api_secret', array(
			'type' => 'string',
			'show_in_rest' => true,
			'default' => '',
		) );
	}

	public function display_options_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div id="clickwise-admin-app"></div>
		<?php
	}

	/**
	 * AJAX: Toggle Recording Mode
	 */
	public function ajax_toggle_recording() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Unauthorized' );
		}

		$current_mode = get_user_meta( get_current_user_id(), 'clickwise_recording_mode', true );
		$new_mode = ! $current_mode;

		update_user_meta( get_current_user_id(), 'clickwise_recording_mode', $new_mode );

		wp_send_json_success( array( 'recording_mode' => $new_mode ) );
	}

	/**
	 * AJAX: Record Event
	 */
	public function ajax_record_event() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Unauthorized' );
		}

		$type = isset( $_POST['type'] ) ? sanitize_text_field( $_POST['type'] ) : '';
		$name = isset( $_POST['name'] ) ? sanitize_text_field( $_POST['name'] ) : '';
		$selector = isset( $_POST['selector'] ) ? sanitize_text_field( $_POST['selector'] ) : '';
		$detail = isset( $_POST['detail'] ) ? sanitize_textarea_field( $_POST['detail'] ) : '';
		$session_id = isset( $_POST['session_id'] ) ? sanitize_text_field( $_POST['session_id'] ) : '';
		$status = isset( $_POST['status'] ) ? sanitize_text_field( $_POST['status'] ) : 'tracked'; // Default to tracked if not specified

		if ( empty( $type ) || empty( $selector ) ) {
			wp_send_json_error( 'Missing required fields' );
		}

		// Generate key
		$event_key = md5( $type . ':' . $selector );

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		// Check if exists
		$existing = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_name WHERE event_key = %s", $event_key ) );

		if ( $existing ) {
			// Update last seen AND session info AND status if provided
			$update_data = array( 
				'last_seen' => current_time( 'mysql' ),
				'session_id' => $session_id,
				'session_timestamp' => current_time( 'timestamp' )
			);

			// Only update status if it's explicitly 'tracked' or if we want to support other status transitions
			// If we are just recording a 'pending' event, we shouldn't overwrite 'tracked' status.
			// But if the user explicitly tracks it (status='tracked'), we should update.
			if ( $status === 'tracked' ) {
				$update_data['status'] = 'tracked';
			}
			
			// Always update name and detail to keep it fresh? Maybe not if user customized name.
			// Let's only update name if it was auto-generated or empty.
			// For now, let's leave name alone to preserve user edits.

			$wpdb->update(
				$table_name,
				$update_data,
				array( 'event_key' => $event_key )
			);
			wp_send_json_success( array( 'status' => 'exists', 'event' => $existing ) );
		} else {
			// Insert
			$wpdb->insert(
				$table_name,
				array(
					'event_key'      => $event_key,
					'type'           => $type,
					'name'           => $name,
					'selector'       => $selector,
					'status'         => $status,
					'first_seen'     => current_time( 'mysql' ),
					'last_seen'      => current_time( 'mysql' ),
					'example_detail' => $detail,
					'session_id'     => $session_id,
					'session_timestamp' => current_time( 'timestamp' )
				)
			);

			if ( $wpdb->insert_id ) {
				wp_send_json_success( array( 'id' => $wpdb->insert_id, 'key' => $event_key ) );
			} else {
				wp_send_json_error( 'DB Insert Failed' );
			}
		}
	}

	/**
	 * AJAX: Update Event Status (Track/Untrack)
	 */
	public function ajax_update_event_status() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Unauthorized' );
		}

		$key = isset( $_POST['key'] ) ? sanitize_text_field( $_POST['key'] ) : '';
		$status = isset( $_POST['status'] ) ? sanitize_text_field( $_POST['status'] ) : 'pending';

		if ( empty( $key ) ) {
			wp_send_json_error( 'Missing key' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$wpdb->update(
			$table_name,
			array( 'status' => $status ),
			array( 'event_key' => $key )
		);

		wp_send_json_success();
	}

	/**
	 * AJAX: Untrack/Delete Event
	 */
	public function ajax_untrack_event() {
		check_ajax_referer( 'clickwise_admin_nonce', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( 'Unauthorized' );
		}

		$key = isset( $_POST['key'] ) ? sanitize_text_field( $_POST['key'] ) : '';
		$type = isset( $_POST['type'] ) ? sanitize_text_field( $_POST['type'] ) : '';
		$selector = isset( $_POST['selector'] ) ? sanitize_text_field( $_POST['selector'] ) : '';

		// If key is missing or looks like a JS key (contains colon), try to generate MD5 from type/selector
		if ( ( empty( $key ) || strpos( $key, ':' ) !== false ) && ! empty( $type ) && ! empty( $selector ) ) {
			$key = md5( $type . ':' . $selector );
		}

		if ( empty( $key ) ) {
			wp_send_json_error( 'Missing key' );
		}

		global $wpdb;
		$table_name = $wpdb->prefix . 'clickwise_events';

		$wpdb->delete(
			$table_name,
			array( 'event_key' => $key )
		);

		wp_send_json_success();
	}
}
